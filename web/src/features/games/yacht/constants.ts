export const YACHT_GAME_KEY = "yacht" as const;
export const YACHT_GAME_NAME = "야찌";
export const YACHT_GAME_NAME_EN = "Yacht Dice";

export const YACHT_MIN_PLAYERS = 1;
export const YACHT_MAX_PLAYERS = 6;
export const YACHT_MAX_PLAYER_NAME_LENGTH = 20;

export const YACHT_CATEGORIES = [
  "ACES",
  "TWOS",
  "THREES",
  "FOURS",
  "FIVES",
  "SIXES",
  "CHOICE",
  "FOUR_OF_A_KIND",
  "FULL_HOUSE",
  "SMALL_STRAIGHT",
  "LARGE_STRAIGHT",
  "YACHT",
] as const;

export type YachtCategory = (typeof YACHT_CATEGORIES)[number];

export const YACHT_CATEGORY_LABELS: Record<YachtCategory, string> = {
  ACES: "Aces",
  TWOS: "Twos",
  THREES: "Threes",
  FOURS: "Fours",
  FIVES: "Fives",
  SIXES: "Sixes",
  CHOICE: "Choice",
  FOUR_OF_A_KIND: "4 of a Kind",
  FULL_HOUSE: "Full House",
  SMALL_STRAIGHT: "Small Straight",
  LARGE_STRAIGHT: "Large Straight",
  YACHT: "Yacht",
};

const uniqueSorted = (values: number[]) =>
  Array.from(new Set(values)).sort((a, b) => a - b);

const range = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, index) => start + index);

const fourOfAKindScores = uniqueSorted([
  0,
  ...range(1, 6).flatMap((repeated) =>
    range(1, 6).map((other) => repeated * 4 + other),
  ),
]);

const fullHouseScores = uniqueSorted([
  0,
  ...range(1, 6).flatMap((three) =>
    range(1, 6)
      .filter((two) => two !== three)
      .map((two) => three * 3 + two * 2),
  ),
]);

export const YACHT_SCORE_OPTIONS: Record<YachtCategory, number[]> = {
  ACES: range(0, 5),
  TWOS: range(0, 5).map((count) => count * 2),
  THREES: range(0, 5).map((count) => count * 3),
  FOURS: range(0, 5).map((count) => count * 4),
  FIVES: range(0, 5).map((count) => count * 5),
  SIXES: range(0, 5).map((count) => count * 6),
  CHOICE: [0, ...range(5, 30)],
  FOUR_OF_A_KIND: fourOfAKindScores,
  FULL_HOUSE: fullHouseScores,
  SMALL_STRAIGHT: [0, 15],
  LARGE_STRAIGHT: [0, 30],
  YACHT: [0, 50],
};
