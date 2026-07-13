// web/src/app/(main)/tichu/matches/page.tsx

import Link from "next/link";

import { auth } from "@/auth";
import UserAvatar from "@/components/common/UserAvatar";
import { TICHU_GAME_KEY } from "@/features/games/tichu/constants";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";
import { getAvatarImageUrl } from "@/lib/avatar";
import TichuNicknameWithBadges from "@/components/tichu/TichuNicknameWithBadges";
import { getTichuEquippedBadgesByUserIds } from "@/app/actions/tichu-achievement.action";
import { db } from "@/lib/prisma";

type TichuMatchesPageProps = {
    searchParams: Promise<{
        status?: string;
        keyword?: string;
        only_mine?: string;
    }>;
};

type TichuTeamKey = "TEAM_A" | "TEAM_B";

type TichuDetails = {
    status?: string;
    current_round?: number;
    target_score?: number;
    winner_team_key?: TichuTeamKey | null;
    finished_at?: string | null;
    logs?: unknown[];
    teams?: {
        TEAM_A?: {
            name?: string;
            score?: number;
            player_keys?: string[];
        };
        TEAM_B?: {
            name?: string;
            score?: number;
            player_keys?: string[];
        };
    };
    players?: Record<
        string,
        {
            name?: string;
            team_key?: TichuTeamKey;
            seat_order?: number;
        }
    >;
};

type TichuMatchStatus = "ALL" | "PLAYING" | "FINISHED";

const STATUS_OPTIONS = [
    { value: "ALL", label: "전체" },
    { value: "PLAYING", label: "진행 중" },
    { value: "FINISHED", label: "종료" },
] as const;

const STATUS_LABEL: Record<string, string> = {
    PLAYING: "진행 중",
    FINISHED: "종료",
};

const TEAM_LABEL: Record<TichuTeamKey, string> = {
    TEAM_A: "A팀",
    TEAM_B: "B팀",
};

function formatDate(value: Date | string | null | undefined) {
    if (!value) {
        return "-";
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function getStatusClassName(status: string) {
    if (status === "PLAYING") {
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }

    return "bg-foreground/10 text-foreground/70 border-foreground/10";
}

function getTichuStatus(details: TichuDetails) {
    if (details.status === "FINISHED") {
        return "FINISHED";
    }

    if (details.status === "DELETED") {
        return "DELETED";
    }

    return "PLAYING";
}

function getTeamName(details: TichuDetails, teamKey: TichuTeamKey) {
    return details.teams?.[teamKey]?.name ?? TEAM_LABEL[teamKey];
}

function getTeamScore(details: TichuDetails, teamKey: TichuTeamKey) {
    return details.teams?.[teamKey]?.score ?? 0;
}

function getWinnerTeamKey(details: TichuDetails) {
    if (
        details.winner_team_key === "TEAM_A" ||
        details.winner_team_key === "TEAM_B"
    ) {
        return details.winner_team_key;
    }

    const teamAScore = getTeamScore(details, "TEAM_A");
    const teamBScore = getTeamScore(details, "TEAM_B");

    if (teamAScore === teamBScore) {
        return null;
    }

    return teamAScore > teamBScore ? "TEAM_A" : "TEAM_B";
}

function getRoundCount(details: TichuDetails) {
    if (Array.isArray(details.logs)) {
        return details.logs.length;
    }

    return 0;
}

function getMatchHref(matchId: number, status: string) {
    return status === "PLAYING"
        ? `/tichu/play/${matchId}`
        : `/tichu/detail/${matchId}`;
}

function normalizeKeyword(value: string) {
    return value.trim().toLowerCase();
}

function getPlayerEntries(details: TichuDetails) {
    return Object.entries(details.players ?? {}).sort(([, a], [, b]) => {
        return (a.seat_order ?? 0) - (b.seat_order ?? 0);
    });
}

function getPlayerNamesText(details: TichuDetails) {
    return getPlayerEntries(details)
        .map(([, player]) => player.name ?? "")
        .filter(Boolean)
        .join(" ");
}

function matchesKeyword(details: TichuDetails, keyword: string, matchId: number) {
    const normalizedKeyword = normalizeKeyword(keyword);

    if (!normalizedKeyword) {
        return true;
    }

    const searchableText = [
        String(matchId),
        getTeamName(details, "TEAM_A"),
        getTeamName(details, "TEAM_B"),
        getPlayerNamesText(details),
        String(details.current_round ?? ""),
        String(details.target_score ?? ""),
    ]
        .join(" ")
        .toLowerCase();

    return searchableText.includes(normalizedKeyword);
}

function getPlayerTeamLabel(
    details: TichuDetails,
    playerName: string,
    fallbackIndex: number,
) {
    const detailPlayer = Object.values(details.players ?? {}).find((player) => {
        return player.name === playerName;
    });

    if (detailPlayer?.team_key) {
        return getTeamName(details, detailPlayer.team_key);
    }

    return fallbackIndex % 2 === 0
        ? getTeamName(details, "TEAM_A")
        : getTeamName(details, "TEAM_B");
}

export default async function TichuMatchesPage({
                                                   searchParams,
                                               }: Readonly<TichuMatchesPageProps>) {
    assertGameEnabled(TICHU_GAME_KEY);

    const resolvedSearchParams = await searchParams;

    const status: TichuMatchStatus =
        resolvedSearchParams.status === "PLAYING" ||
        resolvedSearchParams.status === "FINISHED"
            ? resolvedSearchParams.status
            : "ALL";

    const keyword = resolvedSearchParams.keyword ?? "";
    const onlyMine = resolvedSearchParams.only_mine === "on";
    const formKey = `${status}-${keyword}-${onlyMine}`;

    const session = await auth();
    const providerId = session?.user?.id as string | undefined;

    const [game, me] = await Promise.all([
        db.games.findUnique({
            where: {
                key: TICHU_GAME_KEY,
            },
            select: {
                id: true,
            },
        }),
        providerId
            ? db.users.findFirst({
                where: {
                    provider_id: providerId,
                },
                select: {
                    id: true,
                },
            })
            : Promise.resolve(null),
    ]);

    const rawMatches = game
        ? onlyMine && !me
            ? []
            : await db.matches.findMany({
                where: {
                    game_id: game.id,
                    deleted_at: null,
                    ...(onlyMine && me
                        ? {
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
                        }
                        : {}),
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
                orderBy: {
                    play_date: "desc",
                },
                take: 100,
            })
        : [];

    const matches = rawMatches
        .map((match) => {
            const details = (match.match_details?.details ?? {}) as TichuDetails;
            const matchStatus = getTichuStatus(details);

            return {
                ...match,
                details,
                matchStatus,
            };
        })
        .filter((match) => {
            if (match.matchStatus === "DELETED") {
                return false;
            }

            if (status !== "ALL" && match.matchStatus !== status) {
                return false;
            }

            return matchesKeyword(match.details, keyword, match.id);
        });

    const badgeUserIds = [
        ...new Set(
            matches.flatMap((match) =>
                match.match_players
                    .map((player) => player.users?.id)
                    .filter((userId): userId is string => Boolean(userId)),
            ),
        ),
    ];

    const equippedBadgesByUserId = await getTichuEquippedBadgesByUserIds(
        badgeUserIds,
    );

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
            <header className="space-y-2">
                <Link
                    href="/tichu"
                    className="text-sm font-bold text-foreground/60 hover:text-foreground"
                >
                    ← 티츄 대시보드
                </Link>

                <div>
                    <h2 className="mb-2 text-3xl font-black">게임 기록</h2>
                    <p className="font-semibold text-foreground/60">
                        전체 티츄 게임 기록을 확인하고 조건별로 필터링합니다.
                    </p>
                </div>
            </header>

            <form
                key={formKey}
                className="space-y-3 rounded-2xl border border-foreground/10 bg-foreground/5 p-4"
            >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                        <span className="text-xs font-bold text-foreground/60">상태</span>
                        <select
                            name="status"
                            defaultValue={status}
                            className="w-full rounded-xl border border-foreground/10 bg-background px-3 py-2 text-sm font-semibold"
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-1">
            <span className="text-xs font-bold text-foreground/60">
              검색어
            </span>
                        <input
                            name="keyword"
                            defaultValue={keyword}
                            placeholder="게임 ID / 팀 이름 / 참가자명"
                            className="w-full rounded-xl border border-foreground/10 bg-background px-3 py-2 text-sm font-semibold"
                        />
                    </label>
                </div>

                <label className="flex items-center gap-2 text-sm font-bold text-foreground/70">
                    <input
                        type="checkbox"
                        name="only_mine"
                        defaultChecked={onlyMine}
                        className="size-4 accent-foreground"
                    />
                    내 기록만 보기
                </label>

                <div className="flex justify-end gap-2">
                    <Link
                        href="/tichu/matches"
                        className="rounded-xl border border-foreground/10 px-4 py-2 text-sm font-bold transition hover:bg-foreground/10"
                    >
                        초기화
                    </Link>

                    <button
                        type="submit"
                        className="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background transition hover:opacity-90"
                    >
                        필터 적용
                    </button>
                </div>
            </form>

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black">게임 리스트</h3>

                    <span className="text-sm font-bold text-foreground/50">
            {matches.length}건
          </span>
                </div>

                {!game ? (
                    <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-6 text-center text-sm font-bold text-foreground/50">
                        티츄 게임 정보를 찾을 수 없습니다.
                    </div>
                ) : matches.length === 0 ? (
                    <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-6 text-center text-sm font-bold text-foreground/50">
                        조회된 티츄 게임 기록이 없습니다.
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {matches.map((match) => {
                            const details = match.details;
                            const matchStatus = match.matchStatus;
                            const href = getMatchHref(match.id, matchStatus);

                            const teamAName = getTeamName(details, "TEAM_A");
                            const teamBName = getTeamName(details, "TEAM_B");
                            const teamAScore = getTeamScore(details, "TEAM_A");
                            const teamBScore = getTeamScore(details, "TEAM_B");

                            const winnerTeamKey =
                                matchStatus === "FINISHED" ? getWinnerTeamKey(details) : null;
                            const roundCount = getRoundCount(details);

                            const players = match.match_players.map((player, index) => {
                                const nickname =
                                    player.users?.nickname ?? player.guest_name ?? "게스트";

                                return {
                                    key: player.users?.id ?? player.guest_name ?? `${index}`,
                                    userId: player.users?.id ?? null,
                                    nickname,
                                    teamName: getPlayerTeamLabel(details, nickname, index),
                                    avatarEmoji: player.users?.avatar_emoji ?? null,
                                    avatarImageUrl: getAvatarImageUrl(
                                        player.users?.avatar_image_key ?? null,
                                        player.users?.avatar_image_updated_at ?? null,
                                    ),
                                };
                            });

                            return (
                                <li key={match.id}>
                                    <Link
                                        href={href}
                                        className="block rounded-2xl border border-foreground/10 bg-foreground/5 p-4 transition hover:border-foreground/30 hover:bg-foreground/10"
                                    >
                                        <div className="mb-4 flex items-start justify-between gap-3">
                                            <div>
                                                <div className="mb-1 flex items-center gap-2">
                                                    <span className="font-black">#{match.id}</span>

                                                    <span
                                                        className={`rounded-full border px-2 py-1 text-xs font-black ${getStatusClassName(
                                                            matchStatus,
                                                        )}`}
                                                    >
                            {STATUS_LABEL[matchStatus] ?? matchStatus}
                          </span>

                                                    {winnerTeamKey ? (
                                                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-xs font-black text-blue-500">
                              {getTeamName(details, winnerTeamKey)} 승리
                            </span>
                                                    ) : null}
                                                </div>

                                                <p className="text-sm font-semibold text-foreground/60">
                                                    {formatDate(match.play_date)}
                                                </p>
                                            </div>

                                            <div className="text-right text-sm font-bold text-foreground/60">
                                                <div>
                                                    {teamAName} vs {teamBName}
                                                </div>
                                                <div>
                                                    {matchStatus === "PLAYING"
                                                        ? `${details.current_round ?? 1}라운드 진행 중`
                                                        : `${roundCount}라운드 종료`}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-3 grid grid-cols-2 gap-2">
                                            <div
                                                className={`rounded-xl border p-3 ${
                                                    winnerTeamKey === "TEAM_A"
                                                        ? "border-blue-500/20 bg-blue-500/10"
                                                        : "border-foreground/5 bg-background/60"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-sm font-bold">
                            {teamAName}
                          </span>

                                                    {winnerTeamKey === "TEAM_A" ? (
                                                        <span className="shrink-0 text-xs font-black text-blue-500">
                              WIN
                            </span>
                                                    ) : null}
                                                </div>

                                                <div className="mt-1 font-black">
                                                    {teamAScore.toLocaleString()}점
                                                </div>
                                            </div>

                                            <div
                                                className={`rounded-xl border p-3 ${
                                                    winnerTeamKey === "TEAM_B"
                                                        ? "border-blue-500/20 bg-blue-500/10"
                                                        : "border-foreground/5 bg-background/60"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-sm font-bold">
                            {teamBName}
                          </span>

                                                    {winnerTeamKey === "TEAM_B" ? (
                                                        <span className="shrink-0 text-xs font-black text-blue-500">
                              WIN
                            </span>
                                                    ) : null}
                                                </div>

                                                <div className="mt-1 font-black">
                                                    {teamBScore.toLocaleString()}점
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            {players.map((player) => (
                                                <div
                                                    key={player.key}
                                                    className="rounded-xl border border-foreground/5 bg-background/60 p-3"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 font-bold text-sm">
                              <span className="flex min-w-0 items-center gap-1.5 align-middle">
                                <UserAvatar
                                    imageUrl={player.avatarImageUrl}
                                    emoji={player.avatarEmoji}
                                    name={player.nickname}
                                    size="sm"
                                    className="h-5 w-5 text-xs"
                                />

                                  {player.userId ? (
                                      <TichuNicknameWithBadges
                                          nickname={player.nickname}
                                          badges={equippedBadgesByUserId[player.userId] ?? []}
                                          className="min-w-0"
                                      />
                                  ) : (
                                      <span className="min-w-0 truncate">{player.nickname}</span>
                                  )}
                              </span>
                            </span>

                                                        <span className="shrink-0 text-xs font-black text-foreground/50">
                              {player.teamName}
                            </span>
                                                    </div>
                                                </div>
                                            ))}
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