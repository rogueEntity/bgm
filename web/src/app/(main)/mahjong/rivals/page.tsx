// web/src/app/(main)/mahjong/rivals/page.tsx

import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/prisma";
import UserAvatar from "@/components/common/UserAvatar";
import NicknameWithBadges from "@/components/mahjong/NicknameWithBadges";
import { getAvatarImageUrl } from "@/lib/avatar";
import {
    getMahjongEquippedBadgesByUserIds,
    type MahjongEquippedBadgeItem,
} from "@/app/actions/mahjong-achievement.action";

type MahjongRivalsPageProps = {
    searchParams: Promise<{
        left?: string;
        right?: string;
    }>;
};

type SpecificStats = {
    play_count?: number;
    accumulated_score?: number;
    average_score?: number;
    average_rank?: number;
    mmr?: number;
    rank_rates?: Record<string, number>;
    tobi_rate?: number;
    agari_rate?: number;
    deal_in_rate?: number;
    houjuu_rate?: number;
    ryuukyoku_tenpai_rate?: number;
    riichi_rate?: number;
    modes?: Record<string, SpecificStats>;
    mahjong?: {
        modes?: Record<string, SpecificStats>;
    };
};

type MahjongPlayerSummary = {
    id: string;
    nickname: string;
    avatarEmoji: string | null;
    avatarImageUrl: string | null;
    playCount: number;
    accumulatedScore: number;
    averageScore: number | null;
    averageRank: number | null;
    mmr: number;
    firstRate: number | null;
    secondRate: number | null;
    thirdRate: number | null;
    fourthRate: number | null;
    tobiRate: number | null;
    agariRate: number | null;
    dealInRate: number | null;
    ryuukyokuTenpaiRate: number | null;
    riichiRate: number | null;
};

type CompareDirection = "higher" | "lower";

type CompareMetric = {
    key: string;
    label: string;
    leftValue: number | null;
    rightValue: number | null;
    suffix?: string;
    direction: CompareDirection;
    decimals?: number;
};

type CompareWinner = "left" | "right" | "draw" | "none";

const RATE_DECIMALS = 1;

function toNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    return null;
}

function getOverallSpecificStats(stats: unknown): SpecificStats {
    if (!stats || typeof stats !== "object") {
        return {};
    }

    const typedStats = stats as SpecificStats;

    if (
        typedStats.mahjong?.modes &&
        typeof typedStats.mahjong.modes === "object"
    ) {
        return getOverallStatsFromModes(typedStats.mahjong.modes);
    }

    if (typedStats.modes && typeof typedStats.modes === "object") {
        return getOverallStatsFromModes(typedStats.modes);
    }

    return typedStats;
}

function getOverallStatsFromModes(
    modes: Record<string, SpecificStats>,
): SpecificStats {
    if (modes.all) {
        return modes.all;
    }

    const modeStats = Object.entries(modes)
        .filter(([modeKey]) => modeKey !== "all")
        .map(([, value]) => value)
        .filter((value) => value && typeof value === "object");

    const totalPlayCount = modeStats.reduce((sum, mode) => {
        return sum + (toNumber(mode.play_count) ?? 0);
    }, 0);

    if (totalPlayCount <= 0) {
        return {};
    }

    const weightedRate = (key: keyof SpecificStats): number | undefined => {
        let weightedSum = 0;
        let weightSum = 0;

        for (const mode of modeStats) {
            const playCount = toNumber(mode.play_count) ?? 0;
            const rate = toNumber(mode[key]);

            if (playCount > 0 && rate !== null) {
                weightedSum += rate * playCount;
                weightSum += playCount;
            }
        }

        if (weightSum <= 0) {
            return undefined;
        }

        return weightedSum / weightSum;
    };

    const weightedRankRate = (rank: 1 | 2 | 3 | 4): number | undefined => {
        let weightedSum = 0;
        let weightSum = 0;

        for (const mode of modeStats) {
            const playCount = toNumber(mode.play_count) ?? 0;
            const rate = mode.rank_rates?.[String(rank)];

            if (playCount > 0 && typeof rate === "number" && Number.isFinite(rate)) {
                weightedSum += rate * playCount;
                weightSum += playCount;
            }
        }

        if (weightSum <= 0) {
            return undefined;
        }

        return weightedSum / weightSum;
    };

    const accumulatedScore = modeStats.reduce((sum, mode) => {
        return sum + (toNumber(mode.accumulated_score) ?? 0);
    }, 0);

    const averageRank = weightedRate("average_rank");

    return {
        play_count: totalPlayCount,
        accumulated_score: accumulatedScore,
        average_score:
            totalPlayCount > 0 ? accumulatedScore / totalPlayCount : undefined,
        average_rank: averageRank,
        rank_rates: {
            "1": weightedRankRate(1) ?? 0,
            "2": weightedRankRate(2) ?? 0,
            "3": weightedRankRate(3) ?? 0,
            "4": weightedRankRate(4) ?? 0,
        },
        tobi_rate: weightedRate("tobi_rate"),
        agari_rate: weightedRate("agari_rate"),
        deal_in_rate: weightedRate("deal_in_rate"),
        houjuu_rate: weightedRate("houjuu_rate"),
        ryuukyoku_tenpai_rate: weightedRate("ryuukyoku_tenpai_rate"),
        riichi_rate: weightedRate("riichi_rate"),
    };
}

function getRate(stats: SpecificStats, keys: string[]): number | null {
    for (const key of keys) {
        const value = toNumber((stats as Record<string, unknown>)[key]);

        if (value !== null) {
            return value;
        }
    }

    return null;
}

function getRankRate(stats: SpecificStats, rank: 1 | 2 | 3 | 4): number | null {
    const rankRates = stats.rank_rates;

    if (!rankRates || typeof rankRates !== "object") {
        return null;
    }

    return toNumber(rankRates[String(rank)]);
}

function normalizeRate(value: number | null): number | null {
    if (value === null) {
        return null;
    }

    return value <= 1 ? value * 100 : value;
}

function formatNumber(value: number | null, decimals = 0, suffix = "") {
    if (value === null) {
        return "-";
    }

    return `${value.toLocaleString("ko-KR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })}${suffix}`;
}

function formatRate(value: number | null) {
    return formatNumber(normalizeRate(value), RATE_DECIMALS, "%");
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
) {
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

function getWinnerClass(winner: CompareWinner) {
    if (winner === "left") {
        return "border-blue-500/30 bg-blue-500/10 text-blue-600";
    }

    if (winner === "right") {
        return "border-rose-500/30 bg-rose-500/10 text-rose-600";
    }

    if (winner === "draw") {
        return "border-foreground/15 bg-foreground/5 text-foreground/70";
    }

    return "border-foreground/10 bg-foreground/[0.03] text-foreground/35";
}

function buildCompareMetrics(
    left: MahjongPlayerSummary,
    right: MahjongPlayerSummary,
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
            label: "총 대국 수",
            leftValue: left.playCount,
            rightValue: right.playCount,
            suffix: "국",
            direction: "higher",
        },
        {
            key: "accumulatedScore",
            label: "총점",
            leftValue: left.accumulatedScore,
            rightValue: right.accumulatedScore,
            direction: "higher",
        },
        {
            key: "averageScore",
            label: "평균 점수",
            leftValue: left.averageScore,
            rightValue: right.averageScore,
            direction: "higher",
            decimals: 1,
        },
        {
            key: "averageRank",
            label: "평균 순위",
            leftValue: left.averageRank,
            rightValue: right.averageRank,
            suffix: "위",
            direction: "lower",
            decimals: 2,
        },
        {
            key: "firstRate",
            label: "1위율",
            leftValue: normalizeRate(left.firstRate),
            rightValue: normalizeRate(right.firstRate),
            suffix: "%",
            direction: "higher",
            decimals: RATE_DECIMALS,
        },
        {
            key: "secondRate",
            label: "2위율",
            leftValue: normalizeRate(left.secondRate),
            rightValue: normalizeRate(right.secondRate),
            suffix: "%",
            direction: "higher",
            decimals: RATE_DECIMALS,
        },
        {
            key: "thirdRate",
            label: "3위율",
            leftValue: normalizeRate(left.thirdRate),
            rightValue: normalizeRate(right.thirdRate),
            suffix: "%",
            direction: "higher",
            decimals: RATE_DECIMALS,
        },
        {
            key: "fourthRate",
            label: "4위율",
            leftValue: normalizeRate(left.fourthRate),
            rightValue: normalizeRate(right.fourthRate),
            suffix: "%",
            direction: "lower",
            decimals: RATE_DECIMALS,
        },
        {
            key: "tobiRate",
            label: "토비율",
            leftValue: normalizeRate(left.tobiRate),
            rightValue: normalizeRate(right.tobiRate),
            suffix: "%",
            direction: "lower",
            decimals: RATE_DECIMALS,
        },
        {
            key: "agariRate",
            label: "화료율",
            leftValue: normalizeRate(left.agariRate),
            rightValue: normalizeRate(right.agariRate),
            suffix: "%",
            direction: "higher",
            decimals: RATE_DECIMALS,
        },
        {
            key: "dealInRate",
            label: "방총률",
            leftValue: normalizeRate(left.dealInRate),
            rightValue: normalizeRate(right.dealInRate),
            suffix: "%",
            direction: "lower",
            decimals: RATE_DECIMALS,
        },
        {
            key: "ryuukyokuTenpaiRate",
            label: "유국 텐파이율",
            leftValue: normalizeRate(left.ryuukyokuTenpaiRate),
            rightValue: normalizeRate(right.ryuukyokuTenpaiRate),
            suffix: "%",
            direction: "higher",
            decimals: RATE_DECIMALS,
        },
        {
            key: "riichiRate",
            label: "리치율",
            leftValue: normalizeRate(left.riichiRate),
            rightValue: normalizeRate(right.riichiRate),
            suffix: "%",
            direction: "higher",
            decimals: RATE_DECIMALS,
        },
    ];
}

function getRivalSummary(
    leftName: string,
    rightName: string,
    metrics: CompareMetric[],
) {
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

    const totalCompared = leftWins + rightWins + drawCount;

    if (totalCompared === 0) {
        return "아직 비교할 수 있는 기록이 충분하지 않아요. 대국 기록이 쌓이면 라이벌 구도가 더 선명해집니다.";
    }

    if (leftWins >= rightWins + 4) {
        return `${leftName} 쪽이 전반적인 지표에서 꽤 앞서고 있어요. ${rightName}은 강점 항목을 중심으로 추격하는 구도입니다.`;
    }

    if (rightWins >= leftWins + 4) {
        return `${rightName} 쪽이 전반적인 지표에서 꽤 앞서고 있어요. ${leftName}은 안정적으로 반격 포인트를 찾는 구도입니다.`;
    }

    if (leftWins > rightWins) {
        return `${leftName}이 살짝 앞서지만, ${rightName}도 충분히 따라붙을 만한 팽팽한 라이벌 구도예요.`;
    }

    if (rightWins > leftWins) {
        return `${rightName}이 살짝 앞서지만, ${leftName}도 충분히 뒤집을 수 있는 접전 구도예요.`;
    }

    return `${leftName}와 ${rightName}의 지표가 거의 비슷해요. 항목별 강점이 갈리는 진짜 라이벌 구도입니다.`;
}

function convertToPlayerSummary(player: {
    id: string;
    nickname: string;
    avatar_emoji: string | null;
    avatar_image_key: string | null;
    avatar_image_updated_at: Date | null;
    user_game_stats: {
        play_count: number;
        accumulated_score: number;
        average_rank: number | null;
        mmr: number;
        specific_stats: unknown;
    }[];
}): MahjongPlayerSummary {
    const stat = player.user_game_stats[0];
    const specificStats = getOverallSpecificStats(stat?.specific_stats);

    const playCount =
        toNumber(specificStats.play_count) ?? stat?.play_count ?? 0;

    const accumulatedScore =
        toNumber(specificStats.accumulated_score) ?? stat?.accumulated_score ?? 0;

    const averageScore =
        toNumber(specificStats.average_score) ??
        (playCount > 0 ? accumulatedScore / playCount : null);

    const averageRank =
        toNumber(specificStats.average_rank) ?? stat?.average_rank ?? null;

    return {
        id: player.id,
        nickname: player.nickname,
        avatarEmoji: player.avatar_emoji,
        avatarImageUrl: getAvatarImageUrl(
            player.avatar_image_key,
            player.avatar_image_updated_at,
        ),
        playCount,
        accumulatedScore,
        averageScore,
        averageRank,
        mmr: toNumber(specificStats.mmr) ?? stat?.mmr ?? 1500,
        firstRate: getRankRate(specificStats, 1),
        secondRate: getRankRate(specificStats, 2),
        thirdRate: getRankRate(specificStats, 3),
        fourthRate: getRankRate(specificStats, 4),
        tobiRate: getRate(specificStats, ["tobi_rate"]),
        agariRate: getRate(specificStats, ["agari_rate"]),
        dealInRate: getRate(specificStats, ["deal_in_rate", "houjuu_rate"]),
        ryuukyokuTenpaiRate: getRate(specificStats, ["ryuukyoku_tenpai_rate"]),
        riichiRate: getRate(specificStats, ["riichi_rate"]),
    };
}

function StatRow({
    label,
    value,
}: Readonly<{
    label: string;
    value: ReactNode;
}>) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-foreground/5 py-3 last:border-b-0">
            <span className="text-sm text-foreground/55">{label}</span>
            <span className="text-sm font-bold text-foreground">{value}</span>
        </div>
    );
}

function PlayerStatsCard({
    player,
    badges,
    side,
}: Readonly<{
    player: MahjongPlayerSummary;
    badges: MahjongEquippedBadgeItem[];
    side: "left" | "right";
}>) {
    const sideClass =
        side === "left"
            ? "border-blue-500/20 bg-blue-500/[0.03]"
            : "border-rose-500/20 bg-rose-500/[0.03]";

    return (
        <section className={`rounded-3xl border p-5 shadow-sm md:p-6 ${sideClass}`}>
            <div className="mb-6 flex items-center gap-3">
                <UserAvatar
                    name={player.nickname}
                    emoji={player.avatarEmoji}
                    imageUrl={player.avatarImageUrl}
                    size="lg"
                />

                <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground/40">
                        {side === "left" ? "왼쪽 작사" : "오른쪽 작사"}
                    </div>

                    <NicknameWithBadges
                        nickname={player.nickname}
                        badges={badges}
                        className="mt-1"
                        nameClassName="text-xl font-black"
                    />
                </div>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-background/70 p-4">
                <StatRow label="MMR" value={formatNumber(player.mmr)} />
                <StatRow
                    label="총 대국 수"
                    value={formatNumber(player.playCount, 0, "국")}
                />
                <StatRow label="총점" value={formatNumber(player.accumulatedScore)} />
                <StatRow
                    label="평균 점수"
                    value={formatNumber(player.averageScore, 1)}
                />
                <StatRow
                    label="평균 순위"
                    value={formatNumber(player.averageRank, 2, "위")}
                />
            </div>

            <div className="mt-4 rounded-2xl border border-foreground/10 bg-background/70 p-4">
                <StatRow label="1위율" value={formatRate(player.firstRate)} />
                <StatRow label="2위율" value={formatRate(player.secondRate)} />
                <StatRow label="3위율" value={formatRate(player.thirdRate)} />
                <StatRow label="4위율" value={formatRate(player.fourthRate)} />
                <StatRow label="토비율" value={formatRate(player.tobiRate)} />
            </div>

            <div className="mt-4 rounded-2xl border border-foreground/10 bg-background/70 p-4">
                <StatRow label="화료율" value={formatRate(player.agariRate)} />
                <StatRow label="방총률" value={formatRate(player.dealInRate)} />
                <StatRow
                    label="유국 텐파이율"
                    value={formatRate(player.ryuukyokuTenpaiRate)}
                />
                <StatRow label="리치율" value={formatRate(player.riichiRate)} />
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
        <section className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-5 shadow-sm md:p-6">
            <div className="mb-5 text-center">
                <div className="text-xs font-bold text-foreground/40">비교 결과</div>
                <h2 className="mt-1 text-2xl font-black">VS</h2>
            </div>

            <div className="space-y-3">
                {metrics.map((metric) => {
                    const winner = getCompareWinner(metric);

                    return (
                        <div
                            key={metric.key}
                            className="rounded-2xl border border-foreground/10 bg-background/80 p-4"
                        >
                            <div className="mb-3 text-center text-sm font-black">
                                {metric.label}
                            </div>

                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                <div className="text-right text-xs font-bold text-foreground/60">
                                    {formatNumber(
                                        metric.leftValue,
                                        metric.decimals,
                                        metric.suffix,
                                    )}
                                </div>

                                <div
                                    className={`rounded-full border px-3 py-1 text-center text-xs font-black ${getWinnerClass(
                                        winner,
                                    )}`}
                                >
                                    {getWinnerLabel(winner, leftName, rightName)}
                                </div>

                                <div className="text-left text-xs font-bold text-foreground/60">
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

export default async function MahjongRivalsPage({
    searchParams,
}: Readonly<MahjongRivalsPageProps>) {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    const resolvedSearchParams = await searchParams;

    const mahjongGame = await db.games.findFirst({
        where: {
            OR: [
                {
                    name: "리치마작",
                },
                {
                    name: {
                        contains: "마작",
                    },
                },
            ],
        },
        select: {
            id: true,
        },
    });

    if (!mahjongGame) {
        return (
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
                <section className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-6">
                    <h1 className="text-3xl font-black">라이벌 비교</h1>
                    <p className="mt-3 text-sm text-foreground/60">
                        마작 게임 정보가 아직 없습니다. 게임 데이터가 생성된 뒤 다시 확인해 주세요.
                    </p>
                </section>
            </main>
        );
    }

    const players = await db.users.findMany({
        where: {
            user_game_stats: {
                some: {
                    game_id: mahjongGame.id,
                    play_count: {
                        gt: 0,
                    },
                },
            },
        },
        select: {
            id: true,
            nickname: true,
            avatar_emoji: true,
            avatar_image_key: true,
            avatar_image_updated_at: true,
            user_game_stats: {
                where: {
                    game_id: mahjongGame.id,
                },
                select: {
                    play_count: true,
                    accumulated_score: true,
                    average_rank: true,
                    mmr: true,
                    specific_stats: true,
                },
                take: 1,
            },
        },
        orderBy: {
            nickname: "asc",
        },
    });

    const playerSummaries = players.map(convertToPlayerSummary);

    const leftId = resolvedSearchParams.left ?? playerSummaries[0]?.id;
    const rightId =
        resolvedSearchParams.right ??
        playerSummaries.find((player) => player.id !== leftId)?.id;

    const leftPlayer =
        playerSummaries.find((player) => player.id === leftId) ?? null;
    const rightPlayer =
        playerSummaries.find((player) => player.id === rightId) ?? null;

    const selectedUserIds = [leftPlayer?.id, rightPlayer?.id].filter(
        (id): id is string => Boolean(id),
    );

    const equippedBadgeMap =
        selectedUserIds.length > 0
            ? await getMahjongEquippedBadgesByUserIds(selectedUserIds)
            : {};

    const metrics =
        leftPlayer && rightPlayer
            ? buildCompareMetrics(leftPlayer, rightPlayer)
            : [];

    const summary =
        leftPlayer && rightPlayer
            ? getRivalSummary(leftPlayer.nickname, rightPlayer.nickname, metrics)
            : "비교할 작사 두 명을 선택해 주세요.";

    return (
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
            <section className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-6 shadow-sm">
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-bold text-foreground/45">리치마작</p>
                    <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                        라이벌 비교
                    </h1>
                    <p className="text-sm text-foreground/60">
                        두 작사의 통계를 나란히 비교하고, 항목별로 누가 더 앞서는지 확인합니다.
                    </p>
                </div>

                <form
                    className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto]"
                    method="get"
                >
                    <label className="flex flex-col gap-2">
            <span className="text-xs font-bold text-foreground/50">
              왼쪽 작사
            </span>
                        <select
                            name="left"
                            defaultValue={leftPlayer?.id ?? ""}
                            className="h-12 rounded-2xl border border-foreground/10 bg-background px-4 text-sm font-bold outline-none transition focus:border-foreground/30"
                        >
                            {playerSummaries.map((player) => (
                                <option key={player.id} value={player.id}>
                                    {player.nickname}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="hidden items-end justify-center pb-3 text-sm font-black text-foreground/35 md:flex">
                        VS
                    </div>

                    <label className="flex flex-col gap-2">
            <span className="text-xs font-bold text-foreground/50">
              오른쪽 작사
            </span>
                        <select
                            name="right"
                            defaultValue={rightPlayer?.id ?? ""}
                            className="h-12 rounded-2xl border border-foreground/10 bg-background px-4 text-sm font-bold outline-none transition focus:border-foreground/30"
                        >
                            {playerSummaries.map((player) => (
                                <option key={player.id} value={player.id}>
                                    {player.nickname}
                                </option>
                            ))}
                        </select>
                    </label>

                    <button
                        type="submit"
                        className="h-12 rounded-2xl bg-foreground px-6 text-sm font-black text-background transition hover:opacity-85 md:self-end"
                    >
                        비교하기
                    </button>
                </form>
            </section>

            <section className="rounded-3xl border border-foreground/10 bg-background p-5 shadow-sm md:p-6">
                <div className="text-xs font-bold text-foreground/40">한마디</div>
                <p className="mt-2 text-lg font-black leading-relaxed md:text-xl">
                    {summary}
                </p>
            </section>

            {leftPlayer && rightPlayer ? (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)_minmax(0,1fr)]">
                    <PlayerStatsCard
                        player={leftPlayer}
                        badges={equippedBadgeMap[leftPlayer.id] ?? []}
                        side="left"
                    />

                    <ComparePanel
                        metrics={metrics}
                        leftName={leftPlayer.nickname}
                        rightName={rightPlayer.nickname}
                    />

                    <PlayerStatsCard
                        player={rightPlayer}
                        badges={equippedBadgeMap[rightPlayer.id] ?? []}
                        side="right"
                    />
                </div>
            ) : (
                <section className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-6 text-sm text-foreground/60">
                    비교할 수 있는 작사가 부족합니다. 최소 2명 이상의 작사 기록이 필요합니다.
                </section>
            )}
        </main>
    );
}