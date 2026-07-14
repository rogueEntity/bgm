// web/src/app/actions/tichu-stats.action.ts
"use server";

import { redirect } from "next/navigation";

import {
    getTichuEquippedBadgesByUserIds,
    type TichuEquippedBadgeItem,
} from "@/app/actions/tichu-achievement.action";
import { TICHU_GAME_KEY } from "@/features/games/tichu/constants";
import { createEmptyTichuStats } from "@/features/games/tichu/stats";
import type { TichuSpecificStats } from "@/features/games/tichu/types";
import { assertGameEnabledForAction } from "@/features/games/shared/enabled-games";
import { getAvatarImageUrl } from "@/lib/avatar";
import { getCurrentUserWithAdmin } from "@/lib/admin";
import { db } from "@/lib/prisma";

type JsonRecord = Record<string, unknown>;

export type TichuPlayerStatsItem = {
    userId: string;
    nickname: string;
    avatarEmoji: string | null;
    avatarImageUrl: string | null;
    equippedBadges: TichuEquippedBadgeItem[];

    mmr: number;
    playCount: number;
    winCount: number;
    lossCount: number;
    drawCount: number;
    winRate: number;

    roundCount: number;
    accumulatedScore: number;
    bestScoreDiff: number;
    worstScoreDiff: number;

    tichuCalls: number;
    tichuSuccesses: number;
    tichuFailures: number;
    tichuSuccessRate: number;

    grandTichuCalls: number;
    grandTichuSuccesses: number;
    grandTichuFailures: number;
    grandTichuSuccessRate: number;

    firstOutCount: number;
    oneTwoSuccessCount: number;
    oneTwoSufferedCount: number;
};

function isRecord(value: unknown): value is JsonRecord {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function toNumber(value: unknown): number {
    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {
        return value;
    }

    return 0;
}

function toRate(
    numerator: number,
    denominator: number,
): number {
    if (denominator <= 0) {
        return 0;
    }

    return numerator / denominator;
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
        tichu_successes: toNumber(
            rawStats.tichu_successes,
        ),
        tichu_failures: toNumber(
            rawStats.tichu_failures,
        ),

        grand_tichu_calls: toNumber(
            rawStats.grand_tichu_calls,
        ),
        grand_tichu_successes: toNumber(
            rawStats.grand_tichu_successes,
        ),
        grand_tichu_failures: toNumber(
            rawStats.grand_tichu_failures,
        ),

        first_out_count: toNumber(
            rawStats.first_out_count,
        ),

        one_two_success_count: toNumber(
            rawStats.one_two_success_count,
        ),
        one_two_suffered_count: toNumber(
            rawStats.one_two_suffered_count,
        ),

        total_score_diff: toNumber(
            rawStats.total_score_diff,
        ),
        best_score_diff: toNumber(
            rawStats.best_score_diff,
        ),
        worst_score_diff: toNumber(
            rawStats.worst_score_diff,
        ),
    };
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
        throw new Error(
            "티츄 게임 정보를 찾을 수 없습니다.",
        );
    }

    return game.id;
}

function createTichuPlayerStatsItem({
                                        user,
                                        mmr,
                                        stats,
                                        equippedBadges,
                                    }: {
    user: {
        id: string;
        nickname: string;
        avatar_emoji: string | null;
        avatar_image_key: string | null;
        avatar_image_updated_at: Date | null;
    };
    mmr: number;
    stats: TichuSpecificStats;
    equippedBadges: TichuEquippedBadgeItem[];
}): TichuPlayerStatsItem {
    return {
        userId: user.id,
        nickname: user.nickname,
        avatarEmoji: user.avatar_emoji,
        avatarImageUrl: getAvatarImageUrl(
            user.avatar_image_key,
            user.avatar_image_updated_at,
        ),
        equippedBadges,

        mmr,
        playCount: stats.play_count,
        winCount: stats.win_count,
        lossCount: stats.loss_count,
        drawCount: stats.draw_count,
        winRate: toRate(
            stats.win_count,
            stats.play_count,
        ),

        roundCount: stats.round_count,
        accumulatedScore: stats.total_score_diff,
        bestScoreDiff: stats.best_score_diff,
        worstScoreDiff: stats.worst_score_diff,

        tichuCalls: stats.tichu_calls,
        tichuSuccesses: stats.tichu_successes,
        tichuFailures: stats.tichu_failures,
        tichuSuccessRate: toRate(
            stats.tichu_successes,
            stats.tichu_calls,
        ),

        grandTichuCalls:
        stats.grand_tichu_calls,
        grandTichuSuccesses:
        stats.grand_tichu_successes,
        grandTichuFailures:
        stats.grand_tichu_failures,
        grandTichuSuccessRate: toRate(
            stats.grand_tichu_successes,
            stats.grand_tichu_calls,
        ),

        firstOutCount: stats.first_out_count,
        oneTwoSuccessCount:
        stats.one_two_success_count,
        oneTwoSufferedCount:
        stats.one_two_suffered_count,
    };
}

export async function getTichuPlayerStats(
    userId: string,
): Promise<TichuPlayerStatsItem | null> {
    assertGameEnabledForAction(TICHU_GAME_KEY);

    const currentUser =
        await getCurrentUserWithAdmin();

    if (!currentUser) {
        redirect("/login");
    }

    const gameId = await getTichuGameId();

    const [user, statRow] = await Promise.all([
        db.users.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
                nickname: true,
                avatar_emoji: true,
                avatar_image_key: true,
                avatar_image_updated_at: true,
            },
        }),
        db.user_game_stats.findUnique({
            where: {
                user_id_game_id: {
                    user_id: userId,
                    game_id: gameId,
                },
            },
            select: {
                mmr: true,
                specific_stats: true,
            },
        }),
    ]);

    if (!user) {
        return null;
    }

    const equippedBadgesByUserId =
        await getTichuEquippedBadgesByUserIds([
            userId,
        ]);

    const stats = parseTichuSpecificStats(
        statRow?.specific_stats,
    );

    return createTichuPlayerStatsItem({
        user,
        mmr: statRow?.mmr ?? 1500,
        stats,
        equippedBadges:
            equippedBadgesByUserId[userId] ?? [],
    });
}

export async function getMyTichuPlayerStats(): Promise<
    TichuPlayerStatsItem | null
> {
    assertGameEnabledForAction(TICHU_GAME_KEY);

    const currentUser =
        await getCurrentUserWithAdmin();

    if (!currentUser) {
        redirect("/login");
    }

    return getTichuPlayerStats(currentUser.id);
}

export async function getTichuRankingPlayers(): Promise<
    TichuPlayerStatsItem[]
> {
    assertGameEnabledForAction(TICHU_GAME_KEY);

    const currentUser = await getCurrentUserWithAdmin();

    if (!currentUser) {
        redirect("/login");
    }

    const gameId = await getTichuGameId();

    const statRows = await db.user_game_stats.findMany({
        where: {
            game_id: gameId,
        },
        select: {
            user_id: true,
            mmr: true,
            specific_stats: true,
            users: {
                select: {
                    id: true,
                    nickname: true,
                    avatar_emoji: true,
                    avatar_image_key: true,
                    avatar_image_updated_at: true,
                },
            },
        },
    });

    const userIds = statRows.map((row) => row.user_id);

    const equippedBadgesByUserId =
        await getTichuEquippedBadgesByUserIds(userIds);

    return statRows
        .map((row) => {
            const stats = parseTichuSpecificStats(row.specific_stats);

            return createTichuPlayerStatsItem({
                user: row.users,
                mmr: row.mmr,
                stats,
                equippedBadges:
                    equippedBadgesByUserId[row.user_id] ?? [],
            });
        })
        .filter((player) => player.playCount > 0);
}