export const YACHT_AVERAGE_MIN_PLAYS = 5;

export type YachtRankingType = "average" | "best";

export type YachtRankingPlayer = {
  userId: string;
  nickname: string;
  avatarEmoji: string | null;
  avatarImageUrl: string | null;
  playCount: number;
  averageScore: number;
  bestScore: number;
};

export function createYachtRankedRows(
  players: YachtRankingPlayer[],
  type: YachtRankingType,
) {
  const rows = players
    .filter((player) => player.playCount >= (type === "average" ? YACHT_AVERAGE_MIN_PLAYS : 1))
    .map((player) => ({
      ...player,
      // Use the displayed precision for both sorting and shared ranks.
      value: type === "average" ? Math.round(player.averageScore * 10) / 10 : player.bestScore,
    }))
    .sort((a, b) => b.value - a.value || b.playCount - a.playCount || a.nickname.localeCompare(b.nickname, "ko-KR") || a.userId.localeCompare(b.userId));

  let previousValue: number | null = null;
  let previousRank = 0;
  return rows.map((row, index) => {
    const rank = row.value === previousValue ? previousRank : index + 1;
    previousValue = row.value;
    previousRank = rank;
    return { ...row, rank };
  });
}
