import type { Prisma } from "@prisma/client";

import type { YachtSpecificStats, YachtUserGameSpecificStats } from "./types";

export function parseYachtSpecificStats(value: unknown): YachtSpecificStats {
  if (typeof value !== "object" || value === null || !("yacht" in value)) {
    return { best_score: 0 };
  }
  const yacht = value.yacht;
  if (typeof yacht !== "object" || yacht === null || !("best_score" in yacht)) {
    return { best_score: 0 };
  }
  return {
    best_score: typeof yacht.best_score === "number" && Number.isFinite(yacht.best_score)
      ? yacht.best_score
      : 0,
  };
}

// Acquire before changing match data. Serializes Yacht completion/deletion so
// a concurrent transaction cannot overwrite stats with an older aggregate.
export async function lockYachtStats(tx: Prisma.TransactionClient, gameId: number): Promise<void> {
  await tx.$queryRaw`SELECT id FROM games WHERE id = ${gameId} FOR UPDATE`;
}

export async function syncYachtMatchUserStats(
  tx: Prisma.TransactionClient,
  gameId: number,
  matchId: number,
): Promise<void> {
  const participants = await tx.match_players.findMany({
    where: { match_id: matchId, user_id: { not: null } },
    select: { user_id: true },
  });
  const userIds = [...new Set(participants.flatMap((player) => player.user_id ? [player.user_id] : []))];
  if (userIds.length === 0) return;

  const rows = await tx.match_players.groupBy({
    by: ["user_id"],
    where: {
      user_id: { in: userIds },
      final_score: { not: null },
      matches: {
        game_id: gameId,
        deleted_at: null,
        match_details: { details: { path: ["status"], equals: "FINISHED" } },
      },
    },
    _count: { final_score: true },
    _sum: { final_score: true },
    _max: { final_score: true },
    _avg: { rank: true },
  });
  const statsByUserId = new Map(rows.map((row) => [row.user_id, row]));

  for (const userId of userIds) {
    const row = statsByUserId.get(userId);
    const specificStats: YachtUserGameSpecificStats = {
      schema_version: 1,
      yacht: { best_score: row?._max.final_score ?? 0 },
    };
    const data = {
      play_count: row?._count.final_score ?? 0,
      accumulated_score: row?._sum.final_score ?? 0,
      average_rank: row?._avg.rank ?? null,
      specific_stats: specificStats,
    };
    await tx.user_game_stats.upsert({
      where: { user_id_game_id: { user_id: userId, game_id: gameId } },
      create: { user_id: userId, game_id: gameId, ...data },
      update: data,
    });
  }
}
