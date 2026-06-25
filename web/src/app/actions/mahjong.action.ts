// web/src/app/actions/mahjong.action.ts

"use server";

import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { NORMAL_YAKU, SITUATIONAL_YAKU } from "@/constants/yaku";
import { calculateMahjongScore } from "@/lib/mahjong-score";

// --- 타입 ---

type GameMode = "동풍전" | "반장전" | "전장전";
type MahjongStatus = "PLAYING" | "FINISHED";

type MahjongPlayerState = {
  wind: "EAST" | "SOUTH" | "WEST" | "NORTH";
  score: number;
};

type MahjongDetails = {
  schema_version: number;
  current_round: string;
  honba: number;
  riichi_sticks: number;
  players: Record<string, MahjongPlayerState>;
  logs: Record<string, unknown>[];
  game_mode: GameMode;
  status: MahjongStatus;
  finish_reason?: "FORCE_FINISH" | "TOBI" | "NORMAL" | "MAX_ROUND_REACHED";
};

type MahjongWinInput = {
  winner_key: string;
  loser_key: string | null;
  base_score: number;
  han: number;
  fu?: number | null;
  dora_total: number;
  selected_yaku_ids: string[];
  limit_name?: string;
};

type RecordMahjongResultInput = {
  match_id: number;
  is_tsumo: boolean;
  wins: MahjongWinInput[];
  current_riichi_keys: string[];
  is_final: boolean;
};

type RecordRyuukyokuInput = {
  match_id: number;
  type: "황패유국" | "구종구패" | "사풍연타" | "사개깡" | "사가리치" | "삼가화";
  tenpai_keys: string[];
  current_riichi_keys: string[];
  is_final: boolean;
};

type MahjongScoreMap = Record<string, number>;

const ALL_YAKU = [...NORMAL_YAKU, ...SITUATIONAL_YAKU];

// --- 헬퍼 함수 ---

const ROUND_ORDER = [
  "EAST_1",
  "EAST_2",
  "EAST_3",
  "EAST_4",
  "SOUTH_1",
  "SOUTH_2",
  "SOUTH_3",
  "SOUTH_4",
  "WEST_1",
  "WEST_2",
  "WEST_3",
  "WEST_4",
  "NORTH_1",
  "NORTH_2",
  "NORTH_3",
  "NORTH_4",
];

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getNextWind(currentWind: string) {
  const map: Record<string, MahjongPlayerState["wind"]> = {
    EAST: "SOUTH",
    SOUTH: "WEST",
    WEST: "NORTH",
    NORTH: "EAST",
  };

  return map[currentWind] || "EAST";
}

function rotateWinds(players: Record<string, MahjongPlayerState>) {
  Object.keys(players).forEach((key) => {
    players[key].wind = getNextWind(players[key].wind);
  });
}

function getNextRound(currentRound: string) {
  const currentIdx = ROUND_ORDER.indexOf(currentRound);

  if (currentIdx !== -1 && currentIdx < ROUND_ORDER.length - 1) {
    return ROUND_ORDER[currentIdx + 1];
  }

  return null;
}

const WIND_TURN_ORDER = ["EAST", "SOUTH", "WEST", "NORTH"] as const;

function getWindTurnDistance(
  fromWind: string | undefined,
  toWind: string | undefined,
) {
  const fromIndex = WIND_TURN_ORDER.indexOf(fromWind as any);
  const toIndex = WIND_TURN_ORDER.indexOf(toWind as any);

  if (fromIndex === -1 || toIndex === -1) {
    return Number.POSITIVE_INFINITY;
  }

  const distance =
    (toIndex - fromIndex + WIND_TURN_ORDER.length) % WIND_TURN_ORDER.length;

  // 같은 바람은 본인이므로 론 화료자로 올 수 없음.
  // 혹시 데이터가 이상하면 가장 낮은 우선순위로 밀어냄.
  return distance === 0 ? Number.POSITIVE_INFINITY : distance;
}

function getRiichiStickReceiverKey({
  wins,
  players,
  is_tsumo,
}: {
  wins: { winner_key: string; loser_key: string | null }[];
  players: Record<string, MahjongPlayerState>;
  is_tsumo: boolean;
}) {
  if (wins.length === 0) {
    throw new Error("공탁금 수령자를 계산할 화료 정보가 없습니다.");
  }

  // 쯔모 또는 단일 론은 화료자가 그대로 공탁금 수령
  if (is_tsumo || wins.length === 1) {
    return wins[0].winner_key;
  }

  const loserKey = wins[0].loser_key;

  if (!loserKey) {
    throw new Error("더블 론의 공탁금 수령자 계산에는 방총자가 필요합니다.");
  }

  const loserWind = players[loserKey]?.wind;

  const sortedWins = [...wins].sort((a, b) => {
    const aDistance = getWindTurnDistance(
      loserWind,
      players[a.winner_key]?.wind,
    );
    const bDistance = getWindTurnDistance(
      loserWind,
      players[b.winner_key]?.wind,
    );

    return aDistance - bDistance;
  });

  return sortedWins[0].winner_key;
}

function normalizeLog(log: Record<string, unknown>) {
  if (log.type === "AGARI") {
    return {
      timestamp: log.timestamp,
      type: "AGARI",
      round: log.round,
      honba: log.honba,
      is_tsumo: Boolean(log.is_tsumo),
      riichi_keys: Array.isArray(log.riichi_keys) ? log.riichi_keys : [],
      wins: Array.isArray(log.wins) ? log.wins : [],
      score_deltas:
        typeof log.score_deltas === "object" && log.score_deltas !== null
          ? log.score_deltas
          : {},
      result_scores:
        typeof log.result_scores === "object" && log.result_scores !== null
          ? log.result_scores
          : {},
    };
  }

  if (log.type === "RYUUKYOKU") {
    return {
      timestamp: log.timestamp,
      type: "RYUUKYOKU",
      round: log.round,
      honba: log.honba,
      ryuukyoku_type: log.ryuukyoku_type,
      tenpai_keys: Array.isArray(log.tenpai_keys) ? log.tenpai_keys : [],
      riichi_keys: Array.isArray(log.riichi_keys) ? log.riichi_keys : [],
      score_deltas:
        typeof log.score_deltas === "object" && log.score_deltas !== null
          ? log.score_deltas
          : {},
      result_scores:
        typeof log.result_scores === "object" && log.result_scores !== null
          ? log.result_scores
          : {},
    };
  }

  return log;
}

function normalizeDetails(rawDetails: unknown): MahjongDetails {
  const details = rawDetails as Record<string, unknown>;
  const rawLogs = Array.isArray(details.logs) ? details.logs : [];

  return {
    schema_version: Number(details.schema_version ?? 1),
    current_round: String(details.current_round ?? "EAST_1"),
    honba: Number(details.honba ?? 0),
    riichi_sticks: Number(details.riichi_sticks ?? 0),
    players: (details.players ?? {}) as Record<string, MahjongPlayerState>,
    logs: rawLogs.map((log) => normalizeLog(log as Record<string, unknown>)),
    game_mode: (details.game_mode ?? "동풍전") as GameMode,
    status: (details.status ?? "PLAYING") as MahjongStatus,
    finish_reason: details.finish_reason as
      | MahjongDetails["finish_reason"]
      | undefined,
  };
}

function getModeLimitIdx(gameMode: GameMode) {
  if (gameMode === "동풍전") return 1;
  if (gameMode === "반장전") return 2;

  return 4;
}

function createEmptyScoreMap(players: Record<string, MahjongPlayerState>) {
  return Object.keys(players).reduce<MahjongScoreMap>((acc, key) => {
    acc[key] = 0;

    return acc;
  }, {});
}

function assertUniqueValues(values: string[], message: string) {
  if (new Set(values).size !== values.length) {
    throw new Error(message);
  }
}

function getYakumanCount(selectedYakuIds: string[]) {
  return selectedYakuIds.filter((id) => {
    const yaku = ALL_YAKU.find((item) => item.id === id);

    return yaku?.isYakuman;
  }).length;
}

function recalculateWins({
  wins,
  players,
  is_tsumo,
}: {
  wins: MahjongWinInput[];
  players: Record<string, MahjongPlayerState>;
  is_tsumo: boolean;
}) {
  return wins.map((win) => {
    const winner = players[win.winner_key];

    if (!winner) {
      throw new Error("존재하지 않는 화료자입니다.");
    }

    const yakumanCount = getYakumanCount(win.selected_yaku_ids);

    const calculatedScore = calculateMahjongScore({
      han: win.han,
      fu: win.fu ?? 30,
      isDealer: winner.wind === "EAST",
      isTsumo: is_tsumo,
      yakumanCount,
    });

    return {
      ...win,
      base_score: calculatedScore.totalScore,
      fu: yakumanCount > 0 ? null : win.fu,
      limit_name: calculatedScore.limitName,
    };
  });
}

// -----------------
// 1. 방 생성 액션
// -----------------

export async function createMahjongMatch(
  players: string[],
  startingScore: number,
  gameMode: GameMode,
) {
  const session = await auth();

  if (!session || !session.user) {
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

  const myUserUuid = me.id;
  const winds: MahjongPlayerState["wind"][] = ["EAST", "SOUTH", "WEST", "NORTH"];

  let game = await db.games.findFirst({
    where: {
      name: "리치마작",
    },
  });

  if (!game) {
    game = await db.games.create({
      data: {
        name: "리치마작",
        min_players: 4,
        max_players: 4,
      },
    });
  }

  const playerNames = players.map((player) => player.trim());

  const existingUsers = await db.users.findMany({
    where: {
      nickname: {
        in: playerNames,
      },
    },
  });

  const userMap = new Map(existingUsers.map((user) => [user.nickname, user.id]));

  const initialPlayersState: Record<string, MahjongPlayerState> = {};

  const matchPlayersData = playerNames.map((playerName, index) => {
    const foundUserId = userMap.get(playerName);
    const playerKey = foundUserId
      ? `user_${foundUserId}`
      : `guest_${playerName}`;

    initialPlayersState[playerKey] = {
      wind: winds[index],
      score: startingScore,
    };

    return {
      user_id: foundUserId ? foundUserId : null,
      guest_name: foundUserId ? null : playerName,
    };
  });

  const initialDetails: MahjongDetails = {
    schema_version: 2,
    current_round: "EAST_1",
    honba: 0,
    riichi_sticks: 0,
    players: initialPlayersState,
    logs: [],
    game_mode: gameMode,
    status: "PLAYING",
  };

  const newMatch = await db.matches.create({
    data: {
      game_id: game.id,
      created_by: myUserUuid,
      match_players: {
        create: matchPlayersData,
      },
      match_details: {
        create: {
          details: toPrismaJson(initialDetails),
        },
      },
    },
  });

  redirect(`/mahjong/play/${newMatch.id}`);
}

// -----------------
// 2. 점수 기록, 화료 액션
// -----------------

export async function recordMahjongResult(data: RecordMahjongResultInput) {
  const match = await db.matches.findUnique({
    where: {
      id: data.match_id,
    },
    include: {
      match_details: true,
    },
  });

  if (!match || !match.match_details) {
    throw new Error("Match not found");
  }

  const details = normalizeDetails(match.match_details.details);
  const players = details.players;
  const currentRound = details.current_round;
  const currentHonba = details.honba || 0;

  const wins = recalculateWins({
    wins: data.wins,
    players,
    is_tsumo: data.is_tsumo,
  });

  if (data.is_tsumo && wins.length !== 1) {
    throw new Error("쯔모 화료는 화료자가 1명이어야 합니다.");
  }

  if (!data.is_tsumo && (wins.length < 1 || wins.length > 2)) {
    throw new Error(
      "론 화료는 1명 또는 2명만 가능합니다.\n3명 론은 삼가화 유국으로 기록해주세요.",
    );
  }

  const winnerKeys = wins.map((win) => win.winner_key);

  assertUniqueValues(winnerKeys, "화료자가 중복되었습니다.");

  wins.forEach((win) => {
    if (!players[win.winner_key]) {
      throw new Error("존재하지 않는 화료자입니다.");
    }

    if (!data.is_tsumo) {
      if (!win.loser_key) {
        throw new Error("론 화료에는 방총자가 필요합니다.");
      }

      if (!players[win.loser_key]) {
        throw new Error("존재하지 않는 방총자입니다.");
      }

      if (win.winner_key === win.loser_key) {
        throw new Error("화료자와 방총자는 같을 수 없습니다.");
      }
    }
  });

  if (!data.is_tsumo && wins.length === 2) {
    const firstLoserKey = wins[0].loser_key;

    if (!firstLoserKey || wins.some((win) => win.loser_key !== firstLoserKey)) {
      throw new Error("더블 론의 방총자는 동일해야 합니다.");
    }
  }

  const initialScores: MahjongScoreMap = {};

  Object.keys(players).forEach((key) => {
    initialScores[key] = players[key].score;
  });

  // 이번 국 리치 선언 점수 차감
  data.current_riichi_keys.forEach((key) => {
    if (!players[key]) return;

    players[key].score -= 1000;
  });

  const totalRiichiSticks =
    (details.riichi_sticks || 0) + data.current_riichi_keys.length;

  const normalizedWins = wins.map((win) => ({
    ...win,
    score_deltas: createEmptyScoreMap(players),
  }));

  // 더블 론 공탁금은 방총자의 현재 바람 기준으로 가장 가까운 화료자가 수령
  const riichiStickReceiverKey = getRiichiStickReceiverKey({
    wins: normalizedWins,
    players,
    is_tsumo: data.is_tsumo,
  });

  normalizedWins.forEach((win) => {
    const winner = players[win.winner_key];
    const isWinnerOya = winner.wind === "EAST";
    let collected = 0;

    if (data.is_tsumo) {
      if (isWinnerOya) {
        const basePayment = Math.ceil(win.base_score / 3 / 100) * 100;

        Object.keys(players).forEach((key) => {
          if (key === win.winner_key) return;

          const payment = basePayment + currentHonba * 100;

          players[key].score -= payment;
          win.score_deltas[key] -= payment;
          collected += payment;
        });
      } else {
        const childBasePayment = Math.ceil(win.base_score / 4 / 100) * 100;
        const oyaBasePayment = win.base_score - childBasePayment * 2;

        Object.keys(players).forEach((key) => {
          if (key === win.winner_key) return;

          const payment =
            players[key].wind === "EAST"
              ? oyaBasePayment + currentHonba * 100
              : childBasePayment + currentHonba * 100;

          players[key].score -= payment;
          win.score_deltas[key] -= payment;
          collected += payment;
        });
      }
    } else {
      const loserKey = win.loser_key as string;
      const payment = win.base_score + currentHonba * 300;

      players[loserKey].score -= payment;
      win.score_deltas[loserKey] -= payment;
      collected += payment;
    }

    players[win.winner_key].score += collected;
    win.score_deltas[win.winner_key] += collected;
  });

  // 공탁금은 한 번만 지급
  if (totalRiichiSticks > 0) {
    const riichiStickPoint = totalRiichiSticks * 1000;

    players[riichiStickReceiverKey].score += riichiStickPoint;

    const receiverWin = normalizedWins.find(
      (win) => win.winner_key === riichiStickReceiverKey,
    );

    if (receiverWin) {
      receiverWin.score_deltas[riichiStickReceiverKey] += riichiStickPoint;
    }
  }

  details.riichi_sticks = 0;

  const scoreDeltas: MahjongScoreMap = {};
  const resultScores: MahjongScoreMap = {};

  Object.keys(players).forEach((key) => {
    scoreDeltas[key] = players[key].score - initialScores[key];
    resultScores[key] = players[key].score;
  });

  const topScore = Math.max(
    ...Object.values(players).map((player) => player.score),
  );

  const oyaWin = normalizedWins.find(
    (win) => players[win.winner_key].wind === "EAST",
  );

  const isOyaWin = Boolean(oyaWin);
  const mainWinnerKey = oyaWin?.winner_key ?? normalizedWins[0].winner_key;
  const winnerScore = players[mainWinnerKey].score;
  const isTobi = Object.values(players).some((player) => player.score <= 0);

  const [wind, roundStr] = details.current_round.split("_");
  const roundMap: Record<string, number> = {
    EAST: 1,
    SOUTH: 2,
    WEST: 3,
    NORTH: 4,
  };

  const currentWindIdx = roundMap[wind];
  const modeLimitIdx = getModeLimitIdx(details.game_mode);
  const roundNum = parseInt(roundStr, 10);
  const isAllLast = currentWindIdx === modeLimitIdx && roundNum === 4;
  const isExtraRound = currentWindIdx > modeLimitIdx;

  if (isTobi || data.is_final) {
    details.status = "FINISHED";

    if (data.is_final) {
      details.finish_reason = "FORCE_FINISH";
    } else if (isTobi) {
      details.finish_reason = "TOBI";
    }
  } else {
    if (isOyaWin) {
      details.honba = currentHonba + 1;

      if (
        (isAllLast || isExtraRound) &&
        winnerScore >= 30000 &&
        winnerScore === topScore
      ) {
        details.status = "FINISHED";
        details.finish_reason = "NORMAL";
      }
    } else {
      if ((isAllLast || isExtraRound) && topScore >= 30000) {
        details.status = "FINISHED";
        details.finish_reason = "NORMAL";
      } else {
        const absoluteLimitIdx =
          details.game_mode === "전장전" ? 4 : modeLimitIdx + 1;
        const isAbsoluteLast =
          currentWindIdx === absoluteLimitIdx && roundNum === 4;

        if (isAbsoluteLast) {
          details.status = "FINISHED";
          details.finish_reason = "MAX_ROUND_REACHED";
        } else {
          const nextRound = getNextRound(details.current_round);

          if (!nextRound) {
            details.status = "FINISHED";
            details.finish_reason = "MAX_ROUND_REACHED";
          } else {
            details.current_round = nextRound;
            details.honba = 0;
            rotateWinds(players);
          }
        }
      }
    }
  }

  if (details.status === "FINISHED") {
    details.current_round = currentRound;
    details.honba = currentHonba;
  }

  details.logs.push({
    timestamp: new Date().toISOString(),
    type: "AGARI",
    round: currentRound,
    honba: currentHonba,
    is_tsumo: data.is_tsumo,
    riichi_keys: data.current_riichi_keys,
    wins: normalizedWins,
    score_deltas: scoreDeltas,
    result_scores: resultScores,
  });

  await db.match_details.update({
    where: {
      match_id: match.match_details.match_id,
    },
    data: {
      details: toPrismaJson(details),
    },
  });

  revalidatePath(`/mahjong/play/${data.match_id}`);
  revalidatePath(`/mahjong/detail/${data.match_id}`);
  revalidatePath("/mahjong/matches");
}

// -----------------
// 3. 유국 처리 액션
// -----------------

export async function recordRyuukyoku(data: RecordRyuukyokuInput) {
  const match = await db.matches.findUnique({
    where: {
      id: data.match_id,
    },
    include: {
      match_details: true,
    },
  });

  if (!match || !match.match_details) {
    throw new Error("Match not found");
  }

  const details = normalizeDetails(match.match_details.details);
  const players = details.players;
  const isExhaustive = data.type === "황패유국";
  const currentRound = details.current_round;
  const currentHonba = details.honba || 0;

  const initialScores: MahjongScoreMap = {};

  Object.keys(players).forEach((key) => {
    initialScores[key] = players[key].score;
  });

  data.current_riichi_keys.forEach((key) => {
    if (players[key]) {
      players[key].score -= 1000;
    }
  });

  details.riichi_sticks =
    details.riichi_sticks + data.current_riichi_keys.length;

  let isOyaTenpai: boolean;

  if (isExhaustive) {
    const allKeys = Object.keys(players);
    const tenpaiCount = data.tenpai_keys.length;

    isOyaTenpai = data.tenpai_keys.some(
      (key) => players[key].wind === "EAST",
    );

    if (tenpaiCount > 0 && tenpaiCount < 4) {
      const reward = 3000 / tenpaiCount;
      const penalty = 3000 / (4 - tenpaiCount);

      allKeys.forEach((key) => {
        if (data.tenpai_keys.includes(key)) {
          players[key].score += reward;
        } else {
          players[key].score -= penalty;
        }
      });
    }
  } else {
    isOyaTenpai = true;
  }

  const scoreDeltas: MahjongScoreMap = {};
  const resultScores: MahjongScoreMap = {};

  Object.keys(players).forEach((key) => {
    scoreDeltas[key] = players[key].score - initialScores[key];
    resultScores[key] = players[key].score;
  });

  const oyaKey = Object.keys(players).find(
    (key) => players[key].wind === "EAST",
  ) as string;

  const oyaScore = players[oyaKey].score;
  const topScore = Math.max(
    ...Object.values(players).map((player) => player.score),
  );
  const isTobi = Object.values(players).some((player) => player.score <= 0);

  const [wind, roundStr] = details.current_round.split("_");
  const roundMap: Record<string, number> = {
    EAST: 1,
    SOUTH: 2,
    WEST: 3,
    NORTH: 4,
  };

  const currentWindIdx = roundMap[wind];
  const modeLimitIdx = getModeLimitIdx(details.game_mode);
  const roundNum = parseInt(roundStr, 10);
  const isAllLast = currentWindIdx === modeLimitIdx && roundNum === 4;
  const isExtraRound = currentWindIdx > modeLimitIdx;

  if (isTobi || data.is_final) {
    details.status = "FINISHED";

    if (data.is_final) {
      details.finish_reason = "FORCE_FINISH";
    } else if (isTobi) {
      details.finish_reason = "TOBI";
    }
  } else {
    details.honba = currentHonba + 1;

    if (isOyaTenpai) {
      if ((isAllLast || isExtraRound) && oyaScore >= 30000 && oyaScore === topScore) {
        details.status = "FINISHED";
        details.finish_reason = "NORMAL";
      }
    } else {
      if ((isAllLast || isExtraRound) && topScore >= 30000) {
        details.status = "FINISHED";
        details.finish_reason = "NORMAL";
      } else {
        const absoluteLimitIdx =
          details.game_mode === "전장전" ? 4 : modeLimitIdx + 1;
        const isAbsoluteLast =
          currentWindIdx === absoluteLimitIdx && roundNum === 4;

        if (isAbsoluteLast) {
          details.status = "FINISHED";
          details.finish_reason = "MAX_ROUND_REACHED";
        } else {
          const nextRound = getNextRound(details.current_round);

          if (!nextRound) {
            details.status = "FINISHED";
            details.finish_reason = "MAX_ROUND_REACHED";
          } else {
            details.current_round = nextRound;
            rotateWinds(players);
          }
        }
      }
    }
  }

  if (details.status === "FINISHED") {
    details.current_round = currentRound;
    details.honba = currentHonba;
  }

  details.logs.push({
    timestamp: new Date().toISOString(),
    type: "RYUUKYOKU",
    round: currentRound,
    honba: currentHonba,
    ryuukyoku_type: data.type,
    tenpai_keys: data.tenpai_keys,
    riichi_keys: data.current_riichi_keys,
    score_deltas: scoreDeltas,
    result_scores: resultScores,
  });

  await db.match_details.update({
    where: {
      match_id: match.match_details.match_id,
    },
    data: {
      details: toPrismaJson(details),
    },
  });

  revalidatePath(`/mahjong/play/${data.match_id}`);
  revalidatePath(`/mahjong/detail/${data.match_id}`);
  revalidatePath("/mahjong/matches");
}

export type MahjongMatchListFilter = {
  status?: "ALL" | "PLAYING" | "FINISHED";
  game_mode?: "ALL" | GameMode;
  keyword?: string;
  only_mine?: boolean;
  take?: number;
};

export type MahjongMatchListItem = {
  id: number;
  play_date: string | null;
  game_mode: GameMode;
  status: MahjongStatus;
  current_round: string;
  honba: number;
  riichi_sticks: number;
  finish_reason: MahjongDetails["finish_reason"] | null;
  players: {
    key: string;
    name: string;
    wind: MahjongPlayerState["wind"] | null;
    score: number | null;
    rank: number | null;
  }[];
};

export async function getMahjongMatches(
  filter: MahjongMatchListFilter = {},
): Promise<MahjongMatchListItem[]> {
  const status = filter.status ?? "ALL";
  const gameMode = filter.game_mode ?? "ALL";
  const keyword = filter.keyword?.trim().toLowerCase() ?? "";
  const onlyMine = filter.only_mine ?? false;
  const take = filter.take ?? 50;

  let myUserId: string | null = null;

  if (onlyMine) {
    const session = await auth();
    const providerId = session?.user?.id as string | undefined;

    if (!providerId) {
      return [];
    }

    const me = await db.users.findFirst({
      where: {
        provider_id: providerId,
      },
      select: {
        id: true,
      },
    });

    if (!me) {
      return [];
    }

    myUserId = me.id;
  }

  const mahjongGame = await db.games.findUnique({
    where: {
      name: "리치마작",
    },
    select: {
      id: true,
    },
  });

  if (!mahjongGame) {
    return [];
  }

  const matches = await db.matches.findMany({
    where: {
      game_id: mahjongGame.id,
      ...(myUserId
        ? {
            match_players: {
              some: {
                user_id: myUserId,
              },
            },
          }
        : {}),
    },
    include: {
      match_details: true,
      match_players: {
        include: {
          users: true,
        },
      },
    },
    orderBy: {
      play_date: "desc",
    },
    take: 100,
  });

  return matches
    .map((match): MahjongMatchListItem | null => {
      if (!match.match_details) {
        return null;
      }

      const details = normalizeDetails(match.match_details.details);
      const lastLog = details.logs.at(-1);
      const shouldShowLastCompletedRound = details.status === "FINISHED";
      const displayRound =
        shouldShowLastCompletedRound && typeof lastLog?.round === "string"
          ? lastLog.round
          : details.current_round;
      const displayHonba =
        shouldShowLastCompletedRound && typeof lastLog?.honba === "number"
          ? lastLog.honba
          : details.honba;

      const players = match.match_players.map((matchPlayer) => {
        const name =
          (matchPlayer.user_id
            ? matchPlayer.users?.nickname
            : matchPlayer.guest_name) ?? "이름 없음";
        const key = matchPlayer.user_id
          ? `user_${matchPlayer.user_id}`
          : `guest_${matchPlayer.guest_name}`;
        const playerState = details.players[key];

        return {
          key,
          name,
          wind: playerState?.wind ?? null,
          score: playerState?.score ?? matchPlayer.final_score ?? null,
          rank: matchPlayer.rank ?? null,
        };
      });

      return {
        id: match.id,
        play_date: match.play_date?.toISOString() ?? null,
        game_mode: details.game_mode,
        status: details.status,
        current_round: displayRound,
        honba: displayHonba,
        riichi_sticks: details.riichi_sticks,
        finish_reason: details.finish_reason ?? null,
        players,
      };
    })
    .filter((match): match is MahjongMatchListItem => {
      if (!match) {
        return false;
      }

      if (status !== "ALL" && match.status !== status) {
        return false;
      }

      if (gameMode !== "ALL" && match.game_mode !== gameMode) {
        return false;
      }

      if (keyword) {
        const matchIdText = String(match.id);
        const playerNames = match.players.map((player) =>
          player.name.toLowerCase(),
        );

        return (
          matchIdText.includes(keyword) ||
          playerNames.some((playerName) => playerName.includes(keyword))
        );
      }

      return true;
    })
    .slice(0, take);
}