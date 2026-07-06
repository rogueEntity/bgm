// web/src/app/(main)/tichu/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/prisma";
import UserAvatar from "@/components/common/UserAvatar";
import { getAvatarImageUrl } from "@/lib/avatar";
import { getCurrentUserWithAdmin } from "@/lib/admin";
import { TICHU_GAME_KEY } from "@/features/games/tichu/constants";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";

type TichuDetailsSnapshot = {
    current_round?: number;
    status?: "PLAYING" | "FINISHED" | "DELETED";
    teams?: {
        TEAM_A?: {
            name?: string;
            score?: number;
        };
        TEAM_B?: {
            name?: string;
            score?: number;
        };
    };
};

type RecentTichuNewsItem = {
    id: string;
    title: string;
    message: string;
    event_type: "GAME" | "ACHIEVEMENT";
};

async function getMyTichuDashboardData() {
    const session = await auth();
    const providerId = session?.user?.id as string | undefined;

    if (!providerId) {
        return {
            me: null,
            activeMatch: null,
            recentNews: [] as RecentTichuNewsItem[],
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
            recentNews: [] as RecentTichuNewsItem[],
        };
    }

    const game = await db.games.findUnique({
        where: {
            key: TICHU_GAME_KEY,
        },
        select: {
            id: true,
        },
    });

    if (!game) {
        return {
            me,
            activeMatch: null,
            recentNews: [] as RecentTichuNewsItem[],
        };
    }

    const matches = await db.matches.findMany({
        where: {
            game_id: game.id,
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
    });

    const activeMatch =
        matches.find((match) => {
            const details = match.match_details?.details as
                | TichuDetailsSnapshot
                | undefined;

            return details?.status === "PLAYING";
        }) ?? null;

    return {
        me,
        activeMatch,
        recentNews: [] as RecentTichuNewsItem[],
    };
}

function getActiveGameName(details: TichuDetailsSnapshot | undefined) {
    if (typeof details?.current_round === "number") {
        return `${details.current_round}라운드`;
    }

    return "게임";
}

function getActiveGameScoreText(details: TichuDetailsSnapshot | undefined) {
    const teamAScore = details?.teams?.TEAM_A?.score;
    const teamBScore = details?.teams?.TEAM_B?.score;

    if (typeof teamAScore !== "number" || typeof teamBScore !== "number") {
        return null;
    }

    return `${teamAScore} : ${teamBScore}`;
}

export default async function TichuDashboardPage() {
    assertGameEnabled(TICHU_GAME_KEY);
    const currentUser = await getCurrentUserWithAdmin();

    if (!currentUser) {
        redirect("/login");
    }

    const { me, activeMatch, recentNews } = await getMyTichuDashboardData();

    const activeDetails = activeMatch?.match_details?.details as
        | TichuDetailsSnapshot
        | undefined;

    const activeGameName = getActiveGameName(activeDetails);
    const activeGameScoreText = getActiveGameScoreText(activeDetails);

    const avatarImageUrl = getAvatarImageUrl(
        me?.avatar_image_key,
        me?.avatar_image_updated_at,
    );

    return (
        <main className="space-y-6">
            {/* 1. 헤더 영역 */}
            <section className="space-y-2">
                <h2 className="text-2xl font-bold">티츄 대시보드</h2>
                <p className="text-sm text-foreground/60">
                    오늘도 즐거운 티츄 되세요!
                </p>
            </section>

            {/* 1-1. 내 티츄 프로필 */}
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
                            <p className="text-sm text-foreground/60">내 티츄 프로필</p>

                            <h3 className="mt-1 max-w-[12rem] truncate text-xl font-black">
                                {me.nickname}
                            </h3>
                        </div>
                    </div>
                </section>
            )}

            {/* 2. 핵심 액션 영역 (진행 중인 게임 & 새 게임) */}
            <section className="space-y-3">
                {activeMatch ? (
                    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 space-y-3">
                        <div>
                            <p className="text-sm text-foreground/60">
                                진행 중인 게임이 있습니다
                            </p>
                            <h3 className="text-xl font-bold">{activeGameName}</h3>

                            {activeGameScoreText ? (
                                <p className="mt-1 text-sm font-semibold text-foreground/60">
                                    {activeGameScoreText}
                                </p>
                            ) : null}
                        </div>

                        <Link
                            href={`/tichu/play/${activeMatch.id}`}
                            className="inline-flex items-center justify-center rounded-xl bg-foreground text-background px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
                        >
                            이어하기 ➡️
                        </Link>
                    </div>
                ) : (
                    <Link
                        href="/tichu/new"
                        className="flex items-center justify-center rounded-2xl border border-foreground/10 bg-foreground text-background p-5 text-base font-bold hover:opacity-90 transition"
                    >
                        + 새 게임 시작하기
                    </Link>
                )}
            </section>

            {/* 3. 타임라인 / 최신 소식 (커뮤니티 요소) */}
            <section className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-black">최근 소식</h2>
                        <p className="mt-1 text-sm text-foreground/55">
                            티츄 테이블에서 방금 벌어진 따끈한 기록들입니다.
                        </p>
                    </div>
                </div>

                {recentNews.length > 0 ? (
                    <ul className="space-y-3">
                        {recentNews.map((news) => (
                            <li
                                key={news.id}
                                className="rounded-2xl border border-foreground/10 bg-background/70 p-4"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-lg">
                                        {news.event_type === "ACHIEVEMENT" ? "🏆" : "🎴"}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs font-bold text-foreground/60">
                        {news.event_type === "ACHIEVEMENT"
                            ? "도전과제"
                            : "게임"}
                      </span>
                                            <p className="text-sm font-black">{news.title}</p>
                                        </div>

                                        <p className="mt-1 text-sm text-foreground/75">
                                            {news.message}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="rounded-2xl border border-dashed border-foreground/15 p-5 text-sm text-foreground/55">
                        아직 새로운 소식이 없습니다. 첫 티츄 뉴스의 주인공을 기다리는 중입니다.
                    </div>
                )}
            </section>

            {/* 4. 하위 메뉴 카드 영역 (그리드 레이아웃) */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Link
                    href="/tichu/ranking"
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 p-4 transition hover:border-foreground/30 hover:bg-foreground/10"
                >
                    <span className="text-3xl">🏆</span>
                    <span className="text-sm font-bold">랭킹</span>
                    <span className="text-center text-xs font-semibold text-foreground/45">
            플레이어들의 순위를 확인합니다.
          </span>
                </Link>

                <Link
                    href="/tichu/matches"
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 p-4 transition hover:border-foreground/30 hover:bg-foreground/10"
                >
                    <span className="text-3xl">📜</span>
                    <span className="text-sm font-bold">게임 기록</span>
                    <span className="text-center text-xs font-semibold text-foreground/45">
            완료된 게임과 진행 중인 게임을 확인합니다.
          </span>
                </Link>

                <Link
                    href={`/tichu/players/${currentUser.id}`}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 p-4 transition hover:border-foreground/30 hover:bg-foreground/10"
                >
                    <span className="text-3xl">🧑‍💼</span>
                    <span className="text-sm font-bold">플레이어 정보</span>
                    <span className="text-center text-xs font-semibold text-foreground/45">
            내 티츄 통계를 확인합니다.
          </span>
                </Link>

                <Link
                    href="/tichu/achievements"
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 p-4 transition hover:border-foreground/30 hover:bg-foreground/10"
                >
                    <span className="text-3xl">🎖️</span>
                    <span className="text-sm font-bold">도전과제</span>
                    <span className="text-center text-xs font-semibold text-foreground/45">
            달성한 기록을 확인합니다.
          </span>
                </Link>

                <Link
                    href="/tichu/rivals"
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 p-4 transition hover:border-foreground/30 hover:bg-foreground/10"
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