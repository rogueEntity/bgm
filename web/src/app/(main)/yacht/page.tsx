import Link from "next/link";
import { redirect } from "next/navigation";

import UserAvatar from "@/components/common/UserAvatar";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";
import { YACHT_GAME_KEY } from "@/features/games/yacht/constants";
import type { YachtMatchDetails } from "@/features/games/yacht/types";
import { getCurrentUserWithAdmin } from "@/lib/admin";
import { getAvatarImageUrl } from "@/lib/avatar";
import { db } from "@/lib/prisma";

export default async function YachtDashboardPage() {
  assertGameEnabled(YACHT_GAME_KEY);
  const currentUser = await getCurrentUserWithAdmin();
  if (!currentUser) redirect("/login");

  const [me, game] = await Promise.all([
    db.users.findUnique({
      where: { id: currentUser.id },
      select: {
        nickname: true,
        avatar_emoji: true,
        avatar_image_key: true,
        avatar_image_updated_at: true,
      },
    }),
    db.games.findUnique({ where: { key: YACHT_GAME_KEY }, select: { id: true } }),
  ]);

  const activeMatch = game
    ? await db.matches.findFirst({
        where: {
          game_id: game.id,
          created_by: currentUser.id,
          deleted_at: null,
          match_details: {
            details: { path: ["status"], equals: "PLAYING" },
          },
        },
        include: { match_details: true },
        orderBy: { play_date: "desc" },
      })
    : null;
  const details = activeMatch?.match_details?.details as
    | YachtMatchDetails
    | undefined;

  return (
    <main className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-2xl font-bold">야찌 대시보드</h2>
        <p className="text-sm text-foreground/60">오늘도 즐거운 야찌 되세요!</p>
      </section>

      {me ? (
        <section className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5">
          <div className="flex items-center gap-3">
            <UserAvatar
              imageUrl={getAvatarImageUrl(me.avatar_image_key, me.avatar_image_updated_at)}
              emoji={me.avatar_emoji}
              name={me.nickname}
              size="lg"
              className="h-14 w-14 rounded-2xl text-2xl"
            />
            <div className="min-w-0">
              <p className="text-sm text-foreground/60">내 야찌 프로필</p>
              <p className="mt-1 truncate text-xl font-black">{me.nickname}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section>
        {activeMatch ? (
          <div className="space-y-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5">
            <div>
              <p className="text-sm text-foreground/60">진행 중인 게임이 있습니다</p>
              <h3 className="text-xl font-bold">
                {details?.current_round ?? 1}라운드 · {Object.keys(details?.players ?? {}).length}명
              </h3>
            </div>
            <Link
              href={`/yacht/play/${activeMatch.id}`}
              className="inline-flex items-center justify-center rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
            >
              이어하기 ➡️
            </Link>
          </div>
        ) : (
          <Link
            href="/yacht/new"
            className="flex items-center justify-center rounded-2xl border border-foreground/10 bg-foreground p-5 text-base font-bold text-background transition hover:opacity-90"
          >
            + 새 게임 시작하기
          </Link>
        )}
      </section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[
          { icon: "🏆", label: "랭킹" },
          { icon: "📜", label: "게임 기록", href: "/yacht/matches" },
          { icon: "🧑‍💼", label: "플레이어 정보" },
          { icon: "🎖️", label: "도전과제" },
          { icon: "⚔️", label: "라이벌" },
        ].map((menu) => (
          menu.href ? (
            <Link
              key={menu.label}
              href={menu.href}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 p-4 transition hover:bg-foreground/10"
            >
              <span aria-hidden="true" className="text-3xl">{menu.icon}</span>
              <span className="text-sm font-bold">{menu.label}</span>
            </Link>
          ) : (
          <button
            key={menu.label}
            type="button"
            disabled
            className="flex cursor-not-allowed flex-col items-center justify-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 p-4 text-foreground/45"
          >
            <span aria-hidden="true" className="text-3xl">{menu.icon}</span>
            <span className="text-sm font-bold">{menu.label}</span>
            <span className="text-center text-xs font-semibold">준비 중</span>
          </button>
          )
        ))}
      </div>

      <section className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-black">최근 소식</h2>
          <p className="mt-1 text-sm text-foreground/55">
            야찌 테이블의 새로운 기록과 소식을 전해드립니다.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-foreground/15 p-5 text-sm text-foreground/55">
          최근 소식 기능은 준비 중입니다.
        </div>
      </section>
    </main>
  );
}
