// web/src/app/(main)/page.tsx
import { auth } from "@/auth";
import { db } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

type HomeMatchDetails = {
  status?: "PLAYING" | "FINISHED" | "CANCELED" | string;
  current_round?: string;
  game_mode?: string;
  honba?: number;
};

type RankingItem = {
  key: string;
  name: string;
  avatarEmoji?: string | null;
  playCount: number;
};

type RankedRankingItem = RankingItem & {
  rank: number;
};

type PopularGameItem = {
  gameId: number;
  gameName: string;
  playCount: number;
};

const STATUS_LABEL: Record<string, string> = {
  PLAYING: "진행 중",
  FINISHED: "완료",
  CANCELED: "취소",
};

const NOTICE_CATEGORY_LABEL: Record<string, string> = {
  NOTICE: "공지",
  UPDATE: "업데이트",
  EVENT: "이벤트",
  SYSTEM: "시스템",
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

function formatDate(value?: Date | string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value?: Date | string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getDetails(match: {
  match_details?: {
    details: unknown;
  } | null;
}) {
  return (match.match_details?.details ?? {}) as HomeMatchDetails;
}

function getStatusLabel(status?: string) {
  if (!status) return "상태 없음";
  return STATUS_LABEL[status] ?? status;
}

function getStatusClassName(status?: string) {
  if (status === "PLAYING") {
    return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  }

  if (status === "FINISHED") {
    return "bg-green-500/10 text-green-500 border-green-500/20";
  }

  if (status === "CANCELED") {
    return "bg-red-500/10 text-red-500 border-red-500/20";
  }

  return "bg-foreground/10 text-foreground/70 border-foreground/10";
}

function getNoticeCategoryLabel(category: string) {
  return NOTICE_CATEGORY_LABEL[category] ?? category;
}

function getNoticeCategoryClassName(category: string) {
  if (category === "NOTICE") {
    return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  }

  if (category === "UPDATE") {
    return "bg-green-500/10 text-green-500 border-green-500/20";
  }

  if (category === "EVENT") {
    return "bg-purple-500/10 text-purple-500 border-purple-500/20";
  }

  return "bg-foreground/10 text-foreground/70 border-foreground/10";
}

function getMatchHref(matchId: number, gameName: string, status?: string) {
  // 현재 상세/진행 페이지가 구현된 게임만 연결합니다.
  // 추후 다른 게임이 추가되면 이 함수에서 게임별 경로만 확장하면 됩니다.
  if (gameName.includes("마작")) {
    return status === "PLAYING"
      ? `/mahjong/play/${matchId}`
      : `/mahjong/detail/${matchId}`;
  }

  return null;
}

function getMatchResultSummary(matchPlayer?: {
  final_score: number | null;
  rank: number | null;
}) {
  if (!matchPlayer) return null;

  const rankText = matchPlayer.rank ? `${matchPlayer.rank}위` : null;
  const scoreText =
    typeof matchPlayer.final_score === "number"
      ? `${matchPlayer.final_score.toLocaleString()}점`
      : null;

  if (rankText && scoreText) return `${rankText} / ${scoreText}`;
  if (rankText) return rankText;
  if (scoreText) return scoreText;

  return "참여";
}

function getPlayerDisplayName(player: {
  guest_name: string | null;
  users: {
    nickname: string;
  } | null;
}) {
  return player.users?.nickname ?? player.guest_name ?? "이름 없음";
}

function getPlayerAvatarEmoji(player: {
  users: {
    avatar_emoji: string;
  } | null;
}) {
  return player.users?.avatar_emoji ?? "";
}

function withCompetitionRank<T>(
  items: T[],
  getScore: (item: T) => number
): Array<T & { rank: number }> {
  let prevScore: number | null = null;
  let prevRank = 0;

  return items.map((item, index) => {
    const score = getScore(item);
    const rank = prevScore === score ? prevRank : index + 1;

    prevScore = score;
    prevRank = rank;

    return {
      ...item,
      rank,
    };
  });
}

async function getHomeData(providerId?: string) {
  const recentFrom = new Date();
  recentFrom.setDate(recentFrom.getDate() - 30);

  const me = providerId
    ? await db.users.findFirst({
        where: {
          provider_id: providerId,
        },
        select: {
          id: true,
          nickname: true,
          avatar_emoji: true,
        },
      })
    : null;

  const [homeNotices, recentMatches, recent30Matches] = await Promise.all([
    db.home_notices.findMany({
      where: {
        is_published: true,
      },
      orderBy: [
        {
          is_pinned: "desc",
        },
        {
          created_at: "desc",
        },
      ],
      take: 3,
    }),
    db.matches.findMany({
      include: {
        games: true,
        match_details: true,
        match_players: {
          include: {
            users: {
              select: {
                id: true,
                nickname: true,
                avatar_emoji: true,
              },
            },
          },
        },
      },
      orderBy: {
        play_date: "desc",
      },
      take: 5,
    }),
    db.matches.findMany({
      where: {
        play_date: {
          gte: recentFrom,
        },
      },
      include: {
        games: true,
        match_details: true,
        match_players: {
          include: {
            users: {
              select: {
                id: true,
                nickname: true,
                avatar_emoji: true,
              },
            },
          },
        },
      },
      orderBy: {
        play_date: "desc",
      },
    }),
  ]);

  const myRecent30Matches = me
    ? recent30Matches.filter((match) =>
        match.match_players.some((player) => player.user_id === me.id)
      )
    : [];

  const myPlayedGameIds = new Set(
    myRecent30Matches.map((match) => match.game_id)
  );

  const myFavoriteGame = (() => {
    const gameCountMap = new Map<string, number>();

    myRecent30Matches.forEach((match) => {
      const gameName = match.games.name;
      gameCountMap.set(gameName, (gameCountMap.get(gameName) ?? 0) + 1);
    });

    return (
      [...gameCountMap.entries()].sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0], "ko-KR");
      })[0]?.[0] ?? "-"
    );
  })();

  const popularGames = (() => {
    const gameMap = new Map<number, PopularGameItem>();

    recent30Matches.forEach((match) => {
      const prev = gameMap.get(match.game_id);

      gameMap.set(match.game_id, {
        gameId: match.game_id,
        gameName: match.games.name,
        playCount: (prev?.playCount ?? 0) + 1,
      });
    });

    return [...gameMap.values()]
      .sort((a, b) => {
        if (b.playCount !== a.playCount) return b.playCount - a.playCount;
        return a.gameName.localeCompare(b.gameName, "ko-KR");
      })
      .slice(0, 5);
  })();

  const integratedRanking: RankedRankingItem[] = (() => {
    const rankingMap = new Map<string, RankingItem>();

    recent30Matches.forEach((match) => {
      match.match_players.forEach((player) => {
        const key = player.user_id
          ? `user-${player.user_id}`
          : `guest-${player.guest_name ?? player.id}`;

        const prev = rankingMap.get(key);

        rankingMap.set(key, {
          key,
          name: getPlayerDisplayName(player),
          avatarEmoji: getPlayerAvatarEmoji(player),
          playCount: (prev?.playCount ?? 0) + 1,
        });
      });
    });

    const sortedRanking = [...rankingMap.values()].sort((a, b) => {
      if (b.playCount !== a.playCount) return b.playCount - a.playCount;
      return a.name.localeCompare(b.name, "ko-KR");
    });

    return withCompetitionRank(
      sortedRanking,
      (item) => item.playCount
    ).slice(0, 5);
  })();

  return {
    me,
    homeNotices,
    recentMatches,
    myActivitySummary: {
      playCount: myRecent30Matches.length,
      gameCount: myPlayedGameIds.size,
      lastPlayedAt: myRecent30Matches[0]?.play_date ?? null,
      favoriteGame: myFavoriteGame,
    },
    popularGames,
    integratedRanking,
  };
}

export default async function Home() {
  const session = await auth();

  // 로그인 상태인데 닉네임이 비어있다면 온보딩 페이지로 강제 이동
  // @ts-ignore
  if (session && !session.user?.nickname) {
    redirect("/onboarding");
  }

  // @ts-ignore
  const providerId = session?.user?.id as string | undefined;
  // @ts-ignore
  const nickname = session?.user?.nickname;
  // @ts-ignore
  const avatarEmoji = session?.user?.avatarEmoji;

  const {
    me,
    homeNotices,
    recentMatches,
    myActivitySummary,
    popularGames,
    integratedRanking,
  } = await getHomeData(providerId);

  return (
    <div className="space-y-8">
      {/* 상단 환영 문구 */}
      <section className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-6 md:p-8">
        <div>
          <div className="mb-3 text-4xl">{avatarEmoji ?? ""}</div>
          <h1 className="text-2xl md:text-3xl font-bold">
            환영합니다, {nickname ?? "플레이어"}님!
          </h1>
          <p className="mt-2 text-sm md:text-base text-foreground/60">
            최근 게임 기록과 동호회 소식을 한눈에 확인해보세요.
          </p>
        </div>
      </section>

      {/* 중단: 새 소식 */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">새 소식</h2>
            <p className="mt-1 text-sm text-foreground/60">
              공지사항과 업데이트 소식을 확인합니다.
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          {homeNotices.length === 0 ? (
            <div className="rounded-2xl border border-foreground/10 p-5 text-sm text-foreground/60">
              등록된 새 소식이 없습니다.
            </div>
          ) : (
            homeNotices.map((notice) => (
              <Link
                key={notice.id}
                href={`/notices/${notice.id}`}
                className="block rounded-2xl border border-foreground/10 p-5 bg-background hover:bg-foreground/[0.03] transition"
              >
                <article>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getNoticeCategoryClassName(
                            notice.category
                          )}`}
                        >
                          {getNoticeCategoryLabel(notice.category)}
                        </span>

                        {notice.is_pinned && (
                          <span className="inline-flex items-center rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-1 text-xs font-semibold text-yellow-600">
                            고정
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold">{notice.title}</h3>

                      {(notice.summary || notice.content) && (
                        <p className="mt-1 text-sm text-foreground/60 line-clamp-2">
                          {notice.summary ?? notice.content}
                        </p>
                      )}
                    </div>

                    <time className="text-xs text-foreground/40 whitespace-nowrap">
                      {formatDate(notice.created_at)}
                    </time>
                  </div>
                </article>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* 중단: 내 활동 요약 */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">내 활동 요약</h2>
          <p className="mt-1 text-sm text-foreground/60">
            최근 30일 기준으로 나의 활동을 요약합니다.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-foreground/10 p-5">
            <p className="text-sm text-foreground/60">플레이</p>
            <p className="mt-2 text-2xl font-bold">
              {myActivitySummary.playCount.toLocaleString()}회
            </p>
          </div>

          <div className="rounded-2xl border border-foreground/10 p-5">
            <p className="text-sm text-foreground/60">참여 게임</p>
            <p className="mt-2 text-2xl font-bold">
              {myActivitySummary.gameCount.toLocaleString()}종
            </p>
          </div>

          <div className="rounded-2xl border border-foreground/10 p-5">
            <p className="text-sm text-foreground/60">최근 플레이</p>
            <p className="mt-2 text-lg font-bold">
              {formatDate(myActivitySummary.lastPlayedAt)}
            </p>
          </div>

          <div className="rounded-2xl border border-foreground/10 p-5">
            <p className="text-sm text-foreground/60">가장 많이 한 게임</p>
            <p className="mt-2 text-lg font-bold">
              {myActivitySummary.favoriteGame}
            </p>
          </div>
        </div>
      </section>

      {/* 중단: 최근 기록 */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">최근 기록</h2>
            <p className="mt-1 text-sm text-foreground/60">
              최근 등록된 게임 기록입니다.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-foreground/10 overflow-hidden">
          {recentMatches.length === 0 ? (
            <div className="p-6 text-sm text-foreground/60">
              아직 등록된 기록이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-foreground/10">
              {recentMatches.map((match) => {
                const details = getDetails(match);
                const status = details.status;
                const matchHref = getMatchHref(
                  match.id,
                  match.games.name,
                  status
                );

                const myPlayer = me
                  ? match.match_players.find(
                      (player) => player.user_id === me.id
                    )
                  : undefined;

                const myResultSummary = getMatchResultSummary(myPlayer);

                const roundName =
                  details.current_round && ROUND_NAME_MAP[details.current_round]
                    ? ROUND_NAME_MAP[details.current_round]
                    : details.current_round;

                return (
                  <article key={match.id} className="p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="font-semibold">
                            {match.games.name}
                          </span>

                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                              status
                            )}`}
                          >
                            {getStatusLabel(status)}
                          </span>
                        </div>

                        <p className="text-sm text-foreground/60">
                          {formatDateTime(match.play_date)} · 참가자{" "}
                          {match.match_players.length}명
                          {details.game_mode ? ` · ${details.game_mode}` : ""}
                          {roundName ? ` · ${roundName}` : ""}
                          {typeof details.honba === "number"
                            ? ` ${details.honba}본장`
                            : ""}
                        </p>

                        {myResultSummary && (
                          <p className="mt-1 text-sm text-foreground/70">
                            내 결과: {myResultSummary}
                          </p>
                        )}
                      </div>

                      {matchHref ? (
                        <Link
                          href={matchHref}
                          className="rounded-xl border border-foreground/10 px-4 py-2 text-sm font-semibold text-center hover:bg-foreground/5 transition"
                        >
                          {status === "PLAYING" ? "이어하기" : "상세 보기"}
                        </Link>
                      ) : (
                        <span className="rounded-xl border border-foreground/10 px-4 py-2 text-sm text-foreground/40 text-center">
                          상세 준비 중
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 하단: 최근 인기 게임 / 통합 랭킹 */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">최근 인기 게임</h2>
            <p className="mt-1 text-sm text-foreground/60">
              최근 30일 기준 플레이 횟수입니다.
            </p>
          </div>

          <div className="rounded-2xl border border-foreground/10 overflow-hidden">
            {popularGames.length === 0 ? (
              <div className="p-6 text-sm text-foreground/60">
                최근 30일 동안 등록된 게임 기록이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-foreground/10">
                {popularGames.map((game, index) => (
                  <div
                    key={game.gameId}
                    className="flex items-center justify-between gap-3 p-5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-sm font-bold">
                        {index + 1}
                      </span>
                      <span className="font-semibold truncate">
                        {game.gameName}
                      </span>
                    </div>

                    <span className="text-sm text-foreground/60 whitespace-nowrap">
                      {game.playCount.toLocaleString()}회
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">통합 랭킹</h2>
            <p className="mt-1 text-sm text-foreground/60">
              최근 30일 기준 최다 참여 랭킹입니다. 동점자는 공동 순위로 표시합니다.
            </p>
          </div>

          <div className="rounded-2xl border border-foreground/10 overflow-hidden">
            {integratedRanking.length === 0 ? (
              <div className="p-6 text-sm text-foreground/60">
                최근 30일 동안 참여 기록이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-foreground/10">
                {integratedRanking.map((player) => (
                  <div
                    key={player.key}
                    className="flex items-center justify-between gap-3 p-5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-sm font-bold">
                        {player.rank}
                      </span>
                      <span className="text-xl">
                        {player.avatarEmoji ?? ""}
                      </span>
                      <span className="font-semibold truncate">
                        {player.name}
                      </span>
                    </div>

                    <span className="text-sm text-foreground/60 whitespace-nowrap">
                      {player.playCount.toLocaleString()}회
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}