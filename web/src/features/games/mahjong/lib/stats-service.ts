// web/src/features/games/mahjong/lib/stats-service.ts
// web/src/features/games/mahjong/lib/stats-service.ts

import type { Prisma } from "@prisma/client";

import { db } from "@/lib/prisma";

import { MAHJONG_GAME_KEY } from "../constants";
import type { MahjongDetails } from "../types";
import {
    normalizeDetails,
    toPrismaJson,
} from "./details";
import {
    collectPlayerMatchStats,
    getFinishedPlayerResults,
    getPlayerKeyFromMatchPlayer,
    getStatsModeKey,
    normalizeSpecificStats,
    recalculateModeRates,
} from "./stats";
import { syncMahjongAchievementsForUsers } from "./achievements";

type UserMahjongPlayerResult = ReturnType<
    typeof getFinishedPlayerResults
>[number] & {
    user_id: string;
};

type MahjongMatchWithDetailsForRecalc = {
    id: number;
    game_id: number;
    created_by: string | null;
    match_players: {
        id: number;
        user_id: string | null;
        guest_name: string | null;
    }[];
    match_details: {
        match_id: number;
        details: Prisma.JsonValue;
        version: number;
    } | null;
};

export async function finalizeMahjongMatchStats({
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
        (result): result is UserMahjongPlayerResult => result.user_id !== null,
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
                version: {
                    increment: 1,
                },
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

export async function recalculateAllMahjongStatsAndAchievements() {
    const mahjongGame = await db.games.findUnique({
        where: {
            key: MAHJONG_GAME_KEY,
        },
        select: {
            id: true,
        },
    });

    if (!mahjongGame) return;

    const matches = await db.matches.findMany({
        where: {
            game_id: mahjongGame.id,
        },
        include: {
            match_details: true,
            match_players: true,
        },
        orderBy: {
            id: "asc",
        },
    });

    const affectedUserIds = new Set<string>();

    matches.forEach((match) => {
        match.match_players.forEach((matchPlayer) => {
            if (matchPlayer.user_id) {
                affectedUserIds.add(matchPlayer.user_id);
            }
        });
    });

    await db.$transaction(async (tx) => {
        await tx.user_game_stats.deleteMany({
            where: {
                game_id: mahjongGame.id,
            },
        });

        await tx.match_players.updateMany({
            where: {
                matches: {
                    game_id: mahjongGame.id,
                },
            },
            data: {
                final_score: null,
                rank: null,
            },
        });

        for (const match of matches as MahjongMatchWithDetailsForRecalc[]) {
            if (!match.match_details) continue;

            const details = normalizeDetails(match.match_details.details);

            if (details.status !== "FINISHED") {
                continue;
            }

            const results = getFinishedPlayerResults({
                details,
                matchPlayers: match.match_players,
            });

            const modeKey = getStatsModeKey(details.game_mode);

            for (const result of results) {
                const matchPlayer = match.match_players.find(
                    (item) => getPlayerKeyFromMatchPlayer(item) === result.player_key,
                );

                if (matchPlayer) {
                    await tx.match_players.update({
                        where: {
                            id: matchPlayer.id,
                        },
                        data: {
                            final_score: result.final_score,
                            rank: result.rank,
                        },
                    });
                }

                if (!result.user_id) continue;

                const playerMatchStats = collectPlayerMatchStats({
                    details,
                    playerKey: result.player_key,
                });

                const existingStats = await tx.user_game_stats.findFirst({
                    where: {
                        user_id: result.user_id,
                        game_id: mahjongGame.id,
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
                            game_id: mahjongGame.id,
                            play_count: 1,
                            accumulated_score: result.final_score,
                            average_rank: result.rank,
                            mmr: 1500 + result.uma,
                            specific_stats: toPrismaJson(specificStats),
                        },
                    });
                }
            }

            details.stats_applied = true;

            await tx.match_details.update({
                where: {
                    match_id: match.id,
                },
                data: {
                    details: toPrismaJson(details),
                    version: {
                        increment: 1,
                    },
                },
            });
        }
    });

    await syncMahjongAchievementsForUsers(Array.from(affectedUserIds));
}