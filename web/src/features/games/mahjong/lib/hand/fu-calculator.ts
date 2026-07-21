// web/src/features/games/mahjong/lib/hand/fu-calculator.ts

import {
    isDragonTile,
    isHonorTile,
    isTerminalTile,
    normalizeRedFive,
} from "./tile-utils";
import {
    getMahjongWaitType,
} from "./wait-calculator";

import type {
    MahjongFuCalculation,
    MahjongFuItem,
    MahjongFuReason,
    MahjongHandPattern,
    MahjongHandSnapshot,
    MahjongParsedMeld,
    MahjongPatternFuResult,
    MahjongStandardHandPattern,
    MahjongTileCode,
} from "./types";

import type {
    MahjongWind,
} from "../../types";

function addFuItem({
                       items,
                       reason,
                       label,
                       fu,
                   }: {
    items: MahjongFuItem[];
    reason: MahjongFuReason;
    label: string;
    fu: number;
}) {
    items.push({
        reason,
        label,
        fu,
    });
}

function roundFu(
    value: number,
): number {
    return Math.ceil(value / 10) * 10;
}

function getWindTile(
    wind: MahjongWind,
): MahjongTileCode {
    if (wind === "EAST") {
        return "1z";
    }

    if (wind === "SOUTH") {
        return "2z";
    }

    if (wind === "WEST") {
        return "3z";
    }

    return "4z";
}

function getPairFu({
                       pairTile,
                       hand,
                       items,
                   }: {
    pairTile: MahjongTileCode;
    hand: MahjongHandSnapshot;
    items: MahjongFuItem[];
}): number {
    const normalizedPair =
        normalizeRedFive(pairTile);

    let fu = 0;

    if (isDragonTile(normalizedPair)) {
        fu += 2;

        addFuItem({
            items,
            reason: "PAIR_DRAGON",
            label: "삼원패 머리",
            fu: 2,
        });
    }

    const seatWindTile =
        getWindTile(hand.seat_wind);

    if (
        normalizedPair === seatWindTile
    ) {
        fu += 2;

        addFuItem({
            items,
            reason: "PAIR_SEAT_WIND",
            label: "자풍패 머리",
            fu: 2,
        });
    }

    const roundWindTile =
        getWindTile(hand.round_wind);

    if (
        normalizedPair === roundWindTile
    ) {
        fu += 2;

        addFuItem({
            items,
            reason: "PAIR_ROUND_WIND",
            label: "장풍패 머리",
            fu: 2,
        });
    }

    return fu;
}

function isTerminalOrHonorMeld(
    meld: MahjongParsedMeld,
): boolean {
    const tile =
        normalizeRedFive(meld.tiles[0]);

    return (
        isHonorTile(tile) ||
        isTerminalTile(tile)
    );
}

function isRonCompletedTriplet({
                                   hand,
                                   pattern,
                                   meldIndex,
                               }: {
    hand: MahjongHandSnapshot;
    pattern: MahjongStandardHandPattern;
    meldIndex: number;
}): boolean {
    return (
        hand.win_method === "RON" &&
        pattern.winning_group.type ===
        "TRIPLET" &&
        pattern.winning_group.meld_index ===
        meldIndex
    );
}

function getMeldFu({
                       hand,
                       pattern,
                       meld,
                       meldIndex,
                       items,
                   }: {
    hand: MahjongHandSnapshot;
    pattern: MahjongStandardHandPattern;
    meld: MahjongParsedMeld;
    meldIndex: number;
    items: MahjongFuItem[];
}): number {
    if (meld.type === "SEQUENCE") {
        return 0;
    }

    const terminalOrHonor =
        isTerminalOrHonorMeld(meld);

    /**
     * 론으로 완성한 손안의 각자는
     * 부수 계산에서는 명각으로 취급한다.
     */
    const treatedAsOpen =
        meld.open ||
        isRonCompletedTriplet({
            hand,
            pattern,
            meldIndex,
        });

    if (meld.type === "TRIPLET") {
        if (
            treatedAsOpen &&
            !terminalOrHonor
        ) {
            addFuItem({
                items,
                reason:
                    "OPEN_SIMPLE_TRIPLET",
                label: "중장패 명각",
                fu: 2,
            });

            return 2;
        }

        if (
            !treatedAsOpen &&
            !terminalOrHonor
        ) {
            addFuItem({
                items,
                reason:
                    "CLOSED_SIMPLE_TRIPLET",
                label: "중장패 암각",
                fu: 4,
            });

            return 4;
        }

        if (
            treatedAsOpen &&
            terminalOrHonor
        ) {
            addFuItem({
                items,
                reason:
                    "OPEN_TERMINAL_HONOR_TRIPLET",
                label: "요구패 명각",
                fu: 4,
            });

            return 4;
        }

        addFuItem({
            items,
            reason:
                "CLOSED_TERMINAL_HONOR_TRIPLET",
            label: "요구패 암각",
            fu: 8,
        });

        return 8;
    }

    if (
        treatedAsOpen &&
        !terminalOrHonor
    ) {
        addFuItem({
            items,
            reason:
                "OPEN_SIMPLE_QUAD",
            label: "중장패 명깡",
            fu: 8,
        });

        return 8;
    }

    if (
        !treatedAsOpen &&
        !terminalOrHonor
    ) {
        addFuItem({
            items,
            reason:
                "CLOSED_SIMPLE_QUAD",
            label: "중장패 암깡",
            fu: 16,
        });

        return 16;
    }

    if (
        treatedAsOpen &&
        terminalOrHonor
    ) {
        addFuItem({
            items,
            reason:
                "OPEN_TERMINAL_HONOR_QUAD",
            label: "요구패 명깡",
            fu: 16,
        });

        return 16;
    }

    addFuItem({
        items,
        reason:
            "CLOSED_TERMINAL_HONOR_QUAD",
        label: "요구패 암깡",
        fu: 32,
    });

    return 32;
}

function calculateStandardFu({
                                 hand,
                                 pattern,
                                 isPinfu,
                             }: {
    hand: MahjongHandSnapshot;
    pattern: MahjongStandardHandPattern;
    isPinfu: boolean;
}): MahjongFuCalculation {
    const wait =
        getMahjongWaitType({
            pattern,
            winningTile:
            hand.winning_tile,
        });

    /**
     * 핑후 쯔모는 쯔모 2부를 붙이지 않고
     * 20부 고정으로 처리한다.
     */
    if (
        isPinfu &&
        hand.win_method === "TSUMO"
    ) {
        return {
            raw_fu: 20,
            fu: 20,
            wait,
            items: [
                {
                    reason: "BASE",
                    label: "기본 부수",
                    fu: 20,
                },
            ],
            pinfu_tsumo: true,
            not_applicable: false,
        };
    }

    const items: MahjongFuItem[] = [];

    let rawFu = 20;

    addFuItem({
        items,
        reason: "BASE",
        label: "기본 부수",
        fu: 20,
    });

    if (
        hand.win_method === "RON" &&
        !pattern.melds.some(
            (meld) => meld.open,
        )
    ) {
        rawFu += 10;

        addFuItem({
            items,
            reason: "MENZEN_RON",
            label: "멘젠 론",
            fu: 10,
        });
    }

    if (hand.win_method === "TSUMO") {
        rawFu += 2;

        addFuItem({
            items,
            reason: "TSUMO",
            label: "쯔모",
            fu: 2,
        });
    }

    rawFu += getPairFu({
        pairTile: pattern.pair[0],
        hand,
        items,
    });

    pattern.melds.forEach(
        (meld, meldIndex) => {
            rawFu += getMeldFu({
                hand,
                pattern,
                meld,
                meldIndex,
                items,
            });
        },
    );

    if (wait.fu > 0) {
        rawFu += wait.fu;

        if (wait.type === "KANCHAN") {
            addFuItem({
                items,
                reason: "WAIT_KANCHAN",
                label: "간짱 대기",
                fu: 2,
            });
        } else if (
            wait.type === "PENCHAN"
        ) {
            addFuItem({
                items,
                reason: "WAIT_PENCHAN",
                label: "변짱 대기",
                fu: 2,
            });
        } else if (
            wait.type === "TANKI"
        ) {
            addFuItem({
                items,
                reason: "WAIT_TANKI",
                label: "단기 대기",
                fu: 2,
            });
        }
    }

    /**
     * 후로한 평화형 론은 20부가 아니라
     * 최저 30부로 처리한다.
     */
    if (
        hand.win_method === "RON" &&
        rawFu === 20
    ) {
        addFuItem({
            items,
            reason: "OPEN_RON_MINIMUM",
            label: "후로 론 최저 부수",
            fu: 10,
        });

        rawFu = 30;
    }

    const roundedFu =
        roundFu(rawFu);

    if (roundedFu > rawFu) {
        addFuItem({
            items,
            reason: "ROUND_UP",
            label: "10부 단위 올림",
            fu: roundedFu - rawFu,
        });
    }

    return {
        raw_fu: rawFu,
        fu: roundedFu,
        wait,
        items,
        pinfu_tsumo: false,
        not_applicable: false,
    };
}

export function calculateMahjongPatternFu({
                                              hand,
                                              pattern,
                                              isPinfu = false,
                                          }: {
    hand: MahjongHandSnapshot;
    pattern: MahjongHandPattern;
    isPinfu?: boolean;
}): MahjongFuCalculation {
    const wait =
        getMahjongWaitType({
            pattern,
            winningTile:
            hand.winning_tile,
        });

    if (pattern.type === "KOKUSHI") {
        return {
            raw_fu: 0,
            fu: null,
            wait,
            items: [],
            pinfu_tsumo: false,
            not_applicable: true,
        };
    }

    if (
        pattern.type === "CHIITOITSU"
    ) {
        return {
            raw_fu: 25,
            fu: 25,
            wait,
            items: [
                {
                    reason:
                        "CHIITOITSU_FIXED",
                    label: "치또이쯔 고정",
                    fu: 25,
                },
            ],
            pinfu_tsumo: false,
            not_applicable: false,
        };
    }

    return calculateStandardFu({
        hand,
        pattern,
        isPinfu,
    });
}

export function calculateAllPatternFu({
                                          hand,
                                          patterns,
                                          pinfuPatternKeys = new Set<string>(),
                                          getPatternKey,
                                      }: {
    hand: MahjongHandSnapshot;
    patterns: MahjongHandPattern[];

    /**
     * 이후 역 판정기가 핑후라고 판단한
     * 패턴 키를 전달한다.
     */
    pinfuPatternKeys?: Set<string>;

    getPatternKey?: (
        pattern: MahjongHandPattern,
    ) => string;
}): MahjongPatternFuResult[] {
    return patterns.map((pattern) => {
        const patternKey =
            getPatternKey?.(pattern);

        const isPinfu =
            patternKey !== undefined &&
            pinfuPatternKeys.has(
                patternKey,
            );

        return {
            pattern,

            calculation:
                calculateMahjongPatternFu({
                    hand,
                    pattern,
                    isPinfu,
                }),
        };
    });
}