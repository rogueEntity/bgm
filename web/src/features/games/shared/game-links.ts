// web/src/features/games/shared/game-links.ts

import { getGameModule } from "./game-registry";

export function getGameDashboardHref(gameKey: string): string | null {
    return getGameModule(gameKey)?.routes.dashboard ?? null;
}

export function getMatchHrefByGameKey(
    gameKey: string,
    matchId: number,
    status?: string,
): string | null {
    const gameModule = getGameModule(gameKey);

    if (!gameModule) return null;

    if (gameKey === "mahjong") {
        return status === "PLAYING"
            ? `/mahjong/play/${matchId}`
            : `/mahjong/detail/${matchId}`;
    }

    return null;
}