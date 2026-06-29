// web/src/app/actions/mahjong.action.ts
"use server";

import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { NORMAL_YAKU, SITUATIONAL_YAKU } from "@/constants/yaku";
import { calculateMahjongScore } from "@/lib/mahjong-score";
import { syncMahjongAchievementsForMatch } from "@/lib/mahjong-achievements";

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
  stats_applied?: boolean;
};

type MahjongWinInput = {
  winner_key: string;
  loser_key: string | null;
  is_mengen?: boolean;
  fu?: number | null;
  dora_total: number;
  selected_yaku_ids: string[];
};

type RecalculatedMahjongWin = MahjongWinInput & {
  base_score: number;
  han: number;
  limit_name?: string;
  score_deltas?: MahjongScoreMap;
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
  type:
    | "황패유국"
    | "구종구패"
    | "사풍연타"
    | "사개깡"
    | "사가리치"
    | "삼가화"
    | "유국만관";
  tenpai_keys: string[];
  current_riichi_keys: string[];
  is_final: boolean;
  nagashi_mangan_winner_keys?: string[];
};

type MahjongScoreMap = Record<string, number>;

type MahjongStatsModeKey = "east" | "south" | "full";

type MahjongModeStats = {
  play_count: number;

  rank_counts: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
  };

  rank_rates: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
  };

  tobi_count: number;
  tobi_rate: number;

  total_agari_point: number;
  agari_count: number;
  average_agari_point: number;

  total_rank: number;
  average_rank: number;

  max_honba: number;

  round_count: number;
  agari_round_count: number;
  tsumo_agari_count: number;
  deal_in_count: number;

  // 전체 국 기준 리치
  riichi_count: number;

  // 화료 시 기준
  open_win_count: number;
  riichi_win_count: number;

  agari_rate: number;
  tsumo_rate: number;
  deal_in_rate: number;

  // 전체 국 기준 리치율
  riichi_rate: number;

  // 화료 시 기준
  open_win_rate: number;
  riichi_win_rate: number;
};

type MahjongSpecificStats = {
  schema_version: number;
  mahjong: {
    modes: Record<MahjongStatsModeKey, MahjongModeStats>;

    // 동풍/반장/전장 통합 역 완성 횟수
    yaku_counts: Record<string, number>;
  };
};

type RankedMahjongPlayerResult = {
  player_key: string;
  user_id: string | null;
  final_score: number;
  rank: number;
  is_tobi: boolean;
  uma: number;
};

type MahjongWinLogForStats = {
  winner_key?: string;
  loser_key?: string | null;
  base_score?: number;
  han?: number;
  fu?: number | null;
  dora_total?: number;
  selected_yaku_ids?: string[];
  is_mengen?: boolean;
};

type MahjongLogForStats = {
  type?: string;
  honba?: number;
  is_tsumo?: boolean;
  riichi_keys?: string[];
  wins?: MahjongWinLogForStats[];
};

type YakuHanValue =
  | number
  | {
      closed?: number;
      open?: number;
    };

type YakuLike = {
  id: string;
  name: string;
  han?: YakuHanValue;
  isYakuman?: boolean;
  yakumanMultiplier?: number;
};

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
    avatar_image_key: string | null;
    avatar_image_updated_at: Date | null;
    avatar_emoji: string | null;
  }[];
};

const ALL_YAKU = [...NORMAL_YAKU, ...SITUATIONAL_YAKU] as YakuLike[];

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

const WIND_TURN_ORDER = ["EAST", "SOUTH", "WEST", "NORTH"] as const;

const DEFAULT_RANK_UMA: Record<number, number> = {
  1: 30,
  2: 10,
  3: -10,
  4: -30,
};

const RIICHI_YAKU_IDS = new Set(["riichi", "double_riichi"]);
const RIICHI_YAKU_NAMES = new Set(["리치", "더블 리치", "더블리치"]);

const CHIITOITSU_YAKU_IDS = new Set([
  "chiitoitsu",
  "chitoitsu",
  "seven_pairs",
]);

const CHIITOITSU_YAKU_NAMES = new Set([
  "치또이쯔",
  "치토이츠",
  "칠대자",
]);

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
      nagashi_mangan_winner_keys: Array.isArray(log.nagashi_mangan_winner_keys)
        ? log.nagashi_mangan_winner_keys
        : [],
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
    stats_applied: Boolean(details.stats_applied),
  };
}

function getModeLimitIdx(gameMode: GameMode) {
  if (gameMode === "동풍전") return 1;
  if (gameMode === "반장전") return 2;
  return 4;
}

function getStatsModeKey(gameMode: GameMode): MahjongStatsModeKey {
  if (gameMode === "동풍전") return "east";
  if (gameMode === "반장전") return "south";
  return "full";
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
  return selectedYakuIds.reduce((sum, id) => {
    const yaku = ALL_YAKU.find((item) => item.id === id);

    if (!yaku?.isYakuman) {
      return sum;
    }

    return sum + (yaku.yakumanMultiplier ?? 1);
  }, 0);
}

function isChiitoitsuWin(selectedYakuIds: string[]) {
  return selectedYakuIds.some((yakuId) => {
    if (CHIITOITSU_YAKU_IDS.has(yakuId)) return true;

    const yaku = ALL_YAKU.find((item) => item.id === yakuId);
    return yaku ? CHIITOITSU_YAKU_NAMES.has(yaku.name) : false;
  });
}

function getYakuHan({
  yaku,
  isMengen,
}: {
  yaku: YakuLike;
  isMengen: boolean;
}) {
  if (yaku.isYakuman) return 0;

  const han = yaku.han;

  if (typeof han === "number") {
    return han;
  }

  if (han && typeof han === "object") {
    return isMengen ? han.closed ?? 0 : han.open ?? han.closed ?? 0;
  }

  return 0;
}

function getTotalHan({
  selectedYakuIds,
  doraTotal,
  isMengen,
}: {
  selectedYakuIds: string[];
  doraTotal: number;
  isMengen: boolean;
}) {
  const yakuHan = selectedYakuIds.reduce((sum, yakuId) => {
    const yaku = ALL_YAKU.find((item) => item.id === yakuId);

    if (!yaku) {
      return sum;
    }

    return sum + getYakuHan({ yaku, isMengen });
  }, 0);

  return yakuHan + doraTotal;
}

function recalculateWins({
  wins,
  players,
  is_tsumo,
}: {
  wins: MahjongWinInput[];
  players: Record<string, MahjongPlayerState>;
  is_tsumo: boolean;
}): RecalculatedMahjongWin[] {
  return wins.map((win) => {
    const winner = players[win.winner_key];

    if (!winner) {
      throw new Error("존재하지 않는 화료자입니다.");
    }

    const yakumanCount = getYakumanCount(win.selected_yaku_ids);
    const han = getTotalHan({
      selectedYakuIds: win.selected_yaku_ids,
      doraTotal: win.dora_total,
      isMengen: win.is_mengen !== false,
    });

    const effectiveFu =
      yakumanCount > 0
        ? null
        : isChiitoitsuWin(win.selected_yaku_ids)
          ? 25
          : win.fu ?? 30;

    const calculatedScore = calculateMahjongScore({
      han,
      fu: effectiveFu ?? 30,
      isDealer: winner.wind === "EAST",
      isTsumo: is_tsumo,
      yakumanCount,
    });

    return {
      ...win,
      base_score: calculatedScore.totalScore,
      han,
      fu: effectiveFu,
      limit_name: calculatedScore.limitName,
    };
  });
}

function createEmptyModeStats(): MahjongModeStats {
  return {
    play_count: 0,

    rank_counts: {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
    },

    rank_rates: {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
    },

    tobi_count: 0,
    tobi_rate: 0,

    total_agari_point: 0,
    agari_count: 0,
    average_agari_point: 0,

    total_rank: 0,
    average_rank: 0,

    max_honba: 0,

    round_count: 0,
    agari_round_count: 0,
    tsumo_agari_count: 0,
    deal_in_count: 0,

    riichi_count: 0,

    open_win_count: 0,
    riichi_win_count: 0,

    agari_rate: 0,
    tsumo_rate: 0,
    deal_in_rate: 0,

    riichi_rate: 0,

    open_win_rate: 0,
    riichi_win_rate: 0,
  };
}

function createEmptySpecificStats(): MahjongSpecificStats {
  return {
    schema_version: 1,
    mahjong: {
      modes: {
        east: createEmptyModeStats(),
        south: createEmptyModeStats(),
        full: createEmptyModeStats(),
      },
      yaku_counts: {},
    },
  };
}

function normalizeSpecificStats(rawStats: unknown): MahjongSpecificStats {
  const empty = createEmptySpecificStats();

  if (
    typeof rawStats !== "object" ||
    rawStats === null ||
    Array.isArray(rawStats)
  ) {
    return empty;
  }

  const stats = rawStats as Partial<MahjongSpecificStats>;
  const mahjong = stats.mahjong ?? empty.mahjong;

  return {
    schema_version: Number(stats.schema_version ?? 1),
    mahjong: {
      modes: {
        east: {
          ...createEmptyModeStats(),
          ...(mahjong.modes?.east ?? {}),
        },
        south: {
          ...createEmptyModeStats(),
          ...(mahjong.modes?.south ?? {}),
        },
        full: {
          ...createEmptyModeStats(),
          ...(mahjong.modes?.full ?? {}),
        },
      },
      yaku_counts: {
        ...(mahjong.yaku_counts ?? {}),
      },
    },
  };
}

function safeRate(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}

function recalculateModeRates(modeStats: MahjongModeStats) {
  modeStats.rank_rates["1"] = safeRate(
    modeStats.rank_counts["1"],
    modeStats.play_count,
  );
  modeStats.rank_rates["2"] = safeRate(
    modeStats.rank_counts["2"],
    modeStats.play_count,
  );
  modeStats.rank_rates["3"] = safeRate(
    modeStats.rank_counts["3"],
    modeStats.play_count,
  );
  modeStats.rank_rates["4"] = safeRate(
    modeStats.rank_counts["4"],
    modeStats.play_count,
  );

  modeStats.tobi_rate = safeRate(modeStats.tobi_count, modeStats.play_count);

  modeStats.average_agari_point = modeStats.agari_count
    ? Math.round(modeStats.total_agari_point / modeStats.agari_count)
    : 0;

  modeStats.average_rank = modeStats.play_count
    ? Number((modeStats.total_rank / modeStats.play_count).toFixed(2))
    : 0;

  modeStats.agari_rate = safeRate(
    modeStats.agari_round_count,
    modeStats.round_count,
  );

  modeStats.tsumo_rate = safeRate(
    modeStats.tsumo_agari_count,
    modeStats.agari_count,
  );

  modeStats.deal_in_rate = safeRate(
    modeStats.deal_in_count,
    modeStats.round_count,
  );

  modeStats.riichi_rate = safeRate(
    modeStats.riichi_count,
    modeStats.round_count,
  );

  modeStats.open_win_rate = safeRate(
    modeStats.open_win_count,
    modeStats.agari_count,
  );

  modeStats.riichi_win_rate = safeRate(
    modeStats.riichi_win_count,
    modeStats.agari_count,
  );
}

function isRiichiWin(selectedYakuIds: string[]) {
  return selectedYakuIds.some((yakuId) => {
    if (RIICHI_YAKU_IDS.has(yakuId)) return true;

    const yaku = ALL_YAKU.find((item) => item.id === yakuId);
    return yaku ? RIICHI_YAKU_NAMES.has(yaku.name) : false;
  });
}

function getPlayerKeyFromMatchPlayer(matchPlayer: {
  user_id: string | null;
  guest_name: string | null;
}) {
  return matchPlayer.user_id
    ? `user_${matchPlayer.user_id}`
    : `guest_${matchPlayer.guest_name}`;
}

function getFinishedPlayerResults({
  details,
  matchPlayers,
}: {
  details: MahjongDetails;
  matchPlayers: {
    id?: number;
    user_id: string | null;
    guest_name: string | null;
  }[];
}): RankedMahjongPlayerResult[] {
  const sortedMatchPlayers = [...matchPlayers].sort(
    (a, b) => (a.id ?? 0) - (b.id ?? 0),
  );

  const userKeyMap = new Map<string, string>();
  const startOrderMap = new Map<string, number>();

  sortedMatchPlayers.forEach((matchPlayer, index) => {
    const playerKey = getPlayerKeyFromMatchPlayer(matchPlayer);

    startOrderMap.set(playerKey, index);

    if (matchPlayer.user_id) {
      userKeyMap.set(playerKey, matchPlayer.user_id);
    }
  });

  const sortedPlayers = Object.entries(details.players)
    .map(([playerKey, player]) => ({
      player_key: playerKey,
      user_id: userKeyMap.get(playerKey) ?? null,
      final_score: player.score,
      start_order: startOrderMap.get(playerKey) ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => {
      if (b.final_score !== a.final_score) {
        return b.final_score - a.final_score;
      }

      // 동점이면 시작 바람 순: 동 → 남 → 서 → 북
      return a.start_order - b.start_order;
    });

  return sortedPlayers.map((player, index) => {
    const rank = index + 1;

    return {
      player_key: player.player_key,
      user_id: player.user_id,
      final_score: player.final_score,
      rank,
      is_tobi: player.final_score <= 0,
      uma: DEFAULT_RANK_UMA[rank] ?? 0,
    };
  });
}

// 도전과제 계산 중 오류가 나도 대국 기록 저장 자체가 실패하지 않도록 안전 호출 함수
async function safeSyncMahjongAchievements(matchId: number) {
  try {
    await syncMahjongAchievementsForMatch(matchId);
  } catch (error) {
    console.error("[Mahjong Achievements Sync Failed]", error);
  }
}

function collectPlayerMatchStats({
  details,
  playerKey,
}: {
  details: MahjongDetails;
  playerKey: string;
}) {
  const logs = details.logs as MahjongLogForStats[];

  const result = {
    round_count: logs.length,
    agari_round_count: 0,
    agari_count: 0,
    tsumo_agari_count: 0,
    deal_in_count: 0,
    riichi_count: 0,
    open_win_count: 0,
    riichi_win_count: 0,
    total_agari_point: 0,
    max_honba: 0,
    yaku_counts: {} as Record<string, number>,
  };

  logs.forEach((log) => {
    result.max_honba = Math.max(result.max_honba, Number(log.honba ?? 0));

    if (Array.isArray(log.riichi_keys) && log.riichi_keys.includes(playerKey)) {
      result.riichi_count += 1;
    }

    if (log.type !== "AGARI" || !Array.isArray(log.wins)) {
      return;
    }

    const playerWins = log.wins.filter((win) => win.winner_key === playerKey);

    if (playerWins.length > 0) {
      result.agari_round_count += 1;
    }

    playerWins.forEach((win) => {
      const selectedYakuIds = Array.isArray(win.selected_yaku_ids)
        ? win.selected_yaku_ids
        : [];

      result.agari_count += 1;
      result.total_agari_point += Number(win.base_score ?? 0);

      if (log.is_tsumo) {
        result.tsumo_agari_count += 1;
      }

      if (win.is_mengen === false) {
        result.open_win_count += 1;
      }

      if (isRiichiWin(selectedYakuIds)) {
        result.riichi_win_count += 1;
      }

      selectedYakuIds.forEach((yakuId) => {
        result.yaku_counts[yakuId] = (result.yaku_counts[yakuId] ?? 0) + 1;
      });
    });

    const dealtIn = log.wins.some(
      (win) => !log.is_tsumo && win.loser_key === playerKey,
    );

    if (dealtIn) {
      result.deal_in_count += 1;
    }
  });

  return result;
}

async function finalizeMahjongMatchStats({
  matchId,
  gameId,
  details,
  matchPlayers,
}: {
  matchId: number;
  gameId: number;
  details: MahjongDetails;
  matchPlayers: {
    id?: number;
    user_id: string | null;
    guest_name: string | null;
  }[];
}) {
  if (details.status !== "FINISHED") return;
  if (details.stats_applied) return;

  const modeKey = getStatsModeKey(details.game_mode);
  const results = getFinishedPlayerResults({ details, matchPlayers });
  const userResults = results.filter(
    (result): result is RankedMahjongPlayerResult & { user_id: string } =>
      result.user_id !== null,
  );

  await db.$transaction(async (tx) => {
    const latestMatchDetails = await tx.match_details.findUnique({
      where: {
        match_id: matchId,
      },
    });

    if (!latestMatchDetails) {
      throw new Error("Match details not found");
    }

    const latestDetails = normalizeDetails(latestMatchDetails.details);

    if (latestDetails.stats_applied) {
      return;
    }

    await Promise.all(
      userResults.map(async (result) => {
        const playerMatchStats = collectPlayerMatchStats({
          details,
          playerKey: result.player_key,
        });

        const existingStats = await tx.user_game_stats.findFirst({
          where: {
            user_id: result.user_id,
            game_id: gameId,
          },
        });

        const specificStats = normalizeSpecificStats(
          existingStats?.specific_stats,
        );
        const modeStats = specificStats.mahjong.modes[modeKey];

        modeStats.play_count += 1;
        modeStats.rank_counts[
          String(result.rank) as "1" | "2" | "3" | "4"
        ] += 1;
        modeStats.total_rank += result.rank;

        if (result.is_tobi) {
          modeStats.tobi_count += 1;
        }

        modeStats.round_count += playerMatchStats.round_count;
        modeStats.agari_round_count += playerMatchStats.agari_round_count;
        modeStats.agari_count += playerMatchStats.agari_count;
        modeStats.tsumo_agari_count += playerMatchStats.tsumo_agari_count;
        modeStats.deal_in_count += playerMatchStats.deal_in_count;
        modeStats.riichi_count += playerMatchStats.riichi_count;
        modeStats.open_win_count += playerMatchStats.open_win_count;
        modeStats.riichi_win_count += playerMatchStats.riichi_win_count;
        modeStats.total_agari_point += playerMatchStats.total_agari_point;
        modeStats.max_honba = Math.max(
          modeStats.max_honba,
          playerMatchStats.max_honba,
        );

        Object.entries(playerMatchStats.yaku_counts).forEach(
          ([yakuId, count]) => {
            specificStats.mahjong.yaku_counts[yakuId] =
              (specificStats.mahjong.yaku_counts[yakuId] ?? 0) + count;
          },
        );

        recalculateModeRates(modeStats);

        const previousPlayCount = existingStats?.play_count ?? 0;
        const nextPlayCount = previousPlayCount + 1;

        const nextAccumulatedScore =
          (existingStats?.accumulated_score ?? 0) + result.final_score;

        const previousAverageRank = existingStats?.average_rank ?? 0;
        const nextAverageRank = Number(
          (
            (previousAverageRank * previousPlayCount + result.rank) /
            nextPlayCount
          ).toFixed(2),
        );

        const nextMmr = (existingStats?.mmr ?? 1500) + result.uma;

        if (existingStats) {
          await tx.user_game_stats.update({
            where: {
              id: existingStats.id,
            },
            data: {
              play_count: nextPlayCount,
              accumulated_score: nextAccumulatedScore,
              average_rank: nextAverageRank,
              mmr: nextMmr,
              specific_stats: toPrismaJson(specificStats),
            },
          });
        } else {
          await tx.user_game_stats.create({
            data: {
              user_id: result.user_id,
              game_id: gameId,
              play_count: 1,
              accumulated_score: result.final_score,
              average_rank: result.rank,
              mmr: 1500 + result.uma,
              specific_stats: toPrismaJson(specificStats),
            },
          });
        }
      }),
    );

    await Promise.all(
      matchPlayers.map((matchPlayer) => {
        if (!matchPlayer.id) {
          return Promise.resolve();
        }

        const playerKey = getPlayerKeyFromMatchPlayer(matchPlayer);
        const result = results.find((item) => item.player_key === playerKey);

        if (!result) {
          return Promise.resolve();
        }

        return tx.match_players.update({
          where: {
            id: matchPlayer.id,
          },
          data: {
            final_score: result.final_score,
            rank: result.rank,
          },
        });
      }),
    );

    latestDetails.stats_applied = true;

    await tx.match_details.update({
      where: {
        match_id: matchId,
      },
      data: {
        details: toPrismaJson(latestDetails),
      },
    });

    await tx.matches.update({
      where: {
        id: matchId,
      },
      data: {
        play_date: new Date(),
      },
    });
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
    const playerKey = foundUserId ? `user_${foundUserId}` : `guest_${playerName}`;

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
    stats_applied: false,
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
      match_players: true,
    },
  });

  if (!match || !match.match_details) {
    throw new Error("Match not found");
  }

  const details = normalizeDetails(match.match_details.details);

  if (details.status === "FINISHED") {
    throw new Error("이미 종료된 대국에는 기록을 추가할 수 없습니다.");
  }

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
    is_final: details.status === "FINISHED",
    forced_end: details.finish_reason === "FORCE_FINISH",
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
      match_players: true,
    },
  });

  if (!match || !match.match_details) {
    throw new Error("Match not found");
  }

  const details = normalizeDetails(match.match_details.details);

  if (details.status === "FINISHED") {
    throw new Error("이미 종료된 대국에는 기록을 추가할 수 없습니다.");
  }

  const players = details.players;
  const isExhaustive = data.type === "황패유국";
  const isNagashiMangan = data.type === "유국만관";
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

  if (isNagashiMangan) {
    const winnerKeys = Array.from(
      new Set(data.nagashi_mangan_winner_keys ?? []),
    );

    if (winnerKeys.length === 0) {
      throw new Error("유국만관 대상자가 없습니다.");
    }

    winnerKeys.forEach((winnerKey) => {
      if (!players[winnerKey]) {
        throw new Error("유국만관 대상자가 올바르지 않습니다.");
      }
    });

    const allKeys = Object.keys(players);

    // 작혼 기준:
    // - 텐파이/노텐 벌점 없음
    // - 리치 공탁금 받지 않음
    // - 본장 점수 받지 않음
    // - 복수 유국만관은 다가화와 무관하게 각각 정산
    winnerKeys.forEach((winnerKey) => {
      const winner = players[winnerKey];
      const isWinnerOya = winner.wind === "EAST";
      let collected = 0;

      allKeys.forEach((payerKey) => {
        if (payerKey === winnerKey) return;

        const payment = isWinnerOya
          ? 4000
          : players[payerKey].wind === "EAST"
            ? 4000
            : 2000;

        players[payerKey].score -= payment;
        collected += payment;
      });

      players[winnerKey].score += collected;
    });

    // 작혼 기준:
    // 유국만관을 누가 했는지와 무관하게 친 텐파이 여부로 연장 판단.
    isOyaTenpai = data.tenpai_keys.some(
      (key) => players[key]?.wind === "EAST",
    );
  } else if (isExhaustive) {
    const allKeys = Object.keys(players);
    const tenpaiCount = data.tenpai_keys.length;

    isOyaTenpai = data.tenpai_keys.some((key) => players[key].wind === "EAST");

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
      if (
        (isAllLast || isExtraRound) &&
        oyaScore >= 30000 &&
        oyaScore === topScore
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

  const nagashiManganWinnerKeys = isNagashiMangan
    ? Array.from(new Set(data.nagashi_mangan_winner_keys ?? []))
    : [];

  details.logs.push({
    timestamp: new Date().toISOString(),
    type: "RYUUKYOKU",
    round: currentRound,
    honba: currentHonba,
    ryuukyoku_type: data.type,
    is_final: details.status === "FINISHED",
    forced_end: details.finish_reason === "FORCE_FINISH",
    tenpai_keys: isExhaustive || isNagashiMangan ? data.tenpai_keys : [],
    nagashi_mangan_winner_keys: nagashiManganWinnerKeys,
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
}

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
          avatar_image_key: matchPlayer.users?.avatar_image_key ?? null,
          avatar_image_updated_at: matchPlayer.users?.avatar_image_updated_at ?? null,
          avatar_emoji: matchPlayer.users?.avatar_emoji ?? null,
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