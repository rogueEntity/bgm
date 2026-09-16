import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { lockYachtStats, syncYachtMatchUserStats } from "@/features/games/yacht/stats";
import { syncYachtAchievementsForUser } from "@/features/games/yacht/achievements";
import { YACHT_CATEGORIES } from "@/features/games/yacht/constants";
import type { YachtMatchDetails } from "@/features/games/yacht/types";

// Explicit test URL only; never load the application's DATABASE_URL or .env.
test("database reconciliation is idempotent, rolls back, and revokes deleted-match badges and equipment", {
  skip: !process.env.YACHT_TEST_DATABASE_URL,
}, async () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.YACHT_TEST_DATABASE_URL }) });
  const userId = randomUUID();
  const game = await db.games.create({ data: { key: `test_${userId}`, name: "Yacht test", max_players: 6 } });
  try {
    await db.users.create({ data: { id: userId, provider: "test", provider_id: userId, nickname: "test", avatar_emoji: "🎲" } });
    const details: YachtMatchDetails = {
      schema_version: 1, game_key: "yacht", status: "FINISHED", current_round: 12, finished_at: new Date().toISOString(),
      players: { [`user_${userId}`]: { name: "test", seat_order: 1,
        scores: { ...Object.fromEntries(YACHT_CATEGORIES.map((key) => [key, 0])), YACHT: 150 } } },
    };
    const match = await db.matches.create({ data: {
      game_id: game.id, created_by: userId,
      match_details: { create: { details: details as Prisma.InputJsonValue } },
      match_players: { create: { user_id: userId, final_score: 150, rank: 1 } },
    } });
    const sync = () => db.$transaction(async (tx) => {
      await lockYachtStats(tx, game.id);
      await syncYachtMatchUserStats(tx, game.id, match.id);
    });
    await sync();
    const newsKeys = async () => (await db.yacht_news_events.findMany({ where: { user_id: userId }, orderBy: { event_key: "asc" } })).map((item) => item.event_key);
    const originalNews = await newsKeys();
    assert.equal(originalNews.length, 3); // rookie, first yacht, combined double/triple

    assert.equal(await db.yacht_user_achievements.count({ where: { user_id: userId } }), 30);
    const triple = await db.yacht_user_achievements.findUniqueOrThrow({ where: { user_id_achievement_id: { user_id: userId, achievement_id: "yacht_triple" } } });
    assert.equal(triple.completed, true);
    assert.equal(triple.progress, 3);
    assert.equal(await db.yacht_user_badges.count({ where: { user_id: userId } }), 4); // rookie, first yacht, double, triple
    await db.yacht_user_equipped_badges.create({ data: { user_id: userId, badge_id: "badge_yacht_triple", slot: 1 } });
    await Promise.all([sync(), sync()]);
    assert.deepEqual(await newsKeys(), originalNews);
    const repeated = await db.yacht_user_achievements.findUniqueOrThrow({ where: { user_id_achievement_id: { user_id: userId, achievement_id: "yacht_triple" } } });
    assert.equal(repeated.completed_at?.getTime(), triple.completed_at?.getTime());
    assert.equal(await db.yacht_user_badges.count({ where: { user_id: userId } }), 4);
    assert.equal(await db.yacht_user_equipped_badges.count({ where: { user_id: userId } }), 1);
    await assert.rejects(db.$transaction(async (tx) => {
      await lockYachtStats(tx, game.id);
      await tx.matches.update({ where: { id: match.id }, data: { deleted_at: new Date() } });
      await syncYachtMatchUserStats(tx, game.id, match.id);
      throw new Error("test rollback");
    }), /test rollback/);
    assert.deepEqual(await newsKeys(), originalNews);
    assert.equal(await db.yacht_user_badges.count({ where: { user_id: userId } }), 4);
    assert.equal(await db.yacht_user_equipped_badges.count({ where: { user_id: userId } }), 1);
    await db.$transaction(async (tx) => {
      await lockYachtStats(tx, game.id);
      await tx.matches.update({ where: { id: match.id }, data: { deleted_at: new Date() } });
      await tx.match_details.update({ where: { match_id: match.id }, data: { details: { ...details, status: "DELETED" } as Prisma.InputJsonValue } });
      await tx.match_players.updateMany({ where: { match_id: match.id }, data: { final_score: null, rank: null } });
      await syncYachtMatchUserStats(tx, game.id, match.id);
    });
    assert.equal(await db.yacht_user_achievements.count({ where: { user_id: userId, completed: true } }), 0);
    assert.equal(await db.yacht_user_achievements.count({ where: { user_id: userId, completed_at: { not: null } } }), 0);
    assert.equal(await db.yacht_user_badges.count({ where: { user_id: userId } }), 0);
    assert.equal(await db.yacht_user_equipped_badges.count({ where: { user_id: userId } }), 0);
    const stats = await db.user_game_stats.findUniqueOrThrow({ where: { user_id_game_id: { user_id: userId, game_id: game.id } } });
    assert.equal(stats.play_count, 0);
    assert.deepEqual(await newsKeys(), []);
    // Backfill reads historic completed matches without requiring a new completion.
    await db.match_players.updateMany({ where: { match_id: match.id }, data: { final_score: 150, rank: 1 } });
    await db.match_details.update({ where: { match_id: match.id }, data: { details: details as Prisma.InputJsonValue } });
    await db.matches.update({ where: { id: match.id }, data: { deleted_at: null } });
    await db.$transaction(async (tx) => {
      await lockYachtStats(tx, game.id);
      await syncYachtAchievementsForUser(tx, game.id, userId);
    });
    assert.equal(await db.yacht_user_badges.count({ where: { user_id: userId } }), 4);
  } finally {
    await db.matches.deleteMany({ where: { game_id: game.id } });
    await db.users.deleteMany({ where: { id: userId } });
    await db.games.delete({ where: { id: game.id } });
    await db.$disconnect();
  }
});
