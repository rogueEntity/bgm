// web/src/features/games/mahjong/lib/hand/hand-validator.ts

import {
    areSameTile,
    countNormalizedTiles,
    getTileNumber,
    getTileSuit,
    isHonorTile,
    isMahjongTileCode,
    normalizeRedFive,
    sortMahjongTiles,
} from "./tile-utils";

import type {
    MahjongHandSnapshot,
    MahjongHandValidationError,
    MahjongHandValidationResult,
    MahjongMeldSnapshot,
    MahjongTileCode,
} from "./types";

import { parseMahjongHand } from "./hand-parser";

function getMeldTileCount(meld: MahjongMeldSnapshot): number {
    if (meld.type === "MINKAN" || meld.type === "ANKAN") {
        return 4;
    }

    return 3;
}

/**
 * 손패 입력 칸에 들어가야 하는 패 수.
 *
 * 부로 0개: 화료패 제외 13장
 * 부로 1개: 화료패 제외 10장
 * 부로 2개: 화료패 제외 7장
 * 부로 3개: 화료패 제외 4장
 * 부로 4개: 화료패 제외 1장
 *
 * 깡은 실제 패 수는 4장이지만 하나의 몸통으로 취급하기 때문에
 * 손패 입력 기대 수는 다른 부로와 동일하게 3장씩 감소한다.
 */
function getExpectedConcealedTileCount(
    meldCount: number,
): number {
    return 13 - meldCount * 3;
}

function validateChi(
    meld: MahjongMeldSnapshot,
): MahjongHandValidationError[] {
    const errors: MahjongHandValidationError[] = [];

    if (meld.tiles.length !== 3) {
        errors.push({
            code: "INVALID_CHI",
            message: "치는 반드시 3장의 패로 구성되어야 합니다.",
        });

        return errors;
    }

    const normalizedTiles = meld.tiles
        .map(normalizeRedFive)
        .sort((a, b) => getTileNumber(a) - getTileNumber(b));

    if (normalizedTiles.some(isHonorTile)) {
        errors.push({
            code: "INVALID_CHI",
            message: "자패로는 치를 만들 수 없습니다.",
        });

        return errors;
    }

    const suits = normalizedTiles.map(getTileSuit);

    if (!suits.every((suit) => suit === suits[0])) {
        errors.push({
            code: "INVALID_CHI",
            message: "치는 같은 종류의 수패로 구성되어야 합니다.",
        });

        return errors;
    }

    const numbers = normalizedTiles.map(getTileNumber);

    if (
        numbers[1] !== numbers[0] + 1 ||
        numbers[2] !== numbers[1] + 1
    ) {
        errors.push({
            code: "INVALID_CHI",
            message: "치 패는 연속된 숫자여야 합니다.",
        });
    }

    if (
        meld.called_tile &&
        !meld.tiles.some((tile) =>
            areSameTile(tile, meld.called_tile as MahjongTileCode),
        )
    ) {
        errors.push({
            code: "INVALID_CALLED_TILE",
            message: "가져온 패가 치 구성에 포함되어 있지 않습니다.",
        });
    }

    return errors;
}

function validatePon(
    meld: MahjongMeldSnapshot,
): MahjongHandValidationError[] {
    const errors: MahjongHandValidationError[] = [];

    if (meld.tiles.length !== 3) {
        errors.push({
            code: "INVALID_PON",
            message: "퐁은 반드시 3장의 패로 구성되어야 합니다.",
        });

        return errors;
    }

    const firstTile = meld.tiles[0];

    if (!meld.tiles.every((tile) => areSameTile(tile, firstTile))) {
        errors.push({
            code: "INVALID_PON",
            message: "퐁은 같은 패 3장으로 구성되어야 합니다.",
        });
    }

    if (
        meld.called_tile &&
        !areSameTile(meld.called_tile, firstTile)
    ) {
        errors.push({
            code: "INVALID_CALLED_TILE",
            message: "가져온 패가 퐁 구성과 일치하지 않습니다.",
        });
    }

    return errors;
}

function validateKan(
    meld: MahjongMeldSnapshot,
): MahjongHandValidationError[] {
    const errors: MahjongHandValidationError[] = [];

    if (meld.tiles.length !== 4) {
        errors.push({
            code: "INVALID_KAN",
            message: "깡은 반드시 4장의 패로 구성되어야 합니다.",
        });

        return errors;
    }

    const firstTile = meld.tiles[0];

    if (!meld.tiles.every((tile) => areSameTile(tile, firstTile))) {
        errors.push({
            code: "INVALID_KAN",
            message: "깡은 같은 패 4장으로 구성되어야 합니다.",
        });
    }

    if (meld.type === "ANKAN" && meld.called_tile) {
        errors.push({
            code: "INVALID_CALLED_TILE",
            message: "암깡에는 다른 작사에게서 가져온 패가 없습니다.",
        });
    }

    if (
        meld.type === "MINKAN" &&
        meld.called_tile &&
        !areSameTile(meld.called_tile, firstTile)
    ) {
        errors.push({
            code: "INVALID_CALLED_TILE",
            message: "가져온 패가 명깡 구성과 일치하지 않습니다.",
        });
    }

    return errors;
}

function validateMeld(
    meld: MahjongMeldSnapshot,
): MahjongHandValidationError[] {
    if (meld.type === "CHI") {
        return validateChi(meld);
    }

    if (meld.type === "PON") {
        return validatePon(meld);
    }

    return validateKan(meld);
}

function isOpenHand(melds: readonly MahjongMeldSnapshot[]): boolean {
    return melds.some(
        (meld) =>
            meld.type === "CHI" ||
            meld.type === "PON" ||
            meld.type === "MINKAN",
    );
}

function validateSituation(
    hand: MahjongHandSnapshot,
): MahjongHandValidationError[] {
    const errors: MahjongHandValidationError[] = [];
    const { situation } = hand;
    const openHand = isOpenHand(hand.melds);

    if (situation.riichi && situation.double_riichi) {
        errors.push({
            code: "CONFLICTING_RIICHI",
            message: "리치와 더블 리치는 동시에 선택할 수 없습니다.",
        });
    }

    if (
        openHand &&
        (situation.riichi ||
            situation.double_riichi ||
            situation.ippatsu)
    ) {
        errors.push({
            code: "OPEN_RIICHI",
            message: "후로한 상태에서는 리치·더블 리치·일발이 성립하지 않습니다.",
        });
    }

    if (
        situation.ippatsu &&
        !situation.riichi &&
        !situation.double_riichi
    ) {
        errors.push({
            code: "IPPATSU_WITHOUT_RIICHI",
            message: "일발은 리치 또는 더블 리치와 함께 선택해야 합니다.",
        });
    }

    if (
        hand.win_method === "TSUMO" &&
        (situation.chankan || situation.houtei)
    ) {
        errors.push({
            code: "TSUMO_RON_CONFLICT",
            message: "창깡과 하저로어는 론 화료에서만 성립합니다.",
        });
    }

    if (
        hand.win_method === "RON" &&
        (situation.rinshan || situation.haitei)
    ) {
        errors.push({
            code: "TSUMO_RON_CONFLICT",
            message: "영상개화와 해저로월은 쯔모 화료에서만 성립합니다.",
        });
    }

    if (
        situation.tenhou &&
        (hand.seat_wind !== "EAST" ||
            hand.win_method !== "TSUMO" ||
            openHand)
    ) {
        errors.push({
            code: "INVALID_TENHOU",
            message: "천화는 친의 멘젠 쯔모에서만 성립합니다.",
        });
    }

    if (
        situation.chiihou &&
        (hand.seat_wind === "EAST" ||
            hand.win_method !== "TSUMO" ||
            openHand)
    ) {
        errors.push({
            code: "INVALID_CHIIHOU",
            message: "지화는 자의 멘젠 쯔모에서만 성립합니다.",
        });
    }

    return errors;
}

function collectAllPhysicalTiles(
    hand: MahjongHandSnapshot,
): MahjongTileCode[] {
    return [
        ...hand.concealed_tiles,
        hand.winning_tile,
        ...hand.melds.flatMap((meld) => meld.tiles),
    ];
}

export function validateMahjongHandSnapshot(
    hand: MahjongHandSnapshot,
): MahjongHandValidationResult {
    const errors: MahjongHandValidationError[] = [];

    if (hand.melds.length > 4) {
        errors.push({
            code: "INVALID_MELD_COUNT",
            message: "부로와 깡은 합계 4개를 초과할 수 없습니다.",
        });
    }

    const allInputTiles: unknown[] = [
        ...hand.concealed_tiles,
        hand.winning_tile,
        ...hand.melds.flatMap((meld) => meld.tiles),
        ...hand.dora_indicators,
        ...hand.ura_dora_indicators,
    ];

    if (!allInputTiles.every(isMahjongTileCode)) {
        errors.push({
            code: "INVALID_TILE_CODE",
            message: "올바르지 않은 마작패 코드가 포함되어 있습니다.",
        });

        return {
            ok: false,
            errors,
        };
    }

    const expectedConcealedTileCount =
        getExpectedConcealedTileCount(hand.melds.length);

    if (hand.concealed_tiles.length !== expectedConcealedTileCount) {
        errors.push({
            code: "INVALID_CONCEALED_TILE_COUNT",
            message:
                `현재 부로 ${hand.melds.length}개 기준으로 ` +
                `화료패를 제외한 손패는 ${expectedConcealedTileCount}장이어야 합니다.`,
        });
    }

    for (const meld of hand.melds) {
        errors.push(...validateMeld(meld));
    }

    /**
     * 도라 표시패는 패산에 남아 있던 패이므로,
     * 손패와 합쳐서 동일 패 4장 제한을 검사하지 않는다.
     */
    const physicalTiles = collectAllPhysicalTiles(hand);
    const tileCounts = countNormalizedTiles(physicalTiles);

    for (const [tile, count] of tileCounts.entries()) {
        if (count > 4) {
            errors.push({
                code: "TOO_MANY_SAME_TILE",
                message: `${tile} 패가 적도라를 포함해 ${count}장 입력되어 있습니다.`,
            });
        }
    }

    errors.push(...validateSituation(hand));

    if (errors.length > 0) {
        return {
            ok: false,
            errors,
        };
    }

    const normalizedHand: MahjongHandSnapshot = {
        ...hand,

        concealed_tiles: sortMahjongTiles(
            hand.concealed_tiles,
        ),

        winning_tile: hand.winning_tile,

        melds: hand.melds.map((meld) => ({
            ...meld,

            tiles: sortMahjongTiles(
                meld.tiles,
            ),

            called_tile:
                meld.called_tile ?? null,

            from_player_key:
                meld.from_player_key ?? null,
        })),

        dora_indicators: [
            ...hand.dora_indicators,
        ],

        ura_dora_indicators: [
            ...hand.ura_dora_indicators,
        ],

        situation: {
            ...hand.situation,
        },
    };

    const parsedHand =
        parseMahjongHand(normalizedHand);

    if (!parsedHand.ok) {
        return {
            ok: false,

            errors: [
                {
                    code: "NOT_COMPLETE_HAND",

                    message:
                    parsedHand.message,
                },
            ],
        };
    }

    return {
        ok: true,
        normalized_hand: normalizedHand,
    };
}

export function getExpectedHandTileCount({
                                             melds,
                                         }: {
    melds: readonly MahjongMeldSnapshot[];
}): {
    concealed_tile_count: number;
    winning_tile_count: 1;
    physical_tile_count: number;
} {
    const concealedTileCount =
        getExpectedConcealedTileCount(melds.length);

    const meldTileCount = melds.reduce(
        (total, meld) => total + getMeldTileCount(meld),
        0,
    );

    return {
        concealed_tile_count: concealedTileCount,
        winning_tile_count: 1,
        physical_tile_count:
            concealedTileCount + 1 + meldTileCount,
    };
}