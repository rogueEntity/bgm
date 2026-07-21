// web/src/features/games/mahjong/lib/hand/hand-score-calculator.ts

import {
    calculateMahjongScore,
} from "../score";

import {
    countDoraFromIndicators,
    countRedDoraTiles,
} from "./tile-utils";

import {
    calculateMahjongPatternFu,
} from "./fu-calculator";

import {
    parseMahjongHand,
} from "./hand-parser";

import {
    detectMahjongPatternYaku,
} from "./yaku-detector";

import {
    validateMahjongHandSnapshot,
} from "./hand-validator";

import type {
    MahjongHandPattern,
    MahjongHandScoreCandidate,
    MahjongHandScoreResult,
    MahjongHandSnapshot,
    MahjongTileCode,
    MahjongHandDraft,
} from "./types";

function getAllPhysicalTiles(
    hand: MahjongHandSnapshot,
): MahjongTileCode[] {
    return [
        ...hand.concealed_tiles,
        hand.winning_tile,
        ...hand.melds.flatMap(
            (meld) => meld.tiles,
        ),
    ];
}

function getCandidateRankValue(
    candidate: MahjongHandScoreCandidate,
): number {
    if (candidate.yakuman_count > 0) {
        return (
            100_000_000 +
            candidate.yakuman_count * 1_000_000
        );
    }

    const han = candidate.total_han;
    const fu = candidate.fu.fu ?? 0;

    /**
     * 점수 제한 구간을 먼저 정렬한다.
     *
     * 동일 제한 점수에서는 판수·부수 순으로
     * 안정적으로 후보를 고른다.
     */
    let limitRank = 0;

    if (han >= 13) {
        limitRank = 6;
    } else if (han >= 11) {
        limitRank = 5;
    } else if (han >= 8) {
        limitRank = 4;
    } else if (han >= 6) {
        limitRank = 3;
    } else if (
        han >= 5 ||
        (han === 4 && fu >= 40) ||
        (han === 3 && fu >= 70)
    ) {
        limitRank = 2;
    } else {
        limitRank = 1;
    }

    return (
        limitRank * 1_000_000 +
        han * 10_000 +
        fu
    );
}

function compareCandidates(
    first: MahjongHandScoreCandidate,
    second: MahjongHandScoreCandidate,
) {
    return (
        getCandidateRankValue(second) -
        getCandidateRankValue(first)
    );
}

function createCandidate({
                             hand,
                             pattern,
                             physicalTiles,
                         }: {
    hand: MahjongHandSnapshot;
    pattern: MahjongHandPattern;
    physicalTiles: MahjongTileCode[];
}): MahjongHandScoreCandidate | null {
    const yakuResult =
        detectMahjongPatternYaku({
            hand,
            pattern,
        });

    const doraCount =
        yakuResult.yakuman_count > 0
            ? 0
            : countDoraFromIndicators({
                tiles: physicalTiles,
                indicators:
                hand.dora_indicators,
            });

    const canUseUraDora =
        yakuResult.is_menzen &&
        (
            hand.situation.riichi ||
            hand.situation.double_riichi
        );

    const uraDoraCount =
        yakuResult.yakuman_count > 0 ||
        !canUseUraDora
            ? 0
            : countDoraFromIndicators({
                tiles: physicalTiles,
                indicators:
                hand.ura_dora_indicators,
            });

    const redDoraCount =
        yakuResult.yakuman_count > 0
            ? 0
            : countRedDoraTiles(
                physicalTiles,
            );

    const totalDora =
        doraCount +
        uraDoraCount +
        redDoraCount;

    /**
     * 도라는 역이 아니므로,
     * 기본 역이 하나도 없으면 후보에서 제외한다.
     */
    if (
        yakuResult.yakuman_count === 0 &&
        yakuResult.han <= 0
    ) {
        return null;
    }

    const fu =
        calculateMahjongPatternFu({
            hand,
            pattern,
            isPinfu:
            yakuResult.is_pinfu,
        });

    const totalHan =
        yakuResult.yakuman_count > 0
            ? 0
            : yakuResult.han +
            totalDora;

    const isDealer =
        hand.seat_wind === "EAST";

    const score =
        calculateMahjongScore({
            han: totalHan,
            fu: fu.fu ?? 30,
            isDealer,
            isTsumo:
                hand.win_method === "TSUMO",
            yakumanCount:
            yakuResult.yakuman_count,
        });

    return {
        pattern,

        yaku: yakuResult.yaku,
        yaku_ids:
        yakuResult.yaku_ids,

        yaku_han:
        yakuResult.han,

        dora_count:
        doraCount,

        ura_dora_count:
        uraDoraCount,

        red_dora_count:
        redDoraCount,

        total_han:
        totalHan,

        yakuman_count:
        yakuResult.yakuman_count,

        fu,

        score,

        is_menzen:
        yakuResult.is_menzen,

        is_pinfu:
        yakuResult.is_pinfu,
    };
}

export function calculateMahjongHandScore(
    hand: MahjongHandSnapshot,
): MahjongHandScoreResult {
    const validation =
        validateMahjongHandSnapshot(hand);

    if (!validation.ok) {
        return {
            ok: false,
            code: "INVALID_HAND",
            message:
                validation.errors
                    .map((error) => error.message)
                    .join("\n"),
        };
    }

    const normalizedHand =
        validation.normalized_hand;

    const parseResult =
        parseMahjongHand(
            normalizedHand,
        );

    if (!parseResult.ok) {
        return {
            ok: false,
            code: "INVALID_HAND",
            message:
            parseResult.message,
        };
    }

    const physicalTiles =
        getAllPhysicalTiles(
            normalizedHand,
        );

    const candidates =
        parseResult.patterns
            .map((pattern) => {
                try {
                    return createCandidate({
                        hand:
                        normalizedHand,
                        pattern,
                        physicalTiles,
                    });
                } catch {
                    return null;
                }
            })
            .filter(
                (
                    candidate,
                ): candidate is MahjongHandScoreCandidate =>
                    candidate !== null,
            )
            .sort(compareCandidates);

    if (candidates.length === 0) {
        return {
            ok: false,
            code: "NO_YAKU",
            message:
                "완성된 패이지만 성립하는 역이 없습니다. 도라만으로는 화료할 수 없습니다.",
        };
    }

    const best = candidates[0];

    if (!best) {
        return {
            ok: false,
            code:
                "SCORE_CALCULATION_FAILED",
            message:
                "점수 계산 결과를 만들 수 없습니다.",
        };
    }

    return {
        ok: true,
        hand: normalizedHand,
        best,
        candidates,
    };
}

export function calculateMahjongHandDraftScore(
    draft: MahjongHandDraft,
): MahjongHandScoreResult | null {
    if (!draft.winning_tile) {
        return null;
    }

    const expectedConcealedCount =
        13 -
        draft.melds.length * 3;

    if (
        draft.concealed_tiles.length !==
        expectedConcealedCount
    ) {
        return null;
    }

    return calculateMahjongHandScore({
        ...draft,
        winning_tile:
        draft.winning_tile,
    });
}