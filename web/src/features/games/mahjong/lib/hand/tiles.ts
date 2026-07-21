// web/src/features/games/mahjong/lib/hand/tiles.ts

import type {
    MahjongHonorTileCode,
    MahjongNumberTileCode,
    MahjongTileCode,
} from "./types";

export const MANZU_TILES: MahjongNumberTileCode[] = [
    "1m",
    "2m",
    "3m",
    "4m",
    "5m",
    "0m",
    "6m",
    "7m",
    "8m",
    "9m",
];

export const PINZU_TILES: MahjongNumberTileCode[] = [
    "1p",
    "2p",
    "3p",
    "4p",
    "5p",
    "0p",
    "6p",
    "7p",
    "8p",
    "9p",
];

export const SOUZU_TILES: MahjongNumberTileCode[] = [
    "1s",
    "2s",
    "3s",
    "4s",
    "5s",
    "0s",
    "6s",
    "7s",
    "8s",
    "9s",
];

export const HONOR_TILES: MahjongHonorTileCode[] = [
    "1z",
    "2z",
    "3z",
    "4z",
    "5z",
    "6z",
    "7z",
];

export const ALL_MAHJONG_TILES: MahjongTileCode[] = [
    ...MANZU_TILES,
    ...PINZU_TILES,
    ...SOUZU_TILES,
    ...HONOR_TILES,
];

export const MAHJONG_TILE_LABELS: Record<MahjongTileCode, string> = {
    "1m": "一萬",
    "2m": "二萬",
    "3m": "三萬",
    "4m": "四萬",
    "5m": "五萬",
    "0m": "赤五萬",
    "6m": "六萬",
    "7m": "七萬",
    "8m": "八萬",
    "9m": "九萬",

    "1p": "一筒",
    "2p": "二筒",
    "3p": "三筒",
    "4p": "四筒",
    "5p": "五筒",
    "0p": "赤五筒",
    "6p": "六筒",
    "7p": "七筒",
    "8p": "八筒",
    "9p": "九筒",

    "1s": "一索",
    "2s": "二索",
    "3s": "三索",
    "4s": "四索",
    "5s": "五索",
    "0s": "赤五索",
    "6s": "六索",
    "7s": "七索",
    "8s": "八索",
    "9s": "九索",

    "1z": "東",
    "2z": "南",
    "3z": "西",
    "4z": "北",
    "5z": "白",
    "6z": "發",
    "7z": "中",
};

export const TERMINAL_TILE_CODES = new Set<MahjongTileCode>([
    "1m",
    "9m",
    "1p",
    "9p",
    "1s",
    "9s",
]);

export const WIND_TILE_CODES = new Set<MahjongTileCode>([
    "1z",
    "2z",
    "3z",
    "4z",
]);

export const DRAGON_TILE_CODES = new Set<MahjongTileCode>([
    "5z",
    "6z",
    "7z",
]);

export const RED_DORA_TILE_CODES = new Set<MahjongTileCode>([
    "0m",
    "0p",
    "0s",
]);