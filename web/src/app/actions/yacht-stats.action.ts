"use server";

import { redirect } from "next/navigation";

import { assertGameEnabledForAction } from "@/features/games/shared/enabled-games";
import { YACHT_GAME_KEY } from "@/features/games/yacht/constants";
import { summarizeYachtPlayerMatches } from "@/features/games/yacht/player-stats";
import type { YachtMatchDetails } from "@/features/games/yacht/types";
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

export async function getYachtPlayerStats(userId: string) {
  assertGameEnabledForAction(YACHT_GAME_KEY);
  if (!(await getCurrentUserWithAdmin())) redirect("/login");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return null;

  const user = await db.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nickname: true,
      avatar_emoji: true,
      avatar_image_key: true,
      avatar_image_updated_at: true,
    },
  });
  if (!user) return null;

  const rows = await db.match_players.findMany({
    where: {
      user_id: userId,
      final_score: { not: null },
      matches: {
        games: { key: YACHT_GAME_KEY },
        deleted_at: null,
        match_details: { details: { path: ["status"], equals: "FINISHED" } },
      },
    },
    select: {
      match_id: true,
      final_score: true,
      rank: true,
      matches: { select: { play_date: true, match_details: { select: { details: true } } } },
    },
    orderBy: [{ matches: { play_date: "desc" } }, { match_id: "desc" }],
  });
  const matches = rows.flatMap((row) => {
    const details = row.matches.match_details?.details as YachtMatchDetails | undefined;
    const player = details?.players[`user_${user.id}`];
    if (!player || row.final_score === null) return [];
    return [{
      matchId: row.match_id,
      playDate: row.matches.play_date?.toISOString() ?? null,
      score: row.final_score,
      rank: row.rank,
      playerCount: Object.keys(details.players).length,
      scores: player.scores,
    }];
  });

  return {
    nickname: user.nickname,
    avatarEmoji: user.avatar_emoji,
    avatarImageUrl: getAvatarImageUrl(user.avatar_image_key, user.avatar_image_updated_at),
    ...summarizeYachtPlayerMatches(matches),
    recentMatches: matches.slice(0, 10),
  };
}
