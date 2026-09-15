export type YachtAchievementCategory = "BEGINNER" | "WIN" | "YACHT" | "BONUS" | "CATEGORY" | "SCORE";
export type YachtBadgeRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "SPECIAL";
export type YachtBadge = {
  id: string;
  name: string;
  description: string;
  display: string;
  displayType: "EMOJI" | "TEXT";
  rarity: YachtBadgeRarity;
};
export type YachtAchievementMetric =
  | "playCount" | "winCount" | "closeWinCount" | "bigWinCount"
  | "yachtCount" | "bestYachtCount" | "bonusCount" | "exactBonusCount"
  | "fullHouseCount" | "largeStraightCount" | "bothStraightsCount"
  | "maxChoiceCount" | "noZeroCount" | "bestScore" | "noYachtWinCount" | "almostBonusCount";
export type YachtAchievement = {
  id: string;
  title: string;
  description: string;
  category: YachtAchievementCategory;
  goal: number;
  badgeId: string;
  conditionType: YachtAchievementMetric;
};

export const YACHT_ACHIEVEMENT_CATEGORY_LABELS: Record<YachtAchievementCategory, string> = {
  BEGINNER: "입문/플레이", WIN: "승리", YACHT: "야찌", BONUS: "상단/보너스", CATEGORY: "족보/점수판", SCORE: "점수/특별",
};
export const YACHT_BADGE_RARITY_LABELS: Record<YachtBadgeRarity, string> = {
  COMMON: "일반", RARE: "희귀", EPIC: "영웅", LEGENDARY: "전설", SPECIAL: "특별",
};

// Each definition grants one badge, matching the other games' achievement model.
const definitions: Array<{
  key: string; title: string; description: string; category: YachtAchievementCategory;
  goal: number; conditionType: YachtAchievementMetric; display: string; rarity: YachtBadgeRarity;
}> = [
  { key: "rookie", title: "주사위와 첫인사", description: "야찌 게임을 1회 완료하세요.", category: "BEGINNER", goal: 1, conditionType: "playCount", display: "🎲", rarity: "COMMON" },
  { key: "again", title: "한 판 더!", description: "야찌 게임을 5회 완료하세요.", category: "BEGINNER", goal: 5, conditionType: "playCount", display: "한판더", rarity: "COMMON" },
  { key: "regular", title: "손에 익은 주사위", description: "야찌 게임을 20회 완료하세요.", category: "BEGINNER", goal: 20, conditionType: "playCount", display: "단골", rarity: "RARE" },
  { key: "resident", title: "주사위는 내 일상", description: "야찌 게임을 50회 완료하세요.", category: "BEGINNER", goal: 50, conditionType: "playCount", display: "주민", rarity: "EPIC" },
  { key: "first_win", title: "첫 승리", description: "2인 이상 경기에서 처음으로 1위를 달성하세요. 공동 1위도 포함합니다.", category: "WIN", goal: 1, conditionType: "winCount", display: "🏆", rarity: "COMMON" },
  { key: "winner", title: "승리도 습관", description: "2인 이상 경기에서 누적 10승을 달성하세요. 공동 1위도 포함합니다.", category: "WIN", goal: 10, conditionType: "winCount", display: "승부사", rarity: "RARE" },
  { key: "champion", title: "테이블의 지배자", description: "2인 이상 경기에서 누적 30승을 달성하세요. 공동 1위도 포함합니다.", category: "WIN", goal: 30, conditionType: "winCount", display: "지배자", rarity: "EPIC" },
  { key: "close_win", title: "딱 한 끗", description: "2위와 정확히 1점 차이로 단독 우승하세요.", category: "WIN", goal: 1, conditionType: "closeWinCount", display: "한끗", rarity: "SPECIAL" },
  { key: "big_win", title: "압도적 주사위", description: "2위와 100점 이상 차이로 단독 우승하세요.", category: "WIN", goal: 1, conditionType: "bigWinCount", display: "압도", rarity: "EPIC" },
  { key: "first_yacht", title: "야찌!", description: "완료한 경기에서 첫 야찌를 기록하세요.", category: "YACHT", goal: 1, conditionType: "yachtCount", display: "야찌", rarity: "COMMON" },
  { key: "chorus", title: "다섯 개의 합창", description: "추가 야찌를 포함해 야찌를 누적 5회 기록하세요.", category: "YACHT", goal: 5, conditionType: "yachtCount", display: "합창", rarity: "RARE" },
  { key: "collector", title: "야찌 수집가", description: "추가 야찌를 포함해 야찌를 누적 20회 기록하세요.", category: "YACHT", goal: 20, conditionType: "yachtCount", display: "수집가", rarity: "EPIC" },
  { key: "dice_master", title: "주사위가 말을 듣는다", description: "추가 야찌를 포함해 야찌를 누적 50회 기록하세요.", category: "YACHT", goal: 50, conditionType: "yachtCount", display: "지배", rarity: "LEGENDARY" },
  { key: "double", title: "또 야찌?!", description: "한 경기에서 야찌를 2회 이상 기록하고 완료하세요.", category: "YACHT", goal: 2, conditionType: "bestYachtCount", display: "더블", rarity: "EPIC" },
  { key: "triple", title: "이게 또 된다고?", description: "한 경기에서 야찌를 3회 이상 기록하고 완료하세요.", category: "YACHT", goal: 3, conditionType: "bestYachtCount", display: "트리플", rarity: "LEGENDARY" },
  { key: "first_bonus", title: "보너스 챙겼습니다", description: "상단 합계 63점 이상으로 첫 보너스를 획득하고 완료하세요.", category: "BONUS", goal: 1, conditionType: "bonusCount", display: "+35", rarity: "COMMON" },
  { key: "thrifty", title: "알뜰한 주사위", description: "보너스를 획득한 경기를 누적 10회 완료하세요.", category: "BONUS", goal: 10, conditionType: "bonusCount", display: "알뜰", rarity: "RARE" },
  { key: "fundamentals", title: "보너스는 기본", description: "보너스를 획득한 경기를 누적 30회 완료하세요.", category: "BONUS", goal: 30, conditionType: "bonusCount", display: "기본기", rarity: "EPIC" },
  { key: "exact_bonus", title: "딱 맞췄다", description: "상단 합계 정확히 63점으로 경기를 완료하세요.", category: "BONUS", goal: 1, conditionType: "exactBonusCount", display: "딱63", rarity: "SPECIAL" },
  { key: "full_house", title: "입주 완료", description: "완료한 경기의 Full House 항목에 양수를 누적 10회 기록하세요.", category: "CATEGORY", goal: 10, conditionType: "fullHouseCount", display: "풀하우스", rarity: "RARE" },
  { key: "straight", title: "일직선 본능", description: "완료한 경기의 Large Straight 항목에 30점을 누적 10회 기록하세요.", category: "CATEGORY", goal: 10, conditionType: "largeStraightCount", display: "직진", rarity: "RARE" },
  { key: "both_straights", title: "줄을 서시오", description: "한 경기에서 Small·Large Straight를 모두 성공하고 완료하세요.", category: "CATEGORY", goal: 1, conditionType: "bothStraightsCount", display: "쌍직선", rarity: "RARE" },
  { key: "choice", title: "선택의 정점", description: "Choice에 30점을 기록하고 경기를 완료하세요.", category: "CATEGORY", goal: 1, conditionType: "maxChoiceCount", display: "선택왕", rarity: "RARE" },
  { key: "no_zero", title: "빈틈없는 점수판", description: "12개 항목 모두 0점 없이 경기를 완료하세요.", category: "CATEGORY", goal: 1, conditionType: "noZeroCount", display: "빈틈없음", rarity: "EPIC" },
  { key: "score_200", title: "200점 클럽", description: "보너스와 추가 야찌를 포함해 최종 200점 이상으로 완료하세요.", category: "SCORE", goal: 200, conditionType: "bestScore", display: "200", rarity: "COMMON" },
  { key: "score_250", title: "250점 클럽", description: "보너스와 추가 야찌를 포함해 최종 250점 이상으로 완료하세요.", category: "SCORE", goal: 250, conditionType: "bestScore", display: "250", rarity: "RARE" },
  { key: "score_300", title: "300점 클럽", description: "보너스와 추가 야찌를 포함해 최종 300점 이상으로 완료하세요.", category: "SCORE", goal: 300, conditionType: "bestScore", display: "300", rarity: "EPIC" },
  { key: "score_350", title: "350점 클럽", description: "보너스와 추가 야찌를 포함해 최종 350점 이상으로 완료하세요.", category: "SCORE", goal: 350, conditionType: "bestScore", display: "350", rarity: "LEGENDARY" },
  { key: "no_yacht_win", title: "야찌 없이도 이긴다", description: "2인 이상 경기에서 Yacht 항목 0점으로 단독 우승하세요.", category: "SCORE", goal: 1, conditionType: "noYachtWinCount", display: "기본빵", rarity: "SPECIAL" },
  { key: "almost_bonus", title: "보너스까지 한 걸음", description: "상단 합계 정확히 62점으로 경기를 완료하세요.", category: "SCORE", goal: 1, conditionType: "almostBonusCount", display: "아차", rarity: "SPECIAL" },
];

export const YachtAchievementDefinitions: YachtAchievement[] = definitions.map(({ key, title, description, category, goal, conditionType }) => ({
  id: `yacht_${key}`, title, description, category, goal, conditionType, badgeId: `badge_yacht_${key}`,
}));
export const YACHT_BADGES: YachtBadge[] = definitions.map(({ key, title, description, display, rarity }) => ({
  id: `badge_yacht_${key}`, name: title, description, display, rarity,
  displayType: display === "🎲" || display === "🏆" ? "EMOJI" : "TEXT",
}));
export const YACHT_BADGE_MAP: Record<string, YachtBadge> = Object.fromEntries(YACHT_BADGES.map((badge) => [badge.id, badge]));
export const YACHT_ACHIEVEMENTS_BY_CATEGORY = {
  BEGINNER: YachtAchievementDefinitions.filter((item) => item.category === "BEGINNER"),
  WIN: YachtAchievementDefinitions.filter((item) => item.category === "WIN"),
  YACHT: YachtAchievementDefinitions.filter((item) => item.category === "YACHT"),
  BONUS: YachtAchievementDefinitions.filter((item) => item.category === "BONUS"),
  CATEGORY: YachtAchievementDefinitions.filter((item) => item.category === "CATEGORY"),
  SCORE: YachtAchievementDefinitions.filter((item) => item.category === "SCORE"),
};
