import assert from "node:assert/strict";
import { test } from "node:test";

import { getYachtAchievementProgress } from "@/features/games/yacht/achievement-progress";
import { YachtAchievementDefinitions, YACHT_BADGES } from "@/features/games/yacht/achievement-definitions";
import { summarizeYachtPlayerMatches } from "@/features/games/yacht/player-stats";
import { YACHT_CATEGORIES, type YachtCategory } from "@/features/games/yacht/constants";
import type { YachtMatchDetails, YachtPlayer } from "@/features/games/yacht/types";

function player(scores: Partial<Record<YachtCategory, number>> = {}): YachtPlayer {
  return { name: "player", seat_order: 1, scores: { ...Object.fromEntries(YACHT_CATEGORIES.map((key) => [key, 0])), ...scores } };
}
function match(scores: Partial<Record<YachtCategory, number>> = {}, opponents: YachtPlayer[] = []): YachtMatchDetails {
  return { schema_version: 1, game_key: "yacht", status: "FINISHED", current_round: 12,
    finished_at: "2026-09-15T00:00:00.000Z", players: { user_test: player(scores),
      ...Object.fromEntries(opponents.map((item, index) => [`guest_${index}`, item])),
    } };
}
const progress = (matches: YachtMatchDetails[]) => getYachtAchievementProgress(matches, "user_test");
const unlocked = (matches: YachtMatchDetails[]) => {
  const values = progress(matches);
  return YachtAchievementDefinitions.filter((item) => values[item.conditionType] >= item.goal).map((item) => item.id);
};

test("30 unique achievements each grant a distinct defined badge", () => {
  assert.equal(YachtAchievementDefinitions.length, 30);
  assert.equal(new Set(YachtAchievementDefinitions.map((item) => item.id)).size, 30);
  assert.equal(new Set(YACHT_BADGES.map((item) => item.id)).size, 30);
  assert.deepEqual(YachtAchievementDefinitions.map((item) => item.badgeId), YACHT_BADGES.map((item) => item.id));
  assert.deepEqual(unlocked([]), []);
});
test("solo games count for play and score, never victories", () => {
  const values = progress([match({ YACHT: 150, CHOICE: 30 })]);
  assert.equal(values.playCount, 1);
  assert.equal(values.bestScore, 180);
  for (const key of ["winCount", "closeWinCount", "bigWinCount", "noYachtWinCount"] as const) assert.equal(values[key], 0);
});
test("a shared first place earns a win but no exclusive win badges", () => {
  const values = progress([match({ CHOICE: 30 }, [player({ CHOICE: 30 }), player()])]);
  assert.equal(values.winCount, 1);
  assert.equal(values.closeWinCount, 0);
  assert.equal(values.bigWinCount, 0);
  assert.equal(values.noYachtWinCount, 0);
});
test("winning margins compare against the highest opponent, including guests", () => {
  const values = progress([match({ CHOICE: 30 }, [player(), player({ CHOICE: 29 })])]);
  assert.equal(values.closeWinCount, 1);
  assert.equal(values.noYachtWinCount, 1);
  assert.equal(progress([match({ YACHT: 100 }, [player()])]).bigWinCount, 1);
  assert.equal(progress([match({ YACHT: 100 }, [player({ ACES: 1 })])]).bigWinCount, 0);
  assert.equal(progress([match({}, [player({ ACES: 1 })])]).winCount, 0);
});
test("additional yachts accumulate occurrences while doubles and triples need a single match", () => {
  const values = progress([match({ YACHT: 100 }), match({ YACHT: 150 })]);
  assert.equal(values.yachtCount, 5);
  assert.equal(values.bestYachtCount, 3);
  assert.ok(unlocked([match({ YACHT: 150 })]).includes("yacht_triple"));
  assert.ok(!unlocked([match({ YACHT: 50 }), match({ YACHT: 50 }), match({ YACHT: 50 })]).includes("yacht_double"));
});
test("upper bonus respects 62/63 boundary and contributes 35 points to total", () => {
  const scores = { ACES: 3, TWOS: 6, THREES: 9, FOURS: 12, FIVES: 15, SIXES: 18 };
  const exact = progress([match(scores)]);
  assert.equal(exact.exactBonusCount, 1);
  assert.equal(exact.bonusCount, 1);
  assert.equal(exact.bestScore, 98);
  const almost = progress([match({ ...scores, ACES: 2 })]);
  assert.equal(almost.almostBonusCount, 1);
  assert.equal(almost.bonusCount, 0);
  assert.equal(almost.bestScore, 62);
  assert.equal(progress([match({ ...scores, ACES: 4 })]).exactBonusCount, 0);
});
test("category badges use recorded slots, with both straights in the same match", () => {
  const values = progress([match({ FULL_HOUSE: 28, SMALL_STRAIGHT: 15, LARGE_STRAIGHT: 30, CHOICE: 30 })]);
  assert.equal(values.fullHouseCount, 1);
  assert.equal(values.largeStraightCount, 1);
  assert.equal(values.bothStraightsCount, 1);
  assert.equal(values.maxChoiceCount, 1);
  assert.equal(progress([match({ SMALL_STRAIGHT: 15 }), match({ LARGE_STRAIGHT: 30 })]).bothStraightsCount, 0);
  assert.equal(progress([match()]).fullHouseCount, 0);
});
test("no-zero needs every slot positive; an additional-yacht sacrifice disqualifies it", () => {
  const scores = { ACES: 3, TWOS: 6, THREES: 9, FOURS: 12, FIVES: 15, SIXES: 18,
    CHOICE: 30, FOUR_OF_A_KIND: 29, FULL_HOUSE: 28, SMALL_STRAIGHT: 15, LARGE_STRAIGHT: 30, YACHT: 50 };
  assert.equal(progress([match(scores)]).noZeroCount, 1);
  assert.equal(progress([match({ ...scores, ACES: 0, YACHT: 100 })]).noZeroCount, 0);
});
test("unfinished, deleted, missing-player and incomplete games grant nothing", () => {
  const incomplete = match({ YACHT: 50 });
  delete incomplete.players.user_test.scores.ACES;
  const missingPlayer = match();
  delete missingPlayer.players.user_test;
  assert.deepEqual(unlocked([{ ...match(), status: "PLAYING" }, { ...match(), status: "DELETED" }, incomplete, missingPlayer]), []);
});
test("recalculation removes deleted contributions without losing remaining progress", () => {
  const original = [match({ YACHT: 100 }), match({ YACHT: 150 })];
  assert.ok(unlocked(original).includes("yacht_chorus"));
  assert.ok(!unlocked(original.slice(0, 1)).includes("yacht_chorus"));
  assert.equal(progress(original.slice(0, 1)).yachtCount, 2);
});
test("all accumulation and score tiers unlock precisely at their goals", () => {
  for (const count of [1, 5, 10, 20, 30, 50]) {
    const matches = Array.from({ length: count }, () => match({ YACHT: 50 }, [player()]));
    for (const definition of YachtAchievementDefinitions.filter((item) => ["playCount", "winCount", "yachtCount"].includes(item.conditionType))) {
      assert.equal(unlocked(matches).includes(definition.id), count >= definition.goal);
    }
  }
  for (const goal of [200, 250, 300, 350]) {
    for (const offset of [-1, 0]) {
      const scores = offset ? { YACHT: goal - 50, CHOICE: 29, FOURS: 20 } : { YACHT: goal };
      assert.equal(unlocked([match(scores)]).includes(`yacht_score_${goal}`), offset === 0);
    }
  }
});
test("player yacht rate counts successful matches, including additional yachts, at most once", () => {
  const stats = summarizeYachtPlayerMatches([50, 100, 150, 0].map((score) => ({ score, rank: 1, playerCount: 1, scores: { YACHT: score } })));
  assert.equal(stats.yachtCount, 3);
  assert.equal(stats.yachtRate, 0.75);
});
