// web/src/app/actions/tichu.action.ts

"use server";

import { auth } from "@/auth";
import { db } from "@/lib/prisma";
import { getAvatarImageUrl } from "@/lib/avatar";
import { TICHU_GAME_KEY } from "@/features/games/tichu/constants";

type JsonRecord = Record<string, unknown>;

type TichuDetailsSnapshot = {
    status?: "PLAYING" | "FINISHED" | "DELETED" | string;
    current_round?: number;
    target_score?: number;
    teams?: {
        TEAM_A?: {
            name?: string;
            score?: number;
        };
        TEAM_B?: {
            name?: string;
            score?: number;
        };
    };
};

type TichuDashboardMe = {
    id: string;
    nickname: string;
    avatarEmoji: string | null;
    avatarImageUrl: string | null;
};

type TichuDashboardMatchPlayer = {
    id: string | null;
    nickname: string;
    avatarEmoji: string | null;
    avatarImageUrl: string | null;
};

type TichuDashboardMatch = {
    id: number;
    status: string;
    playDate: string | null;
    currentRound: number | null;
    teamAScore: number | null;
    teamBScore: number | null;
    players: TichuDashboardMatchPlayer[];
};

type TichuDashboardRankingItem = {
    rank: number;
    userId: string;
    nickname: string;
    avatarEmoji: string | null;
    avatarImageUrl: string | null;
    playCount: number;
};

export type TichuDashboardNewsItem = {
    id: number | string;
    title: string;
    createdAt: string | null;
};

export type TichuDashboardData = {
    me: TichuDashboardMe | null;
    activeMatch: TichuDashboardMatch | null;
    recentMatches: TichuDashboardMatch[];
    rankings: TichuDashboardRankingItem[];
    news: TichuDashboardNewsItem[];
};

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getTichuDetails(details: unknown): TichuDetailsSnapshot {
    if (!isRecord(details)) return {};

    return details as TichuDetailsSnapshot;
}

function getTichuStatus(details: unknown) {
    const parsedDetails = getTichuDetails(details);

    if (typeof parsedDetails.status === "string") {
        return parsedDetails.status;
    }

    return "UNKNOWN";
}

function toDateString(value: Date | string | null | undefined) {
    if (!value) return null;

    if (value instanceof Date) {
        return value.toISOString();
    }

    return value;
}

function toDashboardMe(user: {
    id: string;
    nickname: string;
    avatar_emoji: string | null;
    avatar_image_key: string | null;
    avatar_image_updated_at: Date | null;
}): TichuDashboardMe {
    return {
        id: user.id,
        nickname: user.nickname,
        avatarEmoji: user.avatar_emoji,
        avatarImageUrl: getAvatarImageUrl(
            user.avatar_image_key,
            user.avatar_image_updated_at,
        ),
    };
}

export async function getTichuDashboardData(): Promise<TichuDashboardData> {
    const session = await auth();
    const providerId = session?.user?.id as string | undefined;

    if (!providerId) {
        return {
            me: null,
            activeMatch: null,
            recentMatches: [],
            rankings: [],
            news: [],
        };
    }

    const me = await db.users.findFirst({
        where: {
            provider_id: providerId,
        },
        select: {
            id: true,
            nickname: true,
            avatar_emoji: true,
            avatar_image_key: true,
            avatar_image_updated_at: true,
        },
    });

    if (!me) {
        return {
            me: null,
            activeMatch: null,
            recentMatches: [],
            rankings: [],
            news: [],
        };
    }

    const game = await db.games.findUnique({
        where: {
            key: TICHU_GAME_KEY,
        },
        select: {
            id: true,
            name: true,
            key: true,
        },
    });

    if (!game) {
        return {
            me: toDashboardMe(me),
            activeMatch: null,
            recentMatches: [],
            rankings: [],
            news: [],
        };
    }

    const matches = await db.matches.findMany({
        where: {
            game_id: game.id,
            deleted_at: null,
            OR: [
                {
                    created_by: me.id,
                },
                {
                    match_players: {
                        some: {
                            user_id: me.id,
                        },
                    },
                },
            ],
        },
        include: {
            match_details: true,
            match_players: {
                include: {
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
            },
        },
        orderBy: {
            play_date: "desc",
        },
        take: 20,
    });

    const recentRawMatches = await db.matches.findMany({
        where: {
            game_id: game.id,
            deleted_at: null,
        },
        include: {
            match_details: true,
            match_players: {
                include: {
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
            },
        },
        orderBy: {
            play_date: "desc",
        },
        take: 5,
    });

    const toDashboardMatch = (
        match: (typeof recentRawMatches)[number],
    ): TichuDashboardMatch => {
        const details = getTichuDetails(match.match_details?.details);
        const teamAScore =
            typeof details.teams?.TEAM_A?.score === "number"
                ? details.teams.TEAM_A.score
                : null;
        const teamBScore =
            typeof details.teams?.TEAM_B?.score === "number"
                ? details.teams.TEAM_B.score
                : null;

        return {
            id: match.id,
            status: getTichuStatus(match.match_details?.details),
            playDate: toDateString(match.play_date),
            currentRound:
                typeof details.current_round === "number" ? details.current_round : null,
            teamAScore,
            teamBScore,
            players: match.match_players.map((player) => {
                return {
                    id: player.users?.id ?? null,
                    nickname: player.users?.nickname ?? player.guest_name ?? "게스트",
                    avatarEmoji: player.users?.avatar_emoji ?? null,
                    avatarImageUrl: getAvatarImageUrl(
                        player.users?.avatar_image_key ?? null,
                        player.users?.avatar_image_updated_at ?? null,
                    ),
                };
            }),
        };
    };

    const activeRawMatch =
        matches.find((match) => {
            return getTichuStatus(match.match_details?.details) === "PLAYING";
        }) ?? null;

    const rankings = await db.user_game_stats.findMany({
        where: {
            game_id: game.id,
        },
        include: {
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
        orderBy: [
            {
                play_count: "desc",
            },
        ],
        take: 5,
    });

    return {
        me: toDashboardMe(me),
        activeMatch: activeRawMatch ? toDashboardMatch(activeRawMatch) : null,
        recentMatches: recentRawMatches.map(toDashboardMatch),
        rankings: rankings.map((row, index) => {
            return {
                rank: index + 1,
                userId: row.user_id,
                nickname: row.users.nickname,
                avatarEmoji: row.users.avatar_emoji,
                avatarImageUrl: getAvatarImageUrl(
                    row.users.avatar_image_key,
                    row.users.avatar_image_updated_at,
                ),
                playCount: row.play_count,
            };
        }),
        news: [],
    };
}