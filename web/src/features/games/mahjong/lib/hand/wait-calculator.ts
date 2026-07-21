// web/src/features/games/mahjong/lib/hand/wait-calculator.ts

import {
    getTileNumber,
    normalizeRedFive,
} from "./tile-utils";

import type {
    MahjongHandPattern,
    MahjongTileCode,
    MahjongWaitResult,
} from "./types";

function createWaitResult(
    type: MahjongWaitResult["type"],
    fu: number,
): MahjongWaitResult {
    return {
        type,
        fu,
    };
}

function getSequenceWait({
                             sequence,
                             winningTile,
                         }: {
    sequence: readonly MahjongTileCode[];
    winningTile: MahjongTileCode;
}): MahjongWaitResult {
    const normalizedWinningTile =
        normalizeRedFive(winningTile);

    const normalizedSequence = sequence
        .map(normalizeRedFive)
        .sort(
            (first, second) =>
                getTileNumber(first) -
                getTileNumber(second),
        );

    const firstNumber =
        getTileNumber(normalizedSequence[0]);

    const secondNumber =
        getTileNumber(normalizedSequence[1]);

    const thirdNumber =
        getTileNumber(normalizedSequence[2]);

    const winningNumber =
        getTileNumber(normalizedWinningTile);

    /**
     * 가운데 패로 완성.
     *
     * 예:
     * 24에서 3
     * 68에서 7
     */
    if (winningNumber === secondNumber) {
        return createWaitResult(
            "KANCHAN",
            2,
        );
    }

    /**
     * 12에서 3을 기다리는 형태.
     */
    if (
        firstNumber === 1 &&
        winningNumber === thirdNumber
    ) {
        return createWaitResult(
            "PENCHAN",
            2,
        );
    }

    /**
     * 89에서 7을 기다리는 형태.
     */
    if (
        thirdNumber === 9 &&
        winningNumber === firstNumber
    ) {
        return createWaitResult(
            "PENCHAN",
            2,
        );
    }

    return createWaitResult(
        "RYANMEN",
        0,
    );
}

export function getMahjongWaitType({
                                       pattern,
                                       winningTile,
                                   }: {
    pattern: MahjongHandPattern;
    winningTile: MahjongTileCode;
}): MahjongWaitResult {
    if (pattern.type === "CHIITOITSU") {
        return createWaitResult(
            "CHIITOITSU",
            0,
        );
    }

    if (pattern.type === "KOKUSHI") {
        return createWaitResult(
            pattern.thirteen_wait
                ? "KOKUSHI_THIRTEEN"
                : "KOKUSHI_SINGLE",
            0,
        );
    }

    const winningGroup =
        pattern.winning_group;

    if (winningGroup.type === "PAIR") {
        return createWaitResult(
            "TANKI",
            2,
        );
    }

    if (
        winningGroup.type === "TRIPLET" ||
        winningGroup.type === "QUAD"
    ) {
        return createWaitResult(
            "SHANPON",
            0,
        );
    }

    if (
        winningGroup.type === "SEQUENCE"
    ) {
        return getSequenceWait({
            sequence: winningGroup.tiles,
            winningTile,
        });
    }

    return createWaitResult(
        "RYANMEN",
        0,
    );
}