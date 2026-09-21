// web/src/app/(main)/tichu/play/[id]/page.tsx

import { notFound, redirect } from "next/navigation";

import TichuRoundForm from "./TichuRoundForm";

import TichuMatchDangerActions from "@/components/tichu/TichuMatchDangerActions";
import TichuRoundLogCards from "@/components/tichu/TichuRoundLogCards";
import { TICHU_GAME_KEY } from "@/features/games/tichu/constants";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";
import { getCurrentUserWithAdmin } from "@/lib/admin";
import { db } from "@/lib/prisma";
import TichuNicknameWithBadges from "@/components/tichu/TichuNicknameWithBadges";
import { getTichuEquippedBadgesByUserIds } from "@/app/actions/tichu-achievement.action";

type TichuPlayPageProps = {
    params: Promise<{
        id: string;
    }>;
};

type TichuTeamKey = "TEAM_A" | "TEAM_B";

type TichuDetails = {
    status?: string;
    current_round?: number;
    target_score?: number;
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

function getUserIdFromTichuPlayerKey(playerKey: string) {
    if (!playerKey.startsWith("user_")) {
        return null;
    }

    return playerKey.slice("user_".length);
}

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

    const badgeUserIds = players
        .map(([playerKey]) => getUserIdFromTichuPlayerKey(playerKey))
        .filter((userId): userId is string => Boolean(userId));

    const equippedBadgesByUserId = await getTichuEquippedBadgesByUserIds(
        badgeUserIds,
    );

    const currentUser = await getCurrentUserWithAdmin();
    const canManage = Boolean(
        currentUser?.isAdmin || currentUser?.id === match.created_by,
    );
    const canUndo = (details.logs?.length ?? 0) > 0;

    return (
        <div className="mx-auto flex w-full min-w-0 max-w-[900px] flex-col gap-3 md:h-[calc(100dvh-5rem)] md:min-h-[44rem]">
            <div className="shrink-0">
                <div className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] px-3 py-3 shadow-sm lg:px-6">
                    <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-sm font-black text-blue-500">Tichu</p>
                            <div className="mt-1 flex items-center gap-1 whitespace-nowrap lg:gap-3">
                                <h2 className="text-lg leading-tight font-black tracking-tight lg:text-3xl">
                                    티츄 게임 기록
                                </h2>
                                <div className="text-xs leading-3 text-foreground/60 lg:text-sm lg:leading-[1.125rem]">
                                    <p>{details.current_round ?? 1}라운드</p>
                                    <p>목표 {details.target_score ?? 1000}점</p>
                                </div>
                            </div>
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
                </div>
            </div>

            <section className="grid shrink-0 grid-cols-2 gap-3 sm:gap-4">
                {([
                    ["TEAM_A", teamAName, teamAScore],
                    ["TEAM_B", teamBName, teamBScore],
                ] as const).map(([teamKey, teamName, teamScore]) => (
                    <div
                        key={teamKey}
                        className="min-w-0 rounded-3xl border border-foreground/10 bg-background px-3 py-2 shadow-sm sm:px-4 sm:py-3"
                    >
                        <div className="flex items-baseline justify-between gap-2 text-lg sm:text-xl">
                            <p className="min-w-0 truncate font-bold text-foreground/50" title={teamName}>
                                {teamName}
                            </p>
                            <p className="shrink-0 font-black">
                                {teamScore.toLocaleString()}
                            </p>
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
                ))}
            </section>

            <section className="flex h-48 min-h-0 flex-none flex-col rounded-3xl border border-foreground/10 bg-background shadow-sm md:h-auto md:flex-1">
                <h3 className="border-b border-foreground/10 px-4 py-2 text-sm font-black">
                    라운드 기록
                </h3>
                <div id="tichu-round-log-scroll" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
                    <TichuRoundLogCards details={details} compact />
                </div>
            </section>

            {canManage ? (
                <TichuRoundForm
                    matchId={matchId}
                    expectedVersion={match.match_details.version}
                    details={details}
                />
            ) : null}
        </div>
    );
}
