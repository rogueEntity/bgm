// web/src/features/games/tichu/module.ts

import type { GameModule } from "../shared/types";

import {
    TICHU_GAME_KEY,
    TICHU_GAME_NAME,
    TICHU_GAME_NAME_EN,
    TICHU_MIN_PLAYERS,
    TICHU_MAX_PLAYERS,
} from "./constants";

export const tichuModule = {
    key: TICHU_GAME_KEY,
    name: TICHU_GAME_NAME,
    nameEn: TICHU_GAME_NAME_EN,
    shortName: "티츄",
    description:  "티츄 플레이, 점수, 통계, 도전과제를 기록합니다.",
    icon: "🃏",
    minPlayers: TICHU_MIN_PLAYERS,
    maxPlayers: TICHU_MAX_PLAYERS,
    routes: {
        dashboard: "/tichu",
        newMatch: "/tichu/new",
        matches: "/tichu/matches",
        players: "/tichu/players",
        achievements: "/tichu/achievements",
        ranking: "/tichu/ranking",
    },
} satisfies GameModule;