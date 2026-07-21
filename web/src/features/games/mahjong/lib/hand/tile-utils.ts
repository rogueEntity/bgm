// web/src/features/games/mahjong/lib/hand/tile-utils.ts

import {
    ALL_MAHJONG_TILES,
    DRAGON_TILE_CODES,
    HONOR_TILES,
    RED_DORA_TILE_CODES,
    TERMINAL_TILE_CODES,
    WIND_TILE_CODES,
} from "./tiles";

import type {
    MahjongSuit,
    MahjongTileCode,
} from "./types";

const TILE_CODE_SET = new Set<string>(ALL_MAHJONG_TILES);

const TILE_SORT_ORDER = new Map<MahjongTileCode, number>(
    [
        "1m",
        "2m",
        "3m",
        "4m",
        "0m",
        "5m",
        "6m",
        "7m",
        "8m",
        "9m",

        "1p",
        "2p",
        "3p",
        "4p",
        "0p",
        "5p",
        "6p",
        "7p",
        "8p",
        "9p",

        "1s",
        "2s",
        "3s",
        "4s",
        "0s",
        "5s",
        "6s",
        "7s",
        "8s",
        "9s",

        ...HONOR_TILES,
    ].map((tile, index) => [tile as MahjongTileCode, index]),
);

export function isMahjongTileCode(
    value: unknown,
): value is MahjongTileCode {
    return typeof value === "string" && TILE_CODE_SET.has(value);
}

export function getTileSuit(tile: MahjongTileCode): MahjongSuit {
    return tile.at(-1) as MahjongSuit;
}

export function getTileNumber(tile: MahjongTileCode): number {
    const value = Number.parseInt(tile[0], 10);

    if (value === 0) {
        return 5;
    }

    return value;
}

export function isRedDoraTile(tile: MahjongTileCode): boolean {
    return RED_DORA_TILE_CODES.has(tile);
}

export function normalizeRedFive(
    tile: MahjongTileCode,
): MahjongTileCode {
    if (tile === "0m") return "5m";
    if (tile === "0p") return "5p";
    if (tile === "0s") return "5s";

    return tile;
}

export function isHonorTile(tile: MahjongTileCode): boolean {
    return getTileSuit(tile) === "z";
}

export function isWindTile(tile: MahjongTileCode): boolean {
    return WIND_TILE_CODES.has(tile);
}

export function isDragonTile(tile: MahjongTileCode): boolean {
    return DRAGON_TILE_CODES.has(tile);
}

export function isTerminalTile(tile: MahjongTileCode): boolean {
    return TERMINAL_TILE_CODES.has(tile);
}

export function isSimpleTile(tile: MahjongTileCode): boolean {
    if (isHonorTile(tile)) {
        return false;
    }

    const number = getTileNumber(tile);

    return number >= 2 && number <= 8;
}

export function sortMahjongTiles(
    tiles: readonly MahjongTileCode[],
): MahjongTileCode[] {
    return [...tiles].sort((a, b) => {
        const aOrder = TILE_SORT_ORDER.get(a) ?? Number.MAX_SAFE_INTEGER;
        const bOrder = TILE_SORT_ORDER.get(b) ?? Number.MAX_SAFE_INTEGER;

        return aOrder - bOrder;
    });
}

/**
 * 적도라를 일반 5와 같은 패로 묶어서 개수를 계산한다.
 *
 * 예:
 * 0m 1장 + 5m 3장 = 동일 패 4장
 */
export function countNormalizedTiles(
    tiles: readonly MahjongTileCode[],
): Map<MahjongTileCode, number> {
    const counts = new Map<MahjongTileCode, number>();

    for (const tile of tiles) {
        const normalized = normalizeRedFive(tile);
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }

    return counts;
}

export function countRedDoraTiles(
    tiles: readonly MahjongTileCode[],
): number {
    return tiles.reduce(
        (count, tile) => count + (isRedDoraTile(tile) ? 1 : 0),
        0,
    );
}

export function areSameTile(
    first: MahjongTileCode,
    second: MahjongTileCode,
): boolean {
    return normalizeRedFive(first) === normalizeRedFive(second);
}

export function getNextDoraTile(
    indicator: MahjongTileCode,
): MahjongTileCode {
    const normalizedIndicator = normalizeRedFive(indicator);
    const suit = getTileSuit(normalizedIndicator);
    const number = getTileNumber(normalizedIndicator);

    if (suit !== "z") {
        const nextNumber = number === 9 ? 1 : number + 1;

        return `${nextNumber}${suit}` as MahjongTileCode;
    }

    if (number >= 1 && number <= 4) {
        const nextWind = number === 4 ? 1 : number + 1;

        return `${nextWind}z` as MahjongTileCode;
    }

    const nextDragon = number === 7 ? 5 : number + 1;

    return `${nextDragon}z` as MahjongTileCode;
}

export function countDoraFromIndicators({
                                            tiles,
                                            indicators,
                                        }: {
    tiles: readonly MahjongTileCode[];
    indicators: readonly MahjongTileCode[];
}): number {
    if (tiles.length === 0 || indicators.length === 0) {
        return 0;
    }

    const normalizedTiles = tiles.map(normalizeRedFive);

    return indicators.reduce((total, indicator) => {
        const doraTile = normalizeRedFive(getNextDoraTile(indicator));

        return (
            total +
            normalizedTiles.filter((tile) => tile === doraTile).length
        );
    }, 0);
}