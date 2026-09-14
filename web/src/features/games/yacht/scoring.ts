import {
  YACHT_CATEGORIES,
  YACHT_SCORE_OPTIONS,
  type YachtCategory,
} from "./constants";

export function isYachtCategory(value: string): value is YachtCategory {
  return YACHT_CATEGORIES.includes(value as YachtCategory);
}

export function isValidYachtScore(
  category: YachtCategory,
  score: number,
): boolean {
  return YACHT_SCORE_OPTIONS[category].includes(score);
}

export function getYachtUpperSubtotal(
  scores: Partial<Record<YachtCategory, number>>,
): number {
  return YACHT_CATEGORIES.slice(0, 6).reduce(
    (total, category) => total + (scores[category] ?? 0),
    0,
  );
}

export function getYachtBonus(
  scores: Partial<Record<YachtCategory, number>>,
): number {
  return getYachtUpperSubtotal(scores) >= 63 ? 35 : 0;
}

export function getYachtTotal(
  scores: Partial<Record<YachtCategory, number>>,
): number {
  return (
    YACHT_CATEGORIES.reduce(
      (total, category) => total + (scores[category] ?? 0),
      0,
    ) + getYachtBonus(scores)
  );
}

export function getYachtFilledCount(
  scores: Partial<Record<YachtCategory, number>>,
): number {
  return YACHT_CATEGORIES.filter(
    (category) => typeof scores[category] === "number",
  ).length;
}
