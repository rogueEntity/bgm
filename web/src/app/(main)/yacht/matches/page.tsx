import Link from "next/link";

import UserAvatar from "@/components/common/UserAvatar";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";
import { YACHT_GAME_KEY } from "@/features/games/yacht/constants";
import { getYachtTotal } from "@/features/games/yacht/scoring";
import type { YachtMatchDetails } from "@/features/games/yacht/types";
import { getCurrentUserWithAdmin } from "@/lib/admin";
import { getAvatarImageUrl } from "@/lib/avatar";
import { db } from "@/lib/prisma";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function YachtMatchesPage({ searchParams }: Props) {
  assertGameEnabled(YACHT_GAME_KEY);
  const params = await searchParams;
  const status = params.status === "PLAYING" || params.status === "FINISHED"
    ? params.status : "ALL";
  const keyword = typeof params.keyword === "string" ? params.keyword : "";
  const onlyMine = params.only_mine === "on";
  const [game, me] = await Promise.all([
    db.games.findUnique({ where: { key: YACHT_GAME_KEY }, select: { id: true } }),
    getCurrentUserWithAdmin(),
  ]);
  const rawMatches = game && (!onlyMine || me)
    ? await db.matches.findMany({
        where: {
          game_id: game.id,
          deleted_at: null,
          ...(onlyMine && me ? {
            OR: [
              { created_by: me.id },
              { match_players: { some: { user_id: me.id } } },
            ],
          } : {}),
        },
        include: {
          match_details: true,
          match_players: {
            include: {
              users: {
                select: {
                  id: true,
                  nickname: true,
                  avatar_emoji: true,
                  avatar_image_key: true,
                  avatar_image_updated_at: true,
                },
              },
            },
          },
        },
        orderBy: [{ play_date: "desc" }, { id: "desc" }],
      })
    : [];
  const normalizedKeyword = keyword.trim().toLowerCase();
  const matches = rawMatches.flatMap((match) => {
    if (!match.match_details) return [];
    const details = match.match_details.details as YachtMatchDetails;
    if (details.status !== "PLAYING" && details.status !== "FINISHED") return [];
    if (status !== "ALL" && details.status !== status) return [];
    const searchableText = [
      String(match.id),
      ...Object.values(details.players).map((player) => player.name),
      ...match.match_players.map((player) => player.users?.nickname ?? player.guest_name ?? ""),
    ].join(" ").toLowerCase();
    return searchableText.includes(normalizedKeyword) ? [{ ...match, details }] : [];
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <Link href="/yacht" className="mb-4 inline-flex text-sm font-semibold text-foreground/60 hover:text-foreground">
          ← 야찌 대시보드로
        </Link>
        <h2 className="mb-2 text-3xl font-black">게임 기록</h2>
        <p className="text-sm text-foreground/60">전체 야찌 게임 기록을 확인하고 조건별로 필터링합니다.</p>
      </div>

      <form key={JSON.stringify([status, keyword, onlyMine])} action="/yacht/matches" method="get" className="space-y-4 rounded-2xl border border-foreground/10 bg-foreground/5 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm font-bold">
            <span>상태</span>
            <select name="status" defaultValue={status} className="w-full rounded-xl border border-foreground/10 bg-background px-3 py-2 text-sm font-semibold">
              <option value="ALL">전체</option>
              <option value="PLAYING">진행 중</option>
              <option value="FINISHED">종료</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-bold">
            <span>검색</span>
            <input name="keyword" defaultValue={keyword} placeholder="게임 ID / 참가자명" className="w-full rounded-xl border border-foreground/10 bg-background px-3 py-2 text-sm font-semibold" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-foreground/70">
          <input type="checkbox" name="only_mine" defaultChecked={onlyMine} className="size-4 accent-foreground" />
          내 기록만 보기
        </label>
        <div className="flex justify-end gap-2">
          <Link href="/yacht/matches" className="rounded-xl border border-foreground/10 px-4 py-2 text-sm font-bold transition hover:bg-foreground/10">초기화</Link>
          <button type="submit" className="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background transition hover:opacity-90">필터 적용</button>
        </div>
      </form>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black">게임 리스트</h3>
          <span className="text-sm font-bold text-foreground/50">{matches.length}건</span>
        </div>
        {matches.length === 0 ? (
          <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-6 text-center text-sm font-bold text-foreground/50">
            {game ? "조회된 야찌 게임 기록이 없습니다." : "야찌 게임 정보를 찾을 수 없습니다."}
          </div>
        ) : (
          <ul className="space-y-3">
            {matches.map((match) => {
              const finished = match.details.status === "FINISHED";
              const players = Object.entries(match.details.players)
                .map(([key, player]) => ({ key, ...player, total: getYachtTotal(player.scores) }))
                .sort((a, b) => finished ? b.total - a.total || a.seat_order - b.seat_order : a.seat_order - b.seat_order);
              return (
                <li key={match.id}>
                  <Link href={`/yacht/${finished ? "detail" : "play"}/${match.id}`} className="block rounded-2xl border border-foreground/10 bg-foreground/5 p-4 transition hover:border-foreground/30 hover:bg-foreground/10">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-black">#{match.id}</span>
                          <span className={`rounded-full border px-2 py-1 text-xs font-black ${finished ? "border-foreground/10 bg-foreground/10 text-foreground/70" : "border-blue-500/20 bg-blue-500/10 text-blue-500"}`}>
                            {finished ? "종료" : "진행 중"}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground/60">
                          {match.play_date ? new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" }).format(match.play_date) : "-"}
                        </p>
                      </div>
                      <div className="text-right text-sm font-bold text-foreground/60">
                        <div>{players.length}명</div>
                        <div>{finished ? "게임 종료" : `${match.details.current_round}라운드 진행 중`}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {players.map((player) => {
                        const user = match.match_players.find((participant) => participant.user_id && player.key === `user_${participant.user_id}`)?.users;
                        const rank = finished ? players.findIndex((entry) => entry.total === player.total) + 1 : null;
                        return (
                          <div key={player.key} className="rounded-xl border border-foreground/5 bg-background/60 p-3">
                            <div className="flex items-center gap-1.5 text-sm font-bold">
                              <UserAvatar imageUrl={getAvatarImageUrl(user?.avatar_image_key, user?.avatar_image_updated_at)} emoji={user?.avatar_emoji} name={user?.nickname ?? player.name} size="sm" className="h-5 w-5 text-xs" />
                              <span className="min-w-0 truncate">{user?.nickname ?? player.name}</span>
                              {rank ? <span className="ml-auto shrink-0 text-xs text-foreground/50">{rank}위</span> : null}
                            </div>
                            <div className="mt-1 font-black">{player.total.toLocaleString()}점</div>
                          </div>
                        );
                      })}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
