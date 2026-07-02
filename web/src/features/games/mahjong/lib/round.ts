// web/src/features/games/mahjong/lib/round.ts
import type {
    GameMode,
    MahjongPlayerState,
} from "../types";

export const ROUND_ORDER = [
    "EAST_1",
    "EAST_2",
    "EAST_3",
    "EAST_4",
    "SOUTH_1",
    "SOUTH_2",
    "SOUTH_3",
    "SOUTH_4",
    "WEST_1",
    "WEST_2",
    "WEST_3",
    "WEST_4",
    "NORTH_1",
    "NORTH_2",
    "NORTH_3",
    "NORTH_4",
];

export const WIND_TURN_ORDER = ["EAST", "SOUTH", "WEST", "NORTH"] as const;

export function getNextWind(currentWind: string) {
    const map: Record<string, MahjongPlayerState["wind"]> = {
        EAST: "SOUTH",
        SOUTH: "WEST",
        WEST: "NORTH",
        NORTH: "EAST",
    };

    return map[currentWind] || "EAST";
}

export function rotateWinds(players: Record<string, MahjongPlayerState>) {
    Object.keys(players).forEach((key) => {
        players[key].wind = getNextWind(players[key].wind);
    });
}

export function getNextRound(currentRound: string) {
    const currentIdx = ROUND_ORDER.indexOf(currentRound);

    if (currentIdx !== -1 && currentIdx < ROUND_ORDER.length - 1) {
        return ROUND_ORDER[currentIdx + 1];
    }

    return null;
}

export function getWindTurnDistance(
    fromWind: string | undefined,
    toWind: string | undefined,
) {
    const fromIndex = WIND_TURN_ORDER.indexOf(
        fromWind as (typeof WIND_TURN_ORDER)[number],
    );
    const toIndex = WIND_TURN_ORDER.indexOf(
        toWind as (typeof WIND_TURN_ORDER)[number],
    );

    if (fromIndex === -1 || toIndex === -1) {
        return Number.POSITIVE_INFINITY;
    }

    const distance =
        (toIndex - fromIndex + WIND_TURN_ORDER.length) % WIND_TURN_ORDER.length;

    return distance === 0 ? Number.POSITIVE_INFINITY : distance;
}

export function getModeLimitIdx(gameMode: GameMode) {
    if (gameMode === "동풍전") return 1;
    if (gameMode === "반장전") return 2;
    return 4;
}