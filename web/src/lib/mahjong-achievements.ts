// web/src/lib/mahjong-achievements.ts

import { MahjongAchievements } from "@/constants/mahjong-achievements";
import { db } from "@/lib/prisma";
import {
  createMahjongAchievementNewsEvent,
  syncMahjongNewsEventsForMatch,
} from "@/lib/mahjong-news";
import { MAHJONG_GAME_KEY } from "@/features/games/mahjong/constants";

const USER_PLAYER_KEY_PREFIX = "user_";
const GUEST_PLAYER_KEY_PREFIX = "guest_";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type MahjongPlayerState = {
  wind?: string;
  score?: number;
  name?: string;
};

type ScoreMap = Record<string, number>;

type MahjongWinLog = {
  winner_key?: string;
  loser_key?: string | null;
  base_score?: number;
  han?: number;
  fu?: number | null;
  dora_total?: number;
  selected_yaku_ids?: string[];
  score_deltas?: ScoreMap;
  yakuman_count?: number;
};

type MahjongRoundLog = {
  type?: "AGARI" | "RYUUKYOKU" | string;
  round?: string;
  honba?: number;

  is_tsumo?: boolean;
  wins?: MahjongWinLog[];

  winner_key?: string;
  loser_key?: string | null;
  base_score?: number;
  han?: number;
  fu?: number | null;
  dora_total?: number;
  selected_yaku_ids?: string[];
  score_deltas?: ScoreMap;

  tenpai_keys?: string[];

  riichi_keys?: string[];
  declared_riichi_keys?: string[];
  current_riichi_keys?: string[];

  ryuukyoku_type?: string;
  reason?: string;

  is_final?: boolean;
  forced_end?: boolean;
};

type MahjongDetails = {
  players?: Record<string, MahjongPlayerState>;
  logs?: MahjongRoundLog[];
  initial_score?: number;
  starting_score?: number;
  status?: "PLAYING" | "FINISHED" | "DELETED" | string;
};

type UserPlayerEntry = {
  playerKey: string;
  userId: string;
};

type MahjongUserAchievementStats = {
  completedMatchCount: number;
  firstPlaceCount: number;
  topTwoCount: number;
  nonLastPlaceCount: number;

  agariCount: number;
  ronAgariCount: number;
  tsumoAgariCount: number;

  manganOrHigherCount: number;
  hanemanOrHigherCount: number;
  baimanOrHigherCount: number;
  yakumanCount: number;

  noDealInMatchCount: number;
  dealInCount: number;
  participatedRoundCount: number;

  riichiDeclaredCount: number;
  doubleRiichiAgariCount: number;

  ryuukyokuTenpaiCount: number;
  ryuukyokuParticipationCount: number;
  specialRyuukyokuCount: number;
  forcedEndParticipationCount: number;

  finalScores: number[];

  comebackSurvivalCount: number;
  lastRoundRankUpCount: number;

  yakuAgariCounts: Record<string, number>;
  doraAgariCounts: number[];
};

export function isUserPlayerKey(
  playerKey: string | null | undefined
): playerKey is string {
  return (
    typeof playerKey === "string" &&
    playerKey.startsWith(USER_PLAYER_KEY_PREFIX)
  );
}

export function isGuestPlayerKey(
  playerKey: string | null | undefined
): playerKey is string {
  return (
    typeof playerKey === "string" &&
    playerKey.startsWith(GUEST_PLAYER_KEY_PREFIX)
  );
}

export function getUserIdFromPlayerKey(playerKey: string): string | null {
  if (!isUserPlayerKey(playerKey)) return null;

  const userId = playerKey.slice(USER_PLAYER_KEY_PREFIX.length).trim();

  return UUID_REGEX.test(userId) ? userId : null;
}

export function getUserPlayerEntries(
  players: Record<string, unknown> | null | undefined
): UserPlayerEntry[] {
  return Object.keys(players ?? {})
    .map((playerKey) => ({
      playerKey,
      userId: getUserIdFromPlayerKey(playerKey),
    }))
    .filter(
      (entry): entry is UserPlayerEntry =>
        typeof entry.userId === "string" && entry.userId.length > 0
    );
}

function createEmptyStats(): MahjongUserAchievementStats {
  return {
    completedMatchCount: 0,
    firstPlaceCount: 0,
    topTwoCount: 0,
    nonLastPlaceCount: 0,

    agariCount: 0,
    ronAgariCount: 0,
    tsumoAgariCount: 0,

    manganOrHigherCount: 0,
    hanemanOrHigherCount: 0,
    baimanOrHigherCount: 0,
    yakumanCount: 0,

    noDealInMatchCount: 0,
    dealInCount: 0,
    participatedRoundCount: 0,

    riichiDeclaredCount: 0,
    doubleRiichiAgariCount: 0,

    ryuukyokuTenpaiCount: 0,
    ryuukyokuParticipationCount: 0,
    specialRyuukyokuCount: 0,
    forcedEndParticipationCount: 0,

    finalScores: [],

    comebackSurvivalCount: 0,
    lastRoundRankUpCount: 0,

    yakuAgariCounts: {},
    doraAgariCounts: [],
  };
}

function ensureStats(
  statsByUserId: Map<string, MahjongUserAchievementStats>,
  userId: string
) {
  const current = statsByUserId.get(userId);

  if (current) return current;

  const next = createEmptyStats();
  statsByUserId.set(userId, next);
  return next;
}

function normalizeDetails(details: unknown): MahjongDetails {
  if (!details || typeof details !== "object") {
    return {};
  }

  return details as MahjongDetails;
}

function getLogs(details: MahjongDetails): MahjongRoundLog[] {
  return Array.isArray(details.logs) ? details.logs : [];
}

function getWins(log: MahjongRoundLog): MahjongWinLog[] {
  if (Array.isArray(log.wins) && log.wins.length > 0) {
    return log.wins;
  }

  if (log.type === "AGARI" && log.winner_key) {
    return [
      {
        winner_key: log.winner_key,
        loser_key: log.loser_key ?? null,
        base_score: log.base_score,
        han: log.han,
        fu: log.fu,
        dora_total: log.dora_total,
        selected_yaku_ids: log.selected_yaku_ids,
        score_deltas: log.score_deltas,
      },
    ];
  }

  return [];
}

function getLogScoreDeltas(log: MahjongRoundLog): ScoreMap {
  if (log.score_deltas && typeof log.score_deltas === "object") {
    return log.score_deltas;
  }

  const wins = getWins(log);

  return wins.reduce<ScoreMap>((acc, win) => {
    if (!win.score_deltas) return acc;

    for (const [playerKey, delta] of Object.entries(win.score_deltas)) {
      acc[playerKey] = (acc[playerKey] ?? 0) + delta;
    }

    return acc;
  }, {});
}

function getRiichiKeys(log: MahjongRoundLog): string[] {
  const keys = [
    ...(Array.isArray(log.riichi_keys) ? log.riichi_keys : []),
    ...(Array.isArray(log.declared_riichi_keys)
      ? log.declared_riichi_keys
      : []),
    ...(Array.isArray(log.current_riichi_keys)
      ? log.current_riichi_keys
      : []),
  ];

  return Array.from(new Set(keys));
}

function isNormalRyuukyoku(log: MahjongRoundLog) {
  const type = log.ryuukyoku_type;

  if (!type) return true;

  return type === "황패유국";
}

function isSpecialRyuukyoku(log: MahjongRoundLog) {
  if (log.type !== "RYUUKYOKU") return false;

  return !isNormalRyuukyoku(log);
}

function isForcedEndLog(log: MahjongRoundLog) {
  if (log.forced_end === true) return true;

  const reason = log.reason?.toUpperCase();
  const ryuukyokuType = log.ryuukyoku_type?.toUpperCase();

  return (
    reason === "FORCED_END" ||
    reason === "FORCE_END" ||
    ryuukyokuType === "FORCED_END" ||
    ryuukyokuType === "FORCE_END"
  );
}

function getInitialScore(details: MahjongDetails) {
  return details.initial_score ?? details.starting_score ?? 25000;
}

function getRankByScores(scores: Record<string, number>) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  return sorted.reduce<Record<string, number>>((acc, [playerKey], index) => {
    acc[playerKey] = index + 1;
    return acc;
  }, {});
}

function getBaseScore(win: MahjongWinLog) {
  return typeof win.base_score === "number" ? win.base_score : 0;
}

function isYakuman(win: MahjongWinLog) {
  if ((win.yakuman_count ?? 0) > 0) return true;

  const baseScore = getBaseScore(win);

  if (baseScore >= 8000) return true;

  const selectedYakuIds = win.selected_yaku_ids ?? [];

  return selectedYakuIds.some((yakuId) => yakuId.includes("yakuman"));
}

function isManganOrHigher(win: MahjongWinLog) {
  if (isYakuman(win)) return true;

  const baseScore = getBaseScore(win);

  if (baseScore >= 2000) return true;

  const han = win.han ?? 0;
  const fu = win.fu ?? 0;

  return han >= 5 || (han === 4 && fu >= 40) || (han === 3 && fu >= 70);
}

function isHanemanOrHigher(win: MahjongWinLog) {
  if (isYakuman(win)) return true;

  const baseScore = getBaseScore(win);

  if (baseScore >= 3000) return true;

  const han = win.han ?? 0;

  return han >= 6;
}

function isBaimanOrHigher(win: MahjongWinLog) {
  if (isYakuman(win)) return true;

  const baseScore = getBaseScore(win);

  if (baseScore >= 4000) return true;

  const han = win.han ?? 0;

  return han >= 8;
}

function addYakuCounts(
  stats: MahjongUserAchievementStats,
  selectedYakuIds: string[]
) {
  for (const yakuId of selectedYakuIds) {
    stats.yakuAgariCounts[yakuId] = (stats.yakuAgariCounts[yakuId] ?? 0) + 1;
  }
}

function getAchievementProgress(
  achievement: (typeof MahjongAchievements)[number],
  stats: MahjongUserAchievementStats
) {
  switch (achievement.conditionType) {
    case "MAHJONG_COMPLETED_MATCH_COUNT":
      return stats.completedMatchCount;

    case "MAHJONG_FIRST_PLACE_COUNT":
      return stats.firstPlaceCount;

    case "MAHJONG_TOP_TWO_COUNT":
      return stats.topTwoCount;

    case "MAHJONG_NON_LAST_PLACE_COUNT":
      return stats.nonLastPlaceCount;

    case "MAHJONG_AGARI_COUNT":
      return stats.agariCount;

    case "MAHJONG_RON_AGARI_COUNT":
      return stats.ronAgariCount;

    case "MAHJONG_TSUMO_AGARI_COUNT":
      return stats.tsumoAgariCount;

    case "MAHJONG_MANGAN_OR_HIGHER_COUNT":
      return stats.manganOrHigherCount;

    case "MAHJONG_HANEMAN_OR_HIGHER_COUNT":
      return stats.hanemanOrHigherCount;

    case "MAHJONG_BAIMAN_OR_HIGHER_COUNT":
      return stats.baimanOrHigherCount;

    case "MAHJONG_YAKUMAN_COUNT":
      return stats.yakumanCount;

    case "MAHJONG_NO_DEAL_IN_MATCH_COUNT":
      return stats.noDealInMatchCount;

    case "MAHJONG_LOW_DEAL_IN_RATE": {
      const minMatchCount = achievement.conditionValue?.minMatchCount ?? 0;
      const maxDealInRate = achievement.conditionValue?.maxDealInRate ?? 0;

      if (stats.completedMatchCount < minMatchCount) return 0;
      if (stats.participatedRoundCount <= 0) return 0;

      const dealInRate = stats.dealInCount / stats.participatedRoundCount;

      return dealInRate <= maxDealInRate ? 1 : 0;
    }

    case "MAHJONG_RIICHI_DECLARED_COUNT":
      return stats.riichiDeclaredCount;

    case "MAHJONG_DOUBLE_RIICHI_AGARI_COUNT":
      return stats.doubleRiichiAgariCount;

    case "MAHJONG_RYUUKYOKU_TENPAI_COUNT":
      return stats.ryuukyokuTenpaiCount;

    case "MAHJONG_SPECIFIC_YAKU_AGARI_COUNT": {
      const yakuIds = achievement.conditionValue?.yakuIds ?? [];

      return yakuIds.reduce(
        (sum, yakuId) => sum + (stats.yakuAgariCounts[yakuId] ?? 0),
        0
      );
    }

    case "MAHJONG_DORA_COUNT_AGARI": {
      const minDora = achievement.conditionValue?.minDora ?? 0;

      return stats.doraAgariCounts.filter((doraTotal) => doraTotal >= minDora)
        .length;
    }

    case "MAHJONG_RYUUKYOKU_PARTICIPATION_COUNT":
      return stats.ryuukyokuParticipationCount;

    case "MAHJONG_SPECIAL_RYUUKYOKU_COUNT":
      return stats.specialRyuukyokuCount;

    case "MAHJONG_FORCED_END_PARTICIPATION_COUNT":
      return stats.forcedEndParticipationCount;

    case "MAHJONG_FINAL_SCORE_AT_LEAST_COUNT": {
      const minScore = achievement.conditionValue?.minScore ?? 0;

      return stats.finalScores.filter((score) => score >= minScore).length;
    }

    case "MAHJONG_COMEBACK_SURVIVAL_COUNT":
      return stats.comebackSurvivalCount;

    case "MAHJONG_LAST_ROUND_RANK_UP_COUNT":
      return stats.lastRoundRankUpCount;

    default:
      return 0;
  }
}

function collectLogStats(params: {
  statsByUserId: Map<string, MahjongUserAchievementStats>;
  details: MahjongDetails;
}) {
  const { statsByUserId, details } = params;

  const players = details.players ?? {};
  const userPlayerEntries = getUserPlayerEntries(players);
  const logs = getLogs(details);

  const userIdByPlayerKey = new Map(
    userPlayerEntries.map((entry) => [entry.playerKey, entry.userId])
  );

  const dealInPlayerKeys = new Set<string>();

  const currentScores = Object.keys(players).reduce<Record<string, number>>(
    (acc, playerKey) => {
      acc[playerKey] = getInitialScore(details);
      return acc;
    },
    {}
  );

  const minScores = { ...currentScores };

  for (const log of logs) {
    const participantKeys = Object.keys(players);

    for (const playerKey of participantKeys) {
      const userId = userIdByPlayerKey.get(playerKey);

      if (!userId) continue;

      ensureStats(statsByUserId, userId).participatedRoundCount += 1;
    }

    const ranksBeforeLog = getRankByScores(currentScores);

    if (log.type === "AGARI") {
      const wins = getWins(log);
      const isTsumo = log.is_tsumo === true;

      for (const win of wins) {
        const winnerKey = win.winner_key;
        const loserKey = win.loser_key ?? null;

        if (winnerKey) {
          const winnerUserId = userIdByPlayerKey.get(winnerKey);

          if (winnerUserId) {
            const winnerStats = ensureStats(statsByUserId, winnerUserId);

            winnerStats.agariCount += 1;

            if (isTsumo || loserKey === null) {
              winnerStats.tsumoAgariCount += 1;
            } else {
              winnerStats.ronAgariCount += 1;
            }

            if (isManganOrHigher(win)) {
              winnerStats.manganOrHigherCount += 1;
            }

            if (isHanemanOrHigher(win)) {
              winnerStats.hanemanOrHigherCount += 1;
            }

            if (isBaimanOrHigher(win)) {
              winnerStats.baimanOrHigherCount += 1;
            }

            if (isYakuman(win)) {
              winnerStats.yakumanCount += 1;
            }

            const selectedYakuIds = win.selected_yaku_ids ?? [];

            addYakuCounts(winnerStats, selectedYakuIds);

            if (selectedYakuIds.includes("double_riichi")) {
              winnerStats.doubleRiichiAgariCount += 1;
            }

            winnerStats.doraAgariCounts.push(win.dora_total ?? 0);
          }
        }

        if (!isTsumo && loserKey) {
          const loserUserId = userIdByPlayerKey.get(loserKey);

          if (loserUserId) {
            ensureStats(statsByUserId, loserUserId).dealInCount += 1;
            dealInPlayerKeys.add(loserKey);
          }
        }
      }
    }

    if (log.type === "RYUUKYOKU") {
      const tenpaiKeys = Array.isArray(log.tenpai_keys) ? log.tenpai_keys : [];

      for (const playerKey of participantKeys) {
        const userId = userIdByPlayerKey.get(playerKey);

        if (!userId) continue;

        const stats = ensureStats(statsByUserId, userId);

        stats.ryuukyokuParticipationCount += 1;

        if (tenpaiKeys.includes(playerKey)) {
          stats.ryuukyokuTenpaiCount += 1;
        }

        if (isSpecialRyuukyoku(log)) {
          stats.specialRyuukyokuCount += 1;
        }

        if (isForcedEndLog(log)) {
          stats.forcedEndParticipationCount += 1;
        }
      }
    }

    for (const riichiPlayerKey of getRiichiKeys(log)) {
      const userId = userIdByPlayerKey.get(riichiPlayerKey);

      if (!userId) continue;

      ensureStats(statsByUserId, userId).riichiDeclaredCount += 1;
    }

    const scoreDeltas = getLogScoreDeltas(log);

    for (const [playerKey, delta] of Object.entries(scoreDeltas)) {
      currentScores[playerKey] = (currentScores[playerKey] ?? 0) + delta;
      minScores[playerKey] = Math.min(
        minScores[playerKey] ?? currentScores[playerKey],
        currentScores[playerKey]
      );
    }

    const ranksAfterLog = getRankByScores(currentScores);

    if (log.is_final === true) {
      for (const { playerKey, userId } of userPlayerEntries) {
        const beforeRank = ranksBeforeLog[playerKey];
        const afterRank = ranksAfterLog[playerKey];

        if (afterRank < beforeRank) {
          ensureStats(statsByUserId, userId).lastRoundRankUpCount += 1;
        }
      }
    }
  }

  const isFinishedMatch = details.status === "FINISHED";

  for (const { playerKey, userId } of userPlayerEntries) {
    const stats = ensureStats(statsByUserId, userId);

    if (isFinishedMatch && !dealInPlayerKeys.has(playerKey)) {
      stats.noDealInMatchCount += 1;
    }

    const minScore = minScores[playerKey];
    const finalRank = getRankByScores(currentScores)[playerKey];

    if (
      isFinishedMatch &&
      minScore < 10000 &&
      finalRank !== 4
    ) {
      stats.comebackSurvivalCount += 1;
    }
  }
}

function collectCompletedMatchStats(params: {
  statsByUserId: Map<string, MahjongUserAchievementStats>;
  matchPlayers: {
    user_id: string | null;
    final_score: number | null;
    rank: number | null;
  }[];
}) {
  const { statsByUserId, matchPlayers } = params;

  for (const matchPlayer of matchPlayers) {
    if (!matchPlayer.user_id) continue;
    if (matchPlayer.rank === null) continue;

    const stats = ensureStats(statsByUserId, matchPlayer.user_id);

    stats.completedMatchCount += 1;

    if (matchPlayer.rank === 1) {
      stats.firstPlaceCount += 1;
    }

    if (matchPlayer.rank <= 2) {
      stats.topTwoCount += 1;
    }

    if (matchPlayer.rank !== 4) {
      stats.nonLastPlaceCount += 1;
    }

    if (typeof matchPlayer.final_score === "number") {
      stats.finalScores.push(matchPlayer.final_score);
    }
  }
}

async function getMahjongGameId() {
  const game = await db.games.findUnique({
    where: {
      key: MAHJONG_GAME_KEY,
    },
    select: {
      id: true,
    },
  });

  if (!game) {
    throw new Error("리치마작 게임 정보를 찾을 수 없습니다.");
  }

  return game.id;
}

export async function syncMahjongAchievementsForUsers(userIds: string[]) {
  const uniqueUserIds = Array.from(
    new Set(userIds.filter((userId) => UUID_REGEX.test(userId)))
  );

  if (uniqueUserIds.length === 0) return;

  const mahjongGameId = await getMahjongGameId();

  const matches = await db.matches.findMany({
    where: {
      game_id: mahjongGameId,
      deleted_at: null,
      match_players: {
        some: {
          user_id: {
            in: uniqueUserIds,
          },
        },
      },
    },
    include: {
      match_players: {
        select: {
          user_id: true,
          final_score: true,
          rank: true,
        },
      },
      match_details: {
        select: {
          details: true,
        },
      },
    },
  });

  const statsByUserId = new Map<string, MahjongUserAchievementStats>();

  for (const userId of uniqueUserIds) {
    ensureStats(statsByUserId, userId);
  }

  for (const match of matches) {
    const details = normalizeDetails(match.match_details?.details);

    if (details.status === "DELETED") {
      continue;
    }

    if (details.status === "FINISHED") {
      collectCompletedMatchStats({
        statsByUserId,
        matchPlayers: match.match_players,
      });
    }

    collectLogStats({
      statsByUserId,
      details,
    });
  }

  const existingAchievements =
    await db.mahjong_user_achievements.findMany({
      where: {
        user_id: {
          in: uniqueUserIds,
        },
      },
      select: {
        user_id: true,
        achievement_id: true,
        completed: true,
        completed_at: true,
      },
    });

  const existingAchievementMap = new Map(
    existingAchievements.map((achievement) => [
      `${achievement.user_id}:${achievement.achievement_id}`,
      achievement,
    ])
  );

  for (const userId of uniqueUserIds) {
    const stats = ensureStats(statsByUserId, userId);
    const earnedBadgeIds = new Set<string>();

    for (const achievement of MahjongAchievements) {
      const progress = getAchievementProgress(achievement, stats);
      const completed = progress >= achievement.goal;

      const existingAchievement = existingAchievementMap.get(
          `${userId}:${achievement.id}`
      );

      const completedAt = completed
          ? existingAchievement?.completed_at ?? new Date()
          : null;

      await db.mahjong_user_achievements.upsert({
        where: {
          user_id_achievement_id: {
            user_id: userId,
            achievement_id: achievement.id,
          },
        },
        create: {
          user_id: userId,
          achievement_id: achievement.id,
          progress,
          completed,
          completed_at: completedAt,
        },
        update: {
          progress,
          completed,
          completed_at: completedAt,
        },
      });

      if (completed && existingAchievement?.completed !== true) {
        await createMahjongAchievementNewsEvent({
          userId,
          achievementId: achievement.id,
        });
      }

      if (completed) {
        earnedBadgeIds.add(achievement.badgeId);
      }
    }

    const earnedBadgeIdList = Array.from(earnedBadgeIds);

    await db.mahjong_user_badges.deleteMany({
      where: {
        user_id: userId,
        ...(earnedBadgeIdList.length > 0
            ? {
              badge_id: {
                notIn: earnedBadgeIdList,
              },
            }
            : {}),
      },
    });

    await db.mahjong_user_equipped_badges.deleteMany({
      where: {
        user_id: userId,
        ...(earnedBadgeIdList.length > 0
            ? {
              badge_id: {
                notIn: earnedBadgeIdList,
              },
            }
            : {}),
      },
    });

    await db.mahjong_user_equipped_badges.deleteMany({
      where: {
        user_id: userId,
        badge_id: {
          notIn: Array.from(earnedBadgeIds),
        },
      },
    });

    for (const badgeId of earnedBadgeIds) {
      await db.mahjong_user_badges.upsert({
        where: {
          user_id_badge_id: {
            user_id: userId,
            badge_id: badgeId,
          },
        },
        create: {
          user_id: userId,
          badge_id: badgeId,
        },
        update: {},
      });
    }
  }
}

export async function syncMahjongAchievementsForMatch(matchId: number) {
  const match = await db.matches.findUnique({
    where: {
      id: matchId,
    },
    include: {
      match_players: {
        select: {
          user_id: true,
        },
      },
      match_details: {
        select: {
          details: true,
        },
      },
    },
  });

  if (!match) return;

  const details = normalizeDetails(match.match_details?.details);

  if (match.deleted_at || details.status === "DELETED") {
    const userIdsFromMatchPlayers = match.match_players
        .map((player) => player.user_id)
        .filter((userId): userId is string => typeof userId === "string");

    await syncMahjongAchievementsForUsers(userIdsFromMatchPlayers);
    return;
  }

  const userIdsFromDetails = getUserPlayerEntries(details.players).map(
      (entry) => entry.userId
  );

  const userIdsFromMatchPlayers = match.match_players
    .map((player) => player.user_id)
    .filter((userId): userId is string => typeof userId === "string");

  await syncMahjongAchievementsForUsers([
    ...userIdsFromDetails,
    ...userIdsFromMatchPlayers,
  ]);

  await syncMahjongNewsEventsForMatch(matchId);
}