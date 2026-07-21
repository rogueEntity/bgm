// web/src/features/games/mahjong/lib/hand/resolve-hand-win.ts

import {
    calculateMahjongHandScore,
} from "./hand-score-calculator";

import type {
    MahjongDetails,
    MahjongHandWinInput,
    MahjongWinInput,
    ResolvedMahjongWinInput,
} from "../../types";

import type {
    MahjongHandSnapshot,
} from "./types";

function getRoundWind(
    currentRound: string,
): MahjongHandSnapshot["round_wind"] {
    if (
        currentRound.startsWith("SOUTH")
    ) {
        return "SOUTH";
    }

    if (
        currentRound.startsWith("WEST")
    ) {
        return "WEST";
    }

    if (
        currentRound.startsWith("NORTH")
    ) {
        return "NORTH";
    }

    return "EAST";
}

function assertHandWinContext({
                                  win,
                                  details,
                                  isTsumo,
                                  currentRiichiKeys,
                              }: {
    win: MahjongHandWinInput;
    details: MahjongDetails;
    isTsumo: boolean;
    currentRiichiKeys: string[];
}) {
    const winner =
        details.players[win.winner_key];

    if (!winner) {
        throw new Error(
            "존재하지 않는 화료자입니다.",
        );
    }

    const expectedWinMethod =
        isTsumo ? "TSUMO" : "RON";

    if (
        win.hand.win_method !==
        expectedWinMethod
    ) {
        throw new Error(
            "패 입력의 화료 방식이 현재 화료 방식과 일치하지 않습니다.",
        );
    }

    if (
        win.hand.seat_wind !==
        winner.wind
    ) {
        throw new Error(
            "패 입력의 자풍이 실제 화료자의 자풍과 일치하지 않습니다.",
        );
    }

    const expectedRoundWind =
        getRoundWind(
            details.current_round,
        );

    if (
        win.hand.round_wind !==
        expectedRoundWind
    ) {
        throw new Error(
            "패 입력의 장풍이 현재 국과 일치하지 않습니다.",
        );
    }

    const declaredRiichi =
        currentRiichiKeys.includes(
            win.winner_key,
        );

    const handHasRiichi =
        win.hand.situation.riichi ||
        win.hand.situation
            .double_riichi;

    if (
        declaredRiichi !== handHasRiichi
    ) {
        throw new Error(
            declaredRiichi
                ? "이번 국에 리치를 선언한 화료자는 패 입력에서도 리치 또는 더블 리치를 선택해야 합니다."
                : "이번 국에 리치를 선언하지 않은 화료자에게 리치 역을 적용할 수 없습니다.",
        );
    }

    if (
        win.hand.situation
            .double_riichi &&
        !declaredRiichi
    ) {
        throw new Error(
            "리치 선언 없이 더블 리치를 적용할 수 없습니다.",
        );
    }

    if (
        win.hand.situation.ippatsu &&
        !handHasRiichi
    ) {
        throw new Error(
            "일발은 리치 또는 더블 리치와 함께 성립해야 합니다.",
        );
    }

    if (
        win.hand.ura_dora_indicators
            .length > 0 &&
        !handHasRiichi
    ) {
        throw new Error(
            "리치 화료가 아니면 뒷도라 표시패를 입력할 수 없습니다.",
        );
    }
}

function resolveHandWin({
                            win,
                            details,
                            isTsumo,
                            currentRiichiKeys,
                        }: {
    win: MahjongHandWinInput;
    details: MahjongDetails;
    isTsumo: boolean;
    currentRiichiKeys: string[];
}): ResolvedMahjongWinInput {
    assertHandWinContext({
        win,
        details,
        isTsumo,
        currentRiichiKeys,
    });

    const result =
        calculateMahjongHandScore(
            win.hand,
        );

    if (!result.ok) {
        throw new Error(result.message);
    }

    const { best } = result;

    return {
        input_mode: "HAND",

        winner_key:
        win.winner_key,

        loser_key:
        win.loser_key,

        is_menzen:
        best.is_menzen,

        fu:
            best.yakuman_count > 0
                ? null
                : best.fu.fu,

        dora_total:
            best.dora_count +
            best.ura_dora_count +
            best.red_dora_count,

        selected_yaku_ids:
        best.yaku_ids,

        /**
         * 검증과 정규화를 통과한 스냅샷을 저장한다.
         */
        hand: result.hand,
    };
}

function resolveYakuFuWin(
    win: Extract<
        MahjongWinInput,
        { input_mode: "YAKU_FU" }
    >,
): ResolvedMahjongWinInput {
    return {
        input_mode: "YAKU_FU",

        winner_key:
        win.winner_key,

        loser_key:
        win.loser_key,

        is_menzen:
        win.is_menzen,

        fu:
        win.fu,

        dora_total:
        win.dora_total,

        selected_yaku_ids:
        win.selected_yaku_ids,
    };
}

export function resolveMahjongWinInputs({
                                            wins,
                                            details,
                                            isTsumo,
                                            currentRiichiKeys,
                                        }: {
    wins: MahjongWinInput[];
    details: MahjongDetails;
    isTsumo: boolean;
    currentRiichiKeys: string[];
}): ResolvedMahjongWinInput[] {
    return wins.map((win) => {
        if (win.input_mode === "HAND") {
            return resolveHandWin({
                win,
                details,
                isTsumo,
                currentRiichiKeys,
            });
        }

        return resolveYakuFuWin(win);
    });
}