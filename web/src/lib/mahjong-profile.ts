// web/src/lib/mahjong-profile.ts
import "server-only";

import { db } from "@/lib/prisma";
import { NORMAL_YAKU, SITUATIONAL_YAKU } from "@/constants/yaku";

type GameMode = "동풍전" | "반장전" | "전장전";

type MahjongModeKey = "all" | "east" | "half" | "full";

type MahjongWinLog = {
    winner_key?: string;
    loser_key?: string | null;
    base_score?: number;
    han?: number;
    fu?: number | null;
    dora_total?: number;
    selected_yaku_ids?: string[];
    is_open?: boolean;
};

type MahjongRoundLog = {
    type?: string;
    is_tsumo?: boolean;
    wins?: MahjongWinLog[];
    riichi_declared_keys?: string[];
};

type MahjongDetails = {
    game_mode?: GameMode;
    logs?: MahjongRoundLog[];
};

type SpecificMahjongModeStats = {
    play_count?: number;
    rank_rates?: Record<string, number>;
    tobi_rate?: number;
    average_rank?: number;
    average_score?: number;
    max_honba?: number;
    agari_rate?: number;
    tsumo_rate?: number;
    deal_in_rate?: number;
    call_rate?: number;
    riichi_rate?: number;
    average_win_score?: number;
};

type SpecificMahjongStats = {
    mahjong?: {
        modes?: Partial<Record<MahjongModeKey, SpecificMahjongModeStats>>;
    };
    modes?: Partial<Record<MahjongModeKey, SpecificMahjongModeStats>>;
};

export type MahjongPlayerProfileData = {
    user: {
        id: string;
        nickname: string;
        avatarEmoji: string | null;
        avatarImageUrl: string | null;
    };
    equippedBadges: {
        id: string;
        name: string;
        display: string;
    }[];
    headline: string;
    mmr: number;
    totalScore: number;
    style: {
        attack: number;
        defense: number;
        speed: number;
        luck: number;
    };
    recentRanks: {
        matchId: number;
        rank: number;
        createdAt: string;
    }[];
    rankRates: {
        rank1: number;
        rank2: number;
        rank3: number;
        rank4: number;
        tobi: number;
    };
    winGraph: {
        riichiRate: number;
        callRate: number;
        damatenRate: number;
    };
    detailByMode: Record<MahjongModeKey, MahjongModeDetailStats>;
    yakuCounts: {
        yakuId: string;
        label: string;
        count: number;
    }[];
};

export type MahjongModeDetailStats = {
    totalGames: number;
    rank1Rate: number;
    rank2Rate: number;
    rank3Rate: number;
    rank4Rate: number;
    tobiRate: number;
    avgScore: number;
    avgRank: number;
    maxRenchan: number;
    agariRate: number;
    tsumoRate: number;
    dealInRate: number;
    callRate: number;
    riichiRate: number;
    avgWinScore: number;
};

const MODE_KEY_BY_GAME_MODE: Record<GameMode, Exclude<MahjongModeKey, "all">> = {
    동풍전: "east",
    반장전: "half",
    전장전: "full",
};

const EMPTY_MODE_STATS: MahjongModeDetailStats = {
    totalGames: 0,
    rank1Rate: 0,
    rank2Rate: 0,
    rank3Rate: 0,
    rank4Rate: 0,
    tobiRate: 0,
    avgScore: 0,
    avgRank: 0,
    maxRenchan: 0,
    agariRate: 0,
    tsumoRate: 0,
    dealInRate: 0,
    callRate: 0,
    riichiRate: 0,
    avgWinScore: 0,
};

const ALL_YAKU = [...NORMAL_YAKU, ...SITUATIONAL_YAKU];

const FALLBACK_BADGE_LABELS: Record<string, { name: string; display: string }> = {
    beginner: { name: "입문 작사", display: "🀄" },
    first_win: { name: "첫 승리", display: "1승" },
    riichi: { name: "리치러", display: "리치" },
    yakuman: { name: "역만", display: "역만" },
};

function toPercent(value: number | undefined | null) {
    if (!value) return 0;

    // 기존 stats가 0.2399 형태면 %로 변환, 이미 23.99 형태면 그대로 사용
    return value <= 1 ? value * 100 : value;
}

function toNumber(value: unknown, fallback = 0) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function getAvatarImageUrl(key: string | null) {
    if (!key) return null;

    const baseUrl = process.env.R2_PUBLIC_BASE_URL;

    if (!baseUrl) return null;

    return `${baseUrl.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}

function getSpecificStats(raw: unknown): SpecificMahjongStats {
    if (!raw || typeof raw !== "object") return {};

    return raw as SpecificMahjongStats;
}

function getModeStatsFromSpecificStats(
    specificStats: SpecificMahjongStats,
    mode: MahjongModeKey,
): MahjongModeDetailStats {
    const modeStats =
        specificStats.mahjong?.modes?.[mode] ??
        specificStats.modes?.[mode] ??
        undefined;

    if (!modeStats) return { ...EMPTY_MODE_STATS };

    const rankRates = modeStats.rank_rates ?? {};

    return {
        totalGames: toNumber(modeStats.play_count),
        rank1Rate: toPercent(rankRates["1"]),
        rank2Rate: toPercent(rankRates["2"]),
        rank3Rate: toPercent(rankRates["3"]),
        rank4Rate: toPercent(rankRates["4"]),
        tobiRate: toPercent(modeStats.tobi_rate),
        avgScore: toNumber(modeStats.average_score),
        avgRank: toNumber(modeStats.average_rank),
        maxRenchan: toNumber(modeStats.max_honba),
        agariRate: toPercent(modeStats.agari_rate),
        tsumoRate: toPercent(modeStats.tsumo_rate),
        dealInRate: toPercent(modeStats.deal_in_rate),
        callRate: toPercent(modeStats.call_rate),
        riichiRate: toPercent(modeStats.riichi_rate),
        avgWinScore: toNumber(modeStats.average_win_score),
    };
}

function getStyleScore(stats: MahjongModeDetailStats, extra: {
    ippatsuCount: number;
    doraAverage: number;
    rareYakuCount: number;
}) {
    const attack = clampScore(
        stats.agariRate * 1.8 +
        stats.avgWinScore / 150 +
        stats.rank1Rate * 0.8 +
        stats.riichiRate * 0.6,
    );

    const defense = clampScore(
        100 -
        stats.dealInRate * 2.6 -
        stats.rank4Rate * 0.9 -
        stats.tobiRate * 1.6,
    );

    const speed = clampScore(
        stats.callRate * 1.2 +
        stats.agariRate * 1.4 +
        stats.riichiRate * 0.2,
    );

    const luck = clampScore(
        stats.tsumoRate +
        extra.ippatsuCount * 1.5 +
        extra.doraAverage * 12 +
        extra.rareYakuCount * 3,
    );

    return {
        attack,
        defense,
        speed,
        luck,
    };
}

function getHeadline(stats: MahjongModeDetailStats, totalGames: number) {
    if (totalGames < 10) {
        return "아직 표본은 적지만, 앞으로의 성장세가 기대되는 작사입니다.";
    }

    if (stats.rank1Rate >= 32 && stats.agariRate >= 24) {
        return "높은 화료율과 1위율로 승부를 끌고 가는 공격형 작사입니다.";
    }

    if (stats.dealInRate <= 12 && stats.rank4Rate <= 20) {
        return "방총을 잘 억제하고 4위를 피하는 안정형 작사입니다.";
    }

    if (stats.riichiRate >= 25 && stats.callRate <= 25) {
        return "멘젠 중심의 리치 운영으로 압박을 거는 정통파 작사입니다.";
    }

    if (stats.callRate >= 35) {
        return "후로를 적극적으로 활용해 빠르게 국면을 가져가는 속공형 작사입니다.";
    }

    if (stats.agariRate >= 23 && stats.dealInRate >= 16) {
        return "공격력은 확실하지만, 방총 관리가 승률을 좌우하는 승부형 작사입니다.";
    }

    return "균형 잡힌 운영으로 꾸준히 순위를 쌓아가는 밸런스형 작사입니다.";
}

function getYakuLabelMap() {
    return new Map(ALL_YAKU.map((yaku) => [yaku.id, yaku.name]));
}

function isMahjongDetails(value: unknown): value is MahjongDetails {
    return !!value && typeof value === "object";
}

function getWinGraphFromLogs(logs: MahjongRoundLog[], userKeySet: Set<string>) {
    let agariCount = 0;
    let riichiAgariCount = 0;
    let openAgariCount = 0;

    for (const log of logs) {
        if (log.type !== "AGARI") continue;

        for (const win of log.wins ?? []) {
            if (!win.winner_key || !userKeySet.has(win.winner_key)) continue;

            agariCount += 1;

            const yakuIds = win.selected_yaku_ids ?? [];

            if (yakuIds.includes("riichi") || yakuIds.includes("double_riichi")) {
                riichiAgariCount += 1;
            }

            if (win.is_open) {
                openAgariCount += 1;
            }
        }
    }

    if (agariCount === 0) {
        return {
            riichiRate: 0,
            callRate: 0,
            damatenRate: 0,
        };
    }

    const riichiRate = (riichiAgariCount / agariCount) * 100;
    const callRate = (openAgariCount / agariCount) * 100;
    const damatenRate = Math.max(0, 100 - riichiRate - callRate);

    return {
        riichiRate,
        callRate,
        damatenRate,
    };
}

export async function getMahjongPlayerProfile(
    userId: string,
): Promise<MahjongPlayerProfileData | null> {
    const mahjongGame = await db.games.findFirst({
        where: {
            name: "리치마작",
        },
        select: {
            id: true,
        },
    });

    if (!mahjongGame) return null;

    const [user, stat, equippedBadges, matchPlayers] = await Promise.all([
        db.users.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
                nickname: true,
                avatar_emoji: true,
                avatar_image_key: true,
            },
        }),

        db.user_game_stats.findUnique({
            where: {
                user_id_game_id: {
                    user_id: userId,
                    game_id: mahjongGame.id,
                },
            },
            select: {
                mmr: true,
                accumulated_score: true,
                play_count: true,
                average_rank: true,
                specific_stats: true,
            },
        }),

        db.mahjong_user_equipped_badges.findMany({
            where: {
                user_id: userId,
            },
            orderBy: {
                slot: "asc",
            },
            select: {
                badge_id: true,
            },
        }),

        db.match_players.findMany({
            where: {
                user_id: userId,
                matches: {
                    game_id: mahjongGame.id,
                    deleted_at: null,
                },
            },
            orderBy: {
                matches: {
                    play_date: "desc",
                },
            },
            take: 100,
            select: {
                match_id: true,
                rank: true,
                user_id: true,
                guest_name: true,
                matches: {
                    select: {
                        play_date: true,
                        match_details: {
                            select: {
                                details: true,
                            },
                        },
                        match_players: {
                            select: {
                                user_id: true,
                                guest_name: true,
                            },
                        },
                    },
                },
            },
        }),
    ]);

    if (!user) return null;

    const specificStats = getSpecificStats(stat?.specific_stats);

    const detailByMode: Record<MahjongModeKey, MahjongModeDetailStats> = {
        all: getModeStatsFromSpecificStats(specificStats, "all"),
        east: getModeStatsFromSpecificStats(specificStats, "east"),
        half: getModeStatsFromSpecificStats(specificStats, "half"),
        full: getModeStatsFromSpecificStats(specificStats, "full"),
    };

    if (detailByMode.all.totalGames === 0 && stat?.play_count) {
        detailByMode.all.totalGames = stat.play_count;
        detailByMode.all.avgRank = stat.average_rank ?? 0;
    }

    const userKeySet = new Set<string>();
    const allLogs: MahjongRoundLog[] = [];
    const yakuCountMap = new Map<string, number>();

    let doraTotal = 0;
    let agariCount = 0;
    let ippatsuCount = 0;
    let rareYakuCount = 0;

    for (const matchPlayer of matchPlayers) {
        const players = matchPlayer.matches.match_players;

        for (const player of players) {
            if (player.user_id === userId) {
                userKeySet.add(player.user_id);
            }
        }

        const detailsRaw = matchPlayer.matches.match_details?.details;

        if (!isMahjongDetails(detailsRaw)) continue;

        const details = detailsRaw;
        const logs = Array.isArray(details.logs) ? details.logs : [];

        allLogs.push(...logs);

        for (const log of logs) {
            if (log.type !== "AGARI") continue;

            for (const win of log.wins ?? []) {
                if (!win.winner_key || !userKeySet.has(win.winner_key)) continue;

                agariCount += 1;
                doraTotal += toNumber(win.dora_total);

                for (const yakuId of win.selected_yaku_ids ?? []) {
                    yakuCountMap.set(yakuId, (yakuCountMap.get(yakuId) ?? 0) + 1);

                    if (yakuId === "ippatsu") {
                        ippatsuCount += 1;
                    }

                    if (
                        yakuId === "rinshan" ||
                        yakuId === "chankan" ||
                        yakuId === "haitei" ||
                        yakuId === "houtei"
                    ) {
                        rareYakuCount += 1;
                    }
                }
            }
        }

        const modeKey = details.game_mode
            ? MODE_KEY_BY_GAME_MODE[details.game_mode]
            : null;

        // mode별 상세는 현재 specific_stats 우선.
        // specific_stats가 비어있는 경우만 최소한 총 대국 수 보정.
        if (modeKey && detailByMode[modeKey].totalGames === 0) {
            detailByMode[modeKey].totalGames += 1;
        }
    }

    const yakuLabelMap = getYakuLabelMap();

    const yakuCounts = [...yakuCountMap.entries()]
        .map(([yakuId, count]) => ({
            yakuId,
            label: yakuLabelMap.get(yakuId) ?? yakuId,
            count,
        }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    const recentRanks = matchPlayers
        .filter((matchPlayer) => typeof matchPlayer.rank === "number")
        .slice(0, 10)
        .reverse()
        .map((matchPlayer) => ({
            matchId: matchPlayer.match_id,
            rank: matchPlayer.rank ?? 0,
            createdAt:
                matchPlayer.matches.play_date?.toISOString() ?? new Date().toISOString(),
        }));

    const winGraph = getWinGraphFromLogs(allLogs, userKeySet);

    const avgDora = agariCount > 0 ? doraTotal / agariCount : 0;

    const style = getStyleScore(detailByMode.all, {
        ippatsuCount,
        doraAverage: avgDora,
        rareYakuCount,
    });

    const equippedBadgeItems = equippedBadges.map((badge) => {
        const fallback = FALLBACK_BADGE_LABELS[badge.badge_id];

        return {
            id: badge.badge_id,
            name: fallback?.name ?? badge.badge_id,
            display: fallback?.display ?? badge.badge_id.slice(0, 2).toUpperCase(),
        };
    });

    return {
        user: {
            id: user.id,
            nickname: user.nickname,
            avatarEmoji: user.avatar_emoji,
            avatarImageUrl: getAvatarImageUrl(user.avatar_image_key),
        },
        equippedBadges: equippedBadgeItems,
        headline: getHeadline(detailByMode.all, detailByMode.all.totalGames),
        mmr: stat?.mmr ?? 1500,
        totalScore: stat?.accumulated_score ?? 0,
        style,
        recentRanks,
        rankRates: {
            rank1: detailByMode.all.rank1Rate,
            rank2: detailByMode.all.rank2Rate,
            rank3: detailByMode.all.rank3Rate,
            rank4: detailByMode.all.rank4Rate,
            tobi: detailByMode.all.tobiRate,
        },
        winGraph,
        detailByMode,
        yakuCounts,
    };
}