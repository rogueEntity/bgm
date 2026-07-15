// web/src/app/actions/mahjong.action.ts
"use server";

import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { syncMahjongAchievementsForMatch } from "@/features/games/mahjong/lib/achievements";
import { getCurrentUserWithAdmin } from "@/lib/admin";
import { MAHJONG_GAME_KEY } from "@/features/games/mahjong/constants";
import { assertGameEnabledForAction } from "@/features/games/shared/enabled-games";
import type {
  GameMode,
  MahjongMatchListFilter,
  RecordMahjongChomboInput,
  RecordMahjongResultInput,
  RecordRyuukyokuInput,
} from "@/features/games/mahjong/types";
import { normalizeDetails } from "@/features/games/mahjong/lib/details";
import { finalizeMahjongMatchStats } from "@/features/games/mahjong/lib/stats-service";
import {
  applyMahjongAgariResult,
  applyMahjongChomboResult,
  applyMahjongRyuukyokuResult,
} from "@/features/games/mahjong/lib/record";
import {
  createMahjongMatchRecord,
  deleteMahjongMatchRecord,
  getMahjongMatchList,
  getMahjongMatchManageTarget,
  undoMahjongLastLogRecord,
} from "@/features/games/mahjong/lib/match-service";
import {
  assertCanManageMahjongMatch,
  assertLatestMahjongState,
  getCurrentMahjongManager,
  runMahjongAction,
  updateMatchDetailsWithVersionGuard,
  type MahjongActionResult,
} from "@/features/games/mahjong/lib/action-helpers";

// 도전과제 계산 중 오류가 나도 대국 기록 저장 자체가 실패하지 않도록 안전 호출 함수
async function safeSyncMahjongAchievements(matchId: number) {
  try {
    await syncMahjongAchievementsForMatch(matchId);
  } catch (error) {
    console.error("[Mahjong AchievementDefinitions Sync Failed]", error);
  }
}

// -----------------
// 1. 방 생성 액션
// -----------------
export async function createMahjongMatch(
    players: string[],
    startingScore: number,
    gameMode: GameMode,
) {
  assertGameEnabledForAction(MAHJONG_GAME_KEY);

  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const providerId = session.user.id as string;

  const me = await db.users.findFirst({
    where: {
      provider_id: providerId,
    },
  });

  if (!me) {
    throw new Error("DB에서 로그인한 유저 정보를 찾을 수 없습니다.");
  }

  const newMatch = await createMahjongMatchRecord({
    players,
    startingScore,
    gameMode,
    createdBy: me.id,
  });

  redirect(`/mahjong/play/${newMatch.id}`);
}

// -----------------
// 2. 점수 기록, 화료 액션
// -----------------
export async function recordMahjongResult(
    data: RecordMahjongResultInput,
): Promise<MahjongActionResult> {
  assertGameEnabledForAction(MAHJONG_GAME_KEY);

  return runMahjongAction(async () => {
    const currentUser = await getCurrentMahjongManager();

    const mahjongGame = await db.games.findUnique({
      where: {
        key: MAHJONG_GAME_KEY,
      },
      select: {
        id: true,
      },
    });

    if (!mahjongGame) {
      throw new Error("리치마작 게임 정보를 찾을 수 없습니다.");
    }

    const match = await db.matches.findFirst({
      where: {
        id: data.match_id,
        game_id: mahjongGame.id,
      },
      include: {
        match_details: true,
        match_players: true,
      },
    });

    if (!match?.match_details) {
      throw new Error("Match not found");
    }

    assertCanManageMahjongMatch({
      currentUser,
      createdBy: match.created_by,
    });

    const details = normalizeDetails(match.match_details.details);

    assertLatestMahjongState({
      details,
      currentVersion: match.match_details.version,
      expected: data,
    });

    if (match.deleted_at) {
      throw new Error("삭제된 대국에는 기록을 추가할 수 없습니다.");
    }

    if (details.status !== "PLAYING") {
      throw new Error("진행 중인 대국에만 기록을 추가할 수 있습니다.");
    }

    applyMahjongAgariResult({
      details,
      data,
    });

    await updateMatchDetailsWithVersionGuard({
      matchId: match.match_details.match_id,
      expectedVersion: data.expected_version,
      details,
    });

    await finalizeMahjongMatchStats({
      matchId: data.match_id,
      gameId: match.game_id,
      details,
      matchPlayers: match.match_players,
    });

    await safeSyncMahjongAchievements(data.match_id);

    revalidatePath(`/mahjong/play/${data.match_id}`);
    revalidatePath(`/mahjong/detail/${data.match_id}`);
    revalidatePath("/mahjong/matches");
    revalidatePath("/mahjong");
  });
}

// -----------------
// 3. 유국 처리 액션
// -----------------
export async function recordRyuukyoku(
    data: RecordRyuukyokuInput,
): Promise<MahjongActionResult> {
  assertGameEnabledForAction(MAHJONG_GAME_KEY);

  return runMahjongAction(async () => {
    const currentUser = await getCurrentMahjongManager();

    const mahjongGame = await db.games.findUnique({
      where: {
        key: MAHJONG_GAME_KEY,
      },
      select: {
        id: true,
      },
    });

    if (!mahjongGame) {
      throw new Error("리치마작 게임 정보를 찾을 수 없습니다.");
    }

    const match = await db.matches.findFirst({
      where: {
        id: data.match_id,
        game_id: mahjongGame.id,
      },
      include: {
        match_details: true,
        match_players: true,
      },
    });

    if (!match?.match_details) {
      throw new Error("Match not found");
    }

    assertCanManageMahjongMatch({
      currentUser,
      createdBy: match.created_by,
    });

    const details = normalizeDetails(match.match_details.details);

    assertLatestMahjongState({
      details,
      currentVersion: match.match_details.version,
      expected: data,
    });

    if (match.deleted_at) {
      throw new Error("삭제된 대국에는 기록을 추가할 수 없습니다.");
    }

    if (details.status !== "PLAYING") {
      throw new Error("진행 중인 대국에만 기록을 추가할 수 있습니다.");
    }

    applyMahjongRyuukyokuResult({
      details,
      data,
    });

    await updateMatchDetailsWithVersionGuard({
      matchId: match.match_details.match_id,
      expectedVersion: data.expected_version,
      details,
    });

    await finalizeMahjongMatchStats({
      matchId: data.match_id,
      gameId: match.game_id,
      details,
      matchPlayers: match.match_players,
    });

    await safeSyncMahjongAchievements(data.match_id);

    revalidatePath(`/mahjong/play/${data.match_id}`);
    revalidatePath(`/mahjong/detail/${data.match_id}`);
    revalidatePath("/mahjong/matches");
    revalidatePath("/mahjong");
  });
}

// -----------------
// 4. 촌보 처리 액션
// -----------------

export async function recordMahjongChombo(
    data: RecordMahjongChomboInput,
): Promise<MahjongActionResult> {
  assertGameEnabledForAction(MAHJONG_GAME_KEY);

  return runMahjongAction(async () => {
    const currentUser = await getCurrentMahjongManager();

    const mahjongGame = await db.games.findUnique({
      where: {
        key: MAHJONG_GAME_KEY,
      },
      select: {
        id: true,
      },
    });

    if (!mahjongGame) {
      throw new Error("리치마작 게임 정보를 찾을 수 없습니다.");
    }

    const match = await db.matches.findFirst({
      where: {
        id: data.match_id,
        game_id: mahjongGame.id,
      },
      include: {
        match_details: true,
        match_players: true,
      },
    });

    if (!match?.match_details) {
      throw new Error("Match not found");
    }

    assertCanManageMahjongMatch({
      currentUser,
      createdBy: match.created_by,
    });

    const details = normalizeDetails(match.match_details.details);

    assertLatestMahjongState({
      details,
      currentVersion: match.match_details.version,
      expected: data,
    });

    if (match.deleted_at) {
      throw new Error("삭제된 대국에는 기록을 추가할 수 없습니다.");
    }

    if (details.status !== "PLAYING") {
      throw new Error("진행 중인 대국에만 촌보를 기록할 수 있습니다.");
    }

    applyMahjongChomboResult({
      details,
      data,
    });

    await updateMatchDetailsWithVersionGuard({
      matchId: match.match_details.match_id,
      expectedVersion: data.expected_version,
      details,
    });

    /*
     * 촌보만으로 대국이 종료되지는 않으므로
     * finalizeMahjongMatchStats는 실질적으로 적용할 통계가 없다.
     *
     * 다만 현재 서비스가 PLAYING 상태에서도 안전하게 호출되도록
     * 구성되어 있으므로 다른 기록 액션과 흐름을 통일한다.
     */
    await finalizeMahjongMatchStats({
      matchId: data.match_id,
      gameId: match.game_id,
      details,
      matchPlayers: match.match_players,
    });

    await safeSyncMahjongAchievements(data.match_id);

    revalidatePath(`/mahjong/play/${data.match_id}`);
    revalidatePath(`/mahjong/detail/${data.match_id}`);
    revalidatePath("/mahjong/matches");
    revalidatePath("/mahjong");
  });
}

// -----------------
// 5. 대국 목록 조회 액션
// -----------------
export async function getMahjongMatches(filter: MahjongMatchListFilter = {}) {
  const currentUser = await getCurrentUserWithAdmin();

  return getMahjongMatchList({
    filter,
    currentUser,
  });
}

// -----------------
// 6. 대국 삭제 액션
// -----------------
export async function deleteMahjongMatch(matchId: number) {
  assertGameEnabledForAction(MAHJONG_GAME_KEY);

  const currentUser = await getCurrentMahjongManager();

  const target = await getMahjongMatchManageTarget(matchId);

  assertCanManageMahjongMatch({
    currentUser,
    createdBy: target.created_by,
  });

  await deleteMahjongMatchRecord({
    matchId,
    deletedBy: currentUser.id,
  });

  revalidatePath("/mahjong");
  revalidatePath("/mahjong/matches");
  revalidatePath(`/mahjong/play/${matchId}`);
  revalidatePath(`/mahjong/detail/${matchId}`);
  revalidatePath("/mahjong/achievements");
}

// -----------------
// 7. 마지막 기록 UNDO 액션
// -----------------
export async function undoMahjongLastLog(matchId: number) {
  assertGameEnabledForAction(MAHJONG_GAME_KEY);

  const currentUser = await getCurrentMahjongManager();

  const target = await getMahjongMatchManageTarget(matchId);

  assertCanManageMahjongMatch({
    currentUser,
    createdBy: target.created_by,
  });

  await undoMahjongLastLogRecord(matchId);

  revalidatePath("/mahjong");
  revalidatePath("/mahjong/matches");
  revalidatePath(`/mahjong/play/${matchId}`);
  revalidatePath(`/mahjong/detail/${matchId}`);
  revalidatePath("/mahjong/achievements");
}