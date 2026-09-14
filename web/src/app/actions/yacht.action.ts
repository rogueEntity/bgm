"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertGameEnabledForAction } from "@/features/games/shared/enabled-games";
import {
  YACHT_CATEGORIES,
  YACHT_GAME_KEY,
  YACHT_MAX_PLAYER_NAME_LENGTH,
  YACHT_MAX_PLAYERS,
  YACHT_MIN_PLAYERS,
} from "@/features/games/yacht/constants";
import {
  getYachtFilledCount,
  getYachtTotal,
  isValidYachtScore,
  isYachtCategory,
} from "@/features/games/yacht/scoring";
import { lockYachtStats, syncYachtMatchUserStats } from "@/features/games/yacht/stats";
import type { YachtMatchDetails } from "@/features/games/yacht/types";
import { getCurrentUserWithAdmin } from "@/lib/admin";
import { db } from "@/lib/prisma";

type CreateYachtMatchInput = {
  playerNames: string[];
};

type RecordYachtScoreInput = {
  matchId: number;
  expectedVersion: number;
  playerKey: string;
  category: string;
  score: number;
};

type RecordAdditionalYachtInput = {
  matchId: number;
  expectedVersion: number;
  playerKey: string;
  zeroCategory: string;
};

type CompleteYachtMatchInput = {
  matchId: number;
  expectedVersion: number;
};

function normalizePlayerName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function validatePlayerNames(values: string[]): string[] {
  const names = values.map(normalizePlayerName);

  if (names.length < YACHT_MIN_PLAYERS || names.length > YACHT_MAX_PLAYERS) {
    throw new Error("야찌 다이스 참가자는 1명부터 6명까지 입력할 수 있습니다.");
  }

  if (names.some((name) => name.length === 0)) {
    throw new Error("모든 참가자의 이름을 입력해주세요.");
  }

  if (names.some((name) => name.length > YACHT_MAX_PLAYER_NAME_LENGTH)) {
    throw new Error(
      `참가자 이름은 ${YACHT_MAX_PLAYER_NAME_LENGTH}글자까지 입력할 수 있습니다.`,
    );
  }

  if (new Set(names).size !== names.length) {
    throw new Error("참가자 이름은 모두 달라야 합니다.");
  }

  return names;
}

function assertCanManageYachtMatch(
  currentUser: NonNullable<Awaited<ReturnType<typeof getCurrentUserWithAdmin>>>,
  createdBy: string | null,
): void {
  if (!currentUser.isAdmin && currentUser.id !== createdBy) {
    throw new Error("이 게임을 기록할 권한이 없습니다.");
  }
}

export async function createYachtMatch(
  input: CreateYachtMatchInput,
): Promise<void> {
  assertGameEnabledForAction(YACHT_GAME_KEY);

  const currentUser = await getCurrentUserWithAdmin();
  if (!currentUser) throw new Error("로그인이 필요합니다.");

  const playerNames = validatePlayerNames(input.playerNames);
  const game = await db.games.findUnique({
    where: { key: YACHT_GAME_KEY },
    select: { id: true },
  });

  if (!game) throw new Error("야찌 다이스 게임 정보를 찾을 수 없습니다.");

  const activeMatch = await db.matches.findFirst({
    where: {
      game_id: game.id,
      created_by: currentUser.id,
      deleted_at: null,
      match_details: {
        details: { path: ["status"], equals: "PLAYING" },
      },
    },
    select: { id: true },
  });

  if (activeMatch) {
    throw new Error("이미 진행 중인 야찌 다이스 게임이 있습니다.");
  }

  const existingUsers = await db.users.findMany({
    where: { nickname: { in: playerNames } },
    select: { id: true, nickname: true },
  });
  const userMap = new Map(existingUsers.map((user) => [user.nickname, user.id]));

  const playerEntries = playerNames.map((name, index) => {
    const userId = userMap.get(name);
    const playerKey = userId ? `user_${userId}` : `guest_${index + 1}`;

    return [
      playerKey,
      { name, seat_order: index + 1, scores: {} },
    ] as const;
  });

  const details: YachtMatchDetails = {
    schema_version: 1,
    game_key: YACHT_GAME_KEY,
    status: "PLAYING",
    current_round: 1,
    players: Object.fromEntries(playerEntries),
    finished_at: null,
  };

  const newMatch = await db.$transaction(async (tx) => {
    const match = await tx.matches.create({
      data: {
        game_id: game.id,
        created_by: currentUser.id,
        play_date: new Date(),
        match_details: {
          create: { details: details as Prisma.InputJsonValue },
        },
      },
      select: { id: true },
    });

    await tx.match_players.createMany({
      data: playerNames.map((name) => {
        const userId = userMap.get(name);
        return {
          match_id: match.id,
          user_id: userId ?? null,
          guest_name: userId ? null : name,
        };
      }),
    });

    return match;
  });

  revalidatePath("/yacht");
  revalidatePath("/yacht/matches");
  redirect(`/yacht/play/${newMatch.id}`);
}

export async function recordYachtScore(
  input: RecordYachtScoreInput,
): Promise<void> {
  assertGameEnabledForAction(YACHT_GAME_KEY);

  const currentUser = await getCurrentUserWithAdmin();
  if (!currentUser) throw new Error("로그인이 필요합니다.");
  if (!Number.isInteger(input.matchId) || input.matchId < 1) {
    throw new Error("잘못된 게임 정보입니다.");
  }
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
    throw new Error("잘못된 게임 버전입니다.");
  }
  if (!isYachtCategory(input.category)) {
    throw new Error("잘못된 점수 항목입니다.");
  }
  if (!Number.isInteger(input.score) || !isValidYachtScore(input.category, input.score)) {
    throw new Error("선택한 항목에 기록할 수 없는 점수입니다.");
  }

  const match = await db.matches.findUnique({
    where: { id: input.matchId },
    include: { games: true, match_details: true },
  });

  if (!match?.match_details || match.games.key !== YACHT_GAME_KEY) {
    throw new Error("야찌 다이스 게임 기록을 찾을 수 없습니다.");
  }
  if (match.deleted_at) throw new Error("삭제된 게임에는 기록할 수 없습니다.");
  assertCanManageYachtMatch(currentUser, match.created_by);

  const details = match.match_details.details as YachtMatchDetails;
  if (details.game_key !== YACHT_GAME_KEY || details.status !== "PLAYING") {
    throw new Error("진행 중인 야찌 다이스 게임에만 기록할 수 있습니다.");
  }

  const player = details.players[input.playerKey];
  if (!player) throw new Error("존재하지 않는 플레이어입니다.");
  const nextDetails: YachtMatchDetails = {
    ...details,
    players: {
      ...details.players,
      [input.playerKey]: {
        ...player,
        scores: { ...player.scores, [input.category]: input.score },
      },
    },
  };
  const players = Object.values(nextDetails.players);
  const minimumFilledCount = Math.min(
    ...players.map((item) => getYachtFilledCount(item.scores)),
  );
  nextDetails.current_round = Math.min(minimumFilledCount + 1, YACHT_CATEGORIES.length);

  const result = await db.match_details.updateMany({
    where: {
      match_id: input.matchId,
      version: input.expectedVersion,
    },
    data: {
      details: nextDetails as Prisma.InputJsonValue,
      version: { increment: 1 },
    },
  });

  if (result.count !== 1) {
    throw new Error("다른 기록이 먼저 저장되었습니다. 새로고침 후 다시 시도해주세요.");
  }

  revalidatePath("/yacht");
  revalidatePath("/yacht/matches");
  revalidatePath(`/yacht/play/${input.matchId}`);
}

async function getManageableYachtMatch(matchId: number) {
  const currentUser = await getCurrentUserWithAdmin();
  if (!currentUser) throw new Error("로그인이 필요합니다.");

  const match = await db.matches.findUnique({
    where: { id: matchId },
    include: { games: true, match_details: true },
  });
  if (!match?.match_details || match.games.key !== YACHT_GAME_KEY) {
    throw new Error("야찌 다이스 게임 기록을 찾을 수 없습니다.");
  }
  if (match.deleted_at) throw new Error("삭제된 게임에는 기록할 수 없습니다.");
  assertCanManageYachtMatch(currentUser, match.created_by);

  const details = match.match_details.details as YachtMatchDetails;
  if (details.game_key !== YACHT_GAME_KEY || details.status !== "PLAYING") {
    throw new Error("진행 중인 야찌 다이스 게임에만 기록할 수 있습니다.");
  }

  return { match, details };
}

export async function recordAdditionalYacht(
  input: RecordAdditionalYachtInput,
): Promise<void> {
  assertGameEnabledForAction(YACHT_GAME_KEY);
  if (!Number.isInteger(input.matchId) || input.matchId < 1) {
    throw new Error("잘못된 게임 정보입니다.");
  }
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
    throw new Error("잘못된 게임 버전입니다.");
  }
  if (!isYachtCategory(input.zeroCategory) || input.zeroCategory === "YACHT") {
    throw new Error("0점으로 처리할 다른 항목을 선택해주세요.");
  }

  const { match, details } = await getManageableYachtMatch(input.matchId);
  const player = details.players[input.playerKey];
  if (!player) throw new Error("존재하지 않는 플레이어입니다.");

  const yachtScore = player.scores.YACHT;
  if (typeof yachtScore !== "number" || yachtScore < 50 || yachtScore % 50 !== 0) {
    throw new Error("먼저 Yacht 항목에 50점을 기록해주세요.");
  }
  if (typeof player.scores[input.zeroCategory] === "number") {
    throw new Error("이미 점수를 기록한 항목은 0점으로 처리할 수 없습니다.");
  }

  const nextDetails: YachtMatchDetails = {
    ...details,
    players: {
      ...details.players,
      [input.playerKey]: {
        ...player,
        scores: {
          ...player.scores,
          YACHT: yachtScore + 50,
          [input.zeroCategory]: 0,
        },
      },
    },
  };
  const minimumFilledCount = Math.min(
    ...Object.values(nextDetails.players).map((item) =>
      getYachtFilledCount(item.scores),
    ),
  );
  nextDetails.current_round = Math.min(minimumFilledCount + 1, YACHT_CATEGORIES.length);

  const result = await db.match_details.updateMany({
    where: { match_id: match.id, version: input.expectedVersion },
    data: {
      details: nextDetails as Prisma.InputJsonValue,
      version: { increment: 1 },
    },
  });
  if (result.count !== 1) {
    throw new Error("다른 기록이 먼저 저장되었습니다. 새로고침 후 다시 시도해주세요.");
  }

  revalidatePath("/yacht");
  revalidatePath("/yacht/matches");
  revalidatePath(`/yacht/play/${input.matchId}`);
}

export async function completeYachtMatch(
  input: CompleteYachtMatchInput,
): Promise<void> {
  assertGameEnabledForAction(YACHT_GAME_KEY);
  if (!Number.isInteger(input.matchId) || input.matchId < 1) {
    throw new Error("잘못된 게임 정보입니다.");
  }
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
    throw new Error("잘못된 게임 버전입니다.");
  }

  const { match, details } = await getManageableYachtMatch(input.matchId);
  const players = Object.values(details.players);
  if (
    players.length === 0 ||
    !players.every(
      (player) => getYachtFilledCount(player.scores) === YACHT_CATEGORIES.length,
    )
  ) {
    throw new Error("모든 플레이어의 점수칸을 채운 뒤 완료할 수 있습니다.");
  }

  const nextDetails: YachtMatchDetails = {
    ...details,
    status: "FINISHED",
    current_round: YACHT_CATEGORIES.length,
    finished_at: new Date().toISOString(),
  };

  await db.$transaction(async (tx) => {
    await lockYachtStats(tx, match.game_id);
    const result = await tx.match_details.updateMany({
      where: { match_id: match.id, version: input.expectedVersion },
      data: {
        details: nextDetails as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) {
      throw new Error("다른 기록이 먼저 저장되었습니다. 새로고침 후 다시 시도해주세요.");
    }

    const rankedPlayers = Object.entries(nextDetails.players)
      .map(([playerKey, player]) => ({
        playerKey,
        ...player,
        total: getYachtTotal(player.scores),
      }))
      .sort((a, b) => b.total - a.total);
    let previousScore: number | null = null;
    let previousRank = 0;

    for (const [index, player] of rankedPlayers.entries()) {
      const rank = player.total === previousScore ? previousRank : index + 1;
      const userId = player.playerKey.startsWith("user_")
        ? player.playerKey.slice("user_".length)
        : null;
      await tx.match_players.updateMany({
        where: userId
          ? { match_id: match.id, user_id: userId }
          : { match_id: match.id, guest_name: player.name },
        data: { final_score: player.total, rank },
      });
      previousScore = player.total;
      previousRank = rank;
    }
    await syncYachtMatchUserStats(tx, match.game_id, match.id);
  });

  revalidatePath("/yacht");
  revalidatePath("/yacht/matches");
  revalidatePath("/yacht/ranking");
  revalidatePath(`/yacht/play/${input.matchId}`);
  revalidatePath(`/yacht/detail/${input.matchId}`);

  redirect(`/yacht/detail/${input.matchId}`);
}

export async function deleteYachtMatch(matchId: number): Promise<void> {
  assertGameEnabledForAction(YACHT_GAME_KEY);
  if (!Number.isInteger(matchId) || matchId < 1) {
    throw new Error("잘못된 게임 정보입니다.");
  }

  const currentUser = await getCurrentUserWithAdmin();
  if (!currentUser) throw new Error("로그인이 필요합니다.");

  const match = await db.matches.findUnique({
    where: { id: matchId },
    include: { games: true, match_details: true },
  });
  if (!match?.match_details || match.games.key !== YACHT_GAME_KEY) {
    throw new Error("야찌 다이스 게임 기록을 찾을 수 없습니다.");
  }
  assertCanManageYachtMatch(currentUser, match.created_by);

  const details = match.match_details.details as YachtMatchDetails;
  if (match.deleted_at || details.status === "DELETED") return;

  const nextDetails: YachtMatchDetails = {
    ...details,
    status: "DELETED",
  };

  await db.$transaction(async (tx) => {
    await lockYachtStats(tx, match.game_id);
    await tx.match_details.update({
      where: { match_id: matchId },
      data: {
        details: nextDetails as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });
    await tx.matches.update({
      where: { id: matchId },
      data: {
        deleted_at: new Date(),
        deleted_by: currentUser.id,
      },
    });
    await tx.match_players.updateMany({
      where: { match_id: matchId },
      data: { final_score: null, rank: null },
    });
    await syncYachtMatchUserStats(tx, match.game_id, matchId);
  });

  revalidatePath("/");
  revalidatePath("/yacht");
  revalidatePath("/yacht/matches");
  revalidatePath("/yacht/ranking");
  revalidatePath(`/yacht/play/${matchId}`);
  revalidatePath(`/yacht/detail/${matchId}`);
}
