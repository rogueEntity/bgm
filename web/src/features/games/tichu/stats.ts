// web/src/features/games/tichu/stats.ts

import { Prisma } from "@prisma/client";

import {
    CalculateTichuEloChangeParams,
    RawTichuMatchDetails,
    TichuCallLog,
    TichuCallResult,
    TichuEloChangeResult,
    TichuMatchDetails,
    TichuPlayerState,
    TichuRoundLog,
    TichuSpecificStats,
    TichuStatus,
    TichuTeamKey,
    TichuTeamState,
    TichuUserGameSpecificStats,
} from "@/features/games/tichu/types";

type JsonRecord = Record<string, unknown>;

type SyncAllTichuUserStatsParams = {
    gameId: number;
    tx: Prisma.TransactionClient;
};

const DEFAULT_TICHU_MMR = 1500;
const TICHU_ELO_K_FACTOR = 32;
const TICHU_ELO_DIVISOR = 400;
const TICHU_SCORE_DIFF_DIVISOR = 1000;
const TICHU_MAX_SCORE_MULTIPLIER_BONUS = 0.5;

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown, fallback = 0): number {
    return typeof value === "number" && Number.isFinite(value)
        ? value
        : fallback;
}

function toInteger(value: unknown, fallback = 0): number {
    const numberValue = toFiniteNumber(value, fallback);

    return Number.isInteger(numberValue)
        ? numberValue
        : Math.trunc(numberValue);
}

function isTichuTeamKey(value: unknown): value is TichuTeamKey {
    return value === "TEAM_A" || value === "TEAM_B";
}

function isTichuStatus(value: unknown): value is TichuStatus {
    return (
        value === "PLAYING" ||
        value === "FINISHED" ||
        value === "DELETED"
    );
}

function isTichuCallResult(value: unknown): value is TichuCallResult {
    return value === "SUCCESS" || value === "FAIL";
}

function normalizeString(value: unknown, fallback = ""): string {
    return typeof value === "string" ? value : fallback;
}

function normalizeNullableString(value: unknown): string | null {
    return typeof value === "string" ? value : null;
}

function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter(
        (item): item is string => typeof item === "string",
    );
}

function normalizeTichuCallLog(value: unknown): TichuCallLog | null {
    if (!isRecord(value)) {
        return null;
    }

    if (
        typeof value.player_key !== "string" ||
        !isTichuCallResult(value.result)
    ) {
        return null;
    }

    return {
        player_key: value.player_key,
        result: value.result,
        score_delta: toInteger(value.score_delta),
    };
}

function normalizeTichuCallLogs(value: unknown): TichuCallLog[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map(normalizeTichuCallLog)
        .filter((call): call is TichuCallLog => call !== null);
}

function normalizeTichuScoreRecord(
    value: unknown,
): Record<TichuTeamKey, number> {
    if (!isRecord(value)) {
        return {
            TEAM_A: 0,
            TEAM_B: 0,
        };
    }

    return {
        TEAM_A: toInteger(value.TEAM_A),
        TEAM_B: toInteger(value.TEAM_B),
    };
}

function normalizeTichuRoundLog(value: unknown): TichuRoundLog | null {
    if (!isRecord(value)) {
        return null;
    }

    if (typeof value.first_out_player_key !== "string") {
        return null;
    }

    return {
        round: Math.max(1, toInteger(value.round, 1)),
        first_out_player_key: value.first_out_player_key,
        team_a_card_score:
            value.team_a_card_score === null
                ? null
                : toInteger(value.team_a_card_score),
        team_b_card_score:
            value.team_b_card_score === null
                ? null
                : toInteger(value.team_b_card_score),
        one_two_team_key: isTichuTeamKey(value.one_two_team_key)
            ? value.one_two_team_key
            : null,
        small_tichu_calls: normalizeTichuCallLogs(
            value.small_tichu_calls,
        ),
        large_tichu_calls: normalizeTichuCallLogs(
            value.large_tichu_calls,
        ),
        score_deltas: normalizeTichuScoreRecord(value.score_deltas),
        total_scores: normalizeTichuScoreRecord(value.total_scores),
        created_at: normalizeString(value.created_at),
    };
}

function normalizeTichuRoundLogs(value: unknown): TichuRoundLog[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map(normalizeTichuRoundLog)
        .filter((log): log is TichuRoundLog => log !== null);
}

function normalizeTichuPlayerState(
    value: unknown,
): TichuPlayerState | null {
    if (!isRecord(value) || !isTichuTeamKey(value.team_key)) {
        return null;
    }

    return {
        name: normalizeString(value.name),
        team_key: value.team_key,
        seat_order: toInteger(value.seat_order),
    };
}

function normalizeTichuPlayers(
    value: unknown,
): Record<string, TichuPlayerState> {
    if (!isRecord(value)) {
        return {};
    }

    const players: Record<string, TichuPlayerState> = {};

    for (const [playerKey, rawPlayer] of Object.entries(value)) {
        const player = normalizeTichuPlayerState(rawPlayer);

        if (player) {
            players[playerKey] = player;
        }
    }

    return players;
}

function normalizeTichuTeamState(
    value: unknown,
    fallbackName: string,
): TichuTeamState {
    if (!isRecord(value)) {
        return {
            name: fallbackName,
            score: 0,
            player_keys: [],
        };
    }

    return {
        name: normalizeString(value.name, fallbackName),
        score: toInteger(value.score),
        player_keys: normalizeStringArray(value.player_keys),
    };
}

function normalizeTichuTeams(
    value: unknown,
): Record<TichuTeamKey, TichuTeamState> {
    const teams = isRecord(value) ? value : {};

    return {
        TEAM_A: normalizeTichuTeamState(teams.TEAM_A, "A팀"),
        TEAM_B: normalizeTichuTeamState(teams.TEAM_B, "B팀"),
    };
}

export function normalizeTichuMatchDetails(
    value: unknown,
): TichuMatchDetails {
    if (!isRecord(value)) {
        throw new Error("티츄 상세 기록 형식이 올바르지 않습니다.");
    }

    const raw = value as RawTichuMatchDetails;

    return {
        schema_version: Math.max(
            1,
            toInteger(raw.schema_version, 1),
        ),
        game_key: normalizeString(raw.game_key, "tichu"),
        status: isTichuStatus(raw.status)
            ? raw.status
            : "PLAYING",
        current_round: Math.max(
            1,
            toInteger(raw.current_round, 1),
        ),
        target_score: Math.max(
            1,
            toInteger(raw.target_score, 1000),
        ),
        winner_team_key: isTichuTeamKey(raw.winner_team_key)
            ? raw.winner_team_key
            : null,
        finished_at: normalizeNullableString(raw.finished_at),
        teams: normalizeTichuTeams(raw.teams),
        players: normalizeTichuPlayers(raw.players),
        logs: normalizeTichuRoundLogs(raw.logs),
        stats_applied: raw.stats_applied === true,
    };
}

export function getUserIdFromTichuPlayerKey(
    playerKey: string,
): string | null {
    if (!playerKey.startsWith("user_")) {
        return null;
    }

    const userId = playerKey.slice("user_".length);

    return userId.length > 0 ? userId : null;
}

export function getTichuUserIdsFromDetails(
    details: TichuMatchDetails,
): string[] {
    return [
        ...new Set(
            Object.keys(details.players)
                .map(getUserIdFromTichuPlayerKey)
                .filter((userId): userId is string => userId !== null),
        ),
    ];
}

export function getOppositeTichuTeamKey(
    teamKey: TichuTeamKey,
): TichuTeamKey {
    return teamKey === "TEAM_A" ? "TEAM_B" : "TEAM_A";
}

export function createEmptyTichuStats(): TichuSpecificStats {
    return {
        play_count: 0,
        win_count: 0,
        loss_count: 0,
        draw_count: 0,
        round_count: 0,

        tichu_calls: 0,
        tichu_successes: 0,
        tichu_failures: 0,

        grand_tichu_calls: 0,
        grand_tichu_successes: 0,
        grand_tichu_failures: 0,

        first_out_count: 0,

        one_two_success_count: 0,
        one_two_suffered_count: 0,

        total_score_diff: 0,
        best_score_diff: 0,
        worst_score_diff: 0,
    };
}

export function calculateTichuExpectedScore(
    myTeamRating: number,
    opponentTeamRating: number,
): number {
    return (
        1 /
        (1 +
            Math.pow(
                10,
                (opponentTeamRating - myTeamRating) /
                TICHU_ELO_DIVISOR,
            ))
    );
}

export function calculateTichuScoreMultiplier(
    scoreDiff: number,
): number {
    return (
        1 +
        Math.min(
            Math.abs(scoreDiff) / TICHU_SCORE_DIFF_DIVISOR,
            TICHU_MAX_SCORE_MULTIPLIER_BONUS,
        )
    );
}

export function calculateTichuEloChange({
                                            teamARating,
                                            teamBRating,
                                            teamAScore,
                                            teamBScore,
                                        }: CalculateTichuEloChangeParams): TichuEloChangeResult {
    const expectedA = calculateTichuExpectedScore(
        teamARating,
        teamBRating,
    );
    const expectedB = 1 - expectedA;

    const actualA =
        teamAScore > teamBScore
            ? 1
            : teamAScore < teamBScore
                ? 0
                : 0.5;
    const actualB = 1 - actualA;

    const scoreMultiplier = calculateTichuScoreMultiplier(
        teamAScore - teamBScore,
    );

    const teamAChange = Math.round(
        TICHU_ELO_K_FACTOR *
        scoreMultiplier *
        (actualA - expectedA),
    );

    return {
        teamAChange,
        teamBChange: -teamAChange,
        expectedA,
        expectedB,
        actualA,
        actualB,
        scoreMultiplier,
    };
}

function getPlayerKeysByTeam(
    details: TichuMatchDetails,
    teamKey: TichuTeamKey,
): string[] {
    const configuredKeys = details.teams[teamKey].player_keys.filter(
        (playerKey) => details.players[playerKey]?.team_key === teamKey,
    );

    if (configuredKeys.length > 0) {
        return configuredKeys;
    }

    return Object.entries(details.players)
        .filter(([, player]) => player.team_key === teamKey)
        .map(([playerKey]) => playerKey);
}

function getPlayerRating(
    playerKey: string,
    ratingsByUserId: Map<string, number>,
): number {
    const userId = getUserIdFromTichuPlayerKey(playerKey);

    if (!userId) {
        return DEFAULT_TICHU_MMR;
    }

    return ratingsByUserId.get(userId) ?? DEFAULT_TICHU_MMR;
}

function getTeamRating(
    playerKeys: string[],
    ratingsByUserId: Map<string, number>,
): number {
    if (playerKeys.length === 0) {
        return DEFAULT_TICHU_MMR;
    }

    const totalRating = playerKeys.reduce(
        (sum, playerKey) =>
            sum + getPlayerRating(playerKey, ratingsByUserId),
        0,
    );

    return totalRating / playerKeys.length;
}

function ensureUserStats(
    userId: string,
    statsByUserId: Map<string, TichuSpecificStats>,
): TichuSpecificStats {
    const existingStats = statsByUserId.get(userId);

    if (existingStats) {
        return existingStats;
    }

    const emptyStats = createEmptyTichuStats();

    statsByUserId.set(userId, emptyStats);

    return emptyStats;
}

function applyScoreDiffToStats(
    stats: TichuSpecificStats,
    scoreDiff: number,
): void {
    if (stats.play_count === 0) {
        stats.best_score_diff = scoreDiff;
        stats.worst_score_diff = scoreDiff;
    } else {
        stats.best_score_diff = Math.max(
            stats.best_score_diff,
            scoreDiff,
        );
        stats.worst_score_diff = Math.min(
            stats.worst_score_diff,
            scoreDiff,
        );
    }

    stats.total_score_diff += scoreDiff;
}

function applyCallLogToStats(
    call: TichuCallLog,
    statsByUserId: Map<string, TichuSpecificStats>,
    callType: "SMALL" | "LARGE",
): void {
    const userId = getUserIdFromTichuPlayerKey(call.player_key);

    if (!userId) {
        return;
    }

    const stats = ensureUserStats(userId, statsByUserId);

    if (callType === "SMALL") {
        stats.tichu_calls += 1;

        if (call.result === "SUCCESS") {
            stats.tichu_successes += 1;
        } else {
            stats.tichu_failures += 1;
        }

        return;
    }

    stats.grand_tichu_calls += 1;

    if (call.result === "SUCCESS") {
        stats.grand_tichu_successes += 1;
    } else {
        stats.grand_tichu_failures += 1;
    }
}

function applyRoundLogToStats(
    details: TichuMatchDetails,
    log: TichuRoundLog,
    statsByUserId: Map<string, TichuSpecificStats>,
): void {
    const firstOutUserId = getUserIdFromTichuPlayerKey(
        log.first_out_player_key,
    );

    if (firstOutUserId) {
        ensureUserStats(
            firstOutUserId,
            statsByUserId,
        ).first_out_count += 1;
    }

    if (log.one_two_team_key) {
        const successTeamKey = log.one_two_team_key;
        const sufferedTeamKey =
            getOppositeTichuTeamKey(successTeamKey);

        for (const playerKey of getPlayerKeysByTeam(
            details,
            successTeamKey,
        )) {
            const userId = getUserIdFromTichuPlayerKey(playerKey);

            if (userId) {
                ensureUserStats(
                    userId,
                    statsByUserId,
                ).one_two_success_count += 1;
            }
        }

        for (const playerKey of getPlayerKeysByTeam(
            details,
            sufferedTeamKey,
        )) {
            const userId = getUserIdFromTichuPlayerKey(playerKey);

            if (userId) {
                ensureUserStats(
                    userId,
                    statsByUserId,
                ).one_two_suffered_count += 1;
            }
        }
    }

    for (const call of log.small_tichu_calls) {
        applyCallLogToStats(call, statsByUserId, "SMALL");
    }

    for (const call of log.large_tichu_calls) {
        applyCallLogToStats(call, statsByUserId, "LARGE");
    }
}

function applyMatchToStats(
    details: TichuMatchDetails,
    statsByUserId: Map<string, TichuSpecificStats>,
): void {
    const teamAScore = details.teams.TEAM_A.score;
    const teamBScore = details.teams.TEAM_B.score;

    for (const [playerKey, player] of Object.entries(
        details.players,
    )) {
        const userId = getUserIdFromTichuPlayerKey(playerKey);

        if (!userId) {
            continue;
        }

        const stats = ensureUserStats(userId, statsByUserId);
        const myScore =
            player.team_key === "TEAM_A"
                ? teamAScore
                : teamBScore;
        const opponentScore =
            player.team_key === "TEAM_A"
                ? teamBScore
                : teamAScore;
        const scoreDiff = myScore - opponentScore;

        applyScoreDiffToStats(stats, scoreDiff);

        stats.play_count += 1;
        stats.round_count += details.logs.length;

        if (scoreDiff > 0) {
            stats.win_count += 1;
        } else if (scoreDiff < 0) {
            stats.loss_count += 1;
        } else {
            stats.draw_count += 1;
        }
    }

    for (const log of details.logs) {
        applyRoundLogToStats(details, log, statsByUserId);
    }
}

function applyMatchToRatings(
    details: TichuMatchDetails,
    ratingsByUserId: Map<string, number>,
): void {
    const teamAPlayerKeys = getPlayerKeysByTeam(
        details,
        "TEAM_A",
    );
    const teamBPlayerKeys = getPlayerKeysByTeam(
        details,
        "TEAM_B",
    );

    const teamARating = getTeamRating(
        teamAPlayerKeys,
        ratingsByUserId,
    );
    const teamBRating = getTeamRating(
        teamBPlayerKeys,
        ratingsByUserId,
    );

    const eloChange = calculateTichuEloChange({
        teamARating,
        teamBRating,
        teamAScore: details.teams.TEAM_A.score,
        teamBScore: details.teams.TEAM_B.score,
    });

    for (const playerKey of teamAPlayerKeys) {
        const userId = getUserIdFromTichuPlayerKey(playerKey);

        if (!userId) {
            continue;
        }

        const currentRating =
            ratingsByUserId.get(userId) ?? DEFAULT_TICHU_MMR;

        ratingsByUserId.set(
            userId,
            currentRating + eloChange.teamAChange,
        );
    }

    for (const playerKey of teamBPlayerKeys) {
        const userId = getUserIdFromTichuPlayerKey(playerKey);

        if (!userId) {
            continue;
        }

        const currentRating =
            ratingsByUserId.get(userId) ?? DEFAULT_TICHU_MMR;

        ratingsByUserId.set(
            userId,
            currentRating + eloChange.teamBChange,
        );
    }
}

/**
 * 티츄 통계와 MMR은 종료 경기 전체를 시간순으로 다시 계산한다.
 *
 * Elo는 한 경기의 결과가 다음 경기의 팀 레이팅에 영향을 주기 때문에
 * 특정 사용자만 부분 재계산하면 이후 상대 선수의 MMR까지 어긋날 수 있다.
 */
export async function syncAllTichuUserStats({
                                                gameId,
                                                tx,
                                            }: SyncAllTichuUserStatsParams): Promise<void> {
    const [finishedMatchCandidates, existingStatsRows] =
        await Promise.all([
            tx.matches.findMany({
                where: {
                    game_id: gameId,
                    deleted_at: null,
                },
                select: {
                    id: true,
                    play_date: true,
                    match_details: {
                        select: {
                            details: true,
                        },
                    },
                },
                orderBy: [
                    {
                        play_date: "asc",
                    },
                    {
                        id: "asc",
                    },
                ],
            }),
            tx.user_game_stats.findMany({
                where: {
                    game_id: gameId,
                },
                select: {
                    user_id: true,
                },
            }),
        ]);

    const statsByUserId = new Map<
        string,
        TichuSpecificStats
    >();
    const ratingsByUserId = new Map<string, number>();
    const knownUserIds = new Set(
        existingStatsRows.map((row) => row.user_id),
    );

    for (const match of finishedMatchCandidates) {
        if (!match.match_details) {
            continue;
        }

        let details: TichuMatchDetails;

        try {
            details = normalizeTichuMatchDetails(
                match.match_details.details,
            );
        } catch {
            continue;
        }

        if (
            details.status !== "FINISHED" ||
            !details.stats_applied
        ) {
            continue;
        }

        const matchUserIds = getTichuUserIdsFromDetails(details);

        for (const userId of matchUserIds) {
            knownUserIds.add(userId);

            if (!statsByUserId.has(userId)) {
                statsByUserId.set(
                    userId,
                    createEmptyTichuStats(),
                );
            }

            if (!ratingsByUserId.has(userId)) {
                ratingsByUserId.set(
                    userId,
                    DEFAULT_TICHU_MMR,
                );
            }
        }

        applyMatchToStats(details, statsByUserId);
        applyMatchToRatings(details, ratingsByUserId);
    }

    for (const userId of knownUserIds) {
        const tichuStats =
            statsByUserId.get(userId) ??
            createEmptyTichuStats();
        const mmr =
            ratingsByUserId.get(userId) ??
            DEFAULT_TICHU_MMR;

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
                accumulated_score:
                tichuStats.total_score_diff,
                average_rank: null,
                mmr,
                specific_stats:
                    specificStats as Prisma.InputJsonValue,
            },
            create: {
                user_id: userId,
                game_id: gameId,
                play_count: tichuStats.play_count,
                accumulated_score:
                tichuStats.total_score_diff,
                average_rank: null,
                mmr,
                specific_stats:
                    specificStats as Prisma.InputJsonValue,
            },
        });
    }
}