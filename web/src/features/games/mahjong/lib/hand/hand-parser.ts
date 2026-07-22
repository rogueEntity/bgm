// web/src/features/games/mahjong/lib/hand/hand-parser.ts

import {
    getTileNumber,
    getTileSuit,
    isHonorTile,
    normalizeRedFive,
    sortMahjongTiles,
} from "./tile-utils";

import type {
    MahjongChiitoitsuPattern,
    MahjongHandParseResult,
    MahjongHandPattern,
    MahjongHandSnapshot,
    MahjongKokushiPattern,
    MahjongParsedMeld,
    MahjongStandardHandPattern,
    MahjongTileCode,
    MahjongWinningGroup,
} from "./types";

const NORMALIZED_TILE_ORDER: MahjongTileCode[] = [
    "1m",
    "2m",
    "3m",
    "4m",
    "5m",
    "6m",
    "7m",
    "8m",
    "9m",

    "1p",
    "2p",
    "3p",
    "4p",
    "5p",
    "6p",
    "7p",
    "8p",
    "9p",

    "1s",
    "2s",
    "3s",
    "4s",
    "5s",
    "6s",
    "7s",
    "8s",
    "9s",

    "1z",
    "2z",
    "3z",
    "4z",
    "5z",
    "6z",
    "7z",
];

const TILE_INDEX_MAP = new Map<
    MahjongTileCode,
    number
>(
    NORMALIZED_TILE_ORDER.map(
        (tile, index) => [tile, index],
    ),
);

const KOKUSHI_TILE_SET = new Set<
    MahjongTileCode
>([
    "1m",
    "9m",
    "1p",
    "9p",
    "1s",
    "9s",

    "1z",
    "2z",
    "3z",
    "4z",
    "5z",
    "6z",
    "7z",
]);

type ClosedMeldCandidate = {
    type: "SEQUENCE" | "TRIPLET";
    tiles: [
        MahjongTileCode,
        MahjongTileCode,
        MahjongTileCode,
    ];
};

function normalizeTiles(
    tiles: readonly MahjongTileCode[],
): MahjongTileCode[] {
    return tiles.map(normalizeRedFive);
}

function createTileCounts(
    tiles: readonly MahjongTileCode[],
): number[] {
    const counts = new Array<number>(
        NORMALIZED_TILE_ORDER.length,
    ).fill(0);

    for (const tile of tiles) {
        const normalized =
            normalizeRedFive(tile);

        const index =
            TILE_INDEX_MAP.get(normalized);

        if (index === undefined) {
            continue;
        }

        counts[index] += 1;
    }

    return counts;
}

function cloneCounts(
    counts: readonly number[],
): number[] {
    return [...counts];
}

function getFirstRemainingIndex(
    counts: readonly number[],
): number {
    return counts.findIndex(
        (count) => count > 0,
    );
}

function canCreateSequence(
    index: number,
    counts: readonly number[],
): boolean {
    const tile =
        NORMALIZED_TILE_ORDER[index];

    if (!tile || isHonorTile(tile)) {
        return false;
    }

    const number =
        getTileNumber(tile);

    if (number > 7) {
        return false;
    }

    const nextTile =
        NORMALIZED_TILE_ORDER[index + 1];

    const nextNextTile =
        NORMALIZED_TILE_ORDER[index + 2];

    if (!nextTile || !nextNextTile) {
        return false;
    }

    const suit = getTileSuit(tile);

    if (
        getTileSuit(nextTile) !== suit ||
        getTileSuit(nextNextTile) !== suit
    ) {
        return false;
    }

    return (
        counts[index] > 0 &&
        counts[index + 1] > 0 &&
        counts[index + 2] > 0
    );
}

function parseClosedMelds({
                              counts,
                              requiredMeldCount,
                              current,
                              results,
                          }: {
    counts: number[];
    requiredMeldCount: number;
    current: ClosedMeldCandidate[];
    results: ClosedMeldCandidate[][];
}) {
    if (current.length === requiredMeldCount) {
        const hasRemaining =
            counts.some((count) => count > 0);

        if (!hasRemaining) {
            results.push(
                current.map((meld) => ({
                    ...meld,
                    tiles: [...meld.tiles],
                })),
            );
        }

        return;
    }

    const firstIndex =
        getFirstRemainingIndex(counts);

    if (firstIndex < 0) {
        return;
    }

    const tile =
        NORMALIZED_TILE_ORDER[firstIndex];

    if (counts[firstIndex] >= 3) {
        counts[firstIndex] -= 3;

        current.push({
            type: "TRIPLET",
            tiles: [tile, tile, tile],
        });

        parseClosedMelds({
            counts,
            requiredMeldCount,
            current,
            results,
        });

        current.pop();
        counts[firstIndex] += 3;
    }

    if (
        canCreateSequence(
            firstIndex,
            counts,
        )
    ) {
        const secondTile =
            NORMALIZED_TILE_ORDER[
            firstIndex + 1
                ];

        const thirdTile =
            NORMALIZED_TILE_ORDER[
            firstIndex + 2
                ];

        counts[firstIndex] -= 1;
        counts[firstIndex + 1] -= 1;
        counts[firstIndex + 2] -= 1;

        current.push({
            type: "SEQUENCE",
            tiles: [
                tile,
                secondTile,
                thirdTile,
            ],
        });

        parseClosedMelds({
            counts,
            requiredMeldCount,
            current,
            results,
        });

        current.pop();

        counts[firstIndex] += 1;
        counts[firstIndex + 1] += 1;
        counts[firstIndex + 2] += 1;
    }
}

function convertSnapshotMelds(
    hand: MahjongHandSnapshot,
): MahjongParsedMeld[] {
    return hand.melds.map((meld) => {
        const normalizedTiles =
            sortMahjongTiles(
                normalizeTiles(meld.tiles),
            );

        const isOpen =
            meld.type === "CHI" ||
            meld.type === "PON" ||
            meld.type === "MINKAN";

        if (meld.type === "CHI") {
            return {
                type: "SEQUENCE",
                tiles: normalizedTiles,
                open: true,
                source_meld_type: meld.type,
            };
        }

        if (
            meld.type === "MINKAN" ||
            meld.type === "ANKAN"
        ) {
            return {
                type: "QUAD",
                tiles: normalizedTiles,
                open: isOpen,
                source_meld_type: meld.type,
            };
        }

        return {
            type: "TRIPLET",
            tiles: normalizedTiles,
            open: true,
            source_meld_type: meld.type,
        };
    });
}

function createWinningGroupsForStandard({
                                            pair,
                                            melds,
                                            winningTile,
                                            closedMeldStartIndex,
                                        }: {
    pair: [
        MahjongTileCode,
        MahjongTileCode,
    ];
    melds: MahjongParsedMeld[];
    winningTile: MahjongTileCode;
    closedMeldStartIndex: number;
}): MahjongWinningGroup[] {
    const groups: MahjongWinningGroup[] = [];

    if (
        pair[0] === winningTile
    ) {
        groups.push({
            type: "PAIR",
            meld_index: null,
            tiles: [...pair],
        });
    }

    melds.forEach((meld, index) => {
        if (
            index < closedMeldStartIndex
        ) {
            return;
        }

        if (
            !meld.tiles.includes(
                winningTile,
            )
        ) {
            return;
        }

        groups.push({
            type: meld.type,
            meld_index: index,
            tiles: [...meld.tiles],
        });
    });

    return groups;
}

function parseStandardPatterns(
    hand: MahjongHandSnapshot,
): MahjongStandardHandPattern[] {
    const closedTiles = normalizeTiles([
        ...hand.concealed_tiles,
        hand.winning_tile,
    ]);

    const requiredClosedMeldCount =
        4 - hand.melds.length;

    if (
        requiredClosedMeldCount < 0
    ) {
        return [];
    }

    const counts =
        createTileCounts(closedTiles);

    const fixedMelds =
        convertSnapshotMelds(hand);

    const patterns:
        MahjongStandardHandPattern[] = [];

    for (
        let pairIndex = 0;
        pairIndex <
        NORMALIZED_TILE_ORDER.length;
        pairIndex += 1
    ) {
        if (counts[pairIndex] < 2) {
            continue;
        }

        const pairTile =
            NORMALIZED_TILE_ORDER[
                pairIndex
                ];

        const nextCounts =
            cloneCounts(counts);

        nextCounts[pairIndex] -= 2;

        const closedMeldResults:
            ClosedMeldCandidate[][] = [];

        parseClosedMelds({
            counts: nextCounts,
            requiredMeldCount:
            requiredClosedMeldCount,
            current: [],
            results: closedMeldResults,
        });

        for (
            const closedMelds
            of closedMeldResults
            ) {
            const parsedClosedMelds:
                MahjongParsedMeld[] =
                closedMelds.map((meld) => ({
                    type: meld.type,
                    tiles: [...meld.tiles],
                    open: false,
                    source_meld_type: null,
                }));

            const melds = [
                ...fixedMelds,
                ...parsedClosedMelds,
            ];

            if (melds.length !== 4) {
                continue;
            }

            const pair: [
                MahjongTileCode,
                MahjongTileCode,
            ] = [
                pairTile,
                pairTile,
            ];

            const winningTile =
                normalizeRedFive(
                    hand.winning_tile,
                );

            const winningGroups =
                createWinningGroupsForStandard({
                    pair,
                    melds,
                    winningTile,
                    closedMeldStartIndex:
                    fixedMelds.length,
                });

            for (
                const winningGroup
                of winningGroups
                ) {
                patterns.push({
                    type: "STANDARD",
                    pair,
                    melds,
                    winning_group:
                    winningGroup,
                });
            }
        }
    }

    return patterns;
}

function parseChiitoitsuPattern(
    hand: MahjongHandSnapshot,
): MahjongChiitoitsuPattern | null {
    if (hand.melds.length > 0) {
        return null;
    }

    const tiles = normalizeTiles([
        ...hand.concealed_tiles,
        hand.winning_tile,
    ]);

    if (tiles.length !== 14) {
        return null;
    }

    const counts =
        createTileCounts(tiles);

    const pairIndexes =
        counts
            .map((count, index) => ({
                count,
                index,
            }))
            .filter(
                ({ count }) => count === 2,
            );

    if (pairIndexes.length !== 7) {
        return null;
    }

    if (
        counts.some(
            (count) =>
                count !== 0 &&
                count !== 2,
        )
    ) {
        return null;
    }

    const pairs = pairIndexes.map(
        ({ index }) => {
            const tile =
                NORMALIZED_TILE_ORDER[index];

            return [
                tile,
                tile,
            ] as [
                MahjongTileCode,
                MahjongTileCode,
            ];
        },
    );

    const winningTile =
        normalizeRedFive(
            hand.winning_tile,
        );

    return {
        type: "CHIITOITSU",
        pairs,
        winning_group: {
            type: "PAIR",
            meld_index: null,
            tiles: [
                winningTile,
                winningTile,
            ],
        },
    };
}

function parseKokushiPattern(
    hand: MahjongHandSnapshot,
): MahjongKokushiPattern | null {
    if (hand.melds.length > 0) {
        return null;
    }

    const tiles = normalizeTiles([
        ...hand.concealed_tiles,
        hand.winning_tile,
    ]);

    if (tiles.length !== 14) {
        return null;
    }

    const counts =
        createTileCounts(tiles);

    let pairTile:
        MahjongTileCode | null = null;

    for (
        let index = 0;
        index <
        NORMALIZED_TILE_ORDER.length;
        index += 1
    ) {
        const tile =
            NORMALIZED_TILE_ORDER[index];

        const count = counts[index];

        if (
            KOKUSHI_TILE_SET.has(tile)
        ) {
            if (count === 0) {
                return null;
            }

            if (count === 2) {
                if (pairTile) {
                    return null;
                }

                pairTile = tile;
            } else if (count !== 1) {
                return null;
            }
        } else if (count !== 0) {
            return null;
        }
    }

    if (!pairTile) {
        return null;
    }

    const winningTile =
        normalizeRedFive(
            hand.winning_tile,
        );

    const concealedBeforeWin =
        normalizeTiles(
            hand.concealed_tiles,
        );

    const beforeCounts =
        createTileCounts(
            concealedBeforeWin,
        );

    const thirteenWait =
        [...KOKUSHI_TILE_SET].every(
            (tile) => {
                const index =
                    TILE_INDEX_MAP.get(tile);

                return (
                    index !== undefined &&
                    beforeCounts[index] === 1
                );
            },
        );

    return {
        type: "KOKUSHI",
        pair_tile: pairTile,
        thirteen_wait: thirteenWait,

        winning_group: {
            type:
                winningTile === pairTile
                    ? "KOKUSHI_PAIR"
                    : "KOKUSHI_SINGLE",

            meld_index: null,

            tiles:
                winningTile === pairTile
                    ? [
                        winningTile,
                        winningTile,
                    ]
                    : [winningTile],
        },
    };
}

function createPatternKey(
    pattern: MahjongHandPattern,
): string {
    if (
        pattern.type ===
        "CHIITOITSU"
    ) {
        return [
            pattern.type,

            ...pattern.pairs.map(
                (pair) =>
                    pair.join(""),
            ),

            pattern.winning_group.tiles.join(
                "",
            ),
        ].join("|");
    }

    if (
        pattern.type === "KOKUSHI"
    ) {
        return [
            pattern.type,
            pattern.pair_tile,
            pattern.thirteen_wait
                ? "13"
                : "NORMAL",

            pattern.winning_group.type,
        ].join("|");
    }

    return [
        pattern.type,
        pattern.pair.join(""),

        ...pattern.melds.map(
            (meld) =>
                [
                    meld.type,
                    meld.open
                        ? "OPEN"
                        : "CLOSED",
                    meld.tiles.join(""),
                ].join(":"),
        ),

        pattern.winning_group.type,
        pattern.winning_group.meld_index ??
        "PAIR",
    ].join("|");
}

function deduplicatePatterns(
    patterns: MahjongHandPattern[],
): MahjongHandPattern[] {
    const result:
        MahjongHandPattern[] = [];

    const keys =
        new Set<string>();

    for (const pattern of patterns) {
        const key =
            createPatternKey(pattern);

        if (keys.has(key)) {
            continue;
        }

        keys.add(key);
        result.push(pattern);
    }

    return result;
}

export function parseMahjongHand(
    hand: MahjongHandSnapshot,
): MahjongHandParseResult {
    const expectedClosedTileCount =
        14 - hand.melds.length * 3;

    const actualClosedTileCount =
        hand.concealed_tiles.length + 1;

    if (
        actualClosedTileCount !==
        expectedClosedTileCount
    ) {
        return {
            ok: false,
            code: "INVALID_TILE_COUNT",

            message:
                `현재 후로 ${hand.melds.length}개 기준으로 ` +
                `손패와 화료패의 합은 ${expectedClosedTileCount}장이어야 합니다.`,
        };
    }

    const patterns:
        MahjongHandPattern[] = [];

    const chiitoitsu =
        parseChiitoitsuPattern(hand);

    if (chiitoitsu) {
        patterns.push(chiitoitsu);
    }

    const kokushi =
        parseKokushiPattern(hand);

    if (kokushi) {
        patterns.push(kokushi);
    }

    patterns.push(
        ...parseStandardPatterns(hand),
    );

    const uniquePatterns =
        deduplicatePatterns(patterns);

    if (uniquePatterns.length === 0) {
        return {
            ok: false,
            code: "NOT_COMPLETE_HAND",

            message:
                "입력한 패는 완성된 화료 형태가 아닙니다.",
        };
    }

    return {
        ok: true,
        patterns: uniquePatterns,
    };
}