// web/src/app/(main)/tichu/detail/[id]/page.tsx

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import TichuMatchDangerActions from "@/components/tichu/TichuMatchDangerActions";
import TichuRoundLogCards from "@/components/tichu/TichuRoundLogCards";
import { TICHU_GAME_KEY } from "@/features/games/tichu/constants";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";
import { getCurrentUserWithAdmin } from "@/lib/admin";
import TichuNicknameWithBadges from "@/components/tichu/TichuNicknameWithBadges";
import { getTichuEquippedBadgesByUserIds } from "@/app/actions/tichu-achievement.action";
import { db } from "@/lib/prisma";

type TichuDetailPageProps = {
    params: Promise<{
        id: string;
    }>;
};

type TichuTeamKey = "TEAM_A" | "TEAM_B";

type TichuCallLog = {
    player_key?: string;
    result?: string;
    score_delta?: number;
};

type TichuRoundLog = {
    round?: number;
    first_out_player_key?: string;
    team_a_card_score?: number | null;
    team_b_card_score?: number | null;
    one_two_team_key?: TichuTeamKey | null;
    small_tichu_calls?: TichuCallLog[];
    large_tichu_calls?: TichuCallLog[];
    score_deltas?: Partial<Record<TichuTeamKey, number>>;
    total_scores?: Partial<Record<TichuTeamKey, number>>;
    created_at?: string;
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getUserIdFromTichuPlayerKey(playerKey: string) {
    if (!playerKey.startsWith("user_")) {
        return null;
    }

    return playerKey.slice("user_".length);
}

function getRoundLog(value: unknown): TichuRoundLog | null {
    if (!isRecord(value)) {
        return null;
    }

    return value;
}

function getTeamName(details: TichuDetails, teamKey: TichuTeamKey) {
    return details.teams?.[teamKey]?.name ?? (teamKey === "TEAM_A" ? "A팀" : "B팀");
}

function getTeamScore(details: TichuDetails, teamKey: TichuTeamKey) {
    return details.teams?.[teamKey]?.score ?? 0;
}

function formatFinishedAt(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function getLogs(details: TichuDetails) {
    return (details.logs ?? [])
        .map(getRoundLog)
        .filter((log): log is TichuRoundLog => log !== null);
}

function getCallStats(logs: TichuRoundLog[]) {
    return logs.reduce(
        (acc, log) => {
            const smallCalls = log.small_tichu_calls ?? [];
            const largeCalls = log.large_tichu_calls ?? [];

            smallCalls.forEach((call) => {
                acc.smallCalled += 1;

                if (call.result === "SUCCESS") {
                    acc.smallSuccess += 1;
                }
            });

            largeCalls.forEach((call) => {
                acc.largeCalled += 1;

                if (call.result === "SUCCESS") {
                    acc.largeSuccess += 1;
                }
            });

            if (log.one_two_team_key) {
                acc.oneTwoCount += 1;
            }

            return acc;
        },
        {
            smallCalled: 0,
            smallSuccess: 0,
            largeCalled: 0,
            largeSuccess: 0,
            oneTwoCount: 0,
        },
    );
}

function getPlayers(details: TichuDetails) {
    return Object.entries(details.players ?? {}).sort(([, a], [, b]) => {
        return (a.seat_order ?? 0) - (b.seat_order ?? 0);
    });
}

function getWinnerTeamKey(
    details: TichuDetails,
    teamAScore: number,
    teamBScore: number,
): TichuTeamKey | null {
    if (details.winner_team_key === "TEAM_A") {
        return "TEAM_A";
    }

    if (details.winner_team_key === "TEAM_B") {
        return "TEAM_B";
    }

    if (teamAScore === teamBScore) {
        return null;
    }

    if (teamAScore > teamBScore) {
        return "TEAM_A";
    }

    return "TEAM_B";
}

function getTeamCardClassName(
    teamKey: TichuTeamKey,
    winnerTeamKey: TichuTeamKey | null,
) {
    const baseClassName = "min-w-0 rounded-3xl border px-3 py-2 shadow-sm sm:px-4 sm:py-3";

    if (teamKey === winnerTeamKey) {
        return `${baseClassName} border-blue-500/30 bg-blue-500/10`;
    }

    return `${baseClassName} border-foreground/10 bg-background`;
}

function TichuScoreTrendChart({
    logs,
    teamAName,
    teamBName,
}: Readonly<{
    logs: TichuRoundLog[];
    teamAName: string;
    teamBName: string;
}>) {
    const sortedLogs = [...logs].sort((a, b) => (a.round ?? 0) - (b.round ?? 0));
    const snapshots = sortedLogs.reduce(
        (currentSnapshots, log) => {
            const previous = currentSnapshots[currentSnapshots.length - 1];

            return [...currentSnapshots, {
                label: `${log.round ?? "-"}라운드`,
                teamAScore: log.total_scores?.TEAM_A ?? previous.teamAScore + (log.score_deltas?.TEAM_A ?? 0),
                teamBScore: log.total_scores?.TEAM_B ?? previous.teamBScore + (log.score_deltas?.TEAM_B ?? 0),
            }];
        },
        [{ label: "시작", teamAScore: 0, teamBScore: 0 }],
    );

    if (sortedLogs.length === 0) {
        return (
            <section className="shrink-0 rounded-3xl border border-foreground/10 bg-background p-3 shadow-sm">
                <h3 className="text-sm font-black">팀별 점수 그래프</h3>
                <p className="mt-2 text-xs text-foreground/50">점수 변동 기록이 없습니다.</p>
            </section>
        );
    }

    const scores = snapshots.flatMap(({ teamAScore: a, teamBScore: b }) => [a, b]);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const scorePadding = Math.max(50, Math.ceil((maxScore - minScore) / 10 / 50) * 50);
    const chartMin = Math.floor((minScore - scorePadding) / 50) * 50;
    const chartMax = Math.ceil((maxScore + scorePadding) / 50) * 50;
    const width = Math.max(360, 80 + (snapshots.length - 1) * 40);
    const height = 75;
    const padding = { top: 8, right: 12, bottom: 18, left: 45 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const getX = (index: number) => padding.left + (index / (snapshots.length - 1)) * plotWidth;
    const getY = (score: number) => padding.top + ((chartMax - score) / (chartMax - chartMin)) * plotHeight;
    const teams = [
        { name: teamAName, color: "#2563eb", scoreKey: "teamAScore" },
        { name: teamBName, color: "#ef4444", scoreKey: "teamBScore" },
    ] as const;

    return (
        <section className="shrink-0 rounded-3xl border border-foreground/10 bg-background p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <h3 className="text-sm font-black">팀별 점수 그래프</h3>
                {teams.map((team) => (
                    <span key={team.scoreKey} className="flex items-center gap-1 text-xs font-bold">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
                        {team.name}
                    </span>
                ))}
            </div>
            <div className="mt-1 overflow-x-auto">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="mx-auto h-auto w-full max-w-[480px]"
                    style={{ minWidth: width }}
                    role="img"
                    aria-label="라운드별 팀 점수 변화 그래프"
                >
                    {[chartMax, (chartMax + chartMin) / 2, chartMin].map((tick) => {
                        const y = getY(tick);

                        return (
                            <g key={tick}>
                                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" strokeOpacity={0.1} />
                                <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.55}>
                                    {Math.round(tick).toLocaleString()}
                                </text>
                            </g>
                        );
                    })}
                    {teams.map((team) => (
                        <g key={team.scoreKey}>
                            <polyline
                                fill="none"
                                stroke={team.color}
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={snapshots.map((snapshot, index) => `${getX(index)},${getY(snapshot[team.scoreKey])}`).join(" ")}
                            />
                            {snapshots.map((snapshot, index) => (
                                <circle key={index} cx={getX(index)} cy={getY(snapshot[team.scoreKey])} r={3} fill={team.color}>
                                    <title>{`${team.name} · ${snapshot.label} · ${snapshot[team.scoreKey].toLocaleString()}점`}</title>
                                </circle>
                            ))}
                        </g>
                    ))}
                    <text x={padding.left} y={height - 7} fontSize={9} fill="currentColor" opacity={0.55}>시작</text>
                    <text x={width - padding.right} y={height - 7} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.55}>
                        {snapshots[snapshots.length - 1].label}
                    </text>
                </svg>
            </div>
        </section>
    );
}

export default async function TichuDetailPage({
    params,
}: Readonly<TichuDetailPageProps>) {
    assertGameEnabled(TICHU_GAME_KEY);

    const resolvedParams = await params;
    const matchId = Number.parseInt(resolvedParams.id, 10);

    if (Number.isNaN(matchId)) {
        return notFound();
    }

    const match = await db.matches.findUnique({
        where: {
            id: matchId,
        },
        include: {
            games: true,
            match_details: true,
        },
    });

    if (!match?.match_details) {
        return notFound();
    }

    if (match.deleted_at) {
        return notFound();
    }

    if (match.games.key !== TICHU_GAME_KEY) {
        return notFound();
    }

    const details = match.match_details.details as TichuDetails;

    if (details.status === "DELETED") {
        return notFound();
    }

    if (details.status === "PLAYING") {
        redirect(`/tichu/play/${matchId}`);
    }

    const teamAScore = getTeamScore(details, "TEAM_A");
    const teamBScore = getTeamScore(details, "TEAM_B");
    const winnerTeamKey = getWinnerTeamKey(details, teamAScore, teamBScore);

    const winnerTeamName = winnerTeamKey
        ? getTeamName(details, winnerTeamKey)
        : "승리 팀 없음";

    const logs = getLogs(details);
    const callStats = getCallStats(logs);
    const players = getPlayers(details);
    const badgeUserIds = players
        .map(([playerKey]) => getUserIdFromTichuPlayerKey(playerKey))
        .filter((userId): userId is string => Boolean(userId));
    const equippedBadgesByUserId = await getTichuEquippedBadgesByUserIds(
        badgeUserIds,
    );
    const finishedAt = formatFinishedAt(details.finished_at);

    const currentUser = await getCurrentUserWithAdmin();
    const canManage = Boolean(
        currentUser?.isAdmin || currentUser?.id === match.created_by,
    );
    const canUndo = logs.length > 0;

    return (
        <div className="flex h-[calc(100dvh-9rem)] min-h-[44rem] w-full min-w-0 flex-col gap-3 md:h-[calc(100dvh-5rem)]">
            <header className="shrink-0 rounded-3xl border border-foreground/10 bg-foreground/[0.03] px-3 py-3 shadow-sm sm:px-6">
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <div className="flex items-center gap-3">
                            <p className="text-sm font-black text-blue-500">Tichu</p>
                            <Link
                                href="/tichu/matches"
                                className="text-xs font-semibold text-foreground/50 transition hover:text-foreground"
                            >
                                ← 게임 기록으로
                            </Link>
                        </div>
                        <div className="mt-1 flex items-center gap-1 whitespace-nowrap sm:gap-3">
                            <h2 className="text-lg leading-tight font-black tracking-tight sm:text-3xl">
                                티츄 게임 결과
                            </h2>
                            <div className="text-xs leading-3 text-foreground/60 sm:text-sm sm:leading-[1.125rem]">
                                <p>{logs.length.toLocaleString()}라운드</p>
                                <p>목표 {details.target_score ?? 1000}점</p>
                            </div>
                        </div>
                        <p className="mt-1 text-xs font-bold text-foreground/50">
                            승리 {winnerTeamName}
                            {finishedAt ? ` · ${finishedAt} 종료` : ""}
                        </p>
                    </div>
                    <TichuMatchDangerActions
                        matchId={matchId}
                        canManage={canManage}
                        canUndo={canUndo}
                        redirectAfterDelete="/tichu/matches"
                        undoLabel="기록 되돌리기"
                        vertical
                    />
                </div>
            </header>

            <section className="grid shrink-0 grid-cols-2 gap-3 sm:gap-4">
                {(["TEAM_A", "TEAM_B"] as const).map((teamKey) => {
                    const teamName = getTeamName(details, teamKey);
                    const teamScore = getTeamScore(details, teamKey);

                    return (
                        <div key={teamKey} className={getTeamCardClassName(teamKey, winnerTeamKey)}>
                            <div className="flex items-baseline justify-between gap-2 text-lg sm:text-xl">
                                <p className="min-w-0 truncate font-bold text-foreground/50" title={teamName}>
                                    {teamName}
                                </p>
                                <p className="shrink-0 font-black">{teamScore.toLocaleString()}</p>
                            </div>
                            <div className="mt-2 space-y-0.5 border-t border-foreground/10 pt-2">
                                {players
                                    .filter(([, player]) => player.team_key === teamKey)
                                    .map(([playerKey, player]) => {
                                        const userId = getUserIdFromTichuPlayerKey(playerKey);

                                        return (
                                            <div key={playerKey} className="min-w-0 text-xs font-bold sm:text-sm">
                                                {userId ? (
                                                    <TichuNicknameWithBadges
                                                        nickname={player.name ?? "이름 없음"}
                                                        badges={equippedBadgesByUserId[userId] ?? []}
                                                        badgeSize="sm"
                                                        nameClassName="truncate"
                                                    />
                                                ) : (
                                                    <span className="block truncate">
                                                        {player.name ?? "이름 없음"}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    );
                })}
            </section>

            <section className="grid shrink-0 grid-cols-4 gap-1.5 sm:gap-3">
                {[
                    ["라운드", logs.length.toLocaleString()],
                    ["원투", `${callStats.oneTwoCount.toLocaleString()}회`],
                    ["스티", `${callStats.smallSuccess.toLocaleString()}/${callStats.smallCalled.toLocaleString()}`],
                    ["라티", `${callStats.largeSuccess.toLocaleString()}/${callStats.largeCalled.toLocaleString()}`],
                ].map(([label, value]) => (
                    <div key={label} className="min-w-0 rounded-xl border border-foreground/10 bg-background px-2 py-1.5 shadow-sm sm:px-3">
                        <p className="text-[11px] font-bold text-foreground/45">{label}</p>
                        <p className="truncate text-sm font-black" title={value}>{value}</p>
                    </div>
                ))}
            </section>

            <TichuScoreTrendChart
                logs={logs}
                teamAName={getTeamName(details, "TEAM_A")}
                teamBName={getTeamName(details, "TEAM_B")}
            />

            <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-foreground/10 bg-background shadow-sm">
                <h3 className="border-b border-foreground/10 px-4 py-2 text-sm font-black">
                    라운드 기록
                </h3>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
                    <TichuRoundLogCards details={details} compact />
                </div>
            </section>
        </div>
    );
}
