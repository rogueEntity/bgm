import assert from "node:assert/strict";
import { test } from "node:test";
import { buildYachtNewsEvents, type YachtNewsMatch } from "../src/features/games/yacht/news";
import { YACHT_CATEGORIES, type YachtCategory } from "../src/features/games/yacht/constants";

function match(id: number, scores: Partial<Record<YachtCategory, number>> = {}): YachtNewsMatch {
  return { id, playedAt: new Date(`2026-09-${String(id).padStart(2, "0")}T00:00:00Z`), details: {
    schema_version: 1, game_key: "yacht", status: "FINISHED", current_round: 12, finished_at: null,
    players: { user_test: { name: "테스터", seat_order: 1, scores: { ...Object.fromEntries(YACHT_CATEGORIES.map((key) => [key, 0])), ...scores } } },
  } };
}
const events = (matches: YachtNewsMatch[]) => buildYachtNewsEvents(matches, "test");

test("multiple yachts produce one record and merge double/triple unlocks", () => {
  const news = events([match(1, { YACHT: 150 })]);
  const record = news.filter((item) => item.event_type === "MULTIPLE_YACHT");
  assert.equal(record.length, 1);
  assert.match(record[0].message, /야찌 3회/);
  assert.deepEqual(record[0].metadata.achievement_ids, ["yacht_double", "yacht_triple"]);
  assert.equal(news.filter((item) => item.achievement_id === "yacht_double" || item.achievement_id === "yacht_triple").length, 0);
  assert.equal(events([match(1, { YACHT: 50 })]).some((item) => item.event_type === "MULTIPLE_YACHT"), false);
});

test("300 point boundary includes bonuses and merges score achievements", () => {
  const scores: Partial<Record<YachtCategory, number>> = { ACES: 5, TWOS: 10, THREES: 15, FOURS: 20, FIVES: 25, SIXES: 30, YACHT: 150 };
  assert.equal(events([match(1, { ...scores, CHOICE: 9 })]).some((item) => item.event_type === "HIGH_SCORE"), false);
  const record = events([match(1, { ...scores, CHOICE: 10 })]).find((item) => item.event_type === "HIGH_SCORE");
  assert.ok(record);
  assert.match(record.message, /300점/);
  assert.ok(record.metadata.achievement_ids.includes("yacht_score_300"));
});

test("no zero requires every category filled and positive", () => {
  const full = match(1, { ACES: 1, TWOS: 2, THREES: 3, FOURS: 4, FIVES: 5, SIXES: 6, CHOICE: 5, FOUR_OF_A_KIND: 5, FULL_HOUSE: 7, SMALL_STRAIGHT: 15, LARGE_STRAIGHT: 30, YACHT: 50 });
  assert.equal(events([full]).filter((item) => item.event_type === "NO_ZERO").length, 1);
  full.details.players.user_test.scores.CHOICE = 0;
  assert.equal(events([full]).some((item) => item.event_type === "NO_ZERO"), false);
  delete full.details.players.user_test.scores.CHOICE;
  assert.deepEqual(events([full]), []);
});

test("no yacht win needs opponents and excludes ties or losses", () => {
  const solo = match(1, { CHOICE: 30 });
  assert.equal(events([solo]).some((item) => item.event_type === "NO_YACHT_WIN"), false);
  solo.details.players.guest_other = { ...match(2, { CHOICE: 29 }).details.players.user_test };
  assert.equal(events([solo]).filter((item) => item.event_type === "NO_YACHT_WIN").length, 1);
  solo.details.players.guest_other.scores.CHOICE = 30;
  assert.equal(events([solo]).some((item) => item.event_type === "NO_YACHT_WIN"), false);
  solo.details.players.guest_other.scores.YACHT = 50;
  assert.equal(events([solo]).some((item) => item.event_type === "NO_YACHT_WIN"), false);
});

test("reconciliation is deterministic, retains repeat records, and reassigns first unlock after deletion", () => {
  const first = match(1, { YACHT: 100 });
  const second = match(2, { YACHT: 100 });
  const news = events([second, first]);
  assert.deepEqual(news, events([first, second]));
  assert.equal(news.filter((item) => item.event_type === "MULTIPLE_YACHT").length, 2);
  assert.equal(news.filter((item) => item.achievement_id === "yacht_rookie").length, 1);
  assert.equal(news.find((item) => item.achievement_id === "yacht_rookie")?.match_id, 1);
  first.details.status = "DELETED";
  const remaining = events([first, second]);
  assert.ok(remaining.every((item) => item.match_id === 2));
  assert.equal(remaining.find((item) => item.achievement_id === "yacht_rookie")?.match_id, 2);
  second.details.status = "PLAYING";
  assert.deepEqual(events([first, second]), []);
  assert.deepEqual(buildYachtNewsEvents([match(3)], "missing"), []);
});
