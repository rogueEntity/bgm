// web/src/features/games/mahjong/lib/record.ts

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

import type {
    MahjongDetails,
    MahjongScoreMap,
    RecordMahjongChomboInput,
    RecordMahjongResultInput,
    RecordRyuukyokuInput,
} from "../types";

function assertUniqueValues(values: string[], message: string) {
    if (new Set(values).size !== values.length) {
        throw new Error(message);
    }
}

function getRoundWindIndex(round: string) {
    const [wind, roundStr] = round.split("_");

    const roundMap: Record<string, number> = {
        EAST: 1,
        SOUTH: 2,
        WEST: 3,
        NORTH: 4,
    };

    return {
        currentWindIdx: roundMap[wind],
        roundNum: Number.parseInt(roundStr, 10),
    };
}

export function applyMahjongAgariResult({
                                            details,
                                            data,
                                        }: {
    details: MahjongDetails;
    data: RecordMahjongResultInput;
}) {
    const players = details.players;
    const currentRound = details.current_round;
    const currentHonba = details.honba || 0;

    const wins = recalculateWins({
        wins: data.wins,
        players,
        is_tsumo: data.is_tsumo,
    });

    if (data.is_tsumo && wins.length !== 1) {
        throw new Error("쯔모 화료는 화료자가 1명이어야 합니다.");
    }

    if (!data.is_tsumo && (wins.length < 1 || wins.length > 2)) {
        throw new Error(
            "론 화료는 1명 또는 2명만 가능합니다.\n3명 론은 삼가화 유국으로 기록해주세요.",
        );
    }

    const winnerKeys = wins.map((win) => win.winner_key);
    assertUniqueValues(winnerKeys, "화료자가 중복되었습니다.");

    wins.forEach((win) => {
        if (!players[win.winner_key]) {
            throw new Error("존재하지 않는 화료자입니다.");
        }

        if (!data.is_tsumo) {
            if (!win.loser_key) {
                throw new Error("론 화료에는 방총자가 필요합니다.");
            }

            if (!players[win.loser_key]) {
                throw new Error("존재하지 않는 방총자입니다.");
            }

            if (win.winner_key === win.loser_key) {
                throw new Error("화료자와 방총자는 같을 수 없습니다.");
            }
        }
    });

    if (!data.is_tsumo && wins.length === 2) {
        const firstLoserKey = wins[0].loser_key;

        if (!firstLoserKey || wins.some((win) => win.loser_key !== firstLoserKey)) {
            throw new Error("더블 론의 방총자는 동일해야 합니다.");
        }
    }

    const initialScores: MahjongScoreMap = {};

    Object.keys(players).forEach((key) => {
        initialScores[key] = players[key].score;
    });

    data.current_riichi_keys.forEach((key) => {
        if (!players[key]) return;
        players[key].score -= 1000;
    });

    const totalRiichiSticks =
        (details.riichi_sticks || 0) + data.current_riichi_keys.length;

    const normalizedWins = wins.map((win) => ({
        ...win,
        score_deltas: createEmptyScoreMap(players),
    }));

    const riichiStickReceiverKey = getRiichiStickReceiverKey({
        wins: normalizedWins,
        players,
        is_tsumo: data.is_tsumo,
    });

    normalizedWins.forEach((win) => {
        const winner = players[win.winner_key];
        const isWinnerOya = winner.wind === "EAST";
        let collected = 0;

        if (data.is_tsumo) {
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

    const { currentWindIdx, roundNum } = getRoundWindIndex(details.current_round);
    const modeLimitIdx = getModeLimitIdx(details.game_mode);
    const isAllLast = currentWindIdx === modeLimitIdx && roundNum === 4;
    const isExtraRound = currentWindIdx > modeLimitIdx;

    if (isTobi || data.is_final) {
        details.status = "FINISHED";

        if (data.is_final) {
            details.finish_reason = "FORCE_FINISH";
        } else if (isTobi) {
            details.finish_reason = "TOBI";
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
        const isAbsoluteLast =
            currentWindIdx === absoluteLimitIdx && roundNum === 4;

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
        timestamp: new Date().toISOString(),
        type: "AGARI",
        round: currentRound,
        honba: currentHonba,
        is_tsumo: data.is_tsumo,
        is_final: details.status === "FINISHED",
        forced_end: details.finish_reason === "FORCE_FINISH",
        riichi_keys: data.current_riichi_keys,
        wins: normalizedWins,
        score_deltas: scoreDeltas,
        result_scores: resultScores,
    });

    return details;
}

export function applyMahjongRyuukyokuResult({
                                                details,
                                                data,
                                            }: {
    details: MahjongDetails;
    data: RecordRyuukyokuInput;
}) {
    const players = details.players;
    const isExhaustive = data.type === "황패유국";
    const isNagashiMangan = data.type === "유국만관";
    const currentRound = details.current_round;
    const currentHonba = details.honba || 0;

    const initialScores: MahjongScoreMap = {};

    Object.keys(players).forEach((key) => {
        initialScores[key] = players[key].score;
    });

    data.current_riichi_keys.forEach((key) => {
        if (players[key]) {
            players[key].score -= 1000;
        }
    });

    details.riichi_sticks =
        details.riichi_sticks + data.current_riichi_keys.length;

    let isOyaTenpai: boolean;

    if (isNagashiMangan) {
        const winnerKeys = Array.from(
            new Set(data.nagashi_mangan_winner_keys ?? []),
        );

        if (winnerKeys.length === 0) {
            throw new Error("유국만관 대상자가 없습니다.");
        }

        winnerKeys.forEach((winnerKey) => {
            if (!players[winnerKey]) {
                throw new Error("유국만관 대상자가 올바르지 않습니다.");
            }
        });

        const allKeys = Object.keys(players);

        // 작혼 기준:
        // - 텐파이/노텐 벌점 없음
        // - 리치 공탁금 받지 않음
        // - 본장 점수 받지 않음
        // - 복수 유국만관은 다가화와 무관하게 각각 정산
        winnerKeys.forEach((winnerKey) => {
            const winner = players[winnerKey];
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

        // 작혼 기준:
        // 유국만관을 누가 했는지와 무관하게 친 텐파이 여부로 연장 판단.
        isOyaTenpai = data.tenpai_keys.some(
            (key) => players[key]?.wind === "EAST",
        );
    } else if (isExhaustive) {
        const allKeys = Object.keys(players);
        const tenpaiCount = data.tenpai_keys.length;

        isOyaTenpai = data.tenpai_keys.some((key) => players[key].wind === "EAST");

        if (tenpaiCount > 0 && tenpaiCount < 4) {
            const reward = 3000 / tenpaiCount;
            const penalty = 3000 / (4 - tenpaiCount);

            allKeys.forEach((key) => {
                if (data.tenpai_keys.includes(key)) {
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

    const { currentWindIdx, roundNum } = getRoundWindIndex(details.current_round);
    const modeLimitIdx = getModeLimitIdx(details.game_mode);
    const isAllLast = currentWindIdx === modeLimitIdx && roundNum === 4;
    const isExtraRound = currentWindIdx > modeLimitIdx;

    if (isTobi || data.is_final) {
        details.status = "FINISHED";

        if (data.is_final) {
            details.finish_reason = "FORCE_FINISH";
        } else if (isTobi) {
            details.finish_reason = "TOBI";
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

    const nagashiManganWinnerKeys = isNagashiMangan
        ? Array.from(new Set(data.nagashi_mangan_winner_keys ?? []))
        : [];

    details.logs.push({
        timestamp: new Date().toISOString(),
        type: "RYUUKYOKU",
        round: currentRound,
        honba: currentHonba,
        ryuukyoku_type: data.type,
        is_final: details.status === "FINISHED",
        forced_end: details.finish_reason === "FORCE_FINISH",
        tenpai_keys: isExhaustive || isNagashiMangan ? data.tenpai_keys : [],
        nagashi_mangan_winner_keys: nagashiManganWinnerKeys,
        riichi_keys: data.current_riichi_keys,
        score_deltas: scoreDeltas,
        result_scores: resultScores,
    });

    return details;
}

export function applyMahjongChomboResult({
                                             details,
                                             data,
                                         }: {
    details: MahjongDetails;
    data: RecordMahjongChomboInput;
}) {
    const players = details.players;
    const currentRound = details.current_round;
    const currentHonba = details.honba || 0;
    const chomboPlayer = players[data.chombo_player_key];

    if (!chomboPlayer) {
        throw new Error("존재하지 않는 작사입니다.");
    }

    const currentRiichiKeys = Array.from(
        new Set(data.current_riichi_keys ?? []),
    );

    currentRiichiKeys.forEach((playerKey) => {
        if (!players[playerKey]) {
            throw new Error("올바르지 않은 리치 선언자가 포함되어 있습니다.");
        }
    });

    const initialScores: MahjongScoreMap = {};

    Object.keys(players).forEach((playerKey) => {
        initialScores[playerKey] = players[playerKey].score;
    });

    const isDealerChombo = chomboPlayer.wind === "EAST";

    Object.keys(players).forEach((playerKey) => {
        if (playerKey === data.chombo_player_key) {
            return;
        }

        const receiver = players[playerKey];

        const payment = isDealerChombo
            ? 4000
            : receiver.wind === "EAST"
                ? 4000
                : 2000;

        chomboPlayer.score -= payment;
        receiver.score += payment;
    });

    const scoreDeltas: MahjongScoreMap = {};
    const resultScores: MahjongScoreMap = {};

    Object.keys(players).forEach((playerKey) => {
        scoreDeltas[playerKey] =
            players[playerKey].score - initialScores[playerKey];

        resultScores[playerKey] = players[playerKey].score;
    });

    /*
     * 촌보 국은 무효 처리 후 재배패한다.
     *
     * 따라서 아래 상태는 변경하지 않는다.
     * - current_round
     * - honba
     * - 자리바람
     * - riichi_sticks
     * - status
     *
     * current_riichi_keys 역시 점수에서 차감하지 않는다.
     * 이 국에서 선언한 리치는 촌보로 취소된 것으로 처리한다.
     *
     * 촌보로 점수가 0 이하가 되어도 토비 종료하지 않는다.
     */
    details.logs.push({
        timestamp: new Date().toISOString(),
        type: "CHOMBO",
        round: currentRound,
        honba: currentHonba,
        chombo_player_key: data.chombo_player_key,
        chombo_penalty_rule: "MANGAN_PAYMENT",
        cancelled_riichi_keys: currentRiichiKeys,
        score_deltas: scoreDeltas,
        result_scores: resultScores,
    });

    return details;
}