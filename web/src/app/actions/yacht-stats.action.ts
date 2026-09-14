"use server";

import { redirect } from "next/navigation";

import { assertGameEnabledForAction } from "@/features/games/shared/enabled-games";
import { YACHT_GAME_KEY } from "@/features/games/yacht/constants";
import { parseYachtSpecificStats } from "@/features/games/yacht/stats";
import type { YachtRankingPlayer } from "@/features/games/yacht/ranking";
import { getCurrentUserWithAdmin } from "@/lib/admin";
import { getAvatarImageUrl } from "@/lib/avatar";
import { db } from "@/lib/prisma";

export async function getYachtRankingPlayers(): Promise<YachtRankingPlayer[]> {
  assertGameEnabledForAction(YACHT_GAME_KEY);
  if (!(await getCurrentUserWithAdmin())) redirect("/login");

  const rows = await db.user_game_stats.findMany({
    where: { games: { key: YACHT_GAME_KEY }, play_count: { gt: 0 } },
    select: {
      play_count: true,
      accumulated_score: true,
      specific_stats: true,
      users: {
        select: {
          id: true,
          nickname: true,
          avatar_emoji: true,
          avatar_image_key: true,
          avatar_image_updated_at: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    userId: row.users.id,
    nickname: row.users.nickname,
    avatarEmoji: row.users.avatar_emoji,
    avatarImageUrl: getAvatarImageUrl(row.users.avatar_image_key, row.users.avatar_image_updated_at),
    playCount: row.play_count,
    averageScore: row.accumulated_score / row.play_count,
    bestScore: parseYachtSpecificStats(row.specific_stats).best_score,
  }));
}
