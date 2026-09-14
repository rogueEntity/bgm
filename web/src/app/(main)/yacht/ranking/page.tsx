import Link from "next/link";

import { getYachtRankingPlayers } from "@/app/actions/yacht-stats.action";
import UserAvatar from "@/components/common/UserAvatar";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";
import { YACHT_GAME_KEY } from "@/features/games/yacht/constants";
import { createYachtRankedRows, YACHT_AVERAGE_MIN_PLAYS } from "@/features/games/yacht/ranking";

export default async function YachtRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>;
}) {
  assertGameEnabled(YACHT_GAME_KEY);
  const type = (await searchParams).type === "best" ? "best" : "average";
  const rows = createYachtRankedRows(await getYachtRankingPlayers(), type);
  const title = type === "average" ? "평균 점수 랭킹" : "최고 점수 랭킹";

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/yacht" className="text-sm text-foreground/50 hover:text-foreground">
            ← 야찌 대시보드
          </Link>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">랭킹</h2>
          <p className="mt-2 text-sm text-foreground/60">
            {type === "average"
              ? `완료 경기 ${YACHT_AVERAGE_MIN_PLAYS}판 이상인 플레이어의 평균 점수 기준 순위입니다.`
              : "완료 경기 1판 이상인 플레이어의 개인 최고 점수 기준 순위입니다."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-1">
          {([
            { key: "average", label: "평균 점수" },
            { key: "best", label: "최고 점수" },
          ] as const).map((tab) => (
            <Link
              key={tab.key}
              href={`/yacht/ranking?type=${tab.key}`}
              aria-current={type === tab.key ? "page" : undefined}
              className={`rounded-xl px-4 py-2 text-center text-sm font-semibold transition ${type === tab.key ? "bg-foreground text-background shadow-sm" : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-foreground/10 bg-background shadow-sm">
        <div className="border-b border-foreground/10 px-5 py-4 md:px-6">
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="mt-1 text-xs text-foreground/50">
            {type === "average" ? "평균은 소수점 첫째 자리로 반올림하며, 표시 점수가 같으면 공동 순위입니다. " : "점수가 같으면 공동 순위입니다. "}
            예: 1위, 1위, 3위
          </p>
          <p className="mt-1 text-xs text-foreground/50">
            1인 플레이와 보너스 점수를 포함합니다. 게스트와 삭제된 경기는 제외합니다.
          </p>
        </div>
        {rows.length === 0 ? (
          <div className="px-5 py-16 text-center md:px-6">
            <p className="text-sm font-semibold text-foreground/70">아직 랭킹 데이터가 없습니다.</p>
            <p className="mt-2 text-sm text-foreground/45">
              {type === "average" ? `완료 경기가 ${YACHT_AVERAGE_MIN_PLAYS}판 이상 쌓이면 순위가 표시됩니다.` : "첫 경기를 완료하면 순위가 표시됩니다."}
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-foreground/10">
            {rows.map((row) => (
              <li key={row.userId} className="flex items-start gap-3 px-4 py-4 transition hover:bg-foreground/[0.03] md:items-center md:px-6">
                <div className="w-8 shrink-0 pt-3 text-center md:w-10 md:pt-0">
                  <span className={`text-lg font-black ${row.rank === 1 ? "text-yellow-500" : row.rank === 2 ? "text-foreground/70" : row.rank === 3 ? "text-amber-700" : "text-foreground/35"}`}>
                    {row.rank}
                  </span>
                </div>
                <UserAvatar imageUrl={row.avatarImageUrl} emoji={row.avatarEmoji} name={row.nickname} size="md" className="mt-1 shrink-0 md:mt-0" />
                <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <Link href={`/yacht/players/${row.userId}`} className="block truncate font-semibold hover:underline">{row.nickname}</Link>
                    <p className="mt-1 text-xs text-foreground/45">{row.playCount.toLocaleString("ko-KR")}전</p>
                  </div>
                  <div className="shrink-0 self-end text-right md:self-auto">
                    <p className="text-base font-black tabular-nums md:text-lg">
                      {type === "average" ? row.value.toFixed(1) : row.value.toLocaleString("ko-KR")}점
                    </p>
                    <p className="mt-1 text-xs text-foreground/40">
                      {type === "average" ? `최고 ${row.bestScore.toLocaleString("ko-KR")}점` : `평균 ${(Math.round(row.averageScore * 10) / 10).toFixed(1)}점`}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
