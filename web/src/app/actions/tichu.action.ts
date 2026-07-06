// web/src/app/actions/tichu.action.ts

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { db } from "@/lib/prisma";
import { getAvatarImageUrl } from "@/lib/avatar";
import { TICHU_GAME_KEY } from "@/features/games/tichu/constants";
import { assertGameEnabledForAction } from "@/features/games/shared/enabled-games";

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

type CreateTichuMatchInput = {
    teamAName: string;
    teamBName: string;
    playerNames: [string, string, string, string];
    targetScore: 500 | 1000;
};

const MAX_TICHU_PLAYER_NAME_LENGTH = 20;
const MAX_TICHU_TEAM_NAME_LENGTH = 20;

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

function normalizeTichuText(value: string) {
    return value.trim().replace(/\s+/g, " ");
}

function validateTichuPlayerNames(playerNames: string[]) {
    const normalizedNames = playerNames.map(normalizeTichuText);

    if (normalizedNames.length !== 4) {
        throw new Error("티츄 참가자는 4명이어야 합니다.");
    }

    if (normalizedNames.some((name) => name.length === 0)) {
        throw new Error("참가자 4명의 이름을 모두 입력해주세요.");
    }

    if (
        normalizedNames.some((name) => name.length > MAX_TICHU_PLAYER_NAME_LENGTH)
    ) {
        throw new Error(
            `참가자 이름은 ${MAX_TICHU_PLAYER_NAME_LENGTH}글자까지 입력할 수 있습니다.`,
        );
    }

    if (new Set(normalizedNames).size !== normalizedNames.length) {
        throw new Error("참가자 이름은 모두 달라야 합니다.");
    }

    return normalizedNames as [string, string, string, string];
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

export async function createTichuMatch(input: CreateTichuMatchInput) {
    assertGameEnabledForAction(TICHU_GAME_KEY);

    const session = await auth();

    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const providerId = session.user.id as string;

    const me = await db.users.findFirst({
        where: {
            provider_id: providerId,
        },
        select: {
            id: true,
        },
    });

    if (!me) {
        throw new Error("DB에서 로그인한 유저 정보를 찾을 수 없습니다.");
    }

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

    const playerNames = validateTichuPlayerNames(input.playerNames);

    const teamAName = normalizeTichuText(input.teamAName) || "A팀";
    const teamBName = normalizeTichuText(input.teamBName) || "B팀";

    if (
        teamAName.length > MAX_TICHU_TEAM_NAME_LENGTH ||
        teamBName.length > MAX_TICHU_TEAM_NAME_LENGTH
    ) {
        throw new Error(
            `팀 이름은 ${MAX_TICHU_TEAM_NAME_LENGTH}글자까지 입력할 수 있습니다.`,
        );
    }

    if (![500, 1000].includes(input.targetScore)) {
        throw new Error("목표 점수는 500점 또는 1000점만 선택할 수 있습니다.");
    }

    const existingUsers = await db.users.findMany({
        where: {
            nickname: {
                in: playerNames,
            },
        },
        select: {
            id: true,
            nickname: true,
        },
    });

    const userMap = new Map(existingUsers.map((user) => [user.nickname, user.id]));

    const playerKeys = playerNames.map((playerName) => {
        const foundUserId = userMap.get(playerName);

        return foundUserId ? `user_${foundUserId}` : `guest_${playerName}`;
    }) as [string, string, string, string];

    const details = {
        schema_version: 1,
        game_key: TICHU_GAME_KEY,
        status: "PLAYING",
        current_round: 1,
        target_score: input.targetScore,
        teams: {
            TEAM_A: {
                name: teamAName,
                score: 0,
                player_keys: [playerKeys[0], playerKeys[2]],
            },
            TEAM_B: {
                name: teamBName,
                score: 0,
                player_keys: [playerKeys[1], playerKeys[3]],
            },
        },
        players: {
            [playerKeys[0]]: {
                name: playerNames[0],
                team_key: "TEAM_A",
                seat_order: 1,
            },
            [playerKeys[1]]: {
                name: playerNames[1],
                team_key: "TEAM_B",
                seat_order: 2,
            },
            [playerKeys[2]]: {
                name: playerNames[2],
                team_key: "TEAM_A",
                seat_order: 3,
            },
            [playerKeys[3]]: {
                name: playerNames[3],
                team_key: "TEAM_B",
                seat_order: 4,
            },
        },
        logs: [],
        stats_applied: false,
    };

    const newMatch = await db.$transaction(async (tx) => {
        const match = await tx.matches.create({
            data: {
                game_id: game.id,
                created_by: me.id,
                play_date: new Date(),
                match_details: {
                    create: {
                        details: details as Prisma.InputJsonValue,
                    },
                },
            },
            select: {
                id: true,
            },
        });

        await tx.match_players.createMany({
            data: playerNames.map((playerName) => {
                const foundUserId = userMap.get(playerName);

                return {
                    match_id: match.id,
                    user_id: foundUserId ?? null,
                    guest_name: foundUserId ? null : playerName,
                };
            }),
        });

        return match;
    });

    revalidatePath("/tichu");
    revalidatePath("/tichu/matches");

    redirect(`/tichu/play/${newMatch.id}`);
}