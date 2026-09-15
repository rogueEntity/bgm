import Link from "next/link";
import { notFound } from "next/navigation";

import { getYachtEquippedBadgesByUserIds } from "@/app/actions/yacht-achievement.action";
import YachtNicknameWithBadges from "@/components/yacht/YachtNicknameWithBadges";
import { getYachtPlayerStats } from "@/app/actions/yacht-stats.action";
import UserAvatar from "@/components/common/UserAvatar";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";
import { YACHT_CATEGORY_LABELS, YACHT_GAME_KEY } from "@/features/games/yacht/constants";

const formatRate = (rate: number) => `${(rate * 100).toFixed(1)}%`;

export default async function YachtPlayerDetailPage({ params }: {
  params: Promise<{ userId: string }>;
}) {
  assertGameEnabled(YACHT_GAME_KEY);
  const { userId } = await params;
  const player = await getYachtPlayerStats(userId);
  if (!player) notFound();
  const badgesByUserId = await getYachtEquippedBadgesByUserIds([userId]);

  const metrics = [
    { label: "플레이 횟수", value: `${player.playCount}경기`, description: "완료한 전체 경기" },
    { label: "평균 점수", value: `${player.averageScore.toFixed(1)}점`, description: "상단 보너스 포함" },
    { label: "최고 점수", value: `${player.bestScore}점`, description: "개인 최고 기록" },
    { label: "우승률", value: player.winRate === null ? "—" : formatRate(player.winRate), description: `${player.competitivePlayCount}경기 중 ${player.winCount}회 우승 · 2인 이상` },
    { label: "야찌 달성률", value: formatRate(player.yachtRate), description: `${player.yachtCount}경기 · 추가 야찌 포함` },
    { label: "보너스 달성률", value: formatRate(player.bonusRate), description: `${player.bonusCount}회 · 상단 합계 63점 이상` },
  ];
  const chronologicalMatches = [...player.recentMatches].reverse();
  const maxRecentScore = Math.max(1, ...chronologicalMatches.map((match) => match.score));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <UserAvatar imageUrl={player.avatarImageUrl} emoji={player.avatarEmoji} name={player.nickname} size="lg" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground/50">야찌 플레이어</p>
            <h1 className="mt-1 break-words text-2xl font-black sm:text-3xl">{player.nickname}</h1>
            <YachtNicknameWithBadges nickname="" badges={badgesByUserId[userId] ?? []} className="mt-2 flex-wrap" />
            <p className="mt-2 text-sm font-semibold text-foreground/55">{player.playCount}경기</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {[{ href: "/yacht/matches", label: "게임 기록" }, { href: "/yacht/ranking", label: "랭킹" }, { href: "/yacht", label: "야찌 대시보드" }].map((link) => (
            <Link key={link.href} href={link.href} className="inline-flex h-10 items-center justify-center rounded-xl border border-foreground/10 px-4 text-sm font-bold transition hover:bg-foreground/5">{link.label}</Link>
          ))}
        </div>
      </section>

      {player.playCount === 0 ? (
        <section className="rounded-3xl border border-dashed border-foreground/15 px-5 py-14 text-center">
          <h2 className="text-lg font-black">아직 완료한 야찌 게임이 없습니다</h2>
          <p className="mt-2 text-sm text-foreground/55">게임을 완료하면 점수와 달성 기록이 표시됩니다.</p>
        </section>
      ) : (
        <>
          <section>
            <h2 className="text-lg font-black sm:text-xl">경기 요약</h2>
            <p className="mb-3 mt-1 text-sm text-foreground/50">삭제된 경기는 제외합니다. 우승률은 2인 이상 경기 기준이며 공동 1위도 우승에 포함합니다. 나머지 지표는 1인 플레이를 포함합니다.</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {metrics.map((metric) => (
                <article key={metric.label} className="rounded-2xl border border-foreground/10 bg-background p-4 sm:p-5">
                  <p className="text-xs font-bold text-foreground/45">{metric.label}</p>
                  <p className="mt-2 text-2xl font-black tabular-nums sm:text-3xl">{metric.value}</p>
                  <p className="mt-2 text-xs font-semibold text-foreground/45">{metric.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-foreground/10 bg-background p-5 sm:p-6">
            <h2 className="text-lg font-black">최근 점수 추이</h2>
            <p className="mt-1 text-sm text-foreground/50">최근 최대 10경기 · 왼쪽부터 오래된 경기</p>
            <div className="mt-5 overflow-x-auto">
              <div className="flex h-48 min-w-80 items-end gap-2">
                {chronologicalMatches.map((match, index) => (
                  <Link key={match.matchId} href={`/yacht/detail/${match.matchId}`} aria-label={`${index + 1}번째 경기 ${match.score}점 상세 보기`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 text-xs font-bold tabular-nums">
                    <span>{match.score}</span>
                    <span className="w-full rounded-t bg-foreground/20 transition hover:bg-foreground/35" style={{ height: `${Math.max(1, match.score / maxRecentScore * 75)}%` }} />
                    <span className="text-foreground/45">{index + 1}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-foreground/10 bg-background">
            <h2 className="p-5 text-lg font-black">최근 경기 기록</h2>
            <ul className="divide-y divide-foreground/10">
              {player.recentMatches.map((match) => (
                <li key={match.matchId}>
                  <Link href={`/yacht/detail/${match.matchId}`} className="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-foreground/[0.03]">
                    <span className="text-sm font-semibold">{match.playDate ? new Date(match.playDate).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "날짜 없음"}</span>
                    <span className="text-right">
                      <strong className="tabular-nums">{match.score}점</strong>
                      <span className="mt-1 block text-xs text-foreground/50">{match.playerCount === 1 ? "1인 플레이" : `${match.rank ?? "—"}위 / ${match.playerCount}명`}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="overflow-hidden rounded-3xl border border-foreground/10 bg-background">
            <h2 className="p-5 text-lg font-black">족보별 기록</h2>
            <table className="w-full text-sm">
              <thead className="bg-foreground/[0.04]">
                <tr><th className="p-3 text-left">항목</th><th className="p-3 text-right">평균 점수</th><th className="p-3 text-right">0점 기입률</th></tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {player.categories.map((item) => (
                  <tr key={item.category}>
                    <th className="p-3 text-left font-semibold">{YACHT_CATEGORY_LABELS[item.category]}</th>
                    <td className="p-3 text-right tabular-nums">{item.averageScore.toFixed(1)}점</td>
                    <td className="p-3 text-right tabular-nums">{formatRate(item.zeroRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
