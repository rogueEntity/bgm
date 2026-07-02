// web/src/features/games/mahjong/lib/stats.ts
import { NORMAL_YAKU, SITUATIONAL_YAKU } from "../constants/yaku";

import type {
    GameMode,
    MahjongDetails,
    MahjongLogForStats,
    MahjongModeStats,
    MahjongSpecificStats,
    MahjongStatsModeKey,
    RankedMahjongPlayerResult,
    YakuLike,
} from "../types";

const ALL_YAKU = [...NORMAL_YAKU, ...SITUATIONAL_YAKU] as YakuLike[];

const DEFAULT_RANK_UMA: Record<number, number> = {
    1: 30,
    2: 10,
    3: -10,
    4: -30,
};

const RIICHI_YAKU_IDS = new Set(["riichi", "double_riichi"]);
const RIICHI_YAKU_NAMES = new Set(["리치", "더블 리치", "더블리치"]);

export function getStatsModeKey(gameMode: GameMode): MahjongStatsModeKey {
    if (gameMode === "동풍전") return "east";
    if (gameMode === "반장전") return "half";
    return "full";
}

export function createEmptyModeStats(): MahjongModeStats {
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

export function createEmptySpecificStats(): MahjongSpecificStats {
    return {
        schema_version: 1,
        mahjong: {
            modes: {
                east: createEmptyModeStats(),
                half: createEmptyModeStats(),
                full: createEmptyModeStats(),
            },
            yaku_counts: {},
        },
    };
}

export function normalizeSpecificStats(rawStats: unknown): MahjongSpecificStats {
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
                    ...mahjong.modes?.east,
                },
                half: {
                    ...createEmptyModeStats(),
                    ...mahjong.modes?.half,
                },
                full: {
                    ...createEmptyModeStats(),
                    ...mahjong.modes?.full,
                },
            },
            yaku_counts: {
                ...mahjong.yaku_counts,
            },
        },
    };
}

export function safeRate(numerator: number, denominator: number) {
    if (denominator <= 0) return 0;
    return Number((numerator / denominator).toFixed(4));
}

export function recalculateModeRates(modeStats: MahjongModeStats) {
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

export function isRiichiWin(selectedYakuIds: string[]) {
    return selectedYakuIds.some((yakuId) => {
        if (RIICHI_YAKU_IDS.has(yakuId)) return true;

        const yaku = ALL_YAKU.find((item) => item.id === yakuId);
        return yaku ? RIICHI_YAKU_NAMES.has(yaku.name) : false;
    });
}

export function getPlayerKeyFromMatchPlayer(matchPlayer: {
    user_id: string | null;
    guest_name: string | null;
}) {
    return matchPlayer.user_id
        ? `user_${matchPlayer.user_id}`
        : `guest_${matchPlayer.guest_name}`;
}

export function getFinishedPlayerResults({
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

export function collectPlayerMatchStats({
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