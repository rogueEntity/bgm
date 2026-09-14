import Link from "next/link";

import { getYachtPlayerStats, getYachtRankingPlayers } from "@/app/actions/yacht-stats.action";
import UserAvatar from "@/components/common/UserAvatar";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";
import { YACHT_CATEGORY_LABELS, YACHT_GAME_KEY } from "@/features/games/yacht/constants";

type PlayerStats = NonNullable<Awaited<ReturnType<typeof getYachtPlayerStats>>>;
type Metric = {
  label: string;
  left: number | null;
  right: number | null;
  suffix: string;
  decimals?: number;
  lowerIsBetter?: boolean;
};

function formatValue(value: number | null, metric: Metric) {
  return value === null ? "—" : `${value.toLocaleString("ko-KR", {
    minimumFractionDigits: metric.decimals ?? 0,
    maximumFractionDigits: metric.decimals ?? 0,
  })}${metric.suffix}`;
}

function CompareRows({ metrics }: { metrics: Metric[] }) {
  return metrics.map((metric) => {
    const comparable = metric.left !== null && metric.right !== null;
    const tied = metric.left === metric.right;
    const leftWins = metric.left !== null && metric.right !== null && !tied && (metric.lowerIsBetter
      ? metric.left < metric.right
      : metric.left > metric.right);
    const rightWins = comparable && !tied && !leftWins;

    return (
      <tr key={metric.label}>
        <th scope="row" className="p-3 text-left font-semibold">{metric.label}</th>
        <td className={`p-3 text-right tabular-nums ${leftWins ? "font-bold text-blue-600 dark:text-blue-400" : ""}`}>
          {formatValue(metric.left, metric)}{leftWins ? <span className="sr-only"> · 우세</span> : null}
        </td>
        <td className={`p-3 text-right tabular-nums ${rightWins ? "font-bold text-rose-600 dark:text-rose-400" : ""}`}>
          {formatValue(metric.right, metric)}{rightWins ? <span className="sr-only"> · 우세</span> : null}
        </td>
      </tr>
    );
  });
}

function PlayerCard({ player, userId, side }: { player: PlayerStats; userId: string; side: "left" | "right" }) {
  return (
    <section className={`rounded-3xl border p-5 sm:p-6 ${side === "left" ? "border-blue-500/20 bg-blue-500/[0.03]" : "border-rose-500/20 bg-rose-500/[0.03]"}`}>
      <p className="mb-4 text-xs font-bold text-foreground/45">{side === "left" ? "왼쪽 플레이어" : "오른쪽 플레이어"}</p>
      <div className="flex items-center gap-3">
        <UserAvatar name={player.nickname} emoji={player.avatarEmoji} imageUrl={player.avatarImageUrl} size="lg" />
        <div className="min-w-0">
          <h2 className="break-words text-xl font-black">{player.nickname}</h2>
          <p className="mt-1 text-sm text-foreground/55">{player.playCount}경기 · {player.winCount}회 우승</p>
        </div>
      </div>
      <Link href={`/yacht/players/${userId}`} className="mt-4 inline-block text-sm font-semibold text-foreground/55 underline-offset-4 hover:text-foreground hover:underline">개인 통계 보기</Link>
    </section>
  );
}

export default async function YachtRivalsPage({ searchParams }: {
  searchParams: Promise<{ left?: string | string[]; right?: string | string[] }>;
}) {
  assertGameEnabled(YACHT_GAME_KEY);
  const params = await searchParams;
  const players = (await getYachtRankingPlayers()).sort((a, b) =>
    b.averageScore - a.averageScore || b.bestScore - a.bestScore || a.userId.localeCompare(b.userId),
  );
  const leftId = typeof params.left === "string" ? params.left : players[0]?.userId;
  const rightId = typeof params.right === "string" ? params.right : players.find((player) => player.userId !== leftId)?.userId;
  const leftSelection = players.find((player) => player.userId === leftId);
  const rightSelection = players.find((player) => player.userId === rightId);
  const samePlayer = Boolean(leftSelection && rightSelection && leftId === rightId);
  const [left, right] = leftSelection && rightSelection && !samePlayer
    ? await Promise.all([getYachtPlayerStats(leftSelection.userId), getYachtPlayerStats(rightSelection.userId)])
    : [null, null];
  const canCompare = left && right && left.playCount > 0 && right.playCount > 0;
  const metrics: Metric[] = canCompare ? [
    { label: "총 경기 수", left: left.playCount, right: right.playCount, suffix: "경기" },
    { label: "평균 점수", left: left.averageScore, right: right.averageScore, suffix: "점", decimals: 1 },
    { label: "최고 점수", left: left.bestScore, right: right.bestScore, suffix: "점" },
    { label: "우승률", left: left.winRate === null ? null : left.winRate * 100, right: right.winRate === null ? null : right.winRate * 100, suffix: "%", decimals: 1 },
    { label: "야찌 달성률", left: left.yachtRate * 100, right: right.yachtRate * 100, suffix: "%", decimals: 1 },
    { label: "보너스 달성률", left: left.bonusRate * 100, right: right.bonusRate * 100, suffix: "%", decimals: 1 },
  ] : [];
  const categoryMetrics: Metric[] = canCompare ? left.categories.flatMap((item) => {
    const other = right.categories.find((entry) => entry.category === item.category);
    return [
      { label: `${YACHT_CATEGORY_LABELS[item.category]} 평균`, left: item.averageScore, right: other?.averageScore ?? null, suffix: "점", decimals: 1 },
      { label: `${YACHT_CATEGORY_LABELS[item.category]} 0점 기입률`, left: item.zeroRate * 100, right: other ? other.zeroRate * 100 : null, suffix: "%", decimals: 1, lowerIsBetter: true },
    ];
  }) : [];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-5 sm:p-6">
        <Link href="/yacht" className="text-sm font-semibold text-foreground/50 hover:text-foreground">← 야찌 대시보드</Link>
        <h1 className="mt-4 text-3xl font-black">라이벌 비교</h1>
        <p className="mt-2 text-sm text-foreground/55">두 플레이어의 전체 통계와 족보별 기록을 나란히 비교합니다.</p>
        <form method="get" className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          {([{ name: "left", label: "왼쪽 플레이어", selected: leftSelection }, { name: "right", label: "오른쪽 플레이어", selected: rightSelection }] as const).map((field) => (
            <label key={field.name} className="flex min-w-0 flex-col gap-2 text-xs font-bold text-foreground/50">
              {field.label}
              <select key={field.selected?.userId ?? "empty"} name={field.name} defaultValue={field.selected?.userId ?? ""} className="h-12 w-full rounded-2xl border border-foreground/10 bg-background px-4 text-sm font-bold text-foreground">
                <option value="" disabled>플레이어 선택</option>
                {players.map((player) => <option key={player.userId} value={player.userId}>{player.nickname}</option>)}
              </select>
            </label>
          ))}
          <button type="submit" disabled={players.length < 2} className="h-12 rounded-2xl bg-foreground px-6 text-sm font-black text-background transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 sm:self-end">비교하기</button>
        </form>
      </section>

      {canCompare && leftSelection && rightSelection ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <PlayerCard player={left} userId={leftSelection.userId} side="left" />
            <PlayerCard player={right} userId={rightSelection.userId} side="right" />
          </div>
          <p className="text-sm leading-6 text-foreground/55">삭제된 경기는 제외합니다. 우승률은 2인 이상 경기 기준이며 공동 1위도 포함합니다. 나머지 지표는 1인 플레이를 포함합니다. 우세한 값은 각 플레이어의 색으로 표시하며, 0점 기입률은 낮을수록 우세합니다. 기록이 없는 지표는 —로 표시합니다.</p>
          {[{ title: "경기 요약 비교", rows: metrics }, { title: "족보별 기록 비교", rows: categoryMetrics }].map((section) => (
            <section key={section.title} className="overflow-hidden rounded-3xl border border-foreground/10 bg-background">
              <h2 className="p-5 text-lg font-black">{section.title}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-foreground/[0.04]">
                    <tr><th scope="col" className="p-3 text-left">항목</th><th scope="col" className="p-3 text-right text-blue-600 dark:text-blue-400">{left.nickname}</th><th scope="col" className="p-3 text-right text-rose-600 dark:text-rose-400">{right.nickname}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/10"><CompareRows metrics={section.rows} /></tbody>
                </table>
              </div>
            </section>
          ))}
        </>
      ) : (
        <section className="rounded-3xl border border-dashed border-foreground/15 p-6 text-sm text-foreground/60">
          {players.length < 2 ? "비교하려면 완료한 야찌 경기 기록이 있는 플레이어가 최소 2명 필요합니다." : samePlayer ? "서로 다른 플레이어 두 명을 선택해 주세요." : "비교할 수 있는 기록이 있는 플레이어 두 명을 선택해 주세요."}
        </section>
      )}
    </main>
  );
}
