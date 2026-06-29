// web/src/app/(main)/mahjong/achievements/page.tsx

import {
  getMyMahjongAchievements,
  getMyMahjongBadges,
} from "@/app/actions/mahjong-achievement.action";
import MahjongBadgeChip from "@/components/mahjong/MahjongBadgeChip";
import MahjongBadgeEquipForm from "@/components/mahjong/MahjongBadgeEquipForm";
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  type AchievementCategory,
} from "@/constants/mahjong-achievements";

const CATEGORY_ORDER: AchievementCategory[] = [
  "BEGINNER",
  "RANK",
  "AGARI",
  "DEFENSE",
  "RIICHI_TENPAI",
  "YAKU",
  "RYUUKYOKU",
  "SCORE",
];

function getProgressPercent(progress: number, goal: number) {
  if (goal <= 0) return 0;

  return Math.min(100, Math.floor((progress / goal) * 100));
}

export default async function MahjongAchievementsPage() {
  const [achievements, badges] = await Promise.all([
    getMyMahjongAchievements(),
    getMyMahjongBadges(),
  ]);

  const completedCount = achievements.filter(
    (achievement) => achievement.completed,
  ).length;

  const totalCount = achievements.length;
  const earnedBadgeCount = badges.length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
      <section className="rounded-2xl border border-foreground/10 bg-background p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-foreground/60">리치마작</p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              도전과제 & 배지
            </h1>
            <p className="mt-2 text-sm text-foreground/60">
              대국을 완료하고 조건을 달성하면 배지를 획득할 수 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3">
              <p className="text-xs text-foreground/50">도전과제</p>
              <p className="mt-1 font-bold">
                {completedCount} / {totalCount}
              </p>
            </div>

            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3">
              <p className="text-xs text-foreground/50">획득 배지</p>
              <p className="mt-1 font-bold">{earnedBadgeCount}개</p>
            </div>

            <div className="col-span-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 md:col-span-1">
              <p className="text-xs text-foreground/50">완료율</p>
              <p className="mt-1 font-bold">
                {getProgressPercent(completedCount, totalCount)}%
              </p>
            </div>
          </div>
        </div>
      </section>

      <MahjongBadgeEquipForm badges={badges} />

      <div className="flex flex-col gap-8">
        {CATEGORY_ORDER.map((category) => {
          const categoryAchievements = achievements.filter(
            (achievement) => achievement.category === category,
          );

          if (categoryAchievements.length === 0) {
            return null;
          }

          return (
            <section key={category} className="flex flex-col gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  {ACHIEVEMENT_CATEGORY_LABELS[category]}
                </h2>
                <p className="mt-1 text-sm text-foreground/50">
                  {categoryAchievements.filter((item) => item.completed).length}{" "}
                  / {categoryAchievements.length} 완료
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {categoryAchievements.map((achievement) => {
                  const percent = getProgressPercent(
                    achievement.progress,
                    achievement.goal,
                  );

                  return (
                    <article
                      key={achievement.id}
                      className={[
                        "rounded-2xl border bg-background p-4 shadow-sm transition-colors",
                        achievement.completed
                          ? "border-emerald-400/40 bg-emerald-400/[0.04]"
                          : "border-foreground/10",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold">{achievement.title}</h3>

                            {achievement.completed ? (
                              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                완료
                              </span>
                            ) : (
                              <span className="rounded-full border border-foreground/10 bg-foreground/[0.03] px-2 py-0.5 text-xs text-foreground/50">
                                진행 중
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-sm text-foreground/60">
                            {achievement.description}
                          </p>
                        </div>

                        {achievement.badge ? (
                          <MahjongBadgeChip
                            display={achievement.badge.display}
                            name={achievement.badge.name}
                            displayType={achievement.badge.displayType}
                            rarity={achievement.badge.rarity}
                            muted={!achievement.badge.earned}
                          />
                        ) : null}
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-foreground/50">
                          <span>진행률</span>
                          <span>
                            {Math.min(achievement.progress, achievement.goal)} /{" "}
                            {achievement.goal}
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10">
                          <div
                            className={[
                              "h-full rounded-full transition-all",
                              achievement.completed
                                ? "bg-emerald-500"
                                : "bg-foreground/50",
                            ].join(" ")}
                            style={{
                              width: `${percent}%`,
                            }}
                          />
                        </div>
                      </div>

                      {achievement.completedAt ? (
                        <p className="mt-3 text-xs text-foreground/45">
                          달성일{" "}
                          {new Date(achievement.completedAt).toLocaleDateString(
                            "ko-KR",
                          )}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}