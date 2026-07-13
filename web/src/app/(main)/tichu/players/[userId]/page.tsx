// web/src/app/(main)/tichu/players/[userId]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";

import { getTichuPlayerStats } from "@/app/actions/tichu-stats.action";
import UserAvatar from "@/components/common/UserAvatar";
import TichuNicknameWithBadges from "@/components/tichu/TichuNicknameWithBadges";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";
import { TICHU_GAME_KEY } from "@/features/games/tichu/constants";

type TichuPlayerDetailPageProps = {
    params: Promise<{
        userId: string;
    }>;
};

function formatRate(rate: number): string {
    return `${(rate * 100).toFixed(1)}%`;
}

function formatSignedNumber(value: number): string {
    const formattedValue = Math.abs(value).toLocaleString("ko-KR");

    if (value > 0) {
        return `+${formattedValue}`;
    }

    if (value < 0) {
        return `-${formattedValue}`;
    }

    return "0";
}

function getWinRateDescription(rate: number): string {
    if (rate >= 0.7) {
        return "매우 높은 승률";
    }

    if (rate >= 0.55) {
        return "안정적인 승률";
    }

    if (rate >= 0.45) {
        return "팽팽한 승부";
    }

    if (rate > 0) {
        return "반격을 준비 중";
    }

    return "아직 승리 기록 없음";
}

function getTichuSuccessDescription(
    callCount: number,
    successRate: number,
): string {
    if (callCount === 0) {
        return "선언 기록 없음";
    }

    if (successRate >= 0.7) {
        return "높은 성공률";
    }

    if (successRate >= 0.5) {
        return "절반 이상의 성공률";
    }

    return "과감한 선언 성향";
}

function getScoreDiffDescription(value: number): string {
    if (value >= 1000) {
        return "큰 점수 우위";
    }

    if (value > 0) {
        return "누적 점수 우위";
    }

    if (value < 0) {
        return "점수 반등 필요";
    }

    return "점수 차 없음";
}

export default async function TichuPlayerDetailPage({
                                                        params,
                                                    }: TichuPlayerDetailPageProps) {
    assertGameEnabled(TICHU_GAME_KEY);

    const { userId } = await params;
    const player = await getTichuPlayerStats(userId);

    if (!player) {
        notFound();
    }

    const averageScoreDiff =
        player.playCount > 0
            ? player.accumulatedScore / player.playCount
            : 0;

    const averageRoundsPerMatch =
        player.playCount > 0
            ? player.roundCount / player.playCount
            : 0;

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
            <section className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        <UserAvatar
                            imageUrl={player.avatarImageUrl}
                            emoji={player.avatarEmoji}
                            name={player.nickname}
                            size="lg"
                        />

                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground/50">
                                티츄 플레이어
                            </p>

                            <TichuNicknameWithBadges
                                nickname={player.nickname}
                                badges={player.equippedBadges}
                                className="mt-1 text-2xl font-black sm:text-3xl"
                            />

                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-foreground/55">
                <span>
                  {player.playCount.toLocaleString("ko-KR")}경기
                </span>

                                <span>
                  {player.winCount.toLocaleString("ko-KR")}승{" "}
                                    {player.lossCount.toLocaleString("ko-KR")}패
                                    {player.drawCount > 0
                                        ? ` ${player.drawCount.toLocaleString("ko-KR")}무`
                                        : ""}
                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-foreground/10 bg-background px-5 py-4 sm:min-w-40 sm:flex-col sm:items-end">
            <span className="text-xs font-bold text-foreground/45">
              TICHU MMR
            </span>

                        <strong className="text-3xl font-black tabular-nums">
                            {player.mmr.toLocaleString("ko-KR")}
                        </strong>
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                        href="/tichu/matches"
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-foreground/10 px-4 text-sm font-bold transition hover:bg-foreground/5"
                    >
                        대국 기록
                    </Link>

                    <Link
                        href="/tichu"
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-foreground/10 px-4 text-sm font-bold transition hover:bg-foreground/5"
                    >
                        티츄 대시보드
                    </Link>
                </div>
            </section>

            {player.playCount === 0 ? (
                <section className="rounded-3xl border border-dashed border-foreground/15 px-5 py-14 text-center">
                    <div className="text-4xl">🃏</div>

                    <h2 className="mt-4 text-lg font-black">
                        아직 완료한 티츄 게임이 없습니다
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-foreground/55">
                        게임을 완료하면 승률과 선언 기록 등 개인 통계가
                        표시됩니다.
                    </p>
                </section>
            ) : (
                <>
                    <section>
                        <div className="mb-3">
                            <h2 className="text-lg font-black sm:text-xl">
                                경기 요약
                            </h2>

                            <p className="mt-1 text-sm text-foreground/50">
                                전체 티츄 경기 결과를 기준으로 집계한 기록입니다.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <article className="rounded-2xl border border-foreground/10 bg-background p-4 sm:p-5">
                                <p className="text-xs font-bold text-foreground/45">
                                    승률
                                </p>

                                <p className="mt-2 text-2xl font-black tabular-nums sm:text-3xl">
                                    {formatRate(player.winRate)}
                                </p>

                                <p className="mt-2 text-xs font-semibold text-foreground/45">
                                    {getWinRateDescription(player.winRate)}
                                </p>
                            </article>

                            <article className="rounded-2xl border border-foreground/10 bg-background p-4 sm:p-5">
                                <p className="text-xs font-bold text-foreground/45">
                                    경기 수
                                </p>

                                <p className="mt-2 text-2xl font-black tabular-nums sm:text-3xl">
                                    {player.playCount.toLocaleString("ko-KR")}
                                </p>

                                <p className="mt-2 text-xs font-semibold text-foreground/45">
                                    총 {player.roundCount.toLocaleString("ko-KR")}라운드
                                </p>
                            </article>

                            <article className="rounded-2xl border border-foreground/10 bg-background p-4 sm:p-5">
                                <p className="text-xs font-bold text-foreground/45">
                                    누적 점수 차
                                </p>

                                <p className="mt-2 text-2xl font-black tabular-nums sm:text-3xl">
                                    {formatSignedNumber(player.accumulatedScore)}
                                </p>

                                <p className="mt-2 text-xs font-semibold text-foreground/45">
                                    {getScoreDiffDescription(player.accumulatedScore)}
                                </p>
                            </article>

                            <article className="rounded-2xl border border-foreground/10 bg-background p-4 sm:p-5">
                                <p className="text-xs font-bold text-foreground/45">
                                    경기당 평균
                                </p>

                                <p className="mt-2 text-2xl font-black tabular-nums sm:text-3xl">
                                    {formatSignedNumber(Math.round(averageScoreDiff))}
                                </p>

                                <p className="mt-2 text-xs font-semibold text-foreground/45">
                                    평균 점수 차
                                </p>
                            </article>
                        </div>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-2">
                        <article className="rounded-3xl border border-foreground/10 bg-background p-5 sm:p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-foreground/50">
                                        경기 결과
                                    </p>

                                    <h2 className="mt-1 text-xl font-black">
                                        승패 기록
                                    </h2>
                                </div>

                                <div className="rounded-xl bg-foreground/[0.05] px-3 py-2 text-right">
                                    <p className="text-[11px] font-bold text-foreground/45">
                                        승률
                                    </p>

                                    <p className="mt-0.5 text-lg font-black tabular-nums">
                                        {formatRate(player.winRate)}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-3 gap-2">
                                <div className="rounded-2xl bg-foreground/[0.04] p-3 text-center sm:p-4">
                                    <p className="text-xs font-bold text-foreground/45">
                                        승리
                                    </p>

                                    <p className="mt-2 text-2xl font-black tabular-nums">
                                        {player.winCount.toLocaleString("ko-KR")}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-foreground/[0.04] p-3 text-center sm:p-4">
                                    <p className="text-xs font-bold text-foreground/45">
                                        패배
                                    </p>

                                    <p className="mt-2 text-2xl font-black tabular-nums">
                                        {player.lossCount.toLocaleString("ko-KR")}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-foreground/[0.04] p-3 text-center sm:p-4">
                                    <p className="text-xs font-bold text-foreground/45">
                                        무승부
                                    </p>

                                    <p className="mt-2 text-2xl font-black tabular-nums">
                                        {player.drawCount.toLocaleString("ko-KR")}
                                    </p>
                                </div>
                            </div>

                            <dl className="mt-5 divide-y divide-foreground/10 border-t border-foreground/10">
                                <div className="flex items-center justify-between gap-4 py-3">
                                    <dt className="text-sm font-semibold text-foreground/55">
                                        총 라운드
                                    </dt>

                                    <dd className="font-black tabular-nums">
                                        {player.roundCount.toLocaleString("ko-KR")}
                                    </dd>
                                </div>

                                <div className="flex items-center justify-between gap-4 py-3">
                                    <dt className="text-sm font-semibold text-foreground/55">
                                        경기당 평균 라운드
                                    </dt>

                                    <dd className="font-black tabular-nums">
                                        {averageRoundsPerMatch.toFixed(1)}
                                    </dd>
                                </div>

                                <div className="flex items-center justify-between gap-4 py-3">
                                    <dt className="text-sm font-semibold text-foreground/55">
                                        첫 아웃
                                    </dt>

                                    <dd className="font-black tabular-nums">
                                        {player.firstOutCount.toLocaleString("ko-KR")}회
                                    </dd>
                                </div>
                            </dl>
                        </article>

                        <article className="rounded-3xl border border-foreground/10 bg-background p-5 sm:p-6">
                            <div>
                                <p className="text-sm font-semibold text-foreground/50">
                                    점수 기록
                                </p>

                                <h2 className="mt-1 text-xl font-black">
                                    점수 차
                                </h2>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-foreground/[0.04] p-4">
                                    <p className="text-xs font-bold text-foreground/45">
                                        최고 점수 차
                                    </p>

                                    <p className="mt-2 text-xl font-black tabular-nums sm:text-2xl">
                                        {formatSignedNumber(player.bestScoreDiff)}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-foreground/[0.04] p-4">
                                    <p className="text-xs font-bold text-foreground/45">
                                        최저 점수 차
                                    </p>

                                    <p className="mt-2 text-xl font-black tabular-nums sm:text-2xl">
                                        {formatSignedNumber(player.worstScoreDiff)}
                                    </p>
                                </div>
                            </div>

                            <dl className="mt-5 divide-y divide-foreground/10 border-t border-foreground/10">
                                <div className="flex items-center justify-between gap-4 py-3">
                                    <dt className="text-sm font-semibold text-foreground/55">
                                        누적 점수 차
                                    </dt>

                                    <dd className="font-black tabular-nums">
                                        {formatSignedNumber(player.accumulatedScore)}
                                    </dd>
                                </div>

                                <div className="flex items-center justify-between gap-4 py-3">
                                    <dt className="text-sm font-semibold text-foreground/55">
                                        경기당 평균 점수 차
                                    </dt>

                                    <dd className="font-black tabular-nums">
                                        {formatSignedNumber(Math.round(averageScoreDiff))}
                                    </dd>
                                </div>

                                <div className="flex items-center justify-between gap-4 py-3">
                                    <dt className="text-sm font-semibold text-foreground/55">
                                        현재 MMR
                                    </dt>

                                    <dd className="font-black tabular-nums">
                                        {player.mmr.toLocaleString("ko-KR")}
                                    </dd>
                                </div>
                            </dl>
                        </article>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-2">
                        <article className="rounded-3xl border border-foreground/10 bg-background p-5 sm:p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-foreground/50">
                                        스몰 티츄
                                    </p>

                                    <h2 className="mt-1 text-xl font-black">
                                        티츄 선언 기록
                                    </h2>
                                </div>

                                <div className="rounded-xl bg-foreground/[0.05] px-3 py-2 text-right">
                                    <p className="text-[11px] font-bold text-foreground/45">
                                        성공률
                                    </p>

                                    <p className="mt-0.5 text-lg font-black tabular-nums">
                                        {formatRate(player.tichuSuccessRate)}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-3 gap-2">
                                <div className="rounded-2xl bg-foreground/[0.04] p-3 text-center sm:p-4">
                                    <p className="text-xs font-bold text-foreground/45">
                                        선언
                                    </p>

                                    <p className="mt-2 text-2xl font-black tabular-nums">
                                        {player.tichuCalls.toLocaleString("ko-KR")}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-foreground/[0.04] p-3 text-center sm:p-4">
                                    <p className="text-xs font-bold text-foreground/45">
                                        성공
                                    </p>

                                    <p className="mt-2 text-2xl font-black tabular-nums">
                                        {player.tichuSuccesses.toLocaleString("ko-KR")}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-foreground/[0.04] p-3 text-center sm:p-4">
                                    <p className="text-xs font-bold text-foreground/45">
                                        실패
                                    </p>

                                    <p className="mt-2 text-2xl font-black tabular-nums">
                                        {player.tichuFailures.toLocaleString("ko-KR")}
                                    </p>
                                </div>
                            </div>

                            <p className="mt-4 text-sm font-semibold text-foreground/50">
                                {getTichuSuccessDescription(
                                    player.tichuCalls,
                                    player.tichuSuccessRate,
                                )}
                            </p>
                        </article>

                        <article className="rounded-3xl border border-foreground/10 bg-background p-5 sm:p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-foreground/50">
                                        그랜드 티츄
                                    </p>

                                    <h2 className="mt-1 text-xl font-black">
                                        그랜드 선언 기록
                                    </h2>
                                </div>

                                <div className="rounded-xl bg-foreground/[0.05] px-3 py-2 text-right">
                                    <p className="text-[11px] font-bold text-foreground/45">
                                        성공률
                                    </p>

                                    <p className="mt-0.5 text-lg font-black tabular-nums">
                                        {formatRate(player.grandTichuSuccessRate)}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-3 gap-2">
                                <div className="rounded-2xl bg-foreground/[0.04] p-3 text-center sm:p-4">
                                    <p className="text-xs font-bold text-foreground/45">
                                        선언
                                    </p>

                                    <p className="mt-2 text-2xl font-black tabular-nums">
                                        {player.grandTichuCalls.toLocaleString("ko-KR")}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-foreground/[0.04] p-3 text-center sm:p-4">
                                    <p className="text-xs font-bold text-foreground/45">
                                        성공
                                    </p>

                                    <p className="mt-2 text-2xl font-black tabular-nums">
                                        {player.grandTichuSuccesses.toLocaleString("ko-KR")}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-foreground/[0.04] p-3 text-center sm:p-4">
                                    <p className="text-xs font-bold text-foreground/45">
                                        실패
                                    </p>

                                    <p className="mt-2 text-2xl font-black tabular-nums">
                                        {player.grandTichuFailures.toLocaleString("ko-KR")}
                                    </p>
                                </div>
                            </div>

                            <p className="mt-4 text-sm font-semibold text-foreground/50">
                                {getTichuSuccessDescription(
                                    player.grandTichuCalls,
                                    player.grandTichuSuccessRate,
                                )}
                            </p>
                        </article>
                    </section>

                    <section>
                        <div className="mb-3">
                            <h2 className="text-lg font-black sm:text-xl">
                                라운드와 팀플레이
                            </h2>

                            <p className="mt-1 text-sm text-foreground/50">
                                첫 아웃과 원투 성공 기록을 확인할 수 있습니다.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <article className="rounded-2xl border border-foreground/10 bg-background p-5">
                                <p className="text-xs font-bold text-foreground/45">
                                    첫 아웃
                                </p>

                                <p className="mt-2 text-3xl font-black tabular-nums">
                                    {player.firstOutCount.toLocaleString("ko-KR")}
                                    <span className="ml-1 text-sm font-bold text-foreground/45">
                    회
                  </span>
                                </p>

                                <p className="mt-2 text-xs font-semibold text-foreground/45">
                                    라운드에서 가장 먼저 손패를 소진
                                </p>
                            </article>

                            <article className="rounded-2xl border border-foreground/10 bg-background p-5">
                                <p className="text-xs font-bold text-foreground/45">
                                    원투 성공
                                </p>

                                <p className="mt-2 text-3xl font-black tabular-nums">
                                    {player.oneTwoSuccessCount.toLocaleString("ko-KR")}
                                    <span className="ml-1 text-sm font-bold text-foreground/45">
                    회
                  </span>
                                </p>

                                <p className="mt-2 text-xs font-semibold text-foreground/45">
                                    같은 팀이 첫 번째와 두 번째로 아웃
                                </p>
                            </article>

                            <article className="rounded-2xl border border-foreground/10 bg-background p-5">
                                <p className="text-xs font-bold text-foreground/45">
                                    원투 허용
                                </p>

                                <p className="mt-2 text-3xl font-black tabular-nums">
                                    {player.oneTwoSufferedCount.toLocaleString("ko-KR")}
                                    <span className="ml-1 text-sm font-bold text-foreground/45">
                    회
                  </span>
                                </p>

                                <p className="mt-2 text-xs font-semibold text-foreground/45">
                                    상대 팀의 원투를 허용한 횟수
                                </p>
                            </article>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}