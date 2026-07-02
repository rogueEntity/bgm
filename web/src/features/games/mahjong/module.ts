// web/src/features/games/mahjong/module.ts

import type { GameModule } from "../shared/types";

import {
    MAHJONG_GAME_KEY,
    MAHJONG_GAME_NAME,
    MAHJONG_GAME_NAME_EN,
    MAHJONG_MAX_PLAYERS,
    MAHJONG_MIN_PLAYERS,
} from "./constants";

export const mahjongModule = {
    key: MAHJONG_GAME_KEY,
    name: MAHJONG_GAME_NAME,
    nameEn: MAHJONG_GAME_NAME_EN,
    shortName: "마작",
    description: "리치마작 대국, 점수, 통계, 도전과제를 기록합니다.",
    minPlayers: MAHJONG_MIN_PLAYERS,
    maxPlayers: MAHJONG_MAX_PLAYERS,
    routes: {
        dashboard: "/mahjong",
        newMatch: "/mahjong/new",
        matches: "/mahjong/matches",
        players: "/mahjong/players",
        achievements: "/mahjong/achievements",
        ranking: "/mahjong/ranking",
    },
} satisfies GameModule;