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

type TichuTeamKey = "TEAM_A" | "TEAM_B";
type TichuDeclarationResult = "NONE" | "SUCCESS" | "FAIL";
type TichuStatus = "PLAYING" | "FINISHED" | "DELETED" | string;

type TichuDetailsSnapshot = {
    status?: TichuStatus;
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

type RecordTichuRoundInput = {
    matchId: number;
    expectedVersion: number;
    teamACardScore: number | null;
    teamBCardScore: number | null;
    oneTwoTeamKey: TichuTeamKey | null;
    calledTichuPlayerKey: string | null;
    tichuResult: TichuDeclarationResult;
    calledGrandTichuPlayerKey: string | null;
    grandTichuResult: TichuDeclarationResult;
};

type TichuPlayerState = {
    name: string;
    team_key: TichuTeamKey;
    seat_order: number;
};

type TichuTeamState = {
    name: string;
    score: number;
    player_keys: string[];
};

type TichuRoundLog = {
    round: number;
    team_a_card_score: number | null;
    team_b_card_score: number | null;
    called_tichu_player_key: string | null;
    called_grand_tichu_player_key: string | null;
    successful_tichu_player_keys: string[];
    failed_tichu_player_keys: string[];
    successful_grand_tichu_player_keys: string[];
    failed_grand_tichu_player_keys: string[];
    one_two_team_key: TichuTeamKey | null;
    score_deltas: Record<TichuTeamKey, number>;
    total_scores: Record<TichuTeamKey, number>;
    created_at: string;
};

type RawTichuPlayerState = {
    name?: string;
    team_key?: TichuTeamKey;
    seat_order?: number;
};

type RawTichuTeamState = {
    name?: string;
    score?: number;
    player_keys?: string[];
};

type RawTichuRecordDetails = {
    schema_version?: number;
    game_key?: string;
    status?: TichuStatus;
    current_round?: number;
    target_score?: number;
    winner_team_key?: TichuTeamKey | null;
    finished_at?: string | null;
    teams?: Record<TichuTeamKey, RawTichuTeamState>;
    players?: Record<string, RawTichuPlayerState>;
    logs?: TichuRoundLog[];
    stats_applied?: boolean;
};

type NormalizedTichuRecordDetails = {
    schema_version: number;
    game_key: string;
    status: TichuStatus;
    current_round: number;
    target_score: number;
    winner_team_key: TichuTeamKey | null;
    finished_at: string | null;
    teams: Record<TichuTeamKey, TichuTeamState>;
    players: Record<string, TichuPlayerState>;
    logs: TichuRoundLog[];
    stats_applied: boolean;
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

function assertTichuTeamKey(value: unknown): asserts value is TichuTeamKey {
    if (value !== "TEAM_A" && value !== "TEAM_B") {
        throw new Error("잘못된 팀 정보입니다.");
    }
}

function getOppositeTichuTeamKey(teamKey: TichuTeamKey): TichuTeamKey {
    return teamKey === "TEAM_A" ? "TEAM_B" : "TEAM_A";
}

function normalizeTichuPlayers(
    players: Record<string, RawTichuPlayerState> | undefined,
): Record<string, TichuPlayerState> {
    if (!players || Object.keys(players).length !== 4) {
        throw new Error("티츄 참가자 정보를 찾을 수 없습니다.");
    }

    return Object.fromEntries(
        Object.entries(players).map(([playerKey, player]) => {
            assertTichuTeamKey(player.team_key);

            return [
                playerKey,
                {
                    name: player.name ?? "이름 없음",
                    team_key: player.team_key,
                    seat_order: player.seat_order ?? 0,
                },
            ];
        }),
    );
}

function normalizeTichuRecordDetails(
    details: unknown,
): NormalizedTichuRecordDetails {
    if (!isRecord(details)) {
        throw new Error("티츄 기록 정보를 읽을 수 없습니다.");
    }

    const parsedDetails = details as RawTichuRecordDetails;

    if (!parsedDetails.teams?.TEAM_A || !parsedDetails.teams?.TEAM_B) {
        throw new Error("티츄 팀 정보를 찾을 수 없습니다.");
    }

    const teamAPlayerKeys = parsedDetails.teams.TEAM_A.player_keys ?? [];
    const teamBPlayerKeys = parsedDetails.teams.TEAM_B.player_keys ?? [];

    return {
        schema_version: parsedDetails.schema_version ?? 1,
        game_key: parsedDetails.game_key ?? TICHU_GAME_KEY,
        status: parsedDetails.status ?? "PLAYING",
        current_round: parsedDetails.current_round ?? 1,
        target_score: parsedDetails.target_score ?? 1000,
        winner_team_key: parsedDetails.winner_team_key ?? null,
        finished_at: parsedDetails.finished_at ?? null,
        teams: {
            TEAM_A: {
                name: parsedDetails.teams.TEAM_A.name ?? "A팀",
                score: parsedDetails.teams.TEAM_A.score ?? 0,
                player_keys: teamAPlayerKeys,
            },
            TEAM_B: {
                name: parsedDetails.teams.TEAM_B.name ?? "B팀",
                score: parsedDetails.teams.TEAM_B.score ?? 0,
                player_keys: teamBPlayerKeys,
            },
        },
        players: normalizeTichuPlayers(parsedDetails.players),
        logs: Array.isArray(parsedDetails.logs) ? parsedDetails.logs : [],
        stats_applied: parsedDetails.stats_applied ?? false,
    };
}

function getTichuPlayerTeamKey(
    details: NormalizedTichuRecordDetails,
    playerKey: string | null,
): TichuTeamKey | null {
    if (!playerKey) return null;

    const teamKey = details.players[playerKey]?.team_key;

    if (!teamKey) {
        throw new Error("선언한 플레이어 정보를 찾을 수 없습니다.");
    }

    assertTichuTeamKey(teamKey);

    return teamKey;
}

function validateTichuCardScore(value: number | null, label: string) {
    if (value === null) {
        throw new Error(`${label} 카드 점수를 입력해주세요.`);
    }

    if (!Number.isInteger(value)) {
        throw new Error(`${label} 카드 점수는 정수로 입력해주세요.`);
    }

    if (value % 5 !== 0) {
        throw new Error(`${label} 카드 점수는 5점 단위로 입력해주세요.`);
    }

    if (value < -25 || value > 125) {
        throw new Error(`${label} 카드 점수는 -25점부터 125점 사이로 입력해주세요.`);
    }
}

function validateTichuDeclaration(
    playerKey: string | null,
    result: TichuDeclarationResult,
    label: string,
) {
    if (!playerKey && result !== "NONE") {
        throw new Error(`${label} 선언자를 선택해주세요.`);
    }

    if (playerKey && result === "NONE") {
        throw new Error(`${label} 성공/실패를 선택해주세요.`);
    }
}

function applyTichuDeclarationScore(params: {
    details: NormalizedTichuRecordDetails;
    playerKey: string | null;
    result: TichuDeclarationResult;
    successBonus: number;
    failPenalty: number;
    scoreDeltas: Record<TichuTeamKey, number>;
}) {
    const { details, playerKey, result, successBonus, failPenalty, scoreDeltas } =
        params;

    if (!playerKey || result === "NONE") return;

    const teamKey = getTichuPlayerTeamKey(details, playerKey);

    if (!teamKey) {
        throw new Error("선언한 플레이어의 팀 정보를 찾을 수 없습니다.");
    }

    if (result === "SUCCESS") {
        scoreDeltas[teamKey] += successBonus;
        return;
    }

    scoreDeltas[teamKey] -= failPenalty;
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

export async function recordTichuRound(
    input: RecordTichuRoundInput,
): Promise<void> {
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

    const match = await db.matches.findFirst({
        where: {
            id: input.matchId,
            game_id: game.id,
        },
        include: {
            match_details: true,
        },
    });

    if (!match?.match_details) {
        throw new Error("티츄 게임 기록을 찾을 수 없습니다.");
    }

    if (match.deleted_at) {
        throw new Error("삭제된 게임에는 기록을 추가할 수 없습니다.");
    }

    if (match.created_by !== me.id) {
        throw new Error("게임 생성자만 라운드를 기록할 수 있습니다.");
    }

    const details = normalizeTichuRecordDetails(match.match_details.details);

    if (details.game_key !== TICHU_GAME_KEY) {
        throw new Error("티츄 게임 기록이 아닙니다.");
    }

    if (details.status !== "PLAYING") {
        throw new Error("진행 중인 티츄 게임에만 기록을 추가할 수 있습니다.");
    }

    validateTichuDeclaration(
        input.calledTichuPlayerKey,
        input.tichuResult,
        "티츄",
    );

    validateTichuDeclaration(
        input.calledGrandTichuPlayerKey,
        input.grandTichuResult,
        "그랜드 티츄",
    );

    if (
        input.calledTichuPlayerKey &&
        input.calledGrandTichuPlayerKey &&
        input.calledTichuPlayerKey === input.calledGrandTichuPlayerKey
    ) {
        throw new Error(
            "같은 플레이어가 티츄와 그랜드 티츄를 동시에 선언할 수 없습니다.",
        );
    }

    const scoreDeltas: Record<TichuTeamKey, number> = {
        TEAM_A: 0,
        TEAM_B: 0,
    };

    let teamACardScore: number | null = input.teamACardScore;
    let teamBCardScore: number | null = input.teamBCardScore;

    if (input.oneTwoTeamKey) {
        assertTichuTeamKey(input.oneTwoTeamKey);

        const oppositeTeamKey = getOppositeTichuTeamKey(input.oneTwoTeamKey);

        scoreDeltas[input.oneTwoTeamKey] = 200;
        scoreDeltas[oppositeTeamKey] = 0;

        teamACardScore = null;
        teamBCardScore = null;
    } else {
        validateTichuCardScore(teamACardScore, "A팀");
        validateTichuCardScore(teamBCardScore, "B팀");

        if ((teamACardScore ?? 0) + (teamBCardScore ?? 0) !== 100) {
            throw new Error("A팀과 B팀의 카드 점수 합계는 100점이어야 합니다.");
        }

        scoreDeltas.TEAM_A = teamACardScore ?? 0;
        scoreDeltas.TEAM_B = teamBCardScore ?? 0;
    }

    applyTichuDeclarationScore({
        details,
        playerKey: input.calledTichuPlayerKey,
        result: input.tichuResult,
        successBonus: 100,
        failPenalty: 100,
        scoreDeltas,
    });

    applyTichuDeclarationScore({
        details,
        playerKey: input.calledGrandTichuPlayerKey,
        result: input.grandTichuResult,
        successBonus: 200,
        failPenalty: 200,
        scoreDeltas,
    });

    const totalScores: Record<TichuTeamKey, number> = {
        TEAM_A: details.teams.TEAM_A.score + scoreDeltas.TEAM_A,
        TEAM_B: details.teams.TEAM_B.score + scoreDeltas.TEAM_B,
    };

    const reachedTarget =
        totalScores.TEAM_A >= details.target_score ||
        totalScores.TEAM_B >= details.target_score;

    const hasWinner = reachedTarget && totalScores.TEAM_A !== totalScores.TEAM_B;

    const winnerTeamKey: TichuTeamKey | null = hasWinner
        ? totalScores.TEAM_A > totalScores.TEAM_B
            ? "TEAM_A"
            : "TEAM_B"
        : null;

    const round = details.current_round;
    const now = new Date().toISOString();

    const newLog: TichuRoundLog = {
        round,
        team_a_card_score: teamACardScore,
        team_b_card_score: teamBCardScore,
        called_tichu_player_key: input.calledTichuPlayerKey,
        called_grand_tichu_player_key: input.calledGrandTichuPlayerKey,
        successful_tichu_player_keys:
            input.calledTichuPlayerKey && input.tichuResult === "SUCCESS"
                ? [input.calledTichuPlayerKey]
                : [],
        failed_tichu_player_keys:
            input.calledTichuPlayerKey && input.tichuResult === "FAIL"
                ? [input.calledTichuPlayerKey]
                : [],
        successful_grand_tichu_player_keys:
            input.calledGrandTichuPlayerKey && input.grandTichuResult === "SUCCESS"
                ? [input.calledGrandTichuPlayerKey]
                : [],
        failed_grand_tichu_player_keys:
            input.calledGrandTichuPlayerKey && input.grandTichuResult === "FAIL"
                ? [input.calledGrandTichuPlayerKey]
                : [],
        one_two_team_key: input.oneTwoTeamKey,
        score_deltas: scoreDeltas,
        total_scores: totalScores,
        created_at: now,
    };

    const nextDetails: NormalizedTichuRecordDetails = {
        ...details,
        status: winnerTeamKey ? "FINISHED" : "PLAYING",
        current_round: winnerTeamKey ? round : round + 1,
        winner_team_key: winnerTeamKey,
        finished_at: winnerTeamKey ? now : null,
        teams: {
            TEAM_A: {
                ...details.teams.TEAM_A,
                score: totalScores.TEAM_A,
            },
            TEAM_B: {
                ...details.teams.TEAM_B,
                score: totalScores.TEAM_B,
            },
        },
        logs: [...details.logs, newLog],
    };

    const updateResult = await db.match_details.updateMany({
        where: {
            match_id: match.match_details.match_id,
            version: input.expectedVersion,
        },
        data: {
            details: nextDetails as Prisma.InputJsonValue,
            version: {
                increment: 1,
            },
        },
    });

    if (updateResult.count !== 1) {
        throw new Error(
            "다른 사용자가 먼저 기록을 수정했습니다. 새로고침 후 다시 시도해주세요.",
        );
    }

    revalidatePath(`/tichu/play/${input.matchId}`);
    revalidatePath(`/tichu/detail/${input.matchId}`);
    revalidatePath("/tichu");
    revalidatePath("/tichu/matches");
}