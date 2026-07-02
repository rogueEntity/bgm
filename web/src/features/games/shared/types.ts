// web/src/features/games/shared/types.ts

export type GameKey = "mahjong";

export type GameModule = {
    key: GameKey;
    name: string;
    nameEn: string;
    shortName: string;
    description: string;
    icon: string;
    minPlayers: number;
    maxPlayers: number;
    routes: {
        dashboard: string;
        newMatch: string;
        matches: string;
        players?: string;
        achievements?: string;
        ranking?: string;
    };
};

export type MatchStatus = "PLAYING" | "FINISHED" | "DELETED";

export type BaseGameDetails = {
    schema_version: number;
    game_key: GameKey;
};