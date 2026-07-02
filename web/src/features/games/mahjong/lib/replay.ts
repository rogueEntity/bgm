// web/src/features/games/mahjong/lib/replay.ts
import {
    cloneMahjongPlayers,
    normalizeLog,
} from "./details";
import {
    getModeLimitIdx,
    getNextRound,
    rotateWinds,
} from "./round";
import {
    createEmptyScoreMap,
    getRiichiStickReceiverKey,
    recalculateWins,
} from "./win";
import { getPlayerKeyFromMatchPlayer } from "./stats";

import type {
    MahjongDetails,
    MahjongPlayerState,
    MahjongScoreMap,
} from "../types";

export function createInitialPlayersForReplay({
                                                  details,
                                                  matchPlayers,
                                              }: {
    details: MahjongDetails;
    matchPlayers: {
        id?: number;
        user_id: string | null;
        guest_name: string | null;
    }[];
}) {
    if (
        details.initial_players &&
        Object.keys(details.initial_players).length > 0
    ) {
        return cloneMahjongPlayers(details.initial_players);
    }

    const firstLog = details.logs[0];

    const firstResultScores =
        typeof firstLog?.result_scores === "object" &&
        firstLog.result_scores !== null
            ? (firstLog.result_scores as Record<string, number>)
            : {};

    const firstScoreDeltas =
        typeof firstLog?.score_deltas === "object" && firstLog.score_deltas !== null
            ? (firstLog.score_deltas as Record<string, number>)
            : {};

    const sortedMatchPlayers = [...matchPlayers].sort(
        (a, b) => (a.id ?? 0) - (b.id ?? 0),
    );

    const winds: MahjongPlayerState["wind"][] = [
        "EAST",
        "SOUTH",
        "WEST",
        "NORTH",
    ];

    return sortedMatchPlayers.reduce<Record<string, MahjongPlayerState>>(
        (acc, matchPlayer, index) => {
            const playerKey = getPlayerKeyFromMatchPlayer(matchPlayer);
            const resultScore = Number(
                firstResultScores[playerKey] ?? details.players[playerKey]?.score ?? 25000,
            );
            const scoreDelta = Number(firstScoreDeltas[playerKey] ?? 0);

            acc[playerKey] = {
                wind: winds[index] ?? "EAST",
                score: resultScore - scoreDelta,
            };

            return acc;
        },
        {},
    );
}

function createReplayBaseDetails({
                                     details,
                                     initialPlayers,
                                 }: {
    details: MahjongDetails;
    initialPlayers: Record<string, MahjongPlayerState>;
}): MahjongDetails {
    return {
        schema_version: details.schema_version || 2,
        current_round: "EAST_1",
        honba: 0,
        riichi_sticks: 0,
        players: cloneMahjongPlayers(initialPlayers),
        initial_players: cloneMahjongPlayers(initialPlayers),
        logs: [],
        game_mode: details.game_mode,
        status: "PLAYING",
        stats_applied: false,
    };
}

function applyAgariLogForReplay(
    details: MahjongDetails,
    sourceLog: Record<string, any>,
) {
    const players = details.players;
    const currentRound = details.current_round;
    const currentHonba = details.honba || 0;
    const initialScores: MahjongScoreMap = {};

    Object.keys(players).forEach((key) => {
        initialScores[key] = players[key].score;
    });

    const riichiKeys = Array.isArray(sourceLog.riichi_keys)
        ? sourceLog.riichi_keys
        : [];

    riichiKeys.forEach((key) => {
        if (!players[key]) return;
        players[key].score -= 1000;
    });

    const wins = recalculateWins({
        wins: Array.isArray(sourceLog.wins) ? sourceLog.wins : [],
        players,
        is_tsumo: Boolean(sourceLog.is_tsumo),
    });

    if (wins.length === 0) {
        throw new Error("리플레이할 화료 기록에 화료 정보가 없습니다.");
    }

    const totalRiichiSticks = (details.riichi_sticks || 0) + riichiKeys.length;

    const normalizedWins = wins.map((win) => ({
        ...win,
        score_deltas: createEmptyScoreMap(players),
    }));

    const riichiStickReceiverKey = getRiichiStickReceiverKey({
        wins: normalizedWins,
        players,
        is_tsumo: Boolean(sourceLog.is_tsumo),
    });

    normalizedWins.forEach((win) => {
        const winner = players[win.winner_key];
        const isWinnerOya = winner.wind === "EAST";
        let collected = 0;

        if (sourceLog.is_tsumo) {
            if (isWinnerOya) {
                const basePayment = Math.ceil(win.base_score / 3 / 100) * 100;

                Object.keys(players).forEach((key) => {
                    if (key === win.winner_key) return;

                    const payment = basePayment + currentHonba * 100;
                    players[key].score -= payment;
                    win.score_deltas[key] -= payment;
                    collected += payment;
                });
            } else {
                const childBasePayment = Math.ceil(win.base_score / 4 / 100) * 100;
                const oyaBasePayment = win.base_score - childBasePayment * 2;

                Object.keys(players).forEach((key) => {
                    if (key === win.winner_key) return;

                    const payment =
                        players[key].wind === "EAST"
                            ? oyaBasePayment + currentHonba * 100
                            : childBasePayment + currentHonba * 100;

                    players[key].score -= payment;
                    win.score_deltas[key] -= payment;
                    collected += payment;
                });
            }
        } else {
            const loserKey = win.loser_key as string;
            const payment = win.base_score + currentHonba * 300;

            players[loserKey].score -= payment;
            win.score_deltas[loserKey] -= payment;
            collected += payment;
        }

        players[win.winner_key].score += collected;
        win.score_deltas[win.winner_key] += collected;
    });

    if (totalRiichiSticks > 0) {
        const riichiStickPoint = totalRiichiSticks * 1000;
        players[riichiStickReceiverKey].score += riichiStickPoint;

        const receiverWin = normalizedWins.find(
            (win) => win.winner_key === riichiStickReceiverKey,
        );

        if (receiverWin) {
            receiverWin.score_deltas[riichiStickReceiverKey] += riichiStickPoint;
        }
    }

    details.riichi_sticks = 0;

    const scoreDeltas: MahjongScoreMap = {};
    const resultScores: MahjongScoreMap = {};

    Object.keys(players).forEach((key) => {
        scoreDeltas[key] = players[key].score - initialScores[key];
        resultScores[key] = players[key].score;
    });

    const topScore = Math.max(
        ...Object.values(players).map((player) => player.score),
    );

    const oyaWin = normalizedWins.find(
        (win) => players[win.winner_key].wind === "EAST",
    );

    const isOyaWin = Boolean(oyaWin);
    const mainWinnerKey = oyaWin?.winner_key ?? normalizedWins[0].winner_key;
    const winnerScore = players[mainWinnerKey].score;
    const isTobi = Object.values(players).some((player) => player.score <= 0);

    const [wind, roundStr] = details.current_round.split("_");
    const roundMap: Record<string, number> = {
        EAST: 1,
        SOUTH: 2,
        WEST: 3,
        NORTH: 4,
    };

    const currentWindIdx = roundMap[wind];
    const modeLimitIdx = getModeLimitIdx(details.game_mode);
    const roundNum = Number.parseInt(roundStr, 10);
    const isAllLast = currentWindIdx === modeLimitIdx && roundNum === 4;
    const isExtraRound = currentWindIdx > modeLimitIdx;
    const isFinal = Boolean(sourceLog.is_final);
    const forcedEnd = Boolean(sourceLog.forced_end);

    if (isTobi || forcedEnd || isFinal) {
        details.status = "FINISHED";

        if (forcedEnd) {
            details.finish_reason = "FORCE_FINISH";
        } else if (isTobi) {
            details.finish_reason = "TOBI";
        } else {
            details.finish_reason = "NORMAL";
        }
    } else if (isOyaWin) {
        details.honba = currentHonba + 1;

        if (
            (isAllLast || isExtraRound) &&
            winnerScore >= 30000 &&
            winnerScore === topScore
        ) {
            details.status = "FINISHED";
            details.finish_reason = "NORMAL";
        }
    } else if ((isAllLast || isExtraRound) && topScore >= 30000) {
        details.status = "FINISHED";
        details.finish_reason = "NORMAL";
    } else {
        const absoluteLimitIdx =
            details.game_mode === "전장전" ? 4 : modeLimitIdx + 1;
        const isAbsoluteLast = currentWindIdx === absoluteLimitIdx && roundNum === 4;

        if (isAbsoluteLast) {
            details.status = "FINISHED";
            details.finish_reason = "MAX_ROUND_REACHED";
        } else {
            const nextRound = getNextRound(details.current_round);

            if (nextRound) {
                details.current_round = nextRound;
                details.honba = 0;
                rotateWinds(players);
            } else {
                details.status = "FINISHED";
                details.finish_reason = "MAX_ROUND_REACHED";
            }
        }
    }

    if (details.status === "FINISHED") {
        details.current_round = currentRound;
        details.honba = currentHonba;
    }

    details.logs.push({
        ...sourceLog,
        type: "AGARI",
        round: currentRound,
        honba: currentHonba,
        is_tsumo: Boolean(sourceLog.is_tsumo),
        is_final: details.status === "FINISHED",
        forced_end: details.finish_reason === "FORCE_FINISH",
        riichi_keys: riichiKeys,
        wins: normalizedWins,
        score_deltas: scoreDeltas,
        result_scores: resultScores,
    });
}

function applyRyuukyokuLogForReplay(
    details: MahjongDetails,
    sourceLog: Record<string, any>,
) {
    const players = details.players;
    const currentRound = details.current_round;
    const currentHonba = details.honba || 0;
    const ryuukyokuType = String(sourceLog.ryuukyoku_type ?? "황패유국");

    const isExhaustive = ryuukyokuType === "황패유국";
    const isNagashiMangan = ryuukyokuType === "유국만관";

    const tenpaiKeys = Array.isArray(sourceLog.tenpai_keys)
        ? sourceLog.tenpai_keys
        : [];

    const riichiKeys = Array.isArray(sourceLog.riichi_keys)
        ? sourceLog.riichi_keys
        : [];

    const initialScores: MahjongScoreMap = {};

    Object.keys(players).forEach((key) => {
        initialScores[key] = players[key].score;
    });

    riichiKeys.forEach((key) => {
        if (players[key]) {
            players[key].score -= 1000;
        }
    });

    details.riichi_sticks = details.riichi_sticks + riichiKeys.length;

    let isOyaTenpai: boolean;

    if (isNagashiMangan) {
        const winnerKeys = Array.from(
            new Set(
                Array.isArray(sourceLog.nagashi_mangan_winner_keys)
                    ? sourceLog.nagashi_mangan_winner_keys
                    : [],
            ),
        );

        const allKeys = Object.keys(players);

        winnerKeys.forEach((winnerKey) => {
            const winner = players[winnerKey];
            if (!winner) return;

            const isWinnerOya = winner.wind === "EAST";
            let collected = 0;

            allKeys.forEach((payerKey) => {
                if (payerKey === winnerKey) return;

                const payment = isWinnerOya
                    ? 4000
                    : players[payerKey].wind === "EAST"
                        ? 4000
                        : 2000;

                players[payerKey].score -= payment;
                collected += payment;
            });

            players[winnerKey].score += collected;
        });

        isOyaTenpai = tenpaiKeys.some((key) => players[key]?.wind === "EAST");
    } else if (isExhaustive) {
        const allKeys = Object.keys(players);
        const tenpaiCount = tenpaiKeys.length;

        isOyaTenpai = tenpaiKeys.some((key) => players[key]?.wind === "EAST");

        if (tenpaiCount > 0 && tenpaiCount < 4) {
            const reward = 3000 / tenpaiCount;
            const penalty = 3000 / (4 - tenpaiCount);

            allKeys.forEach((key) => {
                if (tenpaiKeys.includes(key)) {
                    players[key].score += reward;
                } else {
                    players[key].score -= penalty;
                }
            });
        }
    } else {
        isOyaTenpai = true;
    }

    const scoreDeltas: MahjongScoreMap = {};
    const resultScores: MahjongScoreMap = {};

    Object.keys(players).forEach((key) => {
        scoreDeltas[key] = players[key].score - initialScores[key];
        resultScores[key] = players[key].score;
    });

    const oyaKey = Object.keys(players).find(
        (key) => players[key].wind === "EAST",
    ) as string;

    const oyaScore = players[oyaKey].score;
    const topScore = Math.max(
        ...Object.values(players).map((player) => player.score),
    );

    const isTobi = Object.values(players).some((player) => player.score <= 0);
    const [wind, roundStr] = details.current_round.split("_");
    const roundMap: Record<string, number> = {
        EAST: 1,
        SOUTH: 2,
        WEST: 3,
        NORTH: 4,
    };

    const currentWindIdx = roundMap[wind];
    const modeLimitIdx = getModeLimitIdx(details.game_mode);
    const roundNum = Number.parseInt(roundStr, 10);
    const isAllLast = currentWindIdx === modeLimitIdx && roundNum === 4;
    const isExtraRound = currentWindIdx > modeLimitIdx;
    const forcedEnd = Boolean(sourceLog.forced_end);
    const isFinal = Boolean(sourceLog.is_final);

    if (isTobi || forcedEnd || isFinal) {
        details.status = "FINISHED";

        if (forcedEnd) {
            details.finish_reason = "FORCE_FINISH";
        } else if (isTobi) {
            details.finish_reason = "TOBI";
        } else {
            details.finish_reason = "NORMAL";
        }
    } else {
        details.honba = currentHonba + 1;

        if (isOyaTenpai) {
            if (
                (isAllLast || isExtraRound) &&
                oyaScore >= 30000 &&
                oyaScore === topScore
            ) {
                details.status = "FINISHED";
                details.finish_reason = "NORMAL";
            }
        } else if ((isAllLast || isExtraRound) && topScore >= 30000) {
            details.status = "FINISHED";
            details.finish_reason = "NORMAL";
        } else {
            const absoluteLimitIdx =
                details.game_mode === "전장전" ? 4 : modeLimitIdx + 1;
            const isAbsoluteLast =
                currentWindIdx === absoluteLimitIdx && roundNum === 4;

            if (isAbsoluteLast) {
                details.status = "FINISHED";
                details.finish_reason = "MAX_ROUND_REACHED";
            } else {
                const nextRound = getNextRound(details.current_round);

                if (nextRound) {
                    details.current_round = nextRound;
                    rotateWinds(players);
                } else {
                    details.status = "FINISHED";
                    details.finish_reason = "MAX_ROUND_REACHED";
                }
            }
        }
    }

    if (details.status === "FINISHED") {
        details.current_round = currentRound;
        details.honba = currentHonba;
    }

    details.logs.push({
        ...sourceLog,
        type: "RYUUKYOKU",
        round: currentRound,
        honba: currentHonba,
        ryuukyoku_type: ryuukyokuType,
        is_final: details.status === "FINISHED",
        forced_end: details.finish_reason === "FORCE_FINISH",
        tenpai_keys: isExhaustive || isNagashiMangan ? tenpaiKeys : [],
        nagashi_mangan_winner_keys: isNagashiMangan
            ? Array.from(
                new Set(
                    Array.isArray(sourceLog.nagashi_mangan_winner_keys)
                        ? sourceLog.nagashi_mangan_winner_keys
                        : [],
                ),
            )
            : [],
        riichi_keys: riichiKeys,
        score_deltas: scoreDeltas,
        result_scores: resultScores,
    });
}

export function rebuildMahjongDetailsFromLogs({
                                                  originalDetails,
                                                  initialPlayers,
                                                  logs,
                                              }: {
    originalDetails: MahjongDetails;
    initialPlayers: Record<string, MahjongPlayerState>;
    logs: Record<string, any>[];
}) {
    const rebuiltDetails = createReplayBaseDetails({
        details: originalDetails,
        initialPlayers,
    });

    logs.forEach((log) => {
        if (log.type === "AGARI") {
            applyAgariLogForReplay(rebuiltDetails, log);
            return;
        }

        if (log.type === "RYUUKYOKU") {
            applyRyuukyokuLogForReplay(rebuiltDetails, log);
        }
    });

    rebuiltDetails.logs = rebuiltDetails.logs.map((log) => normalizeLog(log));

    rebuiltDetails.stats_applied = false;

    return rebuiltDetails;
}