import { YACHT_CATEGORIES } from "./constants";
import type { YachtAchievementMetric } from "./achievement-definitions";
import { getYachtFilledCount, getYachtTotal, getYachtUpperSubtotal } from "./scoring";
import type { YachtMatchDetails } from "./types";

export function getYachtAchievementProgress(matches: YachtMatchDetails[], playerKey: string): Record<YachtAchievementMetric, number> {
  const progress: Record<YachtAchievementMetric, number> = {
    playCount: 0, winCount: 0, closeWinCount: 0, bigWinCount: 0,
    yachtCount: 0, bestYachtCount: 0, bonusCount: 0, exactBonusCount: 0,
    fullHouseCount: 0, largeStraightCount: 0, bothStraightsCount: 0,
    maxChoiceCount: 0, noZeroCount: 0, bestScore: 0, noYachtWinCount: 0, almostBonusCount: 0,
  };
  for (const match of matches) {
    const player = match.players[playerKey];
    if (match.game_key !== "yacht" || match.status !== "FINISHED" || !player ||
      !Object.values(match.players).every((item) => getYachtFilledCount(item.scores) === YACHT_CATEGORIES.length)) continue;
    const { scores } = player;
    const total = getYachtTotal(scores);
    const opponents = Object.entries(match.players).filter(([key]) => key !== playerKey);
    const highestOpponent = Math.max(...opponents.map(([, item]) => getYachtTotal(item.scores)));
    const competitive = opponents.length > 0;
    const soloWin = competitive && total > highestOpponent;
    progress.playCount++;
    if (competitive && total >= highestOpponent) progress.winCount++;
    if (soloWin && total - highestOpponent === 1) progress.closeWinCount++;
    if (soloWin && total - highestOpponent >= 100) progress.bigWinCount++;
    if (soloWin && scores.YACHT === 0) progress.noYachtWinCount++;
    const yachtCount = getYachtCount(scores.YACHT);
    progress.yachtCount += yachtCount;
    progress.bestYachtCount = Math.max(progress.bestYachtCount, yachtCount);
    const upper = getYachtUpperSubtotal(scores);
    if (upper >= 63) progress.bonusCount++;
    if (upper === 63) progress.exactBonusCount++;
    if (upper === 62) progress.almostBonusCount++;
    if ((scores.FULL_HOUSE ?? 0) > 0) progress.fullHouseCount++;
    if (scores.LARGE_STRAIGHT === 30) progress.largeStraightCount++;
    if (scores.SMALL_STRAIGHT === 15 && scores.LARGE_STRAIGHT === 30) progress.bothStraightsCount++;
    if (scores.CHOICE === 30) progress.maxChoiceCount++;
    if (YACHT_CATEGORIES.every((category) => (scores[category] ?? 0) > 0)) progress.noZeroCount++;
    progress.bestScore = Math.max(progress.bestScore, total);
  }
  return progress;
}

export function getYachtCount(score: number | undefined): number {
  return typeof score === "number" && Number.isInteger(score) && score >= 50 && score % 50 === 0 ? score / 50 : 0;
}
