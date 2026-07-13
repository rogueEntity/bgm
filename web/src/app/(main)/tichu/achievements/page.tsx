// web/src/app/(main)/tichu/achievements/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getMyTichuAchievements } from "@/app/actions/tichu-achievement.action";
import TichuBadgeEquipForm from "@/components/tichu/TichuBadgeEquipForm";
import {
    TICHU_ACHIEVEMENT_CATEGORY_LABELS,
    TICHU_ACHIEVEMENTS_BY_CATEGORY,
    TICHU_BADGE_RARITY_LABELS,
    type TichuAchievementCategory,
    type TichuBadgeRarity,
} from "@/features/games/tichu/constants/achievement-definitions";

function getRarityClassName(rarity?: TichuBadgeRarity) {
    switch (rarity) {
        case "COMMON":
            return "border-foreground/10 bg-foreground/5 text-foreground/70";
        case "RARE":
            return "border-sky-500/20 bg-sky-500/10 text-sky-600";
        case "EPIC":
            return "border-violet-500/20 bg-violet-500/10 text-violet-600";
        case "LEGENDARY":
            return "border-yellow-500/25 bg-yellow-500/10 text-yellow-600";
        case "SPECIAL":
            return "border-rose-500/20 bg-rose-500/10 text-rose-600";
        default:
            return "border-foreground/10 bg-foreground/5 text-foreground/70";
    }
}

function clampProgress(progress: number, goal: number) {
    if (goal <= 0) {
        return 0;
    }

    return Math.min(100, Math.max(0, (progress / goal) * 100));
}

export default async function TichuAchievementsPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const { achievements, equippedBadges } = await getMyTichuAchievements();

    const achievementById = new Map(
        achievements.map((achievement) => [achievement.id, achievement]),
    );

    const completedCount = achievements.filter(
        (achievement) => achievement.completed,
    ).length;
    const totalCount = achievements.length;
    const completionRate =
        totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-bold text-foreground/50">
                        TICHU ACHIEVEMENTS
                    </p>
                    <h1 className="text-3xl font-black">티츄 도전과제</h1>
                    <p className="mt-2 text-sm text-foreground/60">
                        티츄 플레이 기록에 따라 도전과제를 달성하고, 획득한 배지를 닉네임에 장착할 수 있어요.
                    </p>
                </div>

                <Link
                    href="/tichu"
                    className="rounded-2xl border border-foreground/10 px-4 py-2 text-center text-sm font-bold transition hover:bg-foreground/5"
                >
                    티츄로 돌아가기
                </Link>
            </div>

            <section className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-black">달성 현황</h2>
                        <p className="mt-1 text-sm text-foreground/60">
                            {completedCount} / {totalCount}개 달성 · {completionRate}%
                        </p>
                    </div>

                    <div className="w-full sm:w-72">
                        <div className="h-3 overflow-hidden rounded-full bg-foreground/10">
                            <div
                                className="h-full rounded-full bg-foreground transition-all"
                                style={{
                                    width: `${completionRate}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>

                {equippedBadges.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm font-bold text-foreground/50">
              장착 중
            </span>

                        {equippedBadges.map((badge) => (
                            <span
                                key={`${badge.id}-${badge.slot}`}
                                title={badge.description}
                                className="inline-flex items-center gap-1 rounded-full border border-foreground/10 bg-background px-2 py-1 text-xs font-black"
                            >
                <span>{badge.display}</span>
                <span>{badge.name}</span>
              </span>
                        ))}
                    </div>
                )}
            </section>

            <TichuBadgeEquipForm
                achievements={achievements}
                equippedBadges={equippedBadges}
            />

            {(
                Object.entries(TICHU_ACHIEVEMENTS_BY_CATEGORY) as [
                    TichuAchievementCategory,
                    (typeof TICHU_ACHIEVEMENTS_BY_CATEGORY)[TichuAchievementCategory],
                ][]
            ).map(([category, categoryDefinitions]) => {
                const categoryAchievements = categoryDefinitions
                    .map((definition) => achievementById.get(definition.id))
                    .filter((achievement): achievement is NonNullable<typeof achievement> =>
                        Boolean(achievement),
                    );

                if (categoryAchievements.length === 0) {
                    return null;
                }

                const categoryCompletedCount = categoryAchievements.filter(
                    (achievement) => achievement.completed,
                ).length;

                return (
                    <section key={category} className="flex flex-col gap-3">
                        <div className="flex items-end justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-black">
                                    {TICHU_ACHIEVEMENT_CATEGORY_LABELS[category]}
                                </h2>
                                <p className="mt-1 text-sm text-foreground/50">
                                    {categoryCompletedCount} / {categoryAchievements.length}개 달성
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {categoryAchievements.map((achievement) => {
                                const progressRate = clampProgress(
                                    achievement.progress,
                                    achievement.goal,
                                );
                                const badge = achievement.badge;

                                return (
                                    <article
                                        key={achievement.id}
                                        className={`rounded-3xl border p-5 transition ${
                                            achievement.completed
                                                ? "border-foreground/15 bg-background"
                                                : "border-foreground/10 bg-foreground/[0.03] opacity-70"
                                        }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground/5 text-2xl">
                                                {achievement.completed ? badge?.display ?? "🏅" : "🔒"}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-black">{achievement.title}</h3>

                                                    {badge && (
                                                        <span
                                                            className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${getRarityClassName(
                                                                badge.rarity,
                                                            )}`}
                                                        >
                              {TICHU_BADGE_RARITY_LABELS[badge.rarity]}
                            </span>
                                                    )}
                                                </div>

                                                <p className="mt-1 text-sm text-foreground/60">
                                                    {achievement.description}
                                                </p>

                                                <div className="mt-4">
                                                    <div className="flex items-center justify-between gap-3 text-xs text-foreground/50">
                                                        <span>진행률</span>
                                                        <span className="font-bold">
                              {Math.min(achievement.progress, achievement.goal)} /{" "}
                                                            {achievement.goal}
                            </span>
                                                    </div>

                                                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-foreground/10">
                                                        <div
                                                            className="h-full rounded-full bg-foreground transition-all"
                                                            style={{
                                                                width: `${progressRate}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {badge && (
                                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-full bg-foreground/5 px-2 py-1 font-bold">
                              배지: {badge.display} {badge.name}
                            </span>

                                                        {achievement.completedAt && (
                                                            <span className="text-foreground/45">
                                획득일{" "}
                                                                {achievement.completedAt.toLocaleDateString(
                                                                    "ko-KR",
                                                                )}
                              </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </main>
    );
}