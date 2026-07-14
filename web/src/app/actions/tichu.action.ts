// web/src/app/actions/tichu.action.ts
"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { syncTichuAchievementsForMatch } from "@/app/actions/tichu-achievement.action";
import { auth } from "@/auth";
import { TICHU_GAME_KEY } from "@/features/games/tichu/constants";
import {
    normalizeTichuMatchDetails,
    syncAllTichuUserStats,
} from "@/features/games/tichu/stats";
import type {
    TichuCallLog,
    TichuMatchDetails,
    TichuRoundLog,
    TichuTeamKey,
} from "@/features/games/tichu/types";
import { assertGameEnabledForAction } from "@/features/games/shared/enabled-games";
import { getCurrentUserWithAdmin } from "@/lib/admin";
import { syncTichuNewsEventsForMatch } from "@/features/games/tichu/news";
import { db } from "@/lib/prisma";

type JsonRecord = Record<string, unknown>;

type CreateTichuMatchInput = {
    teamAName: string;
    teamBName: string;
    playerNames: [string, string, string, string];
    targetScore: 500 | 1000;
};

type RecordTichuRoundInput = {
    matchId: number;
    expectedVersion: number;
    firstOutPlayerKey: string;
    teamACardScore: number | null;
    teamBCardScore: number | null;
    oneTwoTeamKey: TichuTeamKey | null;
    smallTichuPlayerKeys: string[];
    largeTichuPlayerKeys: string[];
    isForceFinish?: boolean;
};

type CurrentTichuManager = NonNullable<
    Awaited<ReturnType<typeof getCurrentUserWithAdmin>>
>;

const MAX_TICHU_PLAYER_NAME_LENGTH = 20;
const MAX_TICHU_TEAM_NAME_LENGTH = 20;

function isRecord(value: unknown): value is JsonRecord {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function normalizeTichuText(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

function validateTichuPlayerNames(
    playerNames: string[],
): [string, string, string, string] {
    const normalizedNames = playerNames.map(normalizeTichuText);

    if (normalizedNames.length !== 4) {
        throw new Error("티츄 참가자는 4명이어야 합니다.");
    }

    if (normalizedNames.some((name) => name.length === 0)) {
        throw new Error("참가자 4명의 이름을 모두 입력해주세요.");
    }

    if (
        normalizedNames.some(
            (name) => name.length > MAX_TICHU_PLAYER_NAME_LENGTH,
        )
    ) {
        throw new Error(
            `참가자 이름은 ${MAX_TICHU_PLAYER_NAME_LENGTH}글자까지 입력할 수 있습니다.`,
        );
    }

    if (
        new Set(normalizedNames).size !== normalizedNames.length
    ) {
        throw new Error("참가자 이름은 모두 달라야 합니다.");
    }

    return normalizedNames as [
        string,
        string,
        string,
        string,
    ];
}

function assertTichuTeamKey(
    value: unknown,
): asserts value is TichuTeamKey {
    if (value !== "TEAM_A" && value !== "TEAM_B") {
        throw new Error("잘못된 팀 정보입니다.");
    }
}

function getOppositeTichuTeamKey(
    teamKey: TichuTeamKey,
): TichuTeamKey {
    return teamKey === "TEAM_A" ? "TEAM_B" : "TEAM_A";
}

async function assertTichuCreatorHasNoOtherPlayingMatch({
                                                            matchId,
                                                            createdBy,
                                                        }: {
    matchId: number;
    createdBy: string | null;
}): Promise<void> {
    if (!createdBy) {
        return;
    }

    const tichuGame = await db.games.findUnique({
        where: {
            key: TICHU_GAME_KEY,
        },
        select: {
            id: true,
        },
    });

    if (!tichuGame) {
        throw new Error("티츄 게임 정보를 찾을 수 없습니다.");
    }

    const otherPlayingMatch = await db.matches.findFirst({
        where: {
            id: {
                not: matchId,
            },
            game_id: tichuGame.id,
            created_by: createdBy,
            deleted_at: null,
            match_details: {
                details: {
                    path: ["status"],
                    equals: "PLAYING",
                },
            },
        },
        select: {
            id: true,
        },
    });

    if (otherPlayingMatch) {
        throw new Error(
            "게임 생성자에게 이미 진행 중인 티츄 게임이 있어 종료된 게임을 진행 중으로 되돌릴 수 없습니다.",
        );
    }
}

function validateTichuCardScore(
    value: number | null,
    label: string,
): void {
    if (value === null) {
        throw new Error(`${label} 카드 점수를 입력해주세요.`);
    }

    if (!Number.isInteger(value)) {
        throw new Error(
            `${label} 카드 점수는 정수로 입력해주세요.`,
        );
    }

    if (value % 5 !== 0) {
        throw new Error(
            `${label} 카드 점수는 5점 단위로 입력해주세요.`,
        );
    }

    if (value < -25 || value > 125) {
        throw new Error(
            `${label} 카드 점수는 -25점부터 125점 사이로 입력해주세요.`,
        );
    }
}

function uniquePlayerKeys(playerKeys: string[]): string[] {
    return Array.from(
        new Set(playerKeys.filter((playerKey) => playerKey)),
    );
}

function validateTichuPlayerKeyExists(
    details: TichuMatchDetails,
    playerKey: string,
): void {
    if (!details.players[playerKey]) {
        throw new Error(
            "존재하지 않는 플레이어가 선택되었습니다.",
        );
    }
}

function validateTichuCallPlayerKeys({
                                         details,
                                         firstOutPlayerKey,
                                         smallTichuPlayerKeys,
                                         largeTichuPlayerKeys,
                                     }: {
    details: TichuMatchDetails;
    firstOutPlayerKey: string;
    smallTichuPlayerKeys: string[];
    largeTichuPlayerKeys: string[];
}): void {
    validateTichuPlayerKeyExists(
        details,
        firstOutPlayerKey,
    );

    if (
        smallTichuPlayerKeys.length !==
        new Set(smallTichuPlayerKeys).size
    ) {
        throw new Error("스몰 티츄 선언자가 중복되었습니다.");
    }

    if (
        largeTichuPlayerKeys.length !==
        new Set(largeTichuPlayerKeys).size
    ) {
        throw new Error("라지 티츄 선언자가 중복되었습니다.");
    }

    const smallSet = new Set(smallTichuPlayerKeys);

    if (
        largeTichuPlayerKeys.some((playerKey) =>
            smallSet.has(playerKey),
        )
    ) {
        throw new Error(
            "같은 플레이어가 스몰 티츄와 라지 티츄를 동시에 선언할 수 없습니다.",
        );
    }

    for (const playerKey of [
        ...smallTichuPlayerKeys,
        ...largeTichuPlayerKeys,
    ]) {
        validateTichuPlayerKeyExists(details, playerKey);
    }
}

function validateTichuOneTwoFirstOutPlayer({
                                               details,
                                               firstOutPlayerKey,
                                               oneTwoTeamKey,
                                           }: {
    details: TichuMatchDetails;
    firstOutPlayerKey: string;
    oneTwoTeamKey: TichuTeamKey | null;
}): void {
    if (!oneTwoTeamKey) {
        return;
    }

    assertTichuTeamKey(oneTwoTeamKey);

    const firstOutPlayer = details.players[firstOutPlayerKey];

    if (!firstOutPlayer) {
        throw new Error(
            "1등으로 나간 플레이어 정보를 찾을 수 없습니다.",
        );
    }

    if (firstOutPlayer.team_key !== oneTwoTeamKey) {
        throw new Error(
            "원투를 달성한 팀의 플레이어만 1등으로 선택할 수 있습니다.",
        );
    }
}

function createTichuCallLogs({
                                 details,
                                 playerKeys,
                                 firstOutPlayerKey,
                                 successBonus,
                                 failPenalty,
                                 scoreDeltas,
                             }: {
    details: TichuMatchDetails;
    playerKeys: string[];
    firstOutPlayerKey: string;
    successBonus: number;
    failPenalty: number;
    scoreDeltas: Record<TichuTeamKey, number>;
}): TichuCallLog[] {
    return playerKeys.map((playerKey) => {
        const player = details.players[playerKey];
        const isSuccess = playerKey === firstOutPlayerKey;
        const scoreDelta = isSuccess
            ? successBonus
            : -failPenalty;

        scoreDeltas[player.team_key] += scoreDelta;

        return {
            player_key: playerKey,
            result: isSuccess ? "SUCCESS" : "FAIL",
            score_delta: scoreDelta,
        };
    });
}

function getWinnerTeamKeyFromScores(
    teamAScore: number,
    teamBScore: number,
): TichuTeamKey | null {
    if (teamAScore === teamBScore) {
        return null;
    }

    return teamAScore > teamBScore ? "TEAM_A" : "TEAM_B";
}

function getTichuPlayerTeamKey(
    details: TichuMatchDetails,
    playerKey: string,
): TichuTeamKey | null {
    return details.players[playerKey]?.team_key ?? null;
}

function getTichuTeamRank(
    teamKey: TichuTeamKey,
    winnerTeamKey: TichuTeamKey | null,
): number {
    if (!winnerTeamKey) {
        return 1;
    }

    return teamKey === winnerTeamKey ? 1 : 2;
}

async function getCurrentTichuManager(): Promise<CurrentTichuManager> {
    const currentUser = await getCurrentUserWithAdmin();

    if (!currentUser) {
        throw new Error("로그인이 필요합니다.");
    }

    return currentUser;
}

function assertCanManageTichuMatch({
                                       currentUser,
                                       createdBy,
                                   }: {
    currentUser: CurrentTichuManager;
    createdBy: string | null;
}): void {
    if (currentUser.isAdmin) {
        return;
    }

    if (createdBy && currentUser.id === createdBy) {
        return;
    }

    throw new Error(
        "게임 생성자 또는 관리자만 처리할 수 있습니다.",
    );
}

async function applyTichuFinalScores({
                                         matchId,
                                         details,
                                         tx,
                                     }: {
    matchId: number;
    details: TichuMatchDetails;
    tx: Prisma.TransactionClient;
}): Promise<void> {
    const teamAScore = details.teams.TEAM_A.score;
    const teamBScore = details.teams.TEAM_B.score;

    const winnerTeamKey =
        details.winner_team_key ??
        getWinnerTeamKeyFromScores(teamAScore, teamBScore);

    const matchPlayers = await tx.match_players.findMany({
        where: {
            match_id: matchId,
        },
    });

    for (const matchPlayer of matchPlayers) {
        let playerKey: string | null = null;

        if (matchPlayer.user_id) {
            playerKey = `user_${matchPlayer.user_id}`;
        } else if (matchPlayer.guest_name) {
            playerKey = `guest_${matchPlayer.guest_name}`;
        }

        if (!playerKey) {
            continue;
        }

        const teamKey = getTichuPlayerTeamKey(
            details,
            playerKey,
        );

        if (!teamKey) {
            continue;
        }

        const finalScore =
            teamKey === "TEAM_A"
                ? details.teams.TEAM_A.score
                : details.teams.TEAM_B.score;

        await tx.match_players.update({
            where: {
                id: matchPlayer.id,
            },
            data: {
                final_score: finalScore,
                rank: getTichuTeamRank(
                    teamKey,
                    winnerTeamKey,
                ),
            },
        });
    }
}

async function clearTichuFinalScores({
                                         matchId,
                                         tx,
                                     }: {
    matchId: number;
    tx: Prisma.TransactionClient;
}): Promise<void> {
    await tx.match_players.updateMany({
        where: {
            match_id: matchId,
        },
        data: {
            final_score: null,
            rank: null,
        },
    });
}

function rebuildTichuDetailsAfterUndo(
    details: TichuMatchDetails,
    logs: TichuRoundLog[],
): TichuMatchDetails {
    const nextTeamScores: Record<TichuTeamKey, number> = {
        TEAM_A: 0,
        TEAM_B: 0,
    };

    for (const log of logs) {
        if (!isRecord(log)) {
            continue;
        }

        const scoreDeltas = log.score_deltas;

        if (!isRecord(scoreDeltas)) {
            continue;
        }

        const teamADelta =
            typeof scoreDeltas.TEAM_A === "number"
                ? scoreDeltas.TEAM_A
                : 0;

        const teamBDelta =
            typeof scoreDeltas.TEAM_B === "number"
                ? scoreDeltas.TEAM_B
                : 0;

        nextTeamScores.TEAM_A += teamADelta;
        nextTeamScores.TEAM_B += teamBDelta;
    }

    return {
        ...details,
        status: "PLAYING",
        current_round: logs.length + 1,
        winner_team_key: null,
        finished_at: null,
        stats_applied: false,
        teams: {
            TEAM_A: {
                ...details.teams.TEAM_A,
                score: nextTeamScores.TEAM_A,
            },
            TEAM_B: {
                ...details.teams.TEAM_B,
                score: nextTeamScores.TEAM_B,
            },
        },
        logs,
    };
}

function revalidateTichuMatchPaths(matchId: number): void {
    revalidatePath("/tichu");
    revalidatePath("/tichu/matches");
    revalidatePath("/tichu/achievements");
    revalidatePath(`/tichu/play/${matchId}`);
    revalidatePath(`/tichu/detail/${matchId}`);
}

export async function createTichuMatch(
    input: CreateTichuMatchInput,
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
        throw new Error(
            "DB에서 로그인한 유저 정보를 찾을 수 없습니다.",
        );
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

    const playerNames = validateTichuPlayerNames(
        input.playerNames,
    );

    const teamAName =
        normalizeTichuText(input.teamAName) || "A팀";

    const teamBName =
        normalizeTichuText(input.teamBName) || "B팀";

    if (
        teamAName.length > MAX_TICHU_TEAM_NAME_LENGTH ||
        teamBName.length > MAX_TICHU_TEAM_NAME_LENGTH
    ) {
        throw new Error(
            `팀 이름은 ${MAX_TICHU_TEAM_NAME_LENGTH}글자까지 입력할 수 있습니다.`,
        );
    }

    if (![500, 1000].includes(input.targetScore)) {
        throw new Error(
            "목표 점수는 500점 또는 1000점만 선택할 수 있습니다.",
        );
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

    const userMap = new Map(
        existingUsers.map((user) => [
            user.nickname,
            user.id,
        ]),
    );

    const playerKeys = playerNames.map((playerName) => {
        const foundUserId = userMap.get(playerName);

        if (foundUserId) {
            return `user_${foundUserId}`;
        }

        return `guest_${playerName}`;
    }) as [string, string, string, string];

    const details: TichuMatchDetails = {
        schema_version: 2,
        game_key: TICHU_GAME_KEY,
        status: "PLAYING",
        current_round: 1,
        target_score: input.targetScore,
        winner_team_key: null,
        finished_at: null,
        teams: {
            TEAM_A: {
                name: teamAName,
                score: 0,
                player_keys: [
                    playerKeys[0],
                    playerKeys[2],
                ],
            },
            TEAM_B: {
                name: teamBName,
                score: 0,
                player_keys: [
                    playerKeys[1],
                    playerKeys[3],
                ],
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

    const newMatch = await db.$transaction(
        async (tx) => {
            const match = await tx.matches.create({
                data: {
                    game_id: game.id,
                    created_by: me.id,
                    play_date: new Date(),
                    match_details: {
                        create: {
                            details:
                                details as Prisma.InputJsonValue,
                        },
                    },
                },
                select: {
                    id: true,
                },
            });

            await tx.match_players.createMany({
                data: playerNames.map((playerName) => {
                    const foundUserId =
                        userMap.get(playerName);

                    return {
                        match_id: match.id,
                        user_id: foundUserId ?? null,
                        guest_name: foundUserId
                            ? null
                            : playerName,
                    };
                }),
            });

            return match;
        },
    );

    revalidatePath("/tichu");
    revalidatePath("/tichu/matches");

    redirect(`/tichu/play/${newMatch.id}`);
}

export async function recordTichuRound(
    input: RecordTichuRoundInput,
): Promise<void> {
    assertGameEnabledForAction(TICHU_GAME_KEY);

    const currentUser = await getCurrentTichuManager();

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
        throw new Error(
            "삭제된 게임에는 기록을 추가할 수 없습니다.",
        );
    }

    assertCanManageTichuMatch({
        currentUser,
        createdBy: match.created_by,
    });

    const matchDetail = match.match_details;

    const details = normalizeTichuMatchDetails(
        matchDetail.details,
    );

    if (details.game_key !== TICHU_GAME_KEY) {
        throw new Error("티츄 게임 기록이 아닙니다.");
    }

    if (details.status !== "PLAYING") {
        throw new Error(
            "진행 중인 티츄 게임에만 기록을 추가할 수 있습니다.",
        );
    }

    const firstOutPlayerKey = input.firstOutPlayerKey.trim();

    const smallTichuPlayerKeys = uniquePlayerKeys(
        input.smallTichuPlayerKeys,
    );

    const largeTichuPlayerKeys = uniquePlayerKeys(
        input.largeTichuPlayerKeys,
    );

    validateTichuCallPlayerKeys({
        details,
        firstOutPlayerKey,
        smallTichuPlayerKeys,
        largeTichuPlayerKeys,
    });

    validateTichuOneTwoFirstOutPlayer({
        details,
        firstOutPlayerKey,
        oneTwoTeamKey: input.oneTwoTeamKey,
    });

    const scoreDeltas: Record<TichuTeamKey, number> = {
        TEAM_A: 0,
        TEAM_B: 0,
    };

    let teamACardScore: number | null =
        input.teamACardScore;

    let teamBCardScore: number | null =
        input.teamBCardScore;

    if (input.oneTwoTeamKey) {
        assertTichuTeamKey(input.oneTwoTeamKey);

        const oppositeTeamKey = getOppositeTichuTeamKey(
            input.oneTwoTeamKey,
        );

        scoreDeltas[input.oneTwoTeamKey] = 200;
        scoreDeltas[oppositeTeamKey] = 0;

        teamACardScore = null;
        teamBCardScore = null;
    } else {
        validateTichuCardScore(teamACardScore, "A팀");
        validateTichuCardScore(teamBCardScore, "B팀");

        if (
            (teamACardScore ?? 0) + (teamBCardScore ?? 0) !==
            100
        ) {
            throw new Error(
                "A팀과 B팀의 카드 점수 합계는 100점이어야 합니다.",
            );
        }

        scoreDeltas.TEAM_A = teamACardScore ?? 0;
        scoreDeltas.TEAM_B = teamBCardScore ?? 0;
    }

    const smallTichuCalls = createTichuCallLogs({
        details,
        playerKeys: smallTichuPlayerKeys,
        firstOutPlayerKey,
        successBonus: 100,
        failPenalty: 100,
        scoreDeltas,
    });

    const largeTichuCalls = createTichuCallLogs({
        details,
        playerKeys: largeTichuPlayerKeys,
        firstOutPlayerKey,
        successBonus: 200,
        failPenalty: 200,
        scoreDeltas,
    });

    const totalScores: Record<TichuTeamKey, number> = {
        TEAM_A:
            details.teams.TEAM_A.score +
            scoreDeltas.TEAM_A,
        TEAM_B:
            details.teams.TEAM_B.score +
            scoreDeltas.TEAM_B,
    };

    const reachedTarget =
        totalScores.TEAM_A >= details.target_score ||
        totalScores.TEAM_B >= details.target_score;

    const hasWinnerByTarget =
        reachedTarget &&
        totalScores.TEAM_A !== totalScores.TEAM_B;

    const shouldFinish =
        input.isForceFinish === true || hasWinnerByTarget;

    const winnerTeamKey = shouldFinish
        ? getWinnerTeamKeyFromScores(
            totalScores.TEAM_A,
            totalScores.TEAM_B,
        )
        : null;

    const round = details.current_round;
    const now = new Date().toISOString();

    const newLog: TichuRoundLog = {
        round,
        first_out_player_key: firstOutPlayerKey,
        team_a_card_score: teamACardScore,
        team_b_card_score: teamBCardScore,
        one_two_team_key: input.oneTwoTeamKey,
        small_tichu_calls: smallTichuCalls,
        large_tichu_calls: largeTichuCalls,
        score_deltas: scoreDeltas,
        total_scores: totalScores,
        created_at: now,
    };

    const nextDetails: TichuMatchDetails = {
        ...details,
        status: shouldFinish ? "FINISHED" : "PLAYING",
        current_round: shouldFinish ? round : round + 1,
        winner_team_key: winnerTeamKey,
        finished_at: shouldFinish ? now : null,
        stats_applied: shouldFinish,
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

    const updateResult = await db.$transaction(
        async (tx) => {
            const result =
                await tx.match_details.updateMany({
                    where: {
                        match_id: matchDetail.match_id,
                        version: input.expectedVersion,
                    },
                    data: {
                        details:
                            nextDetails as Prisma.InputJsonValue,
                        version: {
                            increment: 1,
                        },
                    },
                });

            if (result.count !== 1) {
                return result;
            }

            if (shouldFinish) {
                await applyTichuFinalScores({
                    matchId: input.matchId,
                    details: nextDetails,
                    tx,
                });

                await syncAllTichuUserStats({
                    gameId: game.id,
                    tx,
                });
            }

            return result;
        },
    );

    if (updateResult.count !== 1) {
        throw new Error(
            "다른 사용자가 먼저 기록을 수정했습니다.\n새로고침 후 다시 시도해주세요.",
        );
    }

    if (shouldFinish) {
        await syncTichuAchievementsForMatch(
            input.matchId,
        );

        await syncTichuNewsEventsForMatch(
            input.matchId,
        );
    }

    revalidateTichuMatchPaths(
        input.matchId,
    );
}

export async function deleteTichuMatch(
    matchId: number,
): Promise<void> {
    assertGameEnabledForAction(TICHU_GAME_KEY);

    const currentUser =
        await getCurrentTichuManager();

    const match = await db.matches.findUnique({
        where: {
            id: matchId,
        },
        include: {
            games: true,
            match_details: true,
        },
    });

    if (!match?.match_details) {
        throw new Error(
            "티츄 게임 기록을 찾을 수 없습니다.",
        );
    }

    if (
        match.games.key !== TICHU_GAME_KEY
    ) {
        throw new Error(
            "티츄 게임 기록이 아닙니다.",
        );
    }

    assertCanManageTichuMatch({
        currentUser,
        createdBy: match.created_by,
    });

    const details =
        normalizeTichuMatchDetails(
            match.match_details.details,
        );

    if (
        match.deleted_at ||
        details.status === "DELETED"
    ) {
        return;
    }

    const shouldRecalculateStats =
        details.status === "FINISHED" &&
        details.stats_applied;

    const deletedAt = new Date();

    const nextDetails: TichuMatchDetails = {
        ...details,
        status: "DELETED",
        stats_applied: false,
    };

    await db.$transaction(async (tx) => {
        await tx.match_details.update({
            where: {
                match_id: matchId,
            },
            data: {
                details:
                    nextDetails as Prisma.InputJsonValue,
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
                deleted_at: deletedAt,
                deleted_by: currentUser.id,
            },
        });

        await clearTichuFinalScores({
            matchId,
            tx,
        });

        if (shouldRecalculateStats) {
            await syncAllTichuUserStats({
                gameId: match.games.id,
                tx,
            });
        }
    });

    await syncTichuAchievementsForMatch(
        matchId,
    );

    await syncTichuNewsEventsForMatch(
        matchId,
    );

    revalidateTichuMatchPaths(matchId);
}

export async function undoTichuLastLog(
    matchId: number,
): Promise<void> {
    assertGameEnabledForAction(TICHU_GAME_KEY);

    const currentUser =
        await getCurrentTichuManager();

    const match = await db.matches.findUnique({
        where: {
            id: matchId,
        },
        include: {
            games: true,
            match_details: true,
        },
    });

    if (!match?.match_details) {
        throw new Error(
            "티츄 게임 기록을 찾을 수 없습니다.",
        );
    }

    if (
        match.games.key !== TICHU_GAME_KEY
    ) {
        throw new Error(
            "티츄 게임 기록이 아닙니다.",
        );
    }

    assertCanManageTichuMatch({
        currentUser,
        createdBy: match.created_by,
    });

    if (match.deleted_at) {
        throw new Error(
            "삭제된 게임은 실행취소할 수 없습니다.",
        );
    }

    const details =
        normalizeTichuMatchDetails(
            match.match_details.details,
        );

    if (details.status === "DELETED") {
        throw new Error(
            "삭제된 게임은 실행취소할 수 없습니다.",
        );
    }

    if (details.logs.length === 0) {
        throw new Error(
            "되돌릴 라운드 기록이 없습니다.",
        );
    }

    const willRestoreFinishedMatch =
        details.status === "FINISHED";

    if (willRestoreFinishedMatch) {
        await assertTichuCreatorHasNoOtherPlayingMatch({
            matchId,
            createdBy: match.created_by,
        });
    }

    const shouldRecalculateStats =
        details.status === "FINISHED" &&
        details.stats_applied;

    const nextLogs =
        details.logs.slice(0, -1);

    const nextDetails =
        rebuildTichuDetailsAfterUndo(
            details,
            nextLogs,
        );

    await db.$transaction(async (tx) => {
        await tx.match_details.update({
            where: {
                match_id: matchId,
            },
            data: {
                details:
                    nextDetails as Prisma.InputJsonValue,
                version: {
                    increment: 1,
                },
            },
        });

        await clearTichuFinalScores({
            matchId,
            tx,
        });

        if (shouldRecalculateStats) {
            await syncAllTichuUserStats({
                gameId: match.games.id,
                tx,
            });
        }
    });

    await syncTichuAchievementsForMatch(
        matchId,
    );

    await syncTichuNewsEventsForMatch(
        matchId,
    );

    revalidateTichuMatchPaths(matchId);
}