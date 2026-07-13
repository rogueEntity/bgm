// web/src/app/actions/tichu-achievement.action.ts
"use server";

import { revalidatePath } from "next/cache";

import { TICHU_GAME_KEY } from "@/features/games/tichu/constants";
import {
    TICHU_ACHIEVEMENT_MAP,
    TICHU_BADGE_MAP,
    TichuAchievementDefinitions,
    type TichuAchievement,
    type TichuBadge,
} from "@/features/games/tichu/constants/achievement-definitions";
import { createEmptyTichuStats } from "@/features/games/tichu/stats";
import type { TichuSpecificStats } from "@/features/games/tichu/types";
import { getCurrentUserWithAdmin } from "@/lib/admin";
import { db } from "@/lib/prisma";

const MAX_EQUIPPED_TICHU_BADGES = 3;

type JsonRecord = Record<string, unknown>;

export type TichuAchievementViewItem = TichuAchievement & {
    progress: number;
    completed: boolean;
    completedAt: Date | null;
    badge: TichuBadge | null;
    hasBadge: boolean;
};

export type TichuEquippedBadgeItem = TichuBadge & {
    slot: number;
};

async function getCurrentUserId(): Promise<string> {
    const currentUser = await getCurrentUserWithAdmin();

    if (!currentUser) {
        throw new Error("로그인이 필요합니다.");
    }

    return currentUser.id;
}

async function getTichuGameId(): Promise<number> {
    const game = await db.games.findUnique({
        where: {
            key: TICHU_GAME_KEY,
        },
        select: {
            id: true,
        },
    });

    if (!game) {
        throw new Error("티츄 게임 정보를 찾을 수 없습니다.");
    }

    return game.id;
}

function isRecord(value: unknown): value is JsonRecord {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function toNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    return 0;
}

function parseTichuSpecificStats(
    value: unknown,
): TichuSpecificStats {
    const emptyStats = createEmptyTichuStats();

    if (!isRecord(value) || !isRecord(value.tichu)) {
        return emptyStats;
    }

    const rawStats = value.tichu;

    return {
        play_count: toNumber(rawStats.play_count),
        win_count: toNumber(rawStats.win_count),
        loss_count: toNumber(rawStats.loss_count),
        draw_count: toNumber(rawStats.draw_count),
        round_count: toNumber(rawStats.round_count),

        tichu_calls: toNumber(rawStats.tichu_calls),
        tichu_successes: toNumber(rawStats.tichu_successes),
        tichu_failures: toNumber(rawStats.tichu_failures),

        grand_tichu_calls: toNumber(rawStats.grand_tichu_calls),
        grand_tichu_successes: toNumber(
            rawStats.grand_tichu_successes,
        ),
        grand_tichu_failures: toNumber(
            rawStats.grand_tichu_failures,
        ),

        first_out_count: toNumber(rawStats.first_out_count),

        one_two_success_count: toNumber(
            rawStats.one_two_success_count,
        ),
        one_two_suffered_count: toNumber(
            rawStats.one_two_suffered_count,
        ),

        total_score_diff: toNumber(rawStats.total_score_diff),
        best_score_diff: toNumber(rawStats.best_score_diff),
        worst_score_diff: toNumber(rawStats.worst_score_diff),
    };
}

function getTichuAchievementProgress(
    achievement: TichuAchievement,
    stats: TichuSpecificStats,
): number {
    switch (achievement.conditionType) {
        case "TICHU_COMPLETED_MATCH_COUNT":
            return stats.play_count;

        case "TICHU_WIN_COUNT":
            return stats.win_count;

        case "TICHU_BIG_WIN_COUNT": {
            const minScoreDiff =
                achievement.conditionValue?.minScoreDiff ?? 500;

            return stats.best_score_diff >= minScoreDiff
                ? achievement.goal
                : 0;
        }

        case "TICHU_DRAW_COUNT":
            return stats.draw_count;

        case "TICHU_CALL_COUNT":
            return stats.tichu_calls;

        case "TICHU_SUCCESS_COUNT":
            return stats.tichu_successes;

        case "TICHU_FAILURE_COUNT":
            return stats.tichu_failures;

        case "TICHU_SUCCESS_RATE": {
            const callCount = stats.tichu_calls;
            const successCount = stats.tichu_successes;

            const minCallCount =
                achievement.conditionValue?.minCallCount ?? 1;

            const minSuccessRate =
                achievement.conditionValue?.minSuccessRate ?? 0;

            if (callCount < minCallCount || callCount <= 0) {
                return 0;
            }

            const successRate = successCount / callCount;

            return successRate >= minSuccessRate
                ? achievement.goal
                : 0;
        }

        case "TICHU_GRAND_CALL_COUNT":
            return stats.grand_tichu_calls;

        case "TICHU_GRAND_SUCCESS_COUNT":
            return stats.grand_tichu_successes;

        case "TICHU_GRAND_FAILURE_COUNT":
            return stats.grand_tichu_failures;

        case "TICHU_FIRST_OUT_COUNT":
            return stats.first_out_count;

        case "TICHU_ROUND_COUNT":
            return stats.round_count;

        case "TICHU_ONE_TWO_SUCCESS_COUNT":
            return stats.one_two_success_count;

        case "TICHU_ONE_TWO_SUFFERED_COUNT":
            return stats.one_two_suffered_count;

        case "TICHU_TOTAL_SCORE_DIFF_AT_LEAST":
            return Math.max(0, stats.total_score_diff);

        case "TICHU_BEST_SCORE_DIFF_AT_LEAST":
            return Math.max(0, stats.best_score_diff);

        case "TICHU_WORST_SCORE_DIFF_AT_MOST": {
            const maxScoreDiff =
                achievement.conditionValue?.maxScoreDiff ?? -500;

            return stats.worst_score_diff <= maxScoreDiff
                ? achievement.goal
                : 0;
        }

        default:
            return 0;
    }
}

function isTichuAchievementCompleted(
    achievement: TichuAchievement,
    stats: TichuSpecificStats,
): boolean {
    return (
        getTichuAchievementProgress(achievement, stats) >=
        achievement.goal
    );
}

async function getTichuStatsByUserId(
    userId: string,
): Promise<TichuSpecificStats> {
    const gameId = await getTichuGameId();

    const stats = await db.user_game_stats.findUnique({
        where: {
            user_id_game_id: {
                user_id: userId,
                game_id: gameId,
            },
        },
        select: {
            specific_stats: true,
        },
    });

    return parseTichuSpecificStats(stats?.specific_stats);
}

async function syncTichuAchievementsForSingleUser(
    userId: string,
) {
    const stats = await getTichuStatsByUserId(userId);

    const existingAchievements =
        await db.tichu_user_achievements.findMany({
            where: {
                user_id: userId,
            },
            select: {
                achievement_id: true,
                completed: true,
                completed_at: true,
            },
        });

    const existingAchievementMap = new Map(
        existingAchievements.map((achievement) => [
            achievement.achievement_id,
            achievement,
        ]),
    );

    const completedAchievementIds: string[] = [];
    const completedBadgeIds: string[] = [];

    for (const achievement of TichuAchievementDefinitions) {
        const progress = getTichuAchievementProgress(
            achievement,
            stats,
        );

        const completed = progress >= achievement.goal;

        const existingAchievement = existingAchievementMap.get(
            achievement.id,
        );

        const completedAt = completed
            ? (existingAchievement?.completed_at ?? new Date())
            : null;

        await db.tichu_user_achievements.upsert({
            where: {
                user_id_achievement_id: {
                    user_id: userId,
                    achievement_id: achievement.id,
                },
            },
            update: {
                progress,
                completed,
                completed_at: completedAt,
            },
            create: {
                user_id: userId,
                achievement_id: achievement.id,
                progress,
                completed,
                completed_at: completedAt,
            },
        });

        if (completed) {
            completedAchievementIds.push(achievement.id);
            completedBadgeIds.push(achievement.badgeId);
        }
    }

    const uniqueCompletedBadgeIds = [
        ...new Set(completedBadgeIds),
    ];

    await db.tichu_user_badges.deleteMany({
        where: {
            user_id: userId,
            badge_id: {
                notIn: uniqueCompletedBadgeIds,
            },
        },
    });

    await db.tichu_user_equipped_badges.deleteMany({
        where: {
            user_id: userId,
            badge_id: {
                notIn: uniqueCompletedBadgeIds,
            },
        },
    });

    for (const badgeId of uniqueCompletedBadgeIds) {
        await db.tichu_user_badges.upsert({
            where: {
                user_id_badge_id: {
                    user_id: userId,
                    badge_id: badgeId,
                },
            },
            update: {},
            create: {
                user_id: userId,
                badge_id: badgeId,
            },
        });
    }

    return {
        userId,
        completedAchievementIds,
        completedBadgeIds: uniqueCompletedBadgeIds,
    };
}

export async function syncTichuAchievementsForUsers(
    userIds: string[],
) {
    const uniqueUserIds = [
        ...new Set(userIds.filter(Boolean)),
    ];

    if (uniqueUserIds.length === 0) {
        return {
            ok: true,
            syncedUserCount: 0,
        };
    }

    const results = [];

    for (const userId of uniqueUserIds) {
        results.push(
            await syncTichuAchievementsForSingleUser(userId),
        );
    }

    revalidatePath("/tichu");
    revalidatePath("/tichu/achievements");

    return {
        ok: true,
        syncedUserCount: uniqueUserIds.length,
        results,
    };
}

export async function syncTichuAchievementsForUser(
    userId: string,
) {
    return syncTichuAchievementsForUsers([userId]);
}

export async function syncTichuAchievementsForMatch(
    matchId: number,
) {
    const match = await db.matches.findUnique({
        where: {
            id: matchId,
        },
        select: {
            match_players: {
                select: {
                    user_id: true,
                },
            },
        },
    });

    if (!match) {
        return {
            ok: false,
            syncedUserCount: 0,
        };
    }

    const userIds = match.match_players
        .map((player) => player.user_id)
        .filter(
            (userId): userId is string => Boolean(userId),
        );

    return syncTichuAchievementsForUsers(userIds);
}

export async function getMyTichuAchievements() {
    const userId = await getCurrentUserId();
    const stats = await getTichuStatsByUserId(userId);

    const [userAchievements, userBadges, equippedBadges] =
        await Promise.all([
            db.tichu_user_achievements.findMany({
                where: {
                    user_id: userId,
                },
                select: {
                    achievement_id: true,
                    progress: true,
                    completed: true,
                    completed_at: true,
                },
            }),
            db.tichu_user_badges.findMany({
                where: {
                    user_id: userId,
                },
                select: {
                    badge_id: true,
                },
            }),
            db.tichu_user_equipped_badges.findMany({
                where: {
                    user_id: userId,
                },
                orderBy: {
                    slot: "asc",
                },
                select: {
                    badge_id: true,
                    slot: true,
                },
            }),
        ]);

    const achievementMap = new Map(
        userAchievements.map((achievement) => [
            achievement.achievement_id,
            achievement,
        ]),
    );

    const badgeIdSet = new Set(
        userBadges.map((badge) => badge.badge_id),
    );

    const achievements: TichuAchievementViewItem[] =
        TichuAchievementDefinitions.map((achievement) => {
            const savedAchievement = achievementMap.get(
                achievement.id,
            );

            const progress =
                savedAchievement?.progress ??
                getTichuAchievementProgress(achievement, stats);

            const completed =
                savedAchievement?.completed ??
                isTichuAchievementCompleted(achievement, stats);

            const completedAt =
                savedAchievement?.completed_at ?? null;

            const badge =
                TICHU_BADGE_MAP[achievement.badgeId] ?? null;

            return {
                ...achievement,
                progress,
                completed,
                completedAt,
                badge,
                hasBadge: badgeIdSet.has(achievement.badgeId),
            };
        });

    const badges = userBadges
        .map((badge) => TICHU_BADGE_MAP[badge.badge_id])
        .filter(
            (badge): badge is TichuBadge => Boolean(badge),
        );

    const equippedBadgeItems: TichuEquippedBadgeItem[] =
        equippedBadges
            .map((equippedBadge) => {
                const badge =
                    TICHU_BADGE_MAP[equippedBadge.badge_id];

                if (!badge) {
                    return null;
                }

                return {
                    ...badge,
                    slot: equippedBadge.slot,
                };
            })
            .filter(
                (
                    badge,
                ): badge is TichuEquippedBadgeItem =>
                    Boolean(badge),
            );

    return {
        achievements,
        badges,
        equippedBadges: equippedBadgeItems,
        equippedBadgeIds: equippedBadgeItems.map(
            (badge) => badge.id,
        ),
    };
}

export async function updateMyTichuEquippedBadges(
    badgeIds: string[],
) {
    const userId = await getCurrentUserId();

    const uniqueBadgeIds = [...new Set(badgeIds)]
        .filter((badgeId) =>
            Boolean(TICHU_BADGE_MAP[badgeId]),
        )
        .slice(0, MAX_EQUIPPED_TICHU_BADGES);

    const ownedBadges =
        await db.tichu_user_badges.findMany({
            where: {
                user_id: userId,
                badge_id: {
                    in: uniqueBadgeIds,
                },
            },
            select: {
                badge_id: true,
            },
        });

    const ownedBadgeIdSet = new Set(
        ownedBadges.map((badge) => badge.badge_id),
    );

    const nextBadgeIds = uniqueBadgeIds.filter(
        (badgeId) => ownedBadgeIdSet.has(badgeId),
    );

    await db.$transaction([
        db.tichu_user_equipped_badges.deleteMany({
            where: {
                user_id: userId,
            },
        }),
        ...nextBadgeIds.map((badgeId, index) =>
            db.tichu_user_equipped_badges.create({
                data: {
                    user_id: userId,
                    badge_id: badgeId,
                    slot: index + 1,
                },
            }),
        ),
    ]);

    revalidatePath("/tichu");
    revalidatePath("/tichu/achievements");

    return {
        ok: true,
        equippedBadgeIds: nextBadgeIds,
    };
}

export async function getTichuEquippedBadgesByUserIds(
    userIds: string[],
) {
    const uniqueUserIds = [
        ...new Set(userIds.filter(Boolean)),
    ];

    if (uniqueUserIds.length === 0) {
        return {} as Record<
            string,
            TichuEquippedBadgeItem[]
        >;
    }

    const equippedBadges =
        await db.tichu_user_equipped_badges.findMany({
            where: {
                user_id: {
                    in: uniqueUserIds,
                },
            },
            orderBy: [
                {
                    user_id: "asc",
                },
                {
                    slot: "asc",
                },
            ],
            select: {
                user_id: true,
                badge_id: true,
                slot: true,
            },
        });

    const result: Record<
        string,
        TichuEquippedBadgeItem[]
    > = {};

    for (const userId of uniqueUserIds) {
        result[userId] = [];
    }

    for (const equippedBadge of equippedBadges) {
        const badge =
            TICHU_BADGE_MAP[equippedBadge.badge_id];

        if (!badge) {
            continue;
        }

        result[equippedBadge.user_id].push({
            ...badge,
            slot: equippedBadge.slot,
        });
    }

    return result;
}

export async function getTichuOwnedBadgeIds(
    userId: string,
) {
    const badges =
        await db.tichu_user_badges.findMany({
            where: {
                user_id: userId,
            },
            select: {
                badge_id: true,
            },
        });

    return badges.map((badge) => badge.badge_id);
}

export async function getTichuAchievementDefinition(
    achievementId: string,
) {
    return TICHU_ACHIEVEMENT_MAP[achievementId] ?? null;
}