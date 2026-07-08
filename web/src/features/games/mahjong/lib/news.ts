// web/src/features/games/mahjong/lib/news.ts

import { Prisma } from "@prisma/client";

import { db } from "@/lib/prisma";

import { AchievementDefinitions } from "../constants/achievement-definitions";
import type { MahjongRoundLog, MahjongWinLog } from "../types";
import { normalizeDetails } from "./details";
import { MAHJONG_GAME_KEY } from "../constants";

const USER_PLAYER_KEY_PREFIX = "user_";

const ROUND_NAME_MAP: Record<string, string> = {
    EAST_1: "동 1국",
    EAST_2: "동 2국",
    EAST_3: "동 3국",
    EAST_4: "동 4국",
    SOUTH_1: "남 1국",
    SOUTH_2: "남 2국",
    SOUTH_3: "남 3국",
    SOUTH_4: "남 4국",
    WEST_1: "서 1국",
    WEST_2: "서 2국",
    WEST_3: "서 3국",
    WEST_4: "서 4국",
    NORTH_1: "북 1국",
    NORTH_2: "북 2국",
    NORTH_3: "북 3국",
    NORTH_4: "북 4국",
};

const YAKUMAN_LABEL_MAP: Record<string, string> = {
    kokushi_musou: "국사무쌍",
    kokushi_musou_13_wait: "국사무쌍 13면대기",
    suuankou: "사암각",
    suuankou_tanki: "사암각 단기",
    daisangen: "대삼원",
    shousuushii: "소사희",
    daisuushii: "대사희",
    tsuuiisou: "자일색",
    ryuuiisou: "녹일색",
    chinroutou: "청노두",
    chuuren_poutou: "구련보등",
    junsei_chuuren_poutou: "순정구련보등",
    suukantsu: "사깡쯔",
    tenhou: "천화",
    chiihou: "지화",
};

function getUserIdFromPlayerKey(playerKey: string | null | undefined) {
    if (!playerKey?.startsWith(USER_PLAYER_KEY_PREFIX)) {
        return null;
    }

    return playerKey.slice(USER_PLAYER_KEY_PREFIX.length);
}

function getRoundName(round?: string) {
    if (!round) return "대국";

    return ROUND_NAME_MAP[round] ?? round;
}

function getWins(log: MahjongRoundLog): MahjongWinLog[] {
    if (log.type !== "AGARI") {
        return [];
    }

    return log.wins ?? [];
}

function isYakuman(win: MahjongWinLog) {
    if ((win.yakuman_count ?? 0) > 0) return true;
    if (win.base_score >= 8000) return true;

    return win.selected_yaku_ids.some((yakuId) => {
        return yakuId.includes("yakuman") || YAKUMAN_LABEL_MAP[yakuId];
    });
}

function getYakumanLabel(selectedYakuIds: string[]) {
    const yakumanYakuIds = selectedYakuIds.filter((yakuId) => {
        return yakuId.includes("yakuman") || YAKUMAN_LABEL_MAP[yakuId];
    });

    if (yakumanYakuIds.length === 0) {
        return "역만";
    }

    return yakumanYakuIds
        .map((yakuId) => YAKUMAN_LABEL_MAP[yakuId] ?? yakuId)
        .join(", ");
}

async function createMahjongNewsEvent(params: {
    eventKey: string;
    eventType: "YAKUMAN" | "ACHIEVEMENT";
    userId: string;
    matchId?: number | null;
    achievementId?: string | null;
    yakuId?: string | null;
    title: string;
    message: string;
    metadata?: Prisma.InputJsonValue;
    occurredAt?: Date;
}) {
    await db.mahjong_news_events.upsert({
        where: {
            event_key: params.eventKey,
        },
        create: {
            event_key: params.eventKey,
            event_type: params.eventType,
            user_id: params.userId,
            match_id: params.matchId ?? null,
            achievement_id: params.achievementId ?? null,
            yaku_id: params.yakuId ?? null,
            title: params.title,
            message: params.message,
            metadata: params.metadata ?? Prisma.JsonNull,
            occurred_at: params.occurredAt ?? new Date(),
        },
        update: {},
    });
}

export async function createMahjongAchievementNewsEvent(params: {
    userId: string;
    achievementId: string;
}) {
    const achievement = AchievementDefinitions.find(
        (item) => item.id === params.achievementId,
    );

    if (!achievement) return;

    const user = await db.users.findUnique({
        where: {
            id: params.userId,
        },
        select: {
            nickname: true,
        },
    });

    if (!user) return;

    await createMahjongNewsEvent({
        eventKey: `mahjong:achievement:${params.userId}:${params.achievementId}`,
        eventType: "ACHIEVEMENT",
        userId: params.userId,
        achievementId: params.achievementId,
        title: "도전과제 달성",
        message: `${user.nickname}님이 도전과제 [${achievement.title}]을 달성했습니다!`,
        metadata: {
            achievement_id: achievement.id,
            achievement_title: achievement.title,
            badge_id: achievement.badgeId,
            category: achievement.category,
        },
    });
}

export async function syncMahjongNewsEventsForMatch(matchId: number) {
    const mahjongGame = await db.games.findUnique({
        where: {
            key: MAHJONG_GAME_KEY,
        },
        select: {
            id: true,
        },
    });

    if (!mahjongGame) return;

    const match = await db.matches.findFirst({
        where: {
            id: matchId,
            game_id: mahjongGame.id,
        },
        include: {
            match_details: {
                select: {
                    details: true,
                },
            },
        },
    });

    if (!match || match.deleted_at) return;

    const details = normalizeDetails(match.match_details?.details);

    if (details.status === "DELETED") return;

    for (const [logIndex, log] of details.logs.entries()) {
        if (log.type !== "AGARI") continue;

        const wins = getWins(log);

        for (const [winIndex, win] of wins.entries()) {
            if (!isYakuman(win)) continue;

            const winnerUserId = getUserIdFromPlayerKey(win.winner_key);

            if (!winnerUserId) continue;

            const user = await db.users.findUnique({
                where: {
                    id: winnerUserId,
                },
                select: {
                    nickname: true,
                },
            });

            if (!user) continue;

            const yakumanLabel = getYakumanLabel(win.selected_yaku_ids);
            const primaryYakuId = win.selected_yaku_ids[0] ?? null;
            const roundName = getRoundName(log.round);

            await createMahjongNewsEvent({
                eventKey: `mahjong:yakuman:${matchId}:${logIndex}:${winIndex}:${winnerUserId}`,
                eventType: "YAKUMAN",
                userId: winnerUserId,
                matchId,
                yakuId: primaryYakuId,
                title: "역만 화료",
                message: `${user.nickname}님이 ${roundName}에서 역만(${yakumanLabel})을 화료했습니다!`,
                metadata: {
                    match_id: matchId,
                    round: log.round ?? null,
                    honba: log.honba ?? 0,
                    yaku_ids: win.selected_yaku_ids,
                    yakuman_label: yakumanLabel,
                    base_score: win.base_score,
                    yakuman_count: win.yakuman_count ?? null,
                },
            });
        }
    }
}

export async function getRecentMahjongNewsEvents(take = 5) {
    return db.mahjong_news_events.findMany({
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