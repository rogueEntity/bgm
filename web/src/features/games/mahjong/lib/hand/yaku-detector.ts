// web/src/features/games/mahjong/lib/hand/yaku-detector.ts

import {
    ALL_YAKU,
} from "../../constants/yaku";

import {
    getTileNumber,
    getTileSuit,
    isDragonTile,
    isHonorTile,
    isSimpleTile,
    isTerminalTile,
    normalizeRedFive,
} from "./tile-utils";

import {
    getMahjongWaitType,
} from "./wait-calculator";

import type {
    MahjongDetectedYaku,
    MahjongHandPattern,
    MahjongHandSnapshot,
    MahjongParsedMeld,
    MahjongPatternYakuResult,
    MahjongStandardHandPattern,
    MahjongTileCode,
} from "./types";

const DRAGON_TILES = new Set<MahjongTileCode>([
    "5z",
    "6z",
    "7z",
]);

const WIND_TILES = new Set<MahjongTileCode>([
    "1z",
    "2z",
    "3z",
    "4z",
]);

const GREEN_TILES = new Set<MahjongTileCode>([
    "2s",
    "3s",
    "4s",
    "6s",
    "8s",
    "6z",
]);

const CHUUREN_BASE_COUNTS = [
    3,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    3,
] as const;

function getWindTile(
    wind: MahjongHandSnapshot["seat_wind"],
): MahjongTileCode {
    if (wind === "EAST") return "1z";
    if (wind === "SOUTH") return "2z";
    if (wind === "WEST") return "3z";

    return "4z";
}

function getAllHandTiles(
    hand: MahjongHandSnapshot,
): MahjongTileCode[] {
    return [
        ...hand.concealed_tiles,
        hand.winning_tile,
        ...hand.melds.flatMap((meld) => meld.tiles),
    ].map(normalizeRedFive);
}

function isOpenMeld(
    meld: MahjongParsedMeld,
) {
    return meld.open;
}

function isMenzenPattern(
    pattern: MahjongHandPattern,
) {
    if (pattern.type !== "STANDARD") {
        return true;
    }

    return !pattern.melds.some(isOpenMeld);
}

function addDetectedYaku(
    target: Set<string>,
    id: string,
) {
    if (
        ALL_YAKU.some(
            (yaku) => yaku.id === id,
        )
    ) {
        target.add(id);
    }
}

function isValuePair({
                         hand,
                         pairTile,
                     }: {
    hand: MahjongHandSnapshot;
    pairTile: MahjongTileCode;
}) {
    const normalized =
        normalizeRedFive(pairTile);

    if (isDragonTile(normalized)) {
        return true;
    }

    if (
        normalized ===
        getWindTile(hand.seat_wind)
    ) {
        return true;
    }

    return (
        normalized ===
        getWindTile(hand.round_wind)
    );
}

function getSequenceKey(
    meld: MahjongParsedMeld,
) {
    if (meld.type !== "SEQUENCE") {
        return null;
    }

    const tiles = [...meld.tiles]
        .map(normalizeRedFive)
        .sort(
            (first, second) =>
                getTileNumber(first) -
                getTileNumber(second),
        );

    return `${getTileSuit(tiles[0])}-${getTileNumber(tiles[0])}`;
}

function getTripletTile(
    meld: MahjongParsedMeld,
): MahjongTileCode | null {
    if (
        meld.type !== "TRIPLET" &&
        meld.type !== "QUAD"
    ) {
        return null;
    }

    return normalizeRedFive(
        meld.tiles[0],
    );
}

function groupContainsTerminalOrHonor(
    tiles: readonly MahjongTileCode[],
) {
    return tiles.some((tile) => {
        const normalized =
            normalizeRedFive(tile);

        return (
            isTerminalTile(normalized) ||
            isHonorTile(normalized)
        );
    });
}

function isRonCompletedClosedTriplet({
                                         hand,
                                         pattern,
                                         meldIndex,
                                     }: {
    hand: MahjongHandSnapshot;
    pattern: MahjongStandardHandPattern;
    meldIndex: number;
}) {
    return (
        hand.win_method === "RON" &&
        pattern.winning_group.type ===
        "TRIPLET" &&
        pattern.winning_group.meld_index ===
        meldIndex
    );
}

function countConcealedTriplets({
                                    hand,
                                    pattern,
                                }: {
    hand: MahjongHandSnapshot;
    pattern: MahjongStandardHandPattern;
}) {
    return pattern.melds.reduce(
        (count, meld, index) => {
            if (
                meld.type !== "TRIPLET" &&
                meld.type !== "QUAD"
            ) {
                return count;
            }

            if (meld.open) {
                return count;
            }

            if (
                isRonCompletedClosedTriplet({
                    hand,
                    pattern,
                    meldIndex: index,
                })
            ) {
                return count;
            }

            return count + 1;
        },
        0,
    );
}

function detectSituationYaku({
                                 hand,
                                 isMenzen,
                                 target,
                             }: {
    hand: MahjongHandSnapshot;
    isMenzen: boolean;
    target: Set<string>;
}) {
    const { situation } = hand;

    if (
        isMenzen &&
        situation.double_riichi
    ) {
        addDetectedYaku(
            target,
            "double_riichi",
        );
    } else if (
        isMenzen &&
        situation.riichi
    ) {
        addDetectedYaku(
            target,
            "riichi",
        );
    }

    if (
        isMenzen &&
        situation.ippatsu &&
        (
            situation.riichi ||
            situation.double_riichi
        )
    ) {
        addDetectedYaku(
            target,
            "ippatsu",
        );
    }

    if (
        isMenzen &&
        hand.win_method === "TSUMO"
    ) {
        addDetectedYaku(
            target,
            "menzen_tsumo",
        );
    }

    if (situation.rinshan) {
        addDetectedYaku(
            target,
            "rinshan",
        );
    }

    if (situation.chankan) {
        addDetectedYaku(
            target,
            "chankan",
        );
    }

    if (situation.haitei) {
        addDetectedYaku(
            target,
            "haitei",
        );
    }

    if (situation.houtei) {
        addDetectedYaku(
            target,
            "houtei",
        );
    }

    if (situation.tenhou) {
        addDetectedYaku(
            target,
            "tenho",
        );
    }

    if (situation.chiihou) {
        addDetectedYaku(
            target,
            "chiho",
        );
    }
}

function detectFlushYaku({
                             tiles,
                             target,
                         }: {
    tiles: MahjongTileCode[];
    target: Set<string>;
}) {
    const numberedSuits = new Set(
        tiles
            .filter(
                (tile) =>
                    !isHonorTile(tile),
            )
            .map(getTileSuit),
    );

    if (numberedSuits.size !== 1) {
        return;
    }

    const hasHonor =
        tiles.some(isHonorTile);

    if (hasHonor) {
        addDetectedYaku(
            target,
            "honitsu",
        );
    } else {
        addDetectedYaku(
            target,
            "chinitsu",
        );
    }
}

function detectCommonTileYaku({
                                  tiles,
                                  target,
                              }: {
    tiles: MahjongTileCode[];
    target: Set<string>;
}) {
    if (
        tiles.length > 0 &&
        tiles.every(isSimpleTile)
    ) {
        addDetectedYaku(
            target,
            "tanyao",
        );
    }

    if (
        tiles.length > 0 &&
        tiles.every(
            (tile) =>
                isTerminalTile(tile) ||
                isHonorTile(tile),
        )
    ) {
        addDetectedYaku(
            target,
            "honroutou",
        );
    }

    if (
        tiles.length > 0 &&
        tiles.every(isHonorTile)
    ) {
        addDetectedYaku(
            target,
            "tsuuiisou",
        );
    }

    if (
        tiles.length > 0 &&
        tiles.every(isTerminalTile)
    ) {
        addDetectedYaku(
            target,
            "chinroutou",
        );
    }

    if (
        tiles.length > 0 &&
        tiles.every(
            (tile) =>
                GREEN_TILES.has(
                    normalizeRedFive(tile),
                ),
        )
    ) {
        addDetectedYaku(
            target,
            "ryuuiisou",
        );
    }
}

function detectYakuhai({
                           hand,
                           pattern,
                           target,
                       }: {
    hand: MahjongHandSnapshot;
    pattern: MahjongStandardHandPattern;
    target: Set<string>;
}) {
    const tripletTiles =
        pattern.melds
            .map(getTripletTile)
            .filter(
                (
                    tile,
                ): tile is MahjongTileCode =>
                    tile !== null,
            );

    if (
        tripletTiles.includes("5z")
    ) {
        addDetectedYaku(
            target,
            "yakuhai_dragon_white",
        );
    }

    if (
        tripletTiles.includes("6z")
    ) {
        addDetectedYaku(
            target,
            "yakuhai_dragon_green",
        );
    }

    if (
        tripletTiles.includes("7z")
    ) {
        addDetectedYaku(
            target,
            "yakuhai_dragon_red",
        );
    }

    if (
        tripletTiles.includes(
            getWindTile(
                hand.round_wind,
            ),
        )
    ) {
        addDetectedYaku(
            target,
            "yakuhai_prevailing",
        );
    }

    if (
        tripletTiles.includes(
            getWindTile(
                hand.seat_wind,
            ),
        )
    ) {
        addDetectedYaku(
            target,
            "yakuhai_player",
        );
    }
}

function detectPinfu({
                         hand,
                         pattern,
                         isMenzen,
                         target,
                     }: {
    hand: MahjongHandSnapshot;
    pattern: MahjongStandardHandPattern;
    isMenzen: boolean;
    target: Set<string>;
}) {
    if (!isMenzen) {
        return false;
    }

    if (
        pattern.melds.some(
            (meld) =>
                meld.type !== "SEQUENCE",
        )
    ) {
        return false;
    }

    if (
        isValuePair({
            hand,
            pairTile: pattern.pair[0],
        })
    ) {
        return false;
    }

    const wait =
        getMahjongWaitType({
            pattern,
            winningTile:
            hand.winning_tile,
        });

    if (wait.type !== "RYANMEN") {
        return false;
    }

    addDetectedYaku(
        target,
        "pinfu",
    );

    return true;
}

function detectPeikou({
                          pattern,
                          isMenzen,
                          target,
                      }: {
    pattern: MahjongStandardHandPattern;
    isMenzen: boolean;
    target: Set<string>;
}) {
    if (!isMenzen) {
        return;
    }

    const sequenceCounts =
        new Map<string, number>();

    for (
        const meld of pattern.melds
        ) {
        const key =
            getSequenceKey(meld);

        if (!key) {
            continue;
        }

        sequenceCounts.set(
            key,
            (
                sequenceCounts.get(key) ??
                0
            ) + 1,
        );
    }

    const pairCount =
        [...sequenceCounts.values()]
            .reduce(
                (sum, count) =>
                    sum +
                    Math.floor(count / 2),
                0,
            );

    if (pairCount >= 2) {
        addDetectedYaku(
            target,
            "ryanpeikou",
        );

        return;
    }

    if (pairCount === 1) {
        addDetectedYaku(
            target,
            "iipeikou",
        );
    }
}

function detectSanshokuDoujun({
                                  pattern,
                                  target,
                              }: {
    pattern: MahjongStandardHandPattern;
    target: Set<string>;
}) {
    const sequences =
        pattern.melds
            .filter(
                (meld) =>
                    meld.type === "SEQUENCE",
            )
            .map((meld) => {
                const tiles = [...meld.tiles]
                    .map(normalizeRedFive)
                    .sort(
                        (first, second) =>
                            getTileNumber(first) -
                            getTileNumber(second),
                    );

                return {
                    suit: getTileSuit(tiles[0]),
                    start:
                        getTileNumber(tiles[0]),
                };
            });

    for (
        let start = 1;
        start <= 7;
        start += 1
    ) {
        const hasMan =
            sequences.some(
                (sequence) =>
                    sequence.suit === "m" &&
                    sequence.start === start,
            );

        const hasPin =
            sequences.some(
                (sequence) =>
                    sequence.suit === "p" &&
                    sequence.start === start,
            );

        const hasSou =
            sequences.some(
                (sequence) =>
                    sequence.suit === "s" &&
                    sequence.start === start,
            );

        if (
            hasMan &&
            hasPin &&
            hasSou
        ) {
            addDetectedYaku(
                target,
                "sanshoku",
            );

            return;
        }
    }
}

function detectIttsuu({
                          pattern,
                          target,
                      }: {
    pattern: MahjongStandardHandPattern;
    target: Set<string>;
}) {
    const sequenceKeys =
        new Set(
            pattern.melds
                .map(getSequenceKey)
                .filter(
                    (
                        key,
                    ): key is string =>
                        key !== null,
                ),
        );

    for (
        const suit of [
        "m",
        "p",
        "s",
    ] as const
        ) {
        if (
            sequenceKeys.has(
                `${suit}-1`,
            ) &&
            sequenceKeys.has(
                `${suit}-4`,
            ) &&
            sequenceKeys.has(
                `${suit}-7`,
            )
        ) {
            addDetectedYaku(
                target,
                "ittsuu",
            );

            return;
        }
    }
}

function detectChantaJunchan({
                                 pattern,
                                 target,
                             }: {
    pattern: MahjongStandardHandPattern;
    target: Set<string>;
}) {
    const groups = [
        pattern.pair,
        ...pattern.melds.map(
            (meld) => meld.tiles,
        ),
    ];

    if (
        !groups.every(
            groupContainsTerminalOrHonor,
        )
    ) {
        return;
    }

    const allTiles =
        groups.flat();

    const hasHonor =
        allTiles.some(isHonorTile);

    const hasSequence =
        pattern.melds.some(
            (meld) =>
                meld.type === "SEQUENCE",
        );

    if (!hasSequence) {
        return;
    }

    if (hasHonor) {
        addDetectedYaku(
            target,
            "chanta",
        );
    } else {
        addDetectedYaku(
            target,
            "junchan",
        );
    }
}

function detectToitoi({
                          pattern,
                          target,
                      }: {
    pattern: MahjongStandardHandPattern;
    target: Set<string>;
}) {
    if (
        pattern.melds.every(
            (meld) =>
                meld.type === "TRIPLET" ||
                meld.type === "QUAD",
        )
    ) {
        addDetectedYaku(
            target,
            "toitoi",
        );
    }
}

function detectSanshokuDoukou({
                                  pattern,
                                  target,
                              }: {
    pattern: MahjongStandardHandPattern;
    target: Set<string>;
}) {
    const tripletTiles =
        pattern.melds
            .map(getTripletTile)
            .filter(
                (
                    tile,
                ): tile is MahjongTileCode =>
                    tile !== null &&
                    !isHonorTile(tile),
            );

    for (
        let number = 1;
        number <= 9;
        number += 1
    ) {
        if (
            tripletTiles.includes(
                `${number}m` as MahjongTileCode,
            ) &&
            tripletTiles.includes(
                `${number}p` as MahjongTileCode,
            ) &&
            tripletTiles.includes(
                `${number}s` as MahjongTileCode,
            )
        ) {
            addDetectedYaku(
                target,
                "sanshoku_doukou",
            );

            return;
        }
    }
}

function detectKantsu({
                          pattern,
                          target,
                      }: {
    pattern: MahjongStandardHandPattern;
    target: Set<string>;
}) {
    const quadCount =
        pattern.melds.filter(
            (meld) =>
                meld.type === "QUAD",
        ).length;

    if (quadCount === 4) {
        addDetectedYaku(
            target,
            "suukantsu",
        );
    } else if (quadCount === 3) {
        addDetectedYaku(
            target,
            "sankantsu",
        );
    }
}

function detectAnkou({
                         hand,
                         pattern,
                         isMenzen,
                         target,
                     }: {
    hand: MahjongHandSnapshot;
    pattern: MahjongStandardHandPattern;
    isMenzen: boolean;
    target: Set<string>;
}) {
    const concealedTripletCount =
        countConcealedTriplets({
            hand,
            pattern,
        });

    if (
        concealedTripletCount === 4 &&
        isMenzen
    ) {
        if (
            pattern.winning_group.type ===
            "PAIR"
        ) {
            addDetectedYaku(
                target,
                "suuankou_tanki",
            );
        } else {
            addDetectedYaku(
                target,
                "suuankou",
            );
        }

        return;
    }

    if (
        concealedTripletCount >= 3
    ) {
        addDetectedYaku(
            target,
            "sanankou",
        );
    }
}

function detectDragonHands({
                               pattern,
                               target,
                           }: {
    pattern: MahjongStandardHandPattern;
    target: Set<string>;
}) {
    const tripletTiles =
        pattern.melds
            .map(getTripletTile)
            .filter(
                (
                    tile,
                ): tile is MahjongTileCode =>
                    tile !== null,
            );

    const dragonTripletCount =
        tripletTiles.filter(
            (tile) =>
                DRAGON_TILES.has(tile),
        ).length;

    const pairIsDragon =
        DRAGON_TILES.has(
            normalizeRedFive(
                pattern.pair[0],
            ),
        );

    if (dragonTripletCount === 3) {
        addDetectedYaku(
            target,
            "daisangen",
        );

        return;
    }

    if (
        dragonTripletCount === 2 &&
        pairIsDragon
    ) {
        addDetectedYaku(
            target,
            "shousangen",
        );
    }
}

function detectWindHands({
                             pattern,
                             target,
                         }: {
    pattern: MahjongStandardHandPattern;
    target: Set<string>;
}) {
    const tripletTiles =
        pattern.melds
            .map(getTripletTile)
            .filter(
                (
                    tile,
                ): tile is MahjongTileCode =>
                    tile !== null,
            );

    const windTripletCount =
        tripletTiles.filter(
            (tile) =>
                WIND_TILES.has(tile),
        ).length;

    const pairIsWind =
        WIND_TILES.has(
            normalizeRedFive(
                pattern.pair[0],
            ),
        );

    if (windTripletCount === 4) {
        addDetectedYaku(
            target,
            "daisuushi",
        );

        return;
    }

    if (
        windTripletCount === 3 &&
        pairIsWind
    ) {
        addDetectedYaku(
            target,
            "shousuushi",
        );
    }
}

function detectChuuren({
                           hand,
                           target,
                       }: {
    hand: MahjongHandSnapshot;
    target: Set<string>;
}) {
    if (hand.melds.length > 0) {
        return;
    }

    const tiles =
        getAllHandTiles(hand);

    if (
        tiles.some(isHonorTile)
    ) {
        return;
    }

    const suits =
        new Set(
            tiles.map(getTileSuit),
        );

    if (suits.size !== 1) {
        return;
    }

    const counts =
        new Array<number>(9)
            .fill(0);

    for (const tile of tiles) {
        counts[
        getTileNumber(tile) - 1
            ] += 1;
    }

    const isChuuren =
        CHUUREN_BASE_COUNTS.every(
            (required, index) =>
                counts[index] >= required,
        ) &&
        counts.reduce(
            (sum, count) =>
                sum + count,
            0,
        ) === 14;

    if (!isChuuren) {
        return;
    }

    const beforeWinCounts =
        new Array<number>(9)
            .fill(0);

    for (
        const tile of
        hand.concealed_tiles
        ) {
        beforeWinCounts[
        getTileNumber(
            normalizeRedFive(tile),
        ) - 1
            ] += 1;
    }

    const isJunsei =
        CHUUREN_BASE_COUNTS.every(
            (required, index) =>
                beforeWinCounts[index] ===
                required,
        );

    addDetectedYaku(
        target,
        isJunsei
            ? "junsei_chuurenpoutou"
            : "chuurenpoutou",
    );
}

function detectStandardYaku({
                                hand,
                                pattern,
                                isMenzen,
                                target,
                            }: {
    hand: MahjongHandSnapshot;
    pattern: MahjongStandardHandPattern;
    isMenzen: boolean;
    target: Set<string>;
}) {
    detectYakuhai({
        hand,
        pattern,
        target,
    });

    detectPinfu({
        hand,
        pattern,
        isMenzen,
        target,
    });

    detectPeikou({
        pattern,
        isMenzen,
        target,
    });

    detectSanshokuDoujun({
        pattern,
        target,
    });

    detectIttsuu({
        pattern,
        target,
    });

    detectChantaJunchan({
        pattern,
        target,
    });

    detectToitoi({
        pattern,
        target,
    });

    detectSanshokuDoukou({
        pattern,
        target,
    });

    detectKantsu({
        pattern,
        target,
    });

    detectAnkou({
        hand,
        pattern,
        isMenzen,
        target,
    });

    detectDragonHands({
        pattern,
        target,
    });

    detectWindHands({
        pattern,
        target,
    });
}

function createDetectedYakuList({
                                    ids,
                                    isMenzen,
                                }: {
    ids: Set<string>;
    isMenzen: boolean;
}): MahjongDetectedYaku[] {
    return ALL_YAKU
        .filter(
            (yaku) =>
                ids.has(yaku.id),
        )
        .map((yaku) => ({
            id: yaku.id,
            name: yaku.name,

            han: isMenzen
                ? yaku.han.closed
                : yaku.han.open,

            is_yakuman:
                Boolean(yaku.isYakuman),

            yakuman_multiplier:
                yaku.isYakuman
                    ? (
                        yaku.yakumanMultiplier ??
                        1
                    )
                    : 0,
        }))
        .filter(
            (yaku) =>
                yaku.is_yakuman ||
                yaku.han > 0,
        );
}

export function detectMahjongPatternYaku({
                                             hand,
                                             pattern,
                                         }: {
    hand: MahjongHandSnapshot;
    pattern: MahjongHandPattern;
}): MahjongPatternYakuResult {
    const target =
        new Set<string>();

    const isMenzen =
        isMenzenPattern(pattern);

    detectSituationYaku({
        hand,
        isMenzen,
        target,
    });

    const allTiles =
        getAllHandTiles(hand);

    detectCommonTileYaku({
        tiles: allTiles,
        target,
    });

    detectFlushYaku({
        tiles: allTiles,
        target,
    });

    if (
        pattern.type === "KOKUSHI"
    ) {
        addDetectedYaku(
            target,
            pattern.thirteen_wait
                ? "kokushi_13_wait"
                : "kokushi",
        );
    } else if (
        pattern.type === "CHIITOITSU"
    ) {
        addDetectedYaku(
            target,
            "chiitoitsu",
        );
    } else {
        detectStandardYaku({
            hand,
            pattern,
            isMenzen,
            target,
        });
    }

    detectChuuren({
        hand,
        target,
    });

    let yaku =
        createDetectedYakuList({
            ids: target,
            isMenzen,
        });

    const yakuman =
        yaku.filter(
            (item) =>
                item.is_yakuman,
        );

    /**
     * 역만이 하나라도 성립하면
     * 일반 역과 상황역은 점수 계산에서 제외한다.
     */
    if (yakuman.length > 0) {
        yaku = yakuman;
    }

    const yakumanCount =
        yaku.reduce(
            (sum, item) =>
                sum +
                item.yakuman_multiplier,
            0,
        );

    const han =
        yakumanCount > 0
            ? 0
            : yaku.reduce(
                (sum, item) =>
                    sum + item.han,
                0,
            );

    return {
        pattern,
        yaku,
        yaku_ids:
            yaku.map(
                (item) => item.id,
            ),
        han,
        yakuman_count:
        yakumanCount,
        is_pinfu:
            yaku.some(
                (item) =>
                    item.id === "pinfu",
            ),
        is_menzen:
        isMenzen,
    };
}

export function detectAllMahjongPatternYaku({
                                                hand,
                                                patterns,
                                            }: {
    hand: MahjongHandSnapshot;
    patterns: MahjongHandPattern[];
}): MahjongPatternYakuResult[] {
    return patterns.map(
        (pattern) =>
            detectMahjongPatternYaku({
                hand,
                pattern,
            }),
    );
}