// web/src/features/games/mahjong/lib/details.ts
import { Prisma } from "@prisma/client";

import type {
    GameMode,
    MahjongDetails,
    MahjongPlayerState,
} from "../types";

export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function normalizeLog(log: Record<string, unknown>) {
    if (log.type === "AGARI") {
        return {
            ...log,
            timestamp: log.timestamp,
            type: "AGARI",
            round: log.round,
            honba: log.honba,
            is_tsumo: Boolean(log.is_tsumo),
            is_final: Boolean(log.is_final),
            forced_end: Boolean(log.forced_end),
            riichi_keys: Array.isArray(log.riichi_keys) ? log.riichi_keys : [],
            wins: Array.isArray(log.wins) ? log.wins : [],
            score_deltas:
                typeof log.score_deltas === "object" && log.score_deltas !== null
                    ? log.score_deltas
                    : {},
            result_scores:
                typeof log.result_scores === "object" && log.result_scores !== null
                    ? log.result_scores
                    : {},
        };
    }

    if (log.type === "RYUUKYOKU") {
        return {
            ...log,
            timestamp: log.timestamp,
            type: "RYUUKYOKU",
            round: log.round,
            honba: log.honba,
            ryuukyoku_type: log.ryuukyoku_type,
            is_final: Boolean(log.is_final),
            forced_end: Boolean(log.forced_end),
            tenpai_keys: Array.isArray(log.tenpai_keys) ? log.tenpai_keys : [],
            nagashi_mangan_winner_keys: Array.isArray(log.nagashi_mangan_winner_keys)
                ? log.nagashi_mangan_winner_keys
                : [],
            riichi_keys: Array.isArray(log.riichi_keys) ? log.riichi_keys : [],
            score_deltas:
                typeof log.score_deltas === "object" && log.score_deltas !== null
                    ? log.score_deltas
                    : {},
            result_scores:
                typeof log.result_scores === "object" && log.result_scores !== null
                    ? log.result_scores
                    : {},
        };
    }

    return log;
}

export function normalizeDetails(rawDetails: unknown): MahjongDetails {
    const details = rawDetails as Record<string, any>;
    const rawLogs = Array.isArray(details.logs) ? details.logs : [];
    const players = (details.players ?? {}) as Record<string, MahjongPlayerState>;

    return {
        schema_version: Number(details.schema_version ?? 1),
        game_key: details.game_key === "mahjong" ? "mahjong" : undefined,
        current_round: String(details.current_round ?? "EAST_1"),
        honba: Number(details.honba ?? 0),
        riichi_sticks: Number(details.riichi_sticks ?? 0),
        players,
        initial_players:
            typeof details.initial_players === "object" &&
            details.initial_players !== null &&
            !Array.isArray(details.initial_players)
                ? (details.initial_players as Record<string, MahjongPlayerState>)
                : undefined,
        logs: rawLogs.map((log) => normalizeLog(log as Record<string, any>)),
        game_mode: (details.game_mode ?? "동풍전") as GameMode,
        status: details.status ?? "PLAYING",
        finish_reason: details.finish_reason as
            | MahjongDetails["finish_reason"]
            | undefined,
        stats_applied: Boolean(details.stats_applied),
        deleted_at:
            typeof details.deleted_at === "string" ? details.deleted_at : undefined,
        deleted_by:
            typeof details.deleted_by === "string" ? details.deleted_by : undefined,
    };
}

export function cloneMahjongPlayers(
    players: Record<string, MahjongPlayerState>,
) {
    return structuredClone(players) as Record<string, MahjongPlayerState>;
}