import { YachtAchievementDefinitions, type YachtAchievementMetric } from "./achievement-definitions";
import { getYachtAchievementProgress } from "./achievement-progress";
import type { YachtMatchDetails } from "./types";

export type YachtNewsMatch = { id: number; details: YachtMatchDetails; playedAt: Date | null };
type YachtNewsEvent = {
  event_key: string; event_type: string; user_id: string; match_id: number;
  achievement_id: string | null; title: string; message: string;
  metadata: { achievement_ids: string[] }; occurred_at: Date;
};

// Rebuild from surviving completed matches so deletion also reconciles first unlocks.
export function buildYachtNewsEvents(matches: YachtNewsMatch[], userId: string): YachtNewsEvent[] {
  const events: YachtNewsEvent[] = [];
  const unlocked = new Set<string>();
  const cumulative = getYachtAchievementProgress([], `user_${userId}`);
  const occurredAt = (match: YachtNewsMatch) => {
    const date = new Date(match.details.finished_at ?? match.playedAt ?? 0);
    return Number.isNaN(date.getTime()) ? match.playedAt ?? new Date(0) : date;
  };
  const ordered = [...matches].sort((a, b) => occurredAt(a).getTime() - occurredAt(b).getTime() || a.id - b.id);
  for (const match of ordered) {
    const progress = getYachtAchievementProgress([match.details], `user_${userId}`);
    if (!progress.playCount) continue;
    for (const metric of Object.keys(cumulative) as YachtAchievementMetric[]) {
      cumulative[metric] = metric === "bestScore" || metric === "bestYachtCount"
        ? Math.max(cumulative[metric], progress[metric]) : cumulative[metric] + progress[metric];
    }
    const newlyUnlocked = YachtAchievementDefinitions.filter((item) => !unlocked.has(item.id) && cumulative[item.conditionType] >= item.goal);
    newlyUnlocked.forEach((item) => unlocked.add(item.id));
    const name = match.details.players[`user_${userId}`].name;
    const records: Array<{ type: string; metric: YachtAchievementMetric; title: string; message: string }> = [];
    if (progress.bestYachtCount >= 2) records.push({ type: "MULTIPLE_YACHT", metric: "bestYachtCount", title: "한 경기 다회 야찌", message: `${name}님이 한 경기에서 야찌 ${progress.bestYachtCount}회를 기록했습니다!` });
    if (progress.bestScore >= 300) records.push({ type: "HIGH_SCORE", metric: "bestScore", title: "300점 이상 달성", message: `${name}님이 ${progress.bestScore}점을 기록했습니다!` });
    if (progress.noZeroCount) records.push({ type: "NO_ZERO", metric: "noZeroCount", title: "빈틈없는 점수판", message: `${name}님이 모든 항목에서 득점했습니다!` });
    if (progress.noYachtWinCount) records.push({ type: "NO_YACHT_WIN", metric: "noYachtWinCount", title: "야찌 없는 우승", message: `${name}님이 야찌 없이 ${progress.bestScore}점으로 단독 우승했습니다!` });
    const add = (type: string, key: string, title: string, message: string, achievements: typeof newlyUnlocked) => {
      const suffix = achievements.length && type !== "ACHIEVEMENT"
        ? ` 도전과제 ${achievements.map((item) => `[${item.title}]`).join(", ")} 달성!` : "";
      events.push({ event_key: `yacht:${userId}:${match.id}:${key}`, event_type: type, user_id: userId,
        match_id: match.id, achievement_id: type === "ACHIEVEMENT" ? achievements[0].id : null,
        title, message: message + suffix, metadata: { achievement_ids: achievements.map((item) => item.id) }, occurred_at: occurredAt(match) });
    };
    for (const record of records) {
      add(record.type, record.type, record.title, record.message, newlyUnlocked.filter((item) => item.conditionType === record.metric));
    }
    for (const achievement of newlyUnlocked) {
      if (records.some((record) => record.metric === achievement.conditionType)) continue;
      add("ACHIEVEMENT", achievement.id, "도전과제 달성", `${name}님이 도전과제 [${achievement.title}]을 달성했습니다!`, [achievement]);
    }
  }
  return events;
}
