import type { Prisma } from "@prisma/client";

import { YachtAchievementDefinitions } from "./achievement-definitions";
import { getYachtAchievementProgress } from "./achievement-progress";
import type { YachtMatchDetails } from "./types";

// Caller holds the Yacht game lock. Completion, deletion and equipment changes
// must share that lock so a deleted result cannot leave an owned/equipped badge.
export async function syncYachtAchievementsForUser(tx: Prisma.TransactionClient, gameId: number, userId: string) {
  const rows = await tx.match_players.findMany({
    where: {
      user_id: userId,
      final_score: { not: null },
      matches: {
        game_id: gameId,
        deleted_at: null,
        match_details: { details: { path: ["status"], equals: "FINISHED" } },
      },
    },
    select: { matches: { select: { match_details: { select: { details: true } } } } },
  });
  const matches = rows.flatMap((row) => row.matches.match_details
    ? [row.matches.match_details.details as YachtMatchDetails] : []);
  const progress = getYachtAchievementProgress(matches, `user_${userId}`);
  const existing = await tx.yacht_user_achievements.findMany({ where: { user_id: userId } });
  const existingById = new Map(existing.map((item) => [item.achievement_id, item]));
  const now = new Date();
  const achievements = YachtAchievementDefinitions.map((definition) => {
    const completed = progress[definition.conditionType] >= definition.goal;
    return {
      user_id: userId,
      achievement_id: definition.id,
      progress: progress[definition.conditionType],
      completed,
      completed_at: completed ? existingById.get(definition.id)?.completed_at ?? now : null,
    };
  });
  const missing = achievements.filter((item) => !existingById.has(item.achievement_id));
  if (missing.length) await tx.yacht_user_achievements.createMany({ data: missing });
  for (const item of achievements) {
    const previous = existingById.get(item.achievement_id);
    if (previous && (previous.progress !== item.progress || previous.completed !== item.completed)) {
      await tx.yacht_user_achievements.update({
        where: { user_id_achievement_id: { user_id: userId, achievement_id: item.achievement_id } },
        data: { progress: item.progress, completed: item.completed, completed_at: item.completed_at },
      });
    }
  }
  const badgeIds = YachtAchievementDefinitions
    .filter((item) => progress[item.conditionType] >= item.goal)
    .map((item) => item.badgeId);
  await tx.yacht_user_equipped_badges.deleteMany({ where: { user_id: userId, badge_id: { notIn: badgeIds } } });
  await tx.yacht_user_badges.deleteMany({ where: { user_id: userId, badge_id: { notIn: badgeIds } } });
  if (badgeIds.length) {
    await tx.yacht_user_badges.createMany({
      data: badgeIds.map((badgeId) => ({ user_id: userId, badge_id: badgeId })),
      skipDuplicates: true,
    });
  }
  return achievements;
}
