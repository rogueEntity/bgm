// web/src/features/games/tichu/news.ts

import { Prisma } from "@prisma/client";

import { TICHU_ACHIEVEMENT_MAP } from "@/features/games/tichu/constants/achievement-definitions";
import { TICHU_GAME_KEY } from "@/features/games/tichu/constants";
import { normalizeTichuMatchDetails } from "@/features/games/tichu/stats";
import type {
    TichuMatchDetails,
    TichuRoundLog,
    TichuTeamKey,
} from "@/features/games/tichu/types";
import { db } from "@/lib/prisma";

const USER_PLAYER_KEY_PREFIX = "user_";

export type TichuNewsEventType =
    | "ACHIEVEMENT"
    | "GRAND_TICHU_SUCCESS"
    | "ONE_TWO_SUCCESS"
    | "COMEBACK_WIN"
    | "CLOSE_GAME";

type CreateTichuNewsEventParams = {
    eventKey: string;
    eventType: TichuNewsEventType;
    userId: string;
    matchId?: number | null;
    achievementId?: string | null;
    title: string;
    message: string;
    metadata?: Prisma.InputJsonValue;
    occurredAt?: Date;
};

function getUserIdFromPlayerKey(
    playerKey: string | null | undefined,
): string | null {
    if (!playerKey?.startsWith(USER_PLAYER_KEY_PREFIX)) {
        return null;
    }

    const userId = playerKey.slice(USER_PLAYER_KEY_PREFIX.length);

    return userId || null;
}

function getOppositeTeamKey(teamKey: TichuTeamKey): TichuTeamKey {
    return teamKey === "TEAM_A" ? "TEAM_B" : "TEAM_A";
}

function getTeamPlayerNames(
    details: TichuMatchDetails,
    teamKey: TichuTeamKey,
): string[] {
    return details.teams[teamKey].player_keys
        .map((playerKey) => details.players[playerKey]?.name)
        .filter((name): name is string => Boolean(name));
}

function getTeamDisplayName(
    details: TichuMatchDetails,
    teamKey: TichuTeamKey,
): string {
    const teamName = details.teams[teamKey].name.trim();

    if (teamName) {
        return teamName;
    }

    const playerNames = getTeamPlayerNames(details, teamKey);

    if (playerNames.length > 0) {
        return `${playerNames.join(", ")} 팀`;
    }

    return teamKey === "TEAM_A" ? "A팀" : "B팀";
}

function getRepresentativeUserId(
    details: TichuMatchDetails,
    teamKey: TichuTeamKey,
): string | null {
    for (const playerKey of details.teams[teamKey].player_keys) {
        const userId = getUserIdFromPlayerKey(playerKey);

        if (userId) {
            return userId;
        }
    }

    return null;
}

function getMatchOccurredAt(details: TichuMatchDetails): Date {
    if (details.finished_at) {
        const finishedAt = new Date(details.finished_at);

        if (!Number.isNaN(finishedAt.getTime())) {
            return finishedAt;
        }
    }

    return new Date();
}

function getFinalScoreDiff(details: TichuMatchDetails): number {
    return Math.abs(
        details.teams.TEAM_A.score - details.teams.TEAM_B.score,
    );
}

function getMaximumDeficit(
    details: TichuMatchDetails,
    teamKey: TichuTeamKey,
): number {
    const oppositeTeamKey = getOppositeTeamKey(teamKey);

    let maximumDeficit = 0;

    for (const log of details.logs) {
        const ownScore = log.total_scores?.[teamKey];
        const oppositeScore = log.total_scores?.[oppositeTeamKey];

        if (
            typeof ownScore !== "number" ||
            typeof oppositeScore !== "number"
        ) {
            continue;
        }

        maximumDeficit = Math.max(
            maximumDeficit,
            oppositeScore - ownScore,
        );
    }

    return maximumDeficit;
}

function findOneTwoLog(
    details: TichuMatchDetails,
    preferredTeamKey: TichuTeamKey | null,
): TichuRoundLog | null {
    if (preferredTeamKey) {
        const preferredLog = details.logs.find(
            (log) => log.one_two_team_key === preferredTeamKey,
        );

        if (preferredLog) {
            return preferredLog;
        }
    }

    return (
        details.logs.find(
            (log) =>
                log.one_two_team_key === "TEAM_A" ||
                log.one_two_team_key === "TEAM_B",
        ) ?? null
    );
}

async function createTichuNewsEvent(
    params: CreateTichuNewsEventParams,
): Promise<void> {
    await db.tichu_news_events.upsert({
        where: {
            event_key: params.eventKey,
        },
        create: {
            event_key: params.eventKey,
            event_type: params.eventType,
            user_id: params.userId,
            match_id: params.matchId ?? null,
            achievement_id: params.achievementId ?? null,
            title: params.title,
            message: params.message,
            metadata: params.metadata ?? Prisma.JsonNull,
            occurred_at: params.occurredAt ?? new Date(),
        },
        update: {},
    });
}

export async function createTichuAchievementNewsEvent(params: {
    userId: string;
    achievementId: string;
    completedAt?: Date | null;
}): Promise<void> {
    const achievement =
        TICHU_ACHIEVEMENT_MAP[params.achievementId];

    if (!achievement) {
        return;
    }

    const user = await db.users.findUnique({
        where: {
            id: params.userId,
        },
        select: {
            nickname: true,
        },
    });

    if (!user) {
        return;
    }

    await createTichuNewsEvent({
        eventKey:
            `tichu:achievement:${params.userId}:${params.achievementId}`,
        eventType: "ACHIEVEMENT",
        userId: params.userId,
        achievementId: params.achievementId,
        title: "도전과제 달성",
        message:
            `${user.nickname}님이 도전과제 ` +
            `[${achievement.title}]을 달성했습니다!`,
        metadata: {
            achievement_id: achievement.id,
            achievement_title: achievement.title,
            badge_id: achievement.badgeId,
            category: achievement.category,
        },
        occurredAt: params.completedAt ?? new Date(),
    });
}

async function createGrandTichuNewsEvents(params: {
    matchId: number;
    details: TichuMatchDetails;
    occurredAt: Date;
}): Promise<void> {
    const { matchId, details, occurredAt } = params;

    for (const [logIndex, log] of details.logs.entries()) {
        for (const [callIndex, call] of (
            log.large_tichu_calls ?? []
        ).entries()) {
            if (call.result !== "SUCCESS") {
                continue;
            }

            const userId = getUserIdFromPlayerKey(call.player_key);

            if (!userId) {
                continue;
            }

            const player = details.players[call.player_key];

            if (!player) {
                continue;
            }

            await createTichuNewsEvent({
                eventKey:
                    `tichu:grand-success:${matchId}:` +
                    `${logIndex}:${callIndex}:${userId}`,
                eventType: "GRAND_TICHU_SUCCESS",
                userId,
                matchId,
                title: "라지 티츄 성공",
                message:
                    `${player.name}님이 ${log.round}라운드에서 ` +
                    "라지 티츄에 성공했습니다!",
                metadata: {
                    match_id: matchId,
                    round: log.round,
                    player_key: call.player_key,
                    team_key: player.team_key,
                    score_delta: call.score_delta,
                },
                occurredAt,
            });
        }
    }
}

async function createResultNewsEvent(params: {
    matchId: number;
    details: TichuMatchDetails;
    occurredAt: Date;
}): Promise<void> {
    const { matchId, details, occurredAt } = params;
    const winnerTeamKey = details.winner_team_key;

    if (!winnerTeamKey) {
        return;
    }

    const loserTeamKey = getOppositeTeamKey(winnerTeamKey);
    const representativeUserId = getRepresentativeUserId(
        details,
        winnerTeamKey,
    );

    if (!representativeUserId) {
        return;
    }

    const winnerTeamName = getTeamDisplayName(
        details,
        winnerTeamKey,
    );
    const winnerPlayerNames = getTeamPlayerNames(
        details,
        winnerTeamKey,
    );
    const winnerScore = details.teams[winnerTeamKey].score;
    const loserScore = details.teams[loserTeamKey].score;

    const comebackThreshold = Math.ceil(
        details.target_score * 0.3,
    );
    const maximumDeficit = getMaximumDeficit(
        details,
        winnerTeamKey,
    );

    if (maximumDeficit >= comebackThreshold) {
        await createTichuNewsEvent({
            eventKey: `tichu:comeback:${matchId}`,
            eventType: "COMEBACK_WIN",
            userId: representativeUserId,
            matchId,
            title: "대역전승",
            message:
                `${winnerTeamName}이 최대 ${maximumDeficit}점의 열세를 ` +
                `뒤집고 ${winnerScore} 대 ${loserScore}로 승리했습니다!`,
            metadata: {
                match_id: matchId,
                winner_team_key: winnerTeamKey,
                winner_player_names: winnerPlayerNames,
                maximum_deficit: maximumDeficit,
                comeback_threshold: comebackThreshold,
                final_scores: {
                    TEAM_A: details.teams.TEAM_A.score,
                    TEAM_B: details.teams.TEAM_B.score,
                },
            },
            occurredAt,
        });

        return;
    }

    const finalScoreDiff = getFinalScoreDiff(details);
    const closeGameThreshold = Math.ceil(
        details.target_score * 0.05,
    );

    if (finalScoreDiff <= closeGameThreshold) {
        await createTichuNewsEvent({
            eventKey: `tichu:close-game:${matchId}`,
            eventType: "CLOSE_GAME",
            userId: representativeUserId,
            matchId,
            title: "초접전 승부",
            message:
                `${winnerTeamName}이 치열한 승부 끝에 ` +
                `${winnerScore} 대 ${loserScore}, ` +
                `${finalScoreDiff}점 차이로 승리했습니다!`,
            metadata: {
                match_id: matchId,
                winner_team_key: winnerTeamKey,
                winner_player_names: winnerPlayerNames,
                final_score_diff: finalScoreDiff,
                close_game_threshold: closeGameThreshold,
                final_scores: {
                    TEAM_A: details.teams.TEAM_A.score,
                    TEAM_B: details.teams.TEAM_B.score,
                },
            },
            occurredAt,
        });

        return;
    }

    const oneTwoLog = findOneTwoLog(
        details,
        winnerTeamKey,
    );

    if (!oneTwoLog?.one_two_team_key) {
        return;
    }

    const oneTwoTeamKey = oneTwoLog.one_two_team_key;
    const oneTwoUserId = getRepresentativeUserId(
        details,
        oneTwoTeamKey,
    );

    if (!oneTwoUserId) {
        return;
    }

    const oneTwoPlayerNames = getTeamPlayerNames(
        details,
        oneTwoTeamKey,
    );
    const oneTwoTeamName = getTeamDisplayName(
        details,
        oneTwoTeamKey,
    );

    await createTichuNewsEvent({
        eventKey: `tichu:one-two:${matchId}`,
        eventType: "ONE_TWO_SUCCESS",
        userId: oneTwoUserId,
        matchId,
        title: "원투 성공",
        message:
            `${oneTwoPlayerNames.join("님과 ")}님이 ` +
            `${oneTwoLog.round}라운드에서 완벽한 원투에 성공했습니다!`,
        metadata: {
            match_id: matchId,
            round: oneTwoLog.round,
            team_key: oneTwoTeamKey,
            team_name: oneTwoTeamName,
            player_names: oneTwoPlayerNames,
        },
        occurredAt,
    });
}

export async function syncTichuNewsEventsForMatch(
    matchId: number,
): Promise<void> {
    await db.tichu_news_events.deleteMany({
        where: {
            match_id: matchId,
        },
    });

    const game = await db.games.findUnique({
        where: {
            key: TICHU_GAME_KEY,
        },
        select: {
            id: true,
        },
    });

    if (!game) {
        return;
    }

    const match = await db.matches.findFirst({
        where: {
            id: matchId,
            game_id: game.id,
        },
        include: {
            match_details: {
                select: {
                    details: true,
                },
            },
        },
    });

    if (
        !match ||
        match.deleted_at ||
        !match.match_details
    ) {
        return;
    }

    const details = normalizeTichuMatchDetails(
        match.match_details.details,
    );

    if (details.status !== "FINISHED") {
        return;
    }

    const occurredAt = getMatchOccurredAt(details);

    await createGrandTichuNewsEvents({
        matchId,
        details,
        occurredAt,
    });

    await createResultNewsEvent({
        matchId,
        details,
        occurredAt,
    });
}

export async function getRecentTichuNewsEvents(
    take = 5,
) {
    return db.tichu_news_events.findMany({
        orderBy: {
            occurred_at: "desc",
        },
        take,
        include: {
            users: {
                select: {
                    nickname: true,
                    avatar_emoji: true,
                    avatar_image_key: true,
                    avatar_image_updated_at: true,
                },
            },
        },
    });
}