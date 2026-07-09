// web/src/app/(main)/tichu/detail/[id]/page.tsx

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import TichuMatchDangerActions from "@/components/tichu/TichuMatchDangerActions";
import TichuRoundLogCards from "@/components/tichu/TichuRoundLogCards";
import { TICHU_GAME_KEY } from "@/features/games/tichu/constants";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";
import { getCurrentUserWithAdmin } from "@/lib/admin";
import { db } from "@/lib/prisma";

type TichuDetailPageProps = {
    params: Promise<{
        id: string;
    }>;
};

type TichuTeamKey = "TEAM_A" | "TEAM_B";

type TichuCallLog = {
    player_key?: string;
    result?: "SUCCESS" | "FAIL" | string;
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
    status?: "PLAYING" | "FINISHED" | "DELETED" | string;
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

function getPlayerName(details: TichuDetails, playerKey: string | undefined) {
    if (!playerKey) {
        return "알 수 없음";
    }

    return details.players?.[playerKey]?.name ?? playerKey;
}

function getPlayerTeamName(
    playerTeamKey: TichuTeamKey | undefined,
    teamAName: string,
    teamBName: string,
) {
    if (playerTeamKey === "TEAM_A") {
        return teamAName;
    }

    if (playerTeamKey === "TEAM_B") {
        return teamBName;
    }

    return "소속 팀 없음";
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
    const baseClassName = "rounded-3xl border p-5 shadow-sm";

    if (teamKey === winnerTeamKey) {
        return `${baseClassName} border-blue-500/30 bg-blue-500/10`;
    }

    return `${baseClassName} border-foreground/10 bg-background`;
}

export default async function TichuDetailPage({
                                                  params,
                                              }: TichuDetailPageProps) {
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

    const teamAName = getTeamName(details, "TEAM_A");
    const teamBName = getTeamName(details, "TEAM_B");
    const teamAScore = getTeamScore(details, "TEAM_A");
    const teamBScore = getTeamScore(details, "TEAM_B");
    const winnerTeamKey = getWinnerTeamKey(details, teamAScore, teamBScore);

    const winnerTeamName = winnerTeamKey
        ? getTeamName(details, winnerTeamKey)
        : "승리 팀 없음";

    const logs = getLogs(details);
    const callStats = getCallStats(logs);
    const players = getPlayers(details);
    const finishedAt = formatFinishedAt(details.finished_at);

    const currentUser = await getCurrentUserWithAdmin();
    const canManage = Boolean(
        currentUser?.isAdmin || currentUser?.id === match.created_by,
    );
    const canUndo = logs.length > 0;

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div>
                <Link
                    href="/tichu/matches"
                    className="mb-4 inline-flex text-sm font-semibold text-foreground/60 transition hover:text-foreground"
                >
                    ← 게임 기록으로
                </Link>

                <div className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-6 shadow-sm">
                    <p className="text-sm font-black text-blue-500">Tichu</p>

                    <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-3xl font-black tracking-tight">
                                티츄 게임 결과
                            </h2>
                            <p className="mt-2 text-sm text-foreground/60">
                                {logs.length.toLocaleString()}라운드 진행 · 목표{" "}
                                {details.target_score ?? 1000}점
                                {finishedAt ? ` · ${finishedAt} 종료` : ""}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-left sm:text-right">
                            <p className="text-xs font-black text-blue-500">승리 팀</p>
                            <p className="mt-1 text-xl font-black">{winnerTeamName}</p>
                        </div>
                    </div>
                </div>
            </div>

            <TichuMatchDangerActions matchId={matchId}
                canManage={canManage}
                canUndo={canUndo}
                redirectAfterDelete="/tichu/matches"
            />

            <section className="grid gap-4 sm:grid-cols-2">
                <div className={getTeamCardClassName("TEAM_A", winnerTeamKey)}>
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-foreground/50">{teamAName}</p>

                        {winnerTeamKey === "TEAM_A" ? (
                            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-500">
                                WIN
                            </span>
                        ) : null}
                    </div>

                    <p className="mt-2 text-4xl font-black">
                        {teamAScore.toLocaleString()}
                    </p>
                </div>

                <div className={getTeamCardClassName("TEAM_B", winnerTeamKey)}>
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-foreground/50">{teamBName}</p>

                        {winnerTeamKey === "TEAM_B" ? (
                            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-500">
                                WIN
                            </span>
                        ) : null}
                    </div>

                    <p className="mt-2 text-4xl font-black">
                        {teamBScore.toLocaleString()}
                    </p>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-3xl border border-foreground/10 bg-background p-5 shadow-sm">
                    <p className="text-xs font-black text-foreground/45">라운드</p>
                    <p className="mt-2 text-2xl font-black">
                        {logs.length.toLocaleString()}
                    </p>
                </div>

                <div className="rounded-3xl border border-foreground/10 bg-background p-5 shadow-sm">
                    <p className="text-xs font-black text-foreground/45">원투</p>
                    <p className="mt-2 text-2xl font-black">
                        {callStats.oneTwoCount.toLocaleString()}회
                    </p>
                </div>

                <div className="rounded-3xl border border-foreground/10 bg-background p-5 shadow-sm">
                    <p className="text-xs font-black text-foreground/45">스몰 티츄</p>
                    <p className="mt-2 text-2xl font-black">
                        {callStats.smallSuccess.toLocaleString()}/
                        {callStats.smallCalled.toLocaleString()}
                    </p>
                </div>

                <div className="rounded-3xl border border-foreground/10 bg-background p-5 shadow-sm">
                    <p className="text-xs font-black text-foreground/45">라지 티츄</p>
                    <p className="mt-2 text-2xl font-black">
                        {callStats.largeSuccess.toLocaleString()}/
                        {callStats.largeCalled.toLocaleString()}
                    </p>
                </div>
            </section>

            <section className="rounded-3xl border border-foreground/10 bg-background p-5 shadow-sm">
                <h3 className="text-lg font-black">참가자</h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {players.map(([playerKey, player]) => {
                        const teamName = getPlayerTeamName(
                            player.team_key,
                            teamAName,
                            teamBName,
                        );

                        return (
                            <div key={playerKey} className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
                                <p className="text-xs font-bold text-foreground/40">
                                    {teamName}
                                </p>
                                <p className="mt-1 text-lg font-black">
                                    {getPlayerName(details, playerKey)}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>

            <TichuRoundLogCards details={details} />
        </div>
    );
}