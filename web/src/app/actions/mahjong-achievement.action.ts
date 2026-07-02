// web/src/app/actions/mahjong-achievement.action.ts
"use server";

import { auth } from "@/auth";
import {
  BADGE_MAP,
  AchievementDefinitions,
  type AchievementCategory,
  type AchievementConditionType,
  type BadgeDisplayType,
  type BadgeRarity,
} from "@/features/games/mahjong/constants/achievement-definitions";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type MyMahjongAchievementItem = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  goal: number;
  conditionType: AchievementConditionType;
  conditionValue?: {
    rank?: number;
    minRank?: number;
    minScore?: number;
    minDora?: number;
    maxDealInRate?: number;
    minMatchCount?: number;
    yakuIds?: string[];
  };
  progress: number;
  completed: boolean;
  completedAt: string | null;
  badge: {
    id: string;
    name: string;
    description: string;
    display: string;
    displayType: BadgeDisplayType;
    rarity: BadgeRarity;
    earned: boolean;
  } | null;
};

export type MyMahjongBadgeItem = {
  id: string;
  name: string;
  description: string;
  display: string;
  displayType: BadgeDisplayType;
  rarity: BadgeRarity;
  earnedAt: string;
  equippedSlot: number | null;
};

async function getCurrentUserId() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const providerId = session.user.id as string;

  const user = await db.users.findFirst({
    where: {
      provider_id: providerId,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new Error("로그인한 유저 정보를 찾을 수 없습니다.");
  }

  return user.id;
}

export async function getMyMahjongAchievements(): Promise<
  MyMahjongAchievementItem[]
> {
  const userId = await getCurrentUserId();

  const [progressRows, badgeRows] = await Promise.all([
    db.mahjong_user_achievements.findMany({
      where: {
        user_id: userId,
      },
      select: {
        achievement_id: true,
        progress: true,
        completed: true,
        completed_at: true,
      },
    }),
    db.mahjong_user_badges.findMany({
      where: {
        user_id: userId,
      },
      select: {
        badge_id: true,
      },
    }),
  ]);

  const progressMap = new Map(
    progressRows.map((row) => [row.achievement_id, row])
  );

  const earnedBadgeIdSet = new Set(badgeRows.map((row) => row.badge_id));

  return AchievementDefinitions.map((achievement) => {
    const progressRow = progressMap.get(achievement.id);
    const badge = BADGE_MAP[achievement.badgeId] ?? null;

    return {
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      category: achievement.category,
      goal: achievement.goal,
      conditionType: achievement.conditionType,
      conditionValue: achievement.conditionValue,
      progress: progressRow?.progress ?? 0,
      completed: progressRow?.completed ?? false,
      completedAt: progressRow?.completed_at?.toISOString() ?? null,
      badge: badge
        ? {
            id: badge.id,
            name: badge.name,
            description: badge.description,
            display: badge.display,
            displayType: badge.displayType,
            rarity: badge.rarity,
            earned: earnedBadgeIdSet.has(badge.id),
          }
        : null,
    };
  });
}

export async function getMyMahjongBadges(): Promise<MyMahjongBadgeItem[]> {
  const userId = await getCurrentUserId();

  const [earnedBadges, equippedBadges] = await Promise.all([
    db.mahjong_user_badges.findMany({
      where: {
        user_id: userId,
      },
      select: {
        badge_id: true,
        earned_at: true,
      },
      orderBy: {
        earned_at: "desc",
      },
    }),
    db.mahjong_user_equipped_badges.findMany({
      where: {
        user_id: userId,
      },
      select: {
        badge_id: true,
        slot: true,
      },
      orderBy: {
        slot: "asc",
      },
    }),
  ]);

  const equippedSlotMap = new Map(
    equippedBadges.map((badge) => [badge.badge_id, badge.slot])
  );

  return earnedBadges
    .map((earnedBadge): MyMahjongBadgeItem | null => {
      const badge = BADGE_MAP[earnedBadge.badge_id];

      if (!badge) return null;

      return {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        display: badge.display,
        displayType: badge.displayType,
        rarity: badge.rarity,
        earnedAt: earnedBadge.earned_at.toISOString(),
        equippedSlot: equippedSlotMap.get(badge.id) ?? null,
      };
    })
    .filter((badge): badge is MyMahjongBadgeItem => badge !== null);
}

export async function getMyMahjongEquippedBadges(): Promise<
  MyMahjongBadgeItem[]
> {
  const userId = await getCurrentUserId();

  const equippedBadges = await db.mahjong_user_equipped_badges.findMany({
    where: {
      user_id: userId,
    },
    select: {
      badge_id: true,
      slot: true,
    },
    orderBy: {
      slot: "asc",
    },
  });

  return equippedBadges
    .map((equippedBadge): MyMahjongBadgeItem | null => {
      const badge = BADGE_MAP[equippedBadge.badge_id];

      if (!badge) return null;

      return {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        display: badge.display,
        displayType: badge.displayType,
        rarity: badge.rarity,
        earnedAt: "",
        equippedSlot: equippedBadge.slot,
      };
    })
    .filter((badge): badge is MyMahjongBadgeItem => badge !== null);
}

export async function updateMyMahjongEquippedBadges(badgeIds: string[]) {
  const userId = await getCurrentUserId();

  if (!Array.isArray(badgeIds)) {
    throw new Error("배지 목록이 올바르지 않습니다.");
  }

  const normalizedBadgeIds = badgeIds
    .map((badgeId) => badgeId.trim())
    .filter(Boolean);

  if (normalizedBadgeIds.length > 3) {
    throw new Error("배지는 최대 3개까지 장착할 수 있습니다.");
  }

  if (new Set(normalizedBadgeIds).size !== normalizedBadgeIds.length) {
    throw new Error("같은 배지를 중복 장착할 수 없습니다.");
  }

  const invalidBadgeId = normalizedBadgeIds.find(
    (badgeId) => !BADGE_MAP[badgeId]
  );

  if (invalidBadgeId) {
    throw new Error("존재하지 않는 배지입니다.");
  }

  const earnedBadges = await db.mahjong_user_badges.findMany({
    where: {
      user_id: userId,
      badge_id: {
        in: normalizedBadgeIds,
      },
    },
    select: {
      badge_id: true,
    },
  });

  const earnedBadgeIdSet = new Set(earnedBadges.map((badge) => badge.badge_id));

  const notEarnedBadgeId = normalizedBadgeIds.find(
    (badgeId) => !earnedBadgeIdSet.has(badgeId)
  );

  if (notEarnedBadgeId) {
    throw new Error("획득하지 않은 배지는 장착할 수 없습니다.");
  }

  await db.$transaction(async (tx) => {
    await tx.mahjong_user_equipped_badges.deleteMany({
      where: {
        user_id: userId,
      },
    });

    if (normalizedBadgeIds.length === 0) return;

    await tx.mahjong_user_equipped_badges.createMany({
      data: normalizedBadgeIds.map((badgeId, index) => ({
        user_id: userId,
        badge_id: badgeId,
        slot: index + 1,
      })),
    });
  });

  revalidatePath("/mahjong/achievements");
  revalidatePath("/mahjong");
  revalidatePath("/mahjong/matches");
}

// web/src/app/actions/mahjong-achievement.action.ts

export type MahjongEquippedBadgeItem = {
  id: string;
  name: string;
  description: string;
  display: string;
  displayType: BadgeDisplayType;
  rarity: BadgeRarity;
  slot: number;
};

export type MahjongEquippedBadgeMap = Record<
  string,
  MahjongEquippedBadgeItem[]
>;

export async function getMahjongEquippedBadgesByUserIds(
  userIds: string[],
): Promise<MahjongEquippedBadgeMap> {
  const uniqueUserIds = Array.from(
    new Set(userIds.map((userId) => userId.trim()).filter(Boolean)),
  );

  if (uniqueUserIds.length === 0) {
    return {};
  }

  const equippedBadges = await db.mahjong_user_equipped_badges.findMany({
    where: {
      user_id: {
        in: uniqueUserIds,
      },
    },
    select: {
      user_id: true,
      badge_id: true,
      slot: true,
    },
    orderBy: [
      {
        user_id: "asc",
      },
      {
        slot: "asc",
      },
    ],
  });

  const result: MahjongEquippedBadgeMap = {};

  for (const equippedBadge of equippedBadges) {
    const badge = BADGE_MAP[equippedBadge.badge_id];

    if (!badge) continue;

    if (!result[equippedBadge.user_id]) {
      result[equippedBadge.user_id] = [];
    }

    result[equippedBadge.user_id].push({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      display: badge.display,
      displayType: badge.displayType,
      rarity: badge.rarity,
      slot: equippedBadge.slot,
    });
  }

  return result;
}