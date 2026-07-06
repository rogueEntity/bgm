// web/src/features/games/shared/game-registry.ts

import { mahjongModule } from "../mahjong/module";
import { tichuModule } from "../tichu/module";

import type { GameKey, GameModule } from "./types";

export const gameModules = {
    mahjong: mahjongModule,
    tichu: tichuModule,
} satisfies Record<GameKey, GameModule>;

export const gameModuleList = Object.values(gameModules);

export function getGameModule(gameKey: string): GameModule | null {
    if (gameKey in gameModules) {
        return gameModules[gameKey as GameKey];
    }

    return null;
}

export function assertGameModule(gameKey: string): GameModule {
    const gameModule = getGameModule(gameKey);

    if (!gameModule) {
        throw new Error(`Unknown game module: ${gameKey}`);
    }

    return gameModule;
}