// web/src/app/actions/tichu.action.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { db } from "@/lib/prisma";
import { TICHU_GAME_KEY } from "@/features/games/tichu/constants";
import { assertGameEnabledForAction } from "@/features/games/shared/enabled-games";
import { getCurrentUserWithAdmin } from "@/lib/admin";
import { syncTichuAchievementsForMatch } from "@/app/actions/tichu-achievement.action";

type JsonRecord = Record<string, unknown>;

type TichuTeamKey = "TEAM_A" | "TEAM_B";
type TichuStatus = "PLAYING" | "FINISHED" | "DELETED";
type TichuCallResult = "SUCCESS" | "FAIL";

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

type TichuCallLog = {
    player_key: string;
    result: TichuCallResult;
    score_delta: number;
};

type TichuRoundLog = {
    round: number;
    first_out_player_key: string;
    team_a_card_score: number | null;
    team_b_card_score: number | null;
    one_two_team_key: TichuTeamKey | null;
    small_tichu_calls: TichuCallLog[];
    large_tichu_calls: TichuCallLog[];
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
    status?: TichuStatus | string;
    current_round?: number;
    target_score?: number;
    winner_team_key?: TichuTeamKey | null;
    finished_at?: string | null;
    teams?: Partial<Record<TichuTeamKey, RawTichuTeamState>>;
    players?: Record<string, RawTichuPlayerState>;
    logs?: unknown[];
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
    logs: unknown[];
    stats_applied: boolean;
};

type TichuSpecificStats = {
    play_count: number;
    win_count: number;
    loss_count: number;
    round_count: number;

    tichu_calls: number;
    tichu_successes: number;
    tichu_failures: number;

    grand_tichu_calls: number;
    grand_tichu_successes: number;
    grand_tichu_failures: number;

    first_place_count: number;
    last_place_count: number;

    one_two_success_count: number;
    one_two_suffered_count: number;

    total_score_diff: number;
    best_score_diff: number;
    worst_score_diff: number;

    big_win_count: number;
    close_win_count: number;
};

type TichuUserGameSpecificStats = {
    schema_version: number;
    tichu: TichuSpecificStats;
};

type CurrentTichuManager = NonNullable<
    Awaited<ReturnType<typeof getCurrentUserWithAdmin>>
>;

const MAX_TICHU_PLAYER_NAME_LENGTH = 20;
const MAX_TICHU_TEAM_NAME_LENGTH = 20;

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
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

    if (normalizedNames.some((name) => name.length > MAX_TICHU_PLAYER_NAME_LENGTH)) {
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
    if (teamKey === "TEAM_A") {
        return "TEAM_B";
    }

    return "TEAM_A";
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

function normalizeTichuStatus(status: string | undefined): TichuStatus {
    if (status === "FINISHED" || status === "DELETED") {
        return status;
    }

    return "PLAYING";
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
        status: normalizeTichuStatus(parsedDetails.status),
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

async function assertTichuCreatorHasNoOtherPlayingMatch({
                                                            matchId,
                                                            createdBy,
                                                        }: {
    matchId: number;
    createdBy: string | null;
}) {
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

function uniquePlayerKeys(playerKeys: string[]) {
    return Array.from(new Set(playerKeys.filter((playerKey) => playerKey)));
}

function validateTichuPlayerKeyExists(
    details: NormalizedTichuRecordDetails,
    playerKey: string,
) {
    if (!details.players[playerKey]) {
        throw new Error("존재하지 않는 플레이어가 선택되었습니다.");
    }
}

function validateTichuCallPlayerKeys(params: {
    details: NormalizedTichuRecordDetails;
    firstOutPlayerKey: string;
    smallTichuPlayerKeys: string[];
    largeTichuPlayerKeys: string[];
}) {
    const {
        details,
        firstOutPlayerKey,
        smallTichuPlayerKeys,
        largeTichuPlayerKeys,
    } = params;

    validateTichuPlayerKeyExists(details, firstOutPlayerKey);

    if (smallTichuPlayerKeys.length !== new Set(smallTichuPlayerKeys).size) {
        throw new Error("스몰 티츄 선언자가 중복되었습니다.");
    }

    if (largeTichuPlayerKeys.length !== new Set(largeTichuPlayerKeys).size) {
        throw new Error("라지 티츄 선언자가 중복되었습니다.");
    }

    const smallSet = new Set(smallTichuPlayerKeys);

    if (largeTichuPlayerKeys.some((playerKey) => smallSet.has(playerKey))) {
        throw new Error(
            "같은 플레이어가 스몰 티츄와 라지 티츄를 동시에 선언할 수 없습니다.",
        );
    }

    [...smallTichuPlayerKeys, ...largeTichuPlayerKeys].forEach((playerKey) => {
        validateTichuPlayerKeyExists(details, playerKey);
    });
}

function createTichuCallLogs(params: {
    details: NormalizedTichuRecordDetails;
    playerKeys: string[];
    firstOutPlayerKey: string;
    successBonus: number;
    failPenalty: number;
    scoreDeltas: Record<TichuTeamKey, number>;
}): TichuCallLog[] {
    const {
        details,
        playerKeys,
        firstOutPlayerKey,
        successBonus,
        failPenalty,
        scoreDeltas,
    } = params;

    return playerKeys.map((playerKey) => {
        const player = details.players[playerKey];
        const isSuccess = playerKey === firstOutPlayerKey;
        const scoreDelta = isSuccess ? successBonus : -failPenalty;

        scoreDeltas[player.team_key] += scoreDelta;

        return {
            player_key: playerKey,
            result: isSuccess ? "SUCCESS" : "FAIL",
            score_delta: scoreDelta,
        };
    });
}

function getUserIdFromTichuPlayerKey(playerKey: string) {
    if (!playerKey.startsWith("user_")) {
        return null;
    }

    return playerKey.slice("user_".length);
}

function getTichuUserIdsFromDetails(details: NormalizedTichuRecordDetails) {
    return Object.keys(details.players)
        .map(getUserIdFromTichuPlayerKey)
        .filter((userId): userId is string => Boolean(userId));
}

function createEmptyTichuStats(): TichuSpecificStats {
    return {
        play_count: 0,
        win_count: 0,
        loss_count: 0,
        round_count: 0,

        tichu_calls: 0,
        tichu_successes: 0,
        tichu_failures: 0,

        grand_tichu_calls: 0,
        grand_tichu_successes: 0,
        grand_tichu_failures: 0,

        first_place_count: 0,
        last_place_count: 0,

        one_two_success_count: 0,
        one_two_suffered_count: 0,

        total_score_diff: 0,
        best_score_diff: 0,
        worst_score_diff: 0,

        big_win_count: 0,
        close_win_count: 0,
    };
}

function addTichuStats(base: TichuSpecificStats, add: TichuSpecificStats) {
    return {
        play_count: base.play_count + add.play_count,
        win_count: base.win_count + add.win_count,
        loss_count: base.loss_count + add.loss_count,
        round_count: base.round_count + add.round_count,

        tichu_calls: base.tichu_calls + add.tichu_calls,
        tichu_successes: base.tichu_successes + add.tichu_successes,
        tichu_failures: base.tichu_failures + add.tichu_failures,

        grand_tichu_calls: base.grand_tichu_calls + add.grand_tichu_calls,
        grand_tichu_successes:
            base.grand_tichu_successes + add.grand_tichu_successes,
        grand_tichu_failures:
            base.grand_tichu_failures + add.grand_tichu_failures,

        first_place_count: base.first_place_count + add.first_place_count,
        last_place_count: base.last_place_count + add.last_place_count,

        one_two_success_count:
            base.one_two_success_count + add.one_two_success_count,
        one_two_suffered_count:
            base.one_two_suffered_count + add.one_two_suffered_count,

        total_score_diff: base.total_score_diff + add.total_score_diff,
        best_score_diff: Math.max(base.best_score_diff, add.best_score_diff),
        worst_score_diff: Math.min(base.worst_score_diff, add.worst_score_diff),

        big_win_count: base.big_win_count + add.big_win_count,
        close_win_count: base.close_win_count + add.close_win_count,
    };
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
    details: NormalizedTichuRecordDetails,
    playerKey: string,
) {
    return details.players[playerKey]?.team_key ?? null;
}

function getTichuTeamRank(
    teamKey: TichuTeamKey,
    winnerTeamKey: TichuTeamKey | null,
) {
    if (!winnerTeamKey) {
        return 1;
    }

    return teamKey === winnerTeamKey ? 1 : 2;
}

function getTichuMatchStatsByUser(details: NormalizedTichuRecordDetails) {
    const result: Record<string, TichuSpecificStats> = {};
    const teamAScore = details.teams.TEAM_A.score;
    const teamBScore = details.teams.TEAM_B.score;
    const winnerTeamKey =
        details.winner_team_key ?? getWinnerTeamKeyFromScores(teamAScore, teamBScore);

    function ensureStats(playerKey: string) {
        const userId = getUserIdFromTichuPlayerKey(playerKey);

        if (!userId) {
            return null;
        }

        if (!result[userId]) {
            result[userId] = createEmptyTichuStats();
        }

        return result[userId];
    }

    for (const [playerKey, player] of Object.entries(details.players)) {
        const stats = ensureStats(playerKey);

        if (!stats) {
            continue;
        }

        const myScore = player.team_key === "TEAM_A" ? teamAScore : teamBScore;
        const opponentScore = player.team_key === "TEAM_A" ? teamBScore : teamAScore;
        const scoreDiff = myScore - opponentScore;

        stats.play_count += 1;
        stats.round_count += details.logs.length;
        stats.total_score_diff += scoreDiff;
        stats.best_score_diff = scoreDiff;
        stats.worst_score_diff = scoreDiff;

        if (winnerTeamKey === player.team_key) {
            stats.win_count += 1;

            if (scoreDiff >= 500) {
                stats.big_win_count += 1;
            }

            if (scoreDiff > 0 && scoreDiff <= 100) {
                stats.close_win_count += 1;
            }
        } else if (winnerTeamKey) {
            stats.loss_count += 1;
        }
    }

    for (const log of details.logs) {
        if (!isRecord(log)) {
            continue;
        }

        const firstOutPlayerKey =
            typeof log.first_out_player_key === "string"
                ? log.first_out_player_key
                : null;

        if (firstOutPlayerKey) {
            const firstOutStats = ensureStats(firstOutPlayerKey);

            if (firstOutStats) {
                firstOutStats.first_place_count += 1;
            }
        }

        const lastOutPlayerKey =
            typeof log.last_out_player_key === "string" ? log.last_out_player_key : null;

        if (lastOutPlayerKey) {
            const lastOutStats = ensureStats(lastOutPlayerKey);

            if (lastOutStats) {
                lastOutStats.last_place_count += 1;
            }
        }

        const oneTwoTeamKey =
            log.one_two_team_key === "TEAM_A" || log.one_two_team_key === "TEAM_B"
                ? log.one_two_team_key
                : null;

        if (oneTwoTeamKey) {
            const sufferedTeamKey = getOppositeTichuTeamKey(oneTwoTeamKey);

            for (const playerKey of details.teams[oneTwoTeamKey].player_keys) {
                const stats = ensureStats(playerKey);

                if (stats) {
                    stats.one_two_success_count += 1;
                }
            }

            for (const playerKey of details.teams[sufferedTeamKey].player_keys) {
                const stats = ensureStats(playerKey);

                if (stats) {
                    stats.one_two_suffered_count += 1;
                }
            }
        }

        const smallTichuCalls = Array.isArray(log.small_tichu_calls)
            ? log.small_tichu_calls
            : [];

        for (const call of smallTichuCalls) {
            if (!isRecord(call) || typeof call.player_key !== "string") {
                continue;
            }

            const stats = ensureStats(call.player_key);

            if (!stats) {
                continue;
            }

            stats.tichu_calls += 1;

            if (call.result === "SUCCESS") {
                stats.tichu_successes += 1;
            }

            if (call.result === "FAIL") {
                stats.tichu_failures += 1;
            }
        }

        const largeTichuCalls = Array.isArray(log.large_tichu_calls)
            ? log.large_tichu_calls
            : [];

        for (const call of largeTichuCalls) {
            if (!isRecord(call) || typeof call.player_key !== "string") {
                continue;
            }

            const stats = ensureStats(call.player_key);

            if (!stats) {
                continue;
            }

            stats.grand_tichu_calls += 1;

            if (call.result === "SUCCESS") {
                stats.grand_tichu_successes += 1;
            }

            if (call.result === "FAIL") {
                stats.grand_tichu_failures += 1;
            }
        }
    }

    return result;
}

async function syncTichuUserStatsForUsers({
                                              gameId,
                                              userIds,
                                              tx,
                                          }: {
    gameId: number;
    userIds: string[];
    tx: Prisma.TransactionClient;
}) {
    const uniqueUserIds = [...new Set(userIds)];

    if (uniqueUserIds.length === 0) {
        return;
    }

    const accumulatedStatsByUserId = new Map<string, TichuSpecificStats>();

    for (const userId of uniqueUserIds) {
        accumulatedStatsByUserId.set(userId, createEmptyTichuStats());
    }

    const finishedMatches = await tx.matches.findMany({
        where: {
            game_id: gameId,
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
            match_details: true,
        },
    });

    for (const match of finishedMatches) {
        if (!match.match_details) {
            continue;
        }

        let details: NormalizedTichuRecordDetails;

        try {
            details = normalizeTichuRecordDetails(match.match_details.details);
        } catch {
            continue;
        }

        if (details.status !== "FINISHED" || !details.stats_applied) {
            continue;
        }

        const matchStatsByUserId = getTichuMatchStatsByUser(details);

        for (const userId of uniqueUserIds) {
            const matchStats = matchStatsByUserId[userId];

            if (!matchStats) {
                continue;
            }

            const previousStats =
                accumulatedStatsByUserId.get(userId) ?? createEmptyTichuStats();

            accumulatedStatsByUserId.set(
                userId,
                addTichuStats(previousStats, matchStats),
            );
        }
    }

    for (const userId of uniqueUserIds) {
        const tichuStats =
            accumulatedStatsByUserId.get(userId) ?? createEmptyTichuStats();

        const specificStats: TichuUserGameSpecificStats = {
            schema_version: 2,
            tichu: tichuStats,
        };

        await tx.user_game_stats.upsert({
            where: {
                user_id_game_id: {
                    user_id: userId,
                    game_id: gameId,
                },
            },
            update: {
                play_count: tichuStats.play_count,
                specific_stats: specificStats as Prisma.InputJsonValue,
            },
            create: {
                user_id: userId,
                game_id: gameId,
                play_count: tichuStats.play_count,
                specific_stats: specificStats as Prisma.InputJsonValue,
            },
        });
    }
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

        if (foundUserId) {
            return `user_${foundUserId}`;
        }

        return `guest_${playerName}`;
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

    const matchDetail = match.match_details;

    if (match.deleted_at) {
        throw new Error("삭제된 게임에는 기록을 추가할 수 없습니다.");
    }

    assertCanManageTichuMatch({
        currentUser,
        createdBy: match.created_by,
    });

    const details = normalizeTichuRecordDetails(matchDetail.details);

    if (details.game_key !== TICHU_GAME_KEY) {
        throw new Error("티츄 게임 기록이 아닙니다.");
    }

    if (details.status !== "PLAYING") {
        throw new Error("진행 중인 티츄 게임에만 기록을 추가할 수 있습니다.");
    }

    const firstOutPlayerKey = input.firstOutPlayerKey.trim();
    const smallTichuPlayerKeys = uniquePlayerKeys(input.smallTichuPlayerKeys);
    const largeTichuPlayerKeys = uniquePlayerKeys(input.largeTichuPlayerKeys);

    validateTichuCallPlayerKeys({
        details,
        firstOutPlayerKey,
        smallTichuPlayerKeys,
        largeTichuPlayerKeys,
    });

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
        TEAM_A: details.teams.TEAM_A.score + scoreDeltas.TEAM_A,
        TEAM_B: details.teams.TEAM_B.score + scoreDeltas.TEAM_B,
    };

    const reachedTarget =
        totalScores.TEAM_A >= details.target_score ||
        totalScores.TEAM_B >= details.target_score;
    const hasWinnerByTarget = reachedTarget && totalScores.TEAM_A !== totalScores.TEAM_B;
    const shouldFinish = input.isForceFinish === true || hasWinnerByTarget;
    const winnerTeamKey = shouldFinish
        ? getWinnerTeamKeyFromScores(totalScores.TEAM_A, totalScores.TEAM_B)
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

    const nextDetails: NormalizedTichuRecordDetails = {
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

    const updateResult = await db.$transaction(async (tx) => {
        const result = await tx.match_details.updateMany({
            where: {
                match_id: matchDetail.match_id,
                version: input.expectedVersion,
            },
            data: {
                details: nextDetails as Prisma.InputJsonValue,
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

            await syncTichuUserStatsForUsers({
                gameId: game.id,
                userIds: getTichuUserIdsFromDetails(nextDetails),
                tx,
            });
        }

        return result;
    });

    if (updateResult.count !== 1) {
        throw new Error(
            "다른 사용자가 먼저 기록을 수정했습니다.\n새로고침 후 다시 시도해주세요.",
        );
    }

    if (shouldFinish) {
        await syncTichuAchievementsForMatch(input.matchId);
    }

    revalidateTichuMatchPaths(input.matchId);
}

async function getCurrentTichuManager() {
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
}) {
    if (currentUser.isAdmin) {
        return;
    }

    if (createdBy && currentUser.id === createdBy) {
        return;
    }

    throw new Error("게임 생성자 또는 관리자만 처리할 수 있습니다.");
}

async function applyTichuFinalScores({
                                         matchId,
                                         details,
                                         tx,
                                     }: {
    matchId: number;
    details: NormalizedTichuRecordDetails;
    tx: Prisma.TransactionClient;
}) {
    const teamAScore = details.teams.TEAM_A.score;
    const teamBScore = details.teams.TEAM_B.score;
    const winnerTeamKey =
        details.winner_team_key ?? getWinnerTeamKeyFromScores(teamAScore, teamBScore);

    const matchPlayers = await tx.match_players.findMany({
        where: {
            match_id: matchId,
        },
    });

    for (const matchPlayer of matchPlayers) {
        const playerKey = matchPlayer.user_id
            ? `user_${matchPlayer.user_id}`
            : `guest_${matchPlayer.guest_name}`;

        const teamKey = getTichuPlayerTeamKey(details, playerKey);

        if (!teamKey) {
            continue;
        }

        const finalScore =
            teamKey === "TEAM_A" ? details.teams.TEAM_A.score : details.teams.TEAM_B.score;

        await tx.match_players.update({
            where: {
                id: matchPlayer.id,
            },
            data: {
                final_score: finalScore,
                rank: getTichuTeamRank(teamKey, winnerTeamKey),
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
}) {
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
    details: NormalizedTichuRecordDetails,
    logs: unknown[],
): NormalizedTichuRecordDetails {
    const nextTeamScores: Record<TichuTeamKey, number> = {
        TEAM_A: 0,
        TEAM_B: 0,
    };

    logs.forEach((log) => {
        if (!isRecord(log)) {
            return;
        }

        const scoreDeltas = log.score_deltas;

        if (!isRecord(scoreDeltas)) {
            return;
        }

        const teamADelta =
            typeof scoreDeltas.TEAM_A === "number" ? scoreDeltas.TEAM_A : 0;
        const teamBDelta =
            typeof scoreDeltas.TEAM_B === "number" ? scoreDeltas.TEAM_B : 0;

        nextTeamScores.TEAM_A += teamADelta;
        nextTeamScores.TEAM_B += teamBDelta;
    });

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

function revalidateTichuMatchPaths(matchId: number) {
    revalidatePath("/tichu");
    revalidatePath("/tichu/matches");
    revalidatePath("/tichu/achievements");
    revalidatePath(`/tichu/play/${matchId}`);
    revalidatePath(`/tichu/detail/${matchId}`);
}

export async function deleteTichuMatch(matchId: number) {
    assertGameEnabledForAction(TICHU_GAME_KEY);

    const currentUser = await getCurrentTichuManager();

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
        throw new Error("티츄 게임 기록을 찾을 수 없습니다.");
    }

    if (match.games.key !== TICHU_GAME_KEY) {
        throw new Error("티츄 게임 기록이 아닙니다.");
    }

    assertCanManageTichuMatch({
        currentUser,
        createdBy: match.created_by,
    });

    const details = normalizeTichuRecordDetails(match.match_details.details);

    if (match.deleted_at || details.status === "DELETED") {
        return;
    }

    const userIds = getTichuUserIdsFromDetails(details);
    const deletedAt = new Date();

    const nextDetails: NormalizedTichuRecordDetails = {
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
                details: nextDetails as Prisma.InputJsonValue,
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

        await syncTichuUserStatsForUsers({
            gameId: match.games.id,
            userIds,
            tx,
        });
    });

    await syncTichuAchievementsForMatch(matchId);

    revalidateTichuMatchPaths(matchId);
}

export async function undoTichuLastLog(matchId: number) {
    assertGameEnabledForAction(TICHU_GAME_KEY);

    const currentUser = await getCurrentTichuManager();

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
        throw new Error("티츄 게임 기록을 찾을 수 없습니다.");
    }

    if (match.games.key !== TICHU_GAME_KEY) {
        throw new Error("티츄 게임 기록이 아닙니다.");
    }

    assertCanManageTichuMatch({
        currentUser,
        createdBy: match.created_by,
    });

    if (match.deleted_at) {
        throw new Error("삭제된 게임은 실행취소할 수 없습니다.");
    }

    const details = normalizeTichuRecordDetails(match.match_details.details);

    if (details.status === "DELETED") {
        throw new Error("삭제된 게임은 실행취소할 수 없습니다.");
    }

    if (details.logs.length === 0) {
        throw new Error("되돌릴 라운드 기록이 없습니다.");
    }

    const willRestoreFinishedMatch = details.status === "FINISHED";

    if (willRestoreFinishedMatch) {
        await assertTichuCreatorHasNoOtherPlayingMatch({
            matchId,
            createdBy: match.created_by,
        });
    }

    const userIds = getTichuUserIdsFromDetails(details);
    const nextLogs = details.logs.slice(0, -1);
    const nextDetails = rebuildTichuDetailsAfterUndo(details, nextLogs);

    await db.$transaction(async (tx) => {
        await tx.match_details.update({
            where: {
                match_id: matchId,
            },
            data: {
                details: nextDetails as Prisma.InputJsonValue,
                version: {
                    increment: 1,
                },
            },
        });

        await clearTichuFinalScores({
            matchId,
            tx,
        });

        await syncTichuUserStatsForUsers({
            gameId: match.games.id,
            userIds,
            tx,
        });
    });

    await syncTichuAchievementsForMatch(matchId);

    revalidateTichuMatchPaths(matchId);
}