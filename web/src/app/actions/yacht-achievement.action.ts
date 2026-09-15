"use server";

import { revalidatePath } from "next/cache";

import { assertGameEnabledForAction } from "@/features/games/shared/enabled-games";
import { YACHT_GAME_KEY } from "@/features/games/yacht/constants";
import {
  YachtAchievementDefinitions, YACHT_BADGE_MAP,
  type YachtAchievement, type YachtBadge,
} from "@/features/games/yacht/achievement-definitions";
import { syncYachtAchievementsForUser } from "@/features/games/yacht/achievements";
import { lockYachtStats } from "@/features/games/yacht/stats";
import { getCurrentUserWithAdmin } from "@/lib/admin";
import { db } from "@/lib/prisma";

export type YachtAchievementViewItem = YachtAchievement & {
  progress: number;
  completed: boolean;
  completedAt: Date | null;
  badge: YachtBadge | null;
  hasBadge: boolean;
};
export type YachtEquippedBadgeItem = YachtBadge & { slot: number };

async function getCurrentUserId() {
  assertGameEnabledForAction(YACHT_GAME_KEY);
  const user = await getCurrentUserWithAdmin();
  if (!user) throw new Error("로그인이 필요합니다.");
  return user.id;
}

async function getYachtGameId() {
  const game = await db.games.findUnique({ where: { key: YACHT_GAME_KEY }, select: { id: true } });
  if (!game) throw new Error("야찌 게임 정보를 찾을 수 없습니다.");
  return game.id;
}

export async function getMyYachtAchievements() {
  const userId = await getCurrentUserId();
  const gameId = await getYachtGameId();
  // Reconcile existing matches too, so players do not need a new match to claim old records.
  return db.$transaction(async (tx) => {
    await lockYachtStats(tx, gameId);
    const saved = await syncYachtAchievementsForUser(tx, gameId, userId);
    const savedById = new Map(saved.map((item) => [item.achievement_id, item]));
    const equipped = await tx.yacht_user_equipped_badges.findMany({
      where: { user_id: userId }, orderBy: { slot: "asc" },
    });
    const achievements: YachtAchievementViewItem[] = YachtAchievementDefinitions.map((definition) => {
      const item = savedById.get(definition.id);
      return {
        ...definition,
        progress: item?.progress ?? 0,
        completed: item?.completed ?? false,
        completedAt: item?.completed_at ?? null,
        badge: YACHT_BADGE_MAP[definition.badgeId] ?? null,
        hasBadge: item?.completed ?? false,
      };
    });
    const equippedBadges: YachtEquippedBadgeItem[] = equipped.flatMap((item) => {
      const badge = YACHT_BADGE_MAP[item.badge_id];
      return badge ? [{ ...badge, slot: item.slot }] : [];
    });
    return { achievements, equippedBadges };
  });
}

export async function updateMyYachtEquippedBadges(badgeIds: string[]) {
  const userId = await getCurrentUserId();
  if (!Array.isArray(badgeIds) || badgeIds.length > 3 ||
    badgeIds.some((id) => typeof id !== "string" || !YACHT_BADGE_MAP[id]) ||
    new Set(badgeIds).size !== badgeIds.length) {
    throw new Error("서로 다른 야찌 배지를 최대 3개까지 선택해주세요.");
  }
  const gameId = await getYachtGameId();
  await db.$transaction(async (tx) => {
    await lockYachtStats(tx, gameId);
    await syncYachtAchievementsForUser(tx, gameId, userId);
    const owned = await tx.yacht_user_badges.findMany({
      where: { user_id: userId, badge_id: { in: badgeIds } }, select: { badge_id: true },
    });
    if (owned.length !== badgeIds.length) throw new Error("획득한 야찌 배지만 장착할 수 있습니다.");
    await tx.yacht_user_equipped_badges.deleteMany({ where: { user_id: userId } });
    if (badgeIds.length) {
      await tx.yacht_user_equipped_badges.createMany({
        data: badgeIds.map((badgeId, index) => ({ user_id: userId, badge_id: badgeId, slot: index + 1 })),
      });
    }
  });
  revalidatePath("/yacht", "layout");
  return { ok: true, equippedBadgeIds: badgeIds };
}

export async function getYachtEquippedBadgesByUserIds(userIds: string[]): Promise<Record<string, YachtEquippedBadgeItem[]>> {
  await getCurrentUserId();
  const ids = [...new Set(userIds)];
  if (!ids.length) return {};
  const rows = await db.yacht_user_equipped_badges.findMany({
    where: { user_id: { in: ids } }, orderBy: { slot: "asc" }, select: { user_id: true, badge_id: true, slot: true },
  });
  const result: Record<string, YachtEquippedBadgeItem[]> = {};
  for (const item of rows) {
    const badge = YACHT_BADGE_MAP[item.badge_id];
    if (badge) (result[item.user_id] ??= []).push({ ...badge, slot: item.slot });
  }
  return result;
}
