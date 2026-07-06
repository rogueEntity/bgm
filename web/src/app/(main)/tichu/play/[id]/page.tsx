// web/src/app/(main)/tichu/play/[id]/page.tsx

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/prisma";
import { TICHU_GAME_KEY } from "@/features/games/tichu/constants";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";

type TichuPlayPageProps = {
    params: Promise<{
        id: string;
    }>;
};

type TichuTeamKey = "TEAM_A" | "TEAM_B";

type TichuDetails = {
    status?: "PLAYING" | "FINISHED" | "DELETED" | string;
    current_round?: number;
    target_score?: number;
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

export default async function TichuPlayPage({ params }: TichuPlayPageProps) {
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

    if (details.status === "FINISHED") {
        redirect(`/tichu/detail/${matchId}`);
    }

    const teamAName = details.teams?.TEAM_A?.name ?? "A팀";
    const teamBName = details.teams?.TEAM_B?.name ?? "B팀";
    const teamAScore = details.teams?.TEAM_A?.score ?? 0;
    const teamBScore = details.teams?.TEAM_B?.score ?? 0;

    const players = Object.entries(details.players ?? {}).sort(([, a], [, b]) => {
        return (a.seat_order ?? 0) - (b.seat_order ?? 0);
    });

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div>
                <Link
                    href="/tichu"
                    className="mb-4 inline-flex text-sm font-semibold text-foreground/60 transition hover:text-foreground"
                >
                    ← 티츄 대시보드로
                </Link>

                <div className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-6 shadow-sm">
                    <p className="text-sm font-black text-blue-500">Tichu</p>
                    <h2 className="mt-1 text-3xl font-black tracking-tight">
                        티츄 게임 기록
                    </h2>
                    <p className="mt-2 text-sm text-foreground/60">
                        {details.current_round ?? 1}라운드 · 목표{" "}
                        {details.target_score ?? 1000}점
                    </p>
                </div>
            </div>

            <section className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-foreground/10 bg-background p-5 shadow-sm">
                    <p className="text-sm font-bold text-foreground/50">{teamAName}</p>
                    <p className="mt-2 text-4xl font-black">
                        {teamAScore.toLocaleString()}
                    </p>
                </div>

                <div className="rounded-3xl border border-foreground/10 bg-background p-5 shadow-sm">
                    <p className="text-sm font-bold text-foreground/50">{teamBName}</p>
                    <p className="mt-2 text-4xl font-black">
                        {teamBScore.toLocaleString()}
                    </p>
                </div>
            </section>

            <section className="rounded-3xl border border-foreground/10 bg-background p-5 shadow-sm">
                <h3 className="text-lg font-black">참가자</h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {players.map(([playerKey, player]) => {
                        const teamName =
                            player.team_key === "TEAM_A" ? teamAName : teamBName;

                        return (
                            <div
                                key={playerKey}
                                className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"
                            >
                                <p className="text-xs font-bold text-foreground/40">
                                    {teamName}
                                </p>
                                <p className="mt-1 text-lg font-black">
                                    {player.name ?? "이름 없음"}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="rounded-3xl border border-dashed border-foreground/15 bg-foreground/[0.02] p-6 text-center">
                <p className="font-black">라운드 기록 입력 UI는 다음 단계에서 추가</p>
                <p className="mt-2 text-sm text-foreground/50">
                    지금은 생성된 티츄 게임의 기본 정보가 정상 저장되는지만 확인하는
                    임시 화면입니다.
                </p>
            </section>
        </div>
    );
}