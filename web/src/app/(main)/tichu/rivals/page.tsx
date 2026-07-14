// web/src/app/(main)/tichu/rivals/page.tsx

import type { ReactNode } from "react";
import Link from "next/link";

import {
    getTichuRankingPlayers,
    type TichuPlayerStatsItem,
} from "@/app/actions/tichu-stats.action";
import UserAvatar from "@/components/common/UserAvatar";
import TichuNicknameWithBadges from "@/components/tichu/TichuNicknameWithBadges";
import { TICHU_GAME_KEY } from "@/features/games/tichu/constants";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";

type TichuRivalsPageProps = {
    searchParams: Promise<{
        left?: string;
        right?: string;
    }>;
};

type CompareDirection = "higher" | "lower";

type CompareMetric = {
    key: string;
    label: string;
    leftValue: number | null;
    rightValue: number | null;
    suffix?: string;
    decimals?: number;
    direction: CompareDirection;
};

type CompareWinner = "left" | "right" | "draw" | "none";

function formatNumber(
    value: number | null,
    decimals = 0,
    suffix = "",
): string {
    if (value === null) {
        return "-";
    }

    return `${value.toLocaleString("ko-KR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })}${suffix}`;
}

function getAverageScoreDiff(player: TichuPlayerStatsItem): number | null {
    if (player.playCount <= 0) {
        return null;
    }

    return player.accumulatedScore / player.playCount;
}

function getFirstOutRate(player: TichuPlayerStatsItem): number | null {
    if (player.roundCount <= 0) {
        return null;
    }

    return (player.firstOutCount / player.roundCount) * 100;
}

function getOneTwoRate(player: TichuPlayerStatsItem): number | null {
    if (player.roundCount <= 0) {
        return null;
    }

    return (player.oneTwoSuccessCount / player.roundCount) * 100;
}

function getOneTwoSufferedRate(
    player: TichuPlayerStatsItem,
): number | null {
    if (player.roundCount <= 0) {
        return null;
    }

    return (player.oneTwoSufferedCount / player.roundCount) * 100;
}

function getDeclarationSuccessRate(
    successRate: number,
    callCount: number,
): number | null {
    if (callCount <= 0) {
        return null;
    }

    return successRate * 100;
}

function buildCompareMetrics(
    left: TichuPlayerStatsItem,
    right: TichuPlayerStatsItem,
): CompareMetric[] {
    return [
        {
            key: "mmr",
            label: "MMR",
            leftValue: left.mmr,
            rightValue: right.mmr,
            direction: "higher",
        },
        {
            key: "playCount",
            label: "총 경기 수",
            leftValue: left.playCount,
            rightValue: right.playCount,
            suffix: "경기",
            direction: "higher",
        },
        {
            key: "winRate",
            label: "승률",
            leftValue: left.winRate * 100,
            rightValue: right.winRate * 100,
            suffix: "%",
            decimals: 1,
            direction: "higher",
        },
        {
            key: "accumulatedScore",
            label: "누적 점수 차",
            leftValue: left.accumulatedScore,
            rightValue: right.accumulatedScore,
            suffix: "점",
            direction: "higher",
        },
        {
            key: "averageScoreDiff",
            label: "경기당 평균 점수 차",
            leftValue: getAverageScoreDiff(left),
            rightValue: getAverageScoreDiff(right),
            suffix: "점",
            decimals: 1,
            direction: "higher",
        },
        {
            key: "roundCount",
            label: "총 라운드",
            leftValue: left.roundCount,
            rightValue: right.roundCount,
            suffix: "라운드",
            direction: "higher",
        },
        {
            key: "tichuSuccessRate",
            label: "스몰 티츄 성공률",
            leftValue: getDeclarationSuccessRate(
                left.tichuSuccessRate,
                left.tichuCalls,
            ),
            rightValue: getDeclarationSuccessRate(
                right.tichuSuccessRate,
                right.tichuCalls,
            ),
            suffix: "%",
            decimals: 1,
            direction: "higher",
        },
        {
            key: "grandTichuSuccessRate",
            label: "그랜드 티츄 성공률",
            leftValue: getDeclarationSuccessRate(
                left.grandTichuSuccessRate,
                left.grandTichuCalls,
            ),
            rightValue: getDeclarationSuccessRate(
                right.grandTichuSuccessRate,
                right.grandTichuCalls,
            ),
            suffix: "%",
            decimals: 1,
            direction: "higher",
        },
        {
            key: "firstOutRate",
            label: "첫 아웃 비율",
            leftValue: getFirstOutRate(left),
            rightValue: getFirstOutRate(right),
            suffix: "%",
            decimals: 1,
            direction: "higher",
        },
        {
            key: "oneTwoRate",
            label: "원투 성공 비율",
            leftValue: getOneTwoRate(left),
            rightValue: getOneTwoRate(right),
            suffix: "%",
            decimals: 1,
            direction: "higher",
        },
        {
            key: "oneTwoSufferedRate",
            label: "원투 허용 비율",
            leftValue: getOneTwoSufferedRate(left),
            rightValue: getOneTwoSufferedRate(right),
            suffix: "%",
            decimals: 1,
            direction: "lower",
        },
    ];
}

function getCompareWinner(metric: CompareMetric): CompareWinner {
    const { leftValue, rightValue, direction } = metric;

    if (leftValue === null || rightValue === null) {
        return "none";
    }

    if (leftValue === rightValue) {
        return "draw";
    }

    if (direction === "higher") {
        return leftValue > rightValue ? "left" : "right";
    }

    return leftValue < rightValue ? "left" : "right";
}

function getWinnerLabel(
    winner: CompareWinner,
    leftName: string,
    rightName: string,
): string {
    if (winner === "left") {
        return `${leftName} 우세`;
    }

    if (winner === "right") {
        return `${rightName} 우세`;
    }

    if (winner === "draw") {
        return "동률";
    }

    return "비교 불가";
}

function getWinnerClass(winner: CompareWinner): string {
    if (winner === "left") {
        return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400";
    }

    if (winner === "right") {
        return "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400";
    }

    if (winner === "draw") {
        return "border-foreground/15 bg-foreground/5 text-foreground/70";
    }

    return "border-foreground/10 bg-foreground/[0.03] text-foreground/35";
}

function getRivalSummary(
    leftName: string,
    rightName: string,
    metrics: CompareMetric[],
): string {
    let leftWins = 0;
    let rightWins = 0;
    let drawCount = 0;

    for (const metric of metrics) {
        const winner = getCompareWinner(metric);

        if (winner === "left") {
            leftWins += 1;
        }

        if (winner === "right") {
            rightWins += 1;
        }

        if (winner === "draw") {
            drawCount += 1;
        }
    }

    const comparedCount = leftWins + rightWins + drawCount;

    if (comparedCount === 0) {
        return "아직 비교할 수 있는 기록이 충분하지 않습니다. 경기가 쌓이면 라이벌 구도가 더 선명해집니다.";
    }

    if (leftWins >= rightWins + 4) {
        return `${leftName}이 전반적인 지표에서 꽤 앞서고 있습니다. ${rightName}은 강점 지표를 중심으로 추격하는 구도입니다.`;
    }

    if (rightWins >= leftWins + 4) {
        return `${rightName}이 전반적인 지표에서 꽤 앞서고 있습니다. ${leftName}은 강점 지표를 중심으로 반격을 노려야 합니다.`;
    }

    if (leftWins > rightWins) {
        return `${leftName}이 살짝 앞서지만, ${rightName}도 충분히 따라붙을 수 있는 팽팽한 라이벌 구도입니다.`;
    }

    if (rightWins > leftWins) {
        return `${rightName}이 살짝 앞서지만, ${leftName}도 충분히 뒤집을 수 있는 접전 구도입니다.`;
    }

    return `${leftName}과 ${rightName}의 지표가 거의 비슷합니다. 항목별 강점이 갈리는 진짜 라이벌 구도입니다.`;
}

function StatRow({
                     label,
                     value,
                 }: Readonly<{
    label: string;
    value: ReactNode;
}>) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-foreground/5 py-2.5 last:border-b-0">
            <span className="text-sm text-foreground/55">{label}</span>

            <span className="text-right text-sm font-semibold text-foreground">
        {value}
      </span>
        </div>
    );
}

function PlayerStatsCard({
                             player,
                             side,
                         }: Readonly<{
    player: TichuPlayerStatsItem;
    side: "left" | "right";
}>) {
    const sideClass =
        side === "left"
            ? "border-blue-500/20 bg-blue-500/[0.03]"
            : "border-rose-500/20 bg-rose-500/[0.03]";

    const sideLabel = side === "left" ? "왼쪽 플레이어" : "오른쪽 플레이어";

    return (
        <section
            className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${sideClass}`}
        >
            <div className="mb-5 text-xs font-bold tracking-wide text-foreground/45">
                {sideLabel}
            </div>

            <div className="flex flex-col items-center text-center">
                <UserAvatar
                    name={player.nickname}
                    emoji={player.avatarEmoji}
                    imageUrl={player.avatarImageUrl}
                    size="lg"
                />

                <div className="mt-3">
                    <TichuNicknameWithBadges
                        nickname={player.nickname}
                        badges={player.equippedBadges}
                        className="justify-center text-xl font-bold"
                    />
                </div>

                <div className="mt-2 text-sm text-foreground/50">
                    {player.playCount.toLocaleString("ko-KR")}경기 ·{" "}
                    {player.winCount.toLocaleString("ko-KR")}승{" "}
                    {player.lossCount.toLocaleString("ko-KR")}패
                    {player.drawCount > 0
                        ? ` ${player.drawCount.toLocaleString("ko-KR")}무`
                        : ""}
                </div>

                <div className="mt-4 rounded-2xl border border-foreground/10 bg-background/70 px-5 py-3">
                    <div className="text-xs font-semibold text-foreground/45">
                        TICHU MMR
                    </div>

                    <div className="mt-1 text-2xl font-black">
                        {player.mmr.toLocaleString("ko-KR")}
                    </div>
                </div>

                <Link
                    href={`/tichu/players/${player.userId}`}
                    className="mt-4 text-sm font-semibold text-foreground/55 underline-offset-4 transition hover:text-foreground hover:underline"
                >
                    개인 통계 보기
                </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-foreground/10 bg-background/60 px-4">
                <StatRow
                    label="승률"
                    value={`${(player.winRate * 100).toFixed(1)}%`}
                />

                <StatRow
                    label="누적 점수 차"
                    value={`${player.accumulatedScore.toLocaleString("ko-KR")}점`}
                />

                <StatRow
                    label="경기당 평균"
                    value={
                        player.playCount > 0
                            ? `${(
                                player.accumulatedScore / player.playCount
                            ).toLocaleString("ko-KR", {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                            })}점`
                            : "-"
                    }
                />

                <StatRow
                    label="스몰 티츄"
                    value={`${player.tichuSuccesses.toLocaleString(
                        "ko-KR",
                    )}/${player.tichuCalls.toLocaleString("ko-KR")}`}
                />

                <StatRow
                    label="그랜드 티츄"
                    value={`${player.grandTichuSuccesses.toLocaleString(
                        "ko-KR",
                    )}/${player.grandTichuCalls.toLocaleString("ko-KR")}`}
                />

                <StatRow
                    label="첫 아웃"
                    value={`${player.firstOutCount.toLocaleString("ko-KR")}회`}
                />

                <StatRow
                    label="원투 성공"
                    value={`${player.oneTwoSuccessCount.toLocaleString("ko-KR")}회`}
                />
            </div>
        </section>
    );
}

function ComparePanel({
                          metrics,
                          leftName,
                          rightName,
                      }: Readonly<{
    metrics: CompareMetric[];
    leftName: string;
    rightName: string;
}>) {
    return (
        <section className="rounded-3xl border border-foreground/10 bg-foreground/[0.02] p-4 shadow-sm sm:p-6">
            <div className="mb-5 text-center">
                <div className="text-sm font-semibold text-foreground/45">
                    비교 결과
                </div>

                <h2 className="mt-1 text-2xl font-black">VS</h2>
            </div>

            <div className="space-y-3">
                {metrics.map((metric) => {
                    const winner = getCompareWinner(metric);

                    const leftIsWinner = winner === "left";
                    const rightIsWinner = winner === "right";

                    return (
                        <div
                            key={metric.key}
                            className="rounded-2xl border border-foreground/10 bg-background/70 p-3 sm:p-4"
                        >
                            <div className="mb-3 text-center text-xs font-bold text-foreground/45">
                                {metric.label}
                            </div>

                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                                <div
                                    className={`text-center text-sm font-bold sm:text-base ${
                                        leftIsWinner
                                            ? "text-blue-600 dark:text-blue-400"
                                            : "text-foreground"
                                    }`}
                                >
                                    {formatNumber(
                                        metric.leftValue,
                                        metric.decimals,
                                        metric.suffix,
                                    )}
                                </div>

                                <div
                                    className={`min-w-20 rounded-full border px-2 py-1 text-center text-[10px] font-bold sm:min-w-24 sm:text-xs ${getWinnerClass(
                                        winner,
                                    )}`}
                                >
                                    {getWinnerLabel(winner, leftName, rightName)}
                                </div>

                                <div
                                    className={`text-center text-sm font-bold sm:text-base ${
                                        rightIsWinner
                                            ? "text-rose-600 dark:text-rose-400"
                                            : "text-foreground"
                                    }`}
                                >
                                    {formatNumber(
                                        metric.rightValue,
                                        metric.decimals,
                                        metric.suffix,
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export default async function TichuRivalsPage({
                                                  searchParams,
                                              }: Readonly<TichuRivalsPageProps>) {
    assertGameEnabled(TICHU_GAME_KEY);

    const resolvedSearchParams = await searchParams;
    const players = await getTichuRankingPlayers();

    const leftId = resolvedSearchParams.left ?? players[0]?.userId;

    const rightId =
        resolvedSearchParams.right ??
        players.find((player) => player.userId !== leftId)?.userId;

    const leftPlayer =
        players.find((player) => player.userId === leftId) ?? null;

    const rightPlayer =
        players.find((player) => player.userId === rightId) ?? null;

    const metrics =
        leftPlayer && rightPlayer
            ? buildCompareMetrics(leftPlayer, rightPlayer)
            : [];

    const summary =
        leftPlayer && rightPlayer
            ? getRivalSummary(
                leftPlayer.nickname,
                rightPlayer.nickname,
                metrics,
            )
            : "비교할 플레이어 두 명을 선택해 주세요.";

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
            <div className="mb-6">
                <Link
                    href="/tichu"
                    className="text-sm font-semibold text-foreground/50 transition hover:text-foreground"
                >
                    ← 티츄 대시보드
                </Link>

                <div className="mt-4">
                    <div className="text-sm font-bold text-foreground/45">
                        티츄
                    </div>

                    <h1 className="mt-1 text-3xl font-black tracking-tight">
                        ⚔️ 라이벌 비교
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-foreground/55">
                        두 플레이어의 통계를 나란히 비교하고, 항목별로 누가 더
                        앞서는지 확인합니다.
                    </p>
                </div>
            </div>

            <form
                method="get"
                className="mb-6 rounded-3xl border border-foreground/10 bg-foreground/[0.02] p-4 shadow-sm sm:p-6"
            >
                <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
                    <label className="block">
            <span className="mb-2 block text-sm font-bold text-foreground/60">
              왼쪽 플레이어
            </span>

                        <select
                            name="left"
                            defaultValue={leftPlayer?.userId ?? ""}
                            className="h-12 w-full rounded-2xl border border-foreground/15 bg-background px-4 text-sm font-semibold outline-none transition focus:border-blue-500/60"
                        >
                            {players.map((player) => (
                                <option
                                    key={player.userId}
                                    value={player.userId}
                                    disabled={player.userId === rightPlayer?.userId}
                                >
                                    {player.nickname}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="hidden pb-3 text-center text-lg font-black text-foreground/35 md:block">
                        VS
                    </div>

                    <label className="block">
            <span className="mb-2 block text-sm font-bold text-foreground/60">
              오른쪽 플레이어
            </span>

                        <select
                            name="right"
                            defaultValue={rightPlayer?.userId ?? ""}
                            className="h-12 w-full rounded-2xl border border-foreground/15 bg-background px-4 text-sm font-semibold outline-none transition focus:border-rose-500/60"
                        >
                            {players.map((player) => (
                                <option
                                    key={player.userId}
                                    value={player.userId}
                                    disabled={player.userId === leftPlayer?.userId}
                                >
                                    {player.nickname}
                                </option>
                            ))}
                        </select>
                    </label>

                    <button
                        type="submit"
                        className="h-12 rounded-2xl bg-foreground px-6 text-sm font-bold text-background transition hover:opacity-85"
                    >
                        비교하기
                    </button>
                </div>
            </form>

            <section className="mb-6 rounded-3xl border border-amber-500/20 bg-amber-500/[0.06] p-5 sm:p-6">
                <div className="text-xs font-bold text-amber-700/70 dark:text-amber-300/70">
                    한마디
                </div>

                <p className="mt-2 text-sm font-semibold leading-6 text-foreground/75">
                    {summary}
                </p>
            </section>

            {leftPlayer && rightPlayer ? (
                <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr_1fr] lg:items-start">
                    <PlayerStatsCard player={leftPlayer} side="left" />

                    <ComparePanel
                        metrics={metrics}
                        leftName={leftPlayer.nickname}
                        rightName={rightPlayer.nickname}
                    />

                    <PlayerStatsCard player={rightPlayer} side="right" />
                </div>
            ) : (
                <section className="rounded-3xl border border-dashed border-foreground/15 px-5 py-14 text-center">
                    <div className="text-4xl">⚔️</div>

                    <h2 className="mt-4 text-lg font-bold">
                        비교할 수 있는 플레이어가 부족합니다
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-foreground/50">
                        최소 2명 이상의 플레이어가 티츄 경기를 완료해야 라이벌
                        비교를 사용할 수 있습니다.
                    </p>
                </section>
            )}
        </main>
    );
}