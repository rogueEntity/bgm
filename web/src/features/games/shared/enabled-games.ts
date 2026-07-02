// web/src/features/games/shared/enabled-games.ts

import { notFound } from "next/navigation";

import { gameModuleList, gameModules } from "./game-registry";

import type { GameKey, GameModule } from "./types";

function parseEnabledGameKeys(value?: string): GameKey[] {
    if (value === undefined) return [];

    return value
        .split(",")
        .map((key) => key.trim())
        .filter((key): key is GameKey => key in gameModules);
}

export function getEnabledGameKeys(): GameKey[] {
    return parseEnabledGameKeys(process.env.ENABLED_GAMES);
}

export function getEnabledGameModules(): GameModule[] {
    const enabledGameKeys = getEnabledGameKeys();

    return gameModuleList.filter((gameModule) =>
        enabledGameKeys.includes(gameModule.key),
    );
}

export function isGameEnabled(gameKey: string): gameKey is GameKey {
    const enabledGameKeys = getEnabledGameKeys();

    return enabledGameKeys.includes(gameKey as GameKey);
}

export function assertGameEnabled(gameKey: string): void {
    if (!isGameEnabled(gameKey)) {
        notFound();
    }
}

export function assertGameEnabledForAction(gameKey: string): void {
    if (!isGameEnabled(gameKey)) {
        throw new Error("비활성화된 게임입니다.");
    }
}