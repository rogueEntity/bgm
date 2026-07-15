// web/src/features/games/mahjong/lib/match-service.ts

import { db } from "@/lib/prisma";

import {
    MAHJONG_GAME_KEY,
    MAHJONG_GAME_NAME,
    MAHJONG_GAME_NAME_EN,
    MAHJONG_MAX_PLAYERS,
    MAHJONG_MIN_PLAYERS,
} from "../constants";
import type {
    GameMode,
    MahjongDetails,
    MahjongMatchListFilter,
    MahjongMatchListItem,
    MahjongPlayerState,
    MahjongStatus,
} from "../types";
import {
    normalizeDetails,
    toPrismaJson,
} from "./details";
import {
    createInitialPlayersForReplay,
    rebuildMahjongDetailsFromLogs,
} from "./replay";
import { recalculateAllMahjongStatsAndAchievements } from "./stats-service";

const MAX_MAHJONG_NICKNAME_LENGTH = 6;

export async function createMahjongMatchRecord({
                                                   players,
                                                   startingScore,
                                                   gameMode,
                                                   createdBy,
                                               }: {
    players: string[];
    startingScore: number;
    gameMode: GameMode;
    createdBy: string;
}) {
    const winds: MahjongPlayerState["wind"][] = [
        "EAST",
        "SOUTH",
        "WEST",
        "NORTH",
    ];

    let game = await db.games.findFirst({
        where: {
            key: MAHJONG_GAME_KEY,
        },
    });

    game ??= await db.games.create({
        data: {
            key: MAHJONG_GAME_KEY,
            name: MAHJONG_GAME_NAME,
            name_en: MAHJONG_GAME_NAME_EN,
            min_players: MAHJONG_MIN_PLAYERS,
            max_players: MAHJONG_MAX_PLAYERS,
            is_active: true,
        },
    });

    const playerNames = players.map((player) => player.trim());

    if (playerNames.length !== 4) {
        throw new Error("작사는 4명이어야 합니다.");
    }

    if (playerNames.some((playerName) => playerName.length === 0)) {
        throw new Error("작사 이름을 모두 입력해주세요.");
    }

    if (
        playerNames.some(
            (playerName) => playerName.length > MAX_MAHJONG_NICKNAME_LENGTH,
        )
    ) {
        throw new Error(
            `작사 이름은 ${MAX_MAHJONG_NICKNAME_LENGTH}글자까지 입력할 수 있습니다.`,
        );
    }

    if (new Set(playerNames).size !== 4) {
        throw new Error("작사 이름은 모두 달라야 합니다.");
    }

    const existingUsers = await db.users.findMany({
        where: {
            nickname: {
                in: playerNames,
            },
        },
    });

    const userMap = new Map(existingUsers.map((user) => [user.nickname, user.id]));

    const initialPlayersState: Record<string, MahjongPlayerState> = {};

    const matchPlayersData = playerNames.map((playerName, index) => {
        const foundUserId = userMap.get(playerName);
        const playerKey = foundUserId
            ? `user_${foundUserId}`
            : `guest_${playerName}`;

        initialPlayersState[playerKey] = {
            wind: winds[index],
            score: startingScore,
        };

        return {
            user_id: foundUserId || null,
            guest_name: foundUserId ? null : playerName,
        };
    });

    const initialDetails: MahjongDetails = {
        schema_version: 2,
        current_round: "EAST_1",
        honba: 0,
        riichi_sticks: 0,
        players: initialPlayersState,
        initial_players: structuredClone(initialPlayersState),
        logs: [],
        game_mode: gameMode,
        status: "PLAYING",
        stats_applied: false,
    };

    return db.matches.create({
        data: {
            game_id: game.id,
            created_by: createdBy,
            match_players: {
                create: matchPlayersData,
            },
            match_details: {
                create: {
                    details: toPrismaJson(initialDetails),
                },
            },
        },
        select: {
            id: true,
        },
    });
}

export async function getMahjongMatchList({
                                              filter = {},
                                              currentUser,
                                          }: {
    filter?: MahjongMatchListFilter;
    currentUser: {
        id: string;
        isAdmin: boolean;
    } | null;
}): Promise<MahjongMatchListItem[]> {
    const status = filter.status ?? "ALL";
    const gameMode = filter.game_mode ?? "ALL";
    const keyword = filter.keyword?.trim().toLowerCase() ?? "";
    const onlyMine = filter.only_mine ?? false;
    const take = filter.take ?? 50;
    const fetchTake = Math.min(Math.max(take * 3, 100), 300);

    const myUserId = currentUser?.id ?? null;

    if (onlyMine && !myUserId) {
        return [];
    }

    const mahjongGame = await db.games.findUnique({
        where: {
            key: MAHJONG_GAME_KEY,
        },
        select: {
            id: true,
        },
    });

    if (!mahjongGame) {
        return [];
    }

    const matches = await db.matches.findMany({
        where: {
            game_id: mahjongGame.id,
            deleted_at: null,
            ...(onlyMine && myUserId
                ? {
                    match_players: {
                        some: {
                            user_id: myUserId,
                        },
                    },
                }
                : {}),
        },
        include: {
            match_details: true,
            match_players: {
                include: {
                    users: true,
                },
            },
        },
        orderBy: {
            play_date: "desc",
        },
        take: fetchTake,
    });

    return matches
        .map((match): MahjongMatchListItem | null => {
            if (!match.match_details) {
                return null;
            }

            const details = normalizeDetails(match.match_details.details);

            if (details.status === "DELETED") {
                return null;
            }

            const lastLog = details.logs.at(-1);
            const shouldShowLastCompletedRound = details.status === "FINISHED";

            const displayRound =
                shouldShowLastCompletedRound && typeof lastLog?.round === "string"
                    ? lastLog.round
                    : details.current_round;

            const displayHonba =
                shouldShowLastCompletedRound && typeof lastLog?.honba === "number"
                    ? lastLog.honba
                    : details.honba;

            const players = match.match_players.map((matchPlayer) => {
                const name =
                    (matchPlayer.user_id
                        ? matchPlayer.users?.nickname
                        : matchPlayer.guest_name) ?? "이름 없음";

                const key = matchPlayer.user_id
                    ? `user_${matchPlayer.user_id}`
                    : `guest_${matchPlayer.guest_name}`;

                const playerState = details.players[key];

                return {
                    key,
                    name,
                    wind: playerState?.wind ?? null,
                    score: playerState?.score ?? matchPlayer.final_score ?? null,
                    rank: matchPlayer.rank ?? null,
                    avatar_image_key: matchPlayer.users?.avatar_image_key ?? null,
                    avatar_image_updated_at:
                        matchPlayer.users?.avatar_image_updated_at ?? null,
                    avatar_emoji: matchPlayer.users?.avatar_emoji ?? null,
                };
            });

            return {
                id: match.id,
                created_by: match.created_by,
                can_manage: Boolean(
                    currentUser?.isAdmin || currentUser?.id === match.created_by,
                ),
                log_count: details.logs.length,
                play_date: match.play_date?.toISOString() ?? null,
                game_mode: details.game_mode,
                status: details.status as Exclude<MahjongStatus, "DELETED">,
                current_round: displayRound,
                honba: displayHonba,
                riichi_sticks: details.riichi_sticks,
                finish_reason: details.finish_reason ?? null,
                players,
            };
        })
        .filter((match): match is MahjongMatchListItem => {
            if (!match) {
                return false;
            }

            if (status !== "ALL" && match.status !== status) {
                return false;
            }

            if (gameMode !== "ALL" && match.game_mode !== gameMode) {
                return false;
            }

            if (keyword) {
                const matchIdText = String(match.id);
                const playerNames = match.players.map((player) =>
                    player.name.toLowerCase(),
                );

                return (
                    matchIdText.includes(keyword) ||
                    playerNames.some((playerName) => playerName.includes(keyword))
                );
            }

            return true;
        })
        .slice(0, take);
}

export async function getMahjongMatchManageTarget(matchId: number) {
    const mahjongGameId = await getMahjongGameId();

    const match = await db.matches.findFirst({
        where: {
            id: matchId,
            game_id: mahjongGameId,
        },
        select: {
            id: true,
            created_by: true,
            deleted_at: true,
            match_details: {
                select: {
                    details: true,
                },
            },
        },
    });

    if (!match?.match_details) {
        throw new Error("대국 기록을 찾을 수 없습니다.");
    }

    return {
        id: match.id,
        created_by: match.created_by,
        deleted_at: match.deleted_at,
        details: normalizeDetails(match.match_details.details),
    };
}

export async function deleteMahjongMatchRecord({
                                                   matchId,
                                                   deletedBy,
                                               }: {
    matchId: number;
    deletedBy: string;
}) {
    const mahjongGameId = await getMahjongGameId();

    const match = await db.matches.findFirst({
        where: {
            id: matchId,
            game_id: mahjongGameId,
        },
        include: {
            match_details: true,
        },
    });

    if (!match?.match_details) {
        throw new Error("대국 기록을 찾을 수 없습니다.");
    }

    const details = normalizeDetails(match.match_details.details);

    if (match.deleted_at || details.status === "DELETED") {
        return {
            changed: false,
        };
    }

    const deletedAt = new Date();

    const nextDetails: MahjongDetails = {
        ...details,
        status: "DELETED",
        stats_applied: false,
        deleted_at: deletedAt.toISOString(),
        deleted_by: deletedBy,
    };

    await db.$transaction(async (tx) => {
        await tx.match_details.update({
            where: {
                match_id: matchId,
            },
            data: {
                details: toPrismaJson(nextDetails),
                version: {
                    increment: 1,
                },
            },
        });

        await tx.matches.update({
            where: {
                id: matchId,
            },
            data: {
                deleted_at: deletedAt,
                deleted_by: deletedBy,
            },
        });

        await tx.mahjong_news_events.deleteMany({
            where: {
                match_id: matchId,
            },
        });
    });

    await recalculateAllMahjongStatsAndAchievements();

    return {
        changed: true,
    };
}

async function assertMahjongCreatorHasNoOtherPlayingMatch({
                                                              matchId,
                                                              createdBy,
                                                          }: {
    matchId: number;
    createdBy: string | null;
}) {
    if (!createdBy) {
        return;
    }

    const mahjongGameId = await getMahjongGameId();

    const otherPlayingMatch = await db.matches.findFirst({
        where: {
            id: {
                not: matchId,
            },
            game_id: mahjongGameId,
            created_by: createdBy,
            deleted_at: null,
            match_details: {
                details: {
                    path: ["status"],
                    equals: "PLAYING",
                },
            },
        },
        select: {
            id: true,
        },
    });

    if (otherPlayingMatch) {
        throw new Error(
            "게임 생성자에게 이미 진행 중인 리치마작 대국이 있어 종료된 대국을 진행 중으로 되돌릴 수 없습니다.",
        );
    }
}

export async function undoMahjongLastLogRecord(matchId: number) {
    const mahjongGameId = await getMahjongGameId();

    const match = await db.matches.findFirst({
        where: {
            id: matchId,
            game_id: mahjongGameId,
        },
        include: {
            match_details: true,
            match_players: true,
        },
    });

    if (!match?.match_details) {
        throw new Error("대국 기록을 찾을 수 없습니다.");
    }

    const details = normalizeDetails(match.match_details.details);

    if (details.status === "DELETED") {
        throw new Error("삭제된 대국은 UNDO할 수 없습니다.");
    }

    const logs = Array.isArray(details.logs) ? details.logs : [];

    if (logs.length === 0) {
        throw new Error("되돌릴 기록이 없습니다.");
    }

    const willRestoreFinishedMatch = details.status === "FINISHED";

    if (willRestoreFinishedMatch) {
        await assertMahjongCreatorHasNoOtherPlayingMatch({
            matchId,
            createdBy: match.created_by,
        });
    }

    const nextLogs = logs.slice(0, -1);

    const initialPlayers = createInitialPlayersForReplay({
        details,
        matchPlayers: match.match_players,
    });

    const rebuiltDetails = rebuildMahjongDetailsFromLogs({
        originalDetails: details,
        initialPlayers,
        logs: nextLogs,
    });

    rebuiltDetails.status = "PLAYING";
    rebuiltDetails.finish_reason = undefined;
    rebuiltDetails.stats_applied = false;

    await db.match_details.update({
        where: {
            match_id: matchId,
        },
        data: {
            details: toPrismaJson(rebuiltDetails),
            version: {
                increment: 1,
            },
        },
    });

    await recalculateAllMahjongStatsAndAchievements();

    return {
        changed: true,
    };
}

async function getMahjongGameId() {
    const game = await db.games.findUnique({
        where: {
            key: MAHJONG_GAME_KEY,
        },
        select: {
            id: true,
        },
    });

    if (!game) {
        throw new Error("리치마작 게임 정보를 찾을 수 없습니다.");
    }

    return game.id;
}