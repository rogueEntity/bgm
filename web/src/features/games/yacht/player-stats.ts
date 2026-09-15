import { getYachtCount } from "./achievement-progress";
import { YACHT_CATEGORIES } from "./constants";
import { getYachtBonus } from "./scoring";
import type { YachtPlayer } from "./types";

type PlayerMatch = {
  score: number;
  rank: number | null;
  playerCount: number;
  scores: YachtPlayer["scores"];
};

export function summarizeYachtPlayerMatches(matches: PlayerMatch[]) {
  const playCount = matches.length;
  const competitiveMatches = matches.filter((match) => match.playerCount >= 2);
  const winCount = competitiveMatches.filter((match) => match.rank === 1).length;
  const yachtCount = matches.filter((match) => getYachtCount(match.scores.YACHT) > 0).length;
  const bonusCount = matches.filter((match) => getYachtBonus(match.scores) > 0).length;
  return {
    playCount,
    averageScore: playCount ? matches.reduce((sum, match) => sum + match.score, 0) / playCount : 0,
    bestScore: matches.reduce((best, match) => Math.max(best, match.score), 0),
    competitivePlayCount: competitiveMatches.length,
    winCount,
    winRate: competitiveMatches.length ? winCount / competitiveMatches.length : null,
    yachtCount,
    yachtRate: playCount ? yachtCount / playCount : 0,
    bonusCount,
    bonusRate: playCount ? bonusCount / playCount : 0,
    categories: YACHT_CATEGORIES.map((category) => ({
      category,
      averageScore: playCount ? matches.reduce((sum, match) => sum + (match.scores[category] ?? 0), 0) / playCount : 0,
      zeroRate: playCount ? matches.filter((match) => match.scores[category] === 0).length / playCount : 0,
    })),
  };
}
