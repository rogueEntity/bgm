// web/src/app/(main)/mahjong/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/prisma";
import { getMahjongEquippedBadgesByUserIds } from "@/app/actions/mahjong-achievement.action";
import UserAvatar from "@/components/common/UserAvatar";
import NicknameWithBadges from "@/components/mahjong/NicknameWithBadges";
import { getAvatarImageUrl } from "@/lib/avatar";
import { getCurrentUserWithAdmin } from "@/lib/admin";

type MahjongDetailsSnapshot = {
  current_round?: string;
  status?: "PLAYING" | "FINISHED" | "DELETED";
};

const ROUND_NAME_MAP: Record<string, string> = {
  EAST_1: "동 1국",
  EAST_2: "동 2국",
  EAST_3: "동 3국",
  EAST_4: "동 4국",
  SOUTH_1: "남 1국",
  SOUTH_2: "남 2국",
  SOUTH_3: "남 3국",
  SOUTH_4: "남 4국",
  WEST_1: "서 1국",
  WEST_2: "서 2국",
  WEST_3: "서 3국",
  WEST_4: "서 4국",
  NORTH_1: "북 1국",
  NORTH_2: "북 2국",
  NORTH_3: "북 3국",
  NORTH_4: "북 4국",
};

const SHOW_RECENT_NEWS = false;
const ENABLE_UNIMPLEMENTED_DASHBOARD_LINKS = false;

const disabledDashboardCardClass = ENABLE_UNIMPLEMENTED_DASHBOARD_LINKS
  ? ""
  : " pointer-events-none cursor-not-allowed opacity-45 grayscale";

async function getMyMahjongDashboardData() {
  const session = await auth();
  const providerId = session?.user?.id as string | undefined;

  if (!providerId) {
    return {
      me: null,
      activeMatch: null,
      equippedBadges: [],
    };
  }

  const me = await db.users.findFirst({
    where: {
      provider_id: providerId,
    },
    select: {
      id: true,
      nickname: true,
      avatar_emoji: true,
      avatar_image_key: true,
      avatar_image_updated_at: true,
    },
  });

  if (!me) {
    return {
      me: null,
      activeMatch: null,
      equippedBadges: [],
    };
  }

  const [matches, equippedBadgeMap] = await Promise.all([
    db.matches.findMany({
      where: {
        deleted_at: null,
        OR: [
          {
            created_by: me.id,
          },
          {
            match_players: {
              some: {
                user_id: me.id,
              },
            },
          },
        ],
      },
      include: {
        match_details: true,
      },
      orderBy: {
        play_date: "desc",
      },
      take: 20,
    }),
    getMahjongEquippedBadgesByUserIds([me.id]),
  ]);

  const activeMatch =
    matches.find((match) => {
      const details = match.match_details?.details as
        | MahjongDetailsSnapshot
        | undefined;

      return details?.status === "PLAYING";
    }) ?? null;

  return {
    me,
    activeMatch,
    equippedBadges: equippedBadgeMap[me.id] ?? [],
  };
}

export default async function MahjongDashboardPage() {
  const currentUser = await getCurrentUserWithAdmin();

  if (!currentUser) {
    redirect("/login");
  }

  const { me, activeMatch, equippedBadges } =
    await getMyMahjongDashboardData();

  const activeDetails = activeMatch?.match_details?.details as
    | MahjongDetailsSnapshot
    | undefined;

  const activeRoundName =
    activeDetails?.current_round && ROUND_NAME_MAP[activeDetails.current_round]
      ? ROUND_NAME_MAP[activeDetails.current_round]
      : activeDetails?.current_round;

  const avatarImageUrl = getAvatarImageUrl(
    me?.avatar_image_key,
    me?.avatar_image_updated_at,
  );

  return (
    <main className="space-y-6">
      {/* 1. 헤더 영역 */}
      <section className="space-y-2">
        <h2 className="text-2xl font-bold">리치마작 대시보드</h2>
        <p className="text-sm text-foreground/60">
          오늘도 즐거운 마작 되세요!
        </p>
      </section>

      {/* 1-1. 내 리치마작 프로필 */}
      {me && (
        <section className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5">
          <div className="flex items-center gap-3">
            <UserAvatar
              imageUrl={avatarImageUrl}
              emoji={me.avatar_emoji}
              name={me.nickname}
              size="lg"
              className="h-14 w-14 rounded-2xl text-2xl"
            />

            <div className="min-w-0">
              <p className="text-sm text-foreground/60">내 리치마작 프로필</p>

              <NicknameWithBadges
                nickname={me.nickname}
                badges={equippedBadges}
                badgeSize="sm"
                className="mt-1 max-w-full"
                nameClassName="max-w-[12rem] truncate text-xl font-black"
              />
            </div>
          </div>
        </section>
      )}

      {/* 2. 핵심 액션 영역 (진행 중인 대국 & 새 대국) */}
      <section className="space-y-3">
        {activeMatch ? (
          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 space-y-3">
            <div>
              <p className="text-sm text-foreground/60">
                진행 중인 대국이 있습니다
              </p>
              <h3 className="text-xl font-bold">
                {activeRoundName ?? "대국"}
              </h3>
            </div>

            <Link
              href={`/mahjong/play/${activeMatch.id}`}
              className="inline-flex items-center justify-center rounded-xl bg-foreground text-background px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
            >
              이어하기 ➡️
            </Link>
          </div>
        ) : (
          <Link
            href="/mahjong/new"
            className="flex items-center justify-center rounded-2xl border border-foreground/10 bg-foreground text-background p-5 text-base font-bold hover:opacity-90 transition"
          >
            + 새 대국 시작하기
          </Link>
        )}
      </section>

      {/* 3. 타임라인 / 최신 소식 (커뮤니티 요소) */}
      {SHOW_RECENT_NEWS && (
        <section className="rounded-2xl border border-foreground/10 bg-background p-5">
          <h3 className="mb-3 font-bold">최근 소식</h3>

          <ul className="space-y-2 text-sm text-foreground/70">
            <li>김현욱님이 방금 전 대국에서 역만(국사무쌍)을 화료했습니다!</li>
            <li>지인A님이 누적 10만 점을 돌파했습니다.</li>
            <li>지인B님의 최근 5경기 평균 순위가 3.8위로 하락했습니다.</li>
          </ul>
        </section>
      )}

      {/* 4. 하위 메뉴 카드 영역 (그리드 레이아웃) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Link
            href="/mahjong/ranking"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 p-4 transition hover:border-foreground/30 hover:bg-foreground/10"
        >
          <span className="text-3xl">🏆</span>
          <span className="text-sm font-bold">랭킹</span>
          <span className="text-center text-xs font-semibold text-foreground/45">
            작사들의 순위를 확인합니다.
          </span>
        </Link>

        <Link
            href="/mahjong/matches"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 p-4 transition hover:border-foreground/30 hover:bg-foreground/10"
        >
          <span className="text-3xl">📜</span>
          <span className="text-sm font-bold">대국 기록</span>
          <span className="text-center text-xs font-semibold text-foreground/45">
            완료된 대국과 진행 중인 대국을 확인합니다.
          </span>
        </Link>

        <Link
            href="/mahjong/guide"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 p-4 transition hover:border-foreground/30 hover:bg-foreground/10"
        >
          <span className="text-3xl">📘</span>
          <span className="text-sm font-bold">역·점수 안내</span>
          <span className="text-center text-xs font-semibold text-foreground/45">
            역 족보와 점수 계산을 확인합니다.
          </span>
        </Link>

        <Link
            href={`/mahjong/players/${currentUser.id}`}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 p-4 transition hover:border-foreground/30 hover:bg-foreground/10"
        >
          <span className="text-3xl">🧑‍💼</span>
          <span className="text-sm font-bold">작사 정보</span>
          <span className="text-center text-xs font-semibold text-foreground/45">
            내 작사 통계를 확인합니다.
          </span>
        </Link>

        <Link
            href="/mahjong/achievements"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 p-4 transition hover:border-foreground/30 hover:bg-foreground/10"
        >
          <span className="text-3xl">🎖️</span>
          <span className="text-sm font-bold">도전과제</span>
          <span className="text-center text-xs font-semibold text-foreground/45">
            달성한 기록을 확인합니다.
          </span>
        </Link>

        <Link
            href="/mahjong/rival"
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 p-4 transition hover:border-foreground/30 hover:bg-foreground/10${disabledDashboardCardClass}`}
        >
          <span className="text-3xl">⚔️</span>
          <span className="text-sm font-bold">라이벌</span>
          <span className="text-center text-xs font-semibold text-foreground/45">
            라이벌과의 상대 전적을 확인합니다.
          </span>
        </Link>
      </div>
    </main>
  );
}