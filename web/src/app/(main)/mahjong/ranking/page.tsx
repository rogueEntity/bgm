// web/src/app/(main)/mahjong/ranking/page.tsx

import Link from "next/link";

import { getMahjongEquippedBadgesByUserIds } from "@/app/actions/mahjong-achievement.action";
import UserAvatar from "@/components/common/UserAvatar";
import NicknameWithBadges from "@/components/mahjong/NicknameWithBadges";
import { getAvatarImageUrl } from "@/lib/avatar";
import { db } from "@/lib/prisma";

import { MAHJONG_GAME_KEY } from "@/features/games/mahjong/constants";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";

type RankingPageProps = {
    searchParams: Promise<{
        type?: string;
    }>;
};

type RankingType = "mmr" | "score";

type RankingRow = {
    userId: string;
    nickname: string;
    avatarEmoji: string | null;
    avatarImageUrl: string | null;
    playCount: number;
    mmr: number;
    accumulatedScore: number;
    averageRank: number | null;
    rank: number;
};

function normalizeRankingType(type?: string): RankingType {
    if (type === "score") return "score";
    return "mmr";
}

function getRankingValue(row: Omit<RankingRow, "rank">, type: RankingType) {
    if (type === "score") return row.accumulatedScore;
    return row.mmr;
}

function formatRankingValue(value: number, type: RankingType) {
    if (type === "score") {
        return `${value.toLocaleString("ko-KR")}점`;
    }

    return `${value.toLocaleString("ko-KR")} MMR`;
}

function createRankedRows(
    rows: Omit<RankingRow, "rank">[],
    type: RankingType,
): RankingRow[] {
    const sortedRows = [...rows].sort((a, b) => {
        const aValue = getRankingValue(a, type);
        const bValue = getRankingValue(b, type);

        if (bValue !== aValue) return bValue - aValue;

        // 보조 정렬: 같은 점수면 대국 수 많은 순, 그래도 같으면 닉네임순
        if (b.playCount !== a.playCount) return b.playCount - a.playCount;

        return a.nickname.localeCompare(b.nickname, "ko-KR");
    });

    let previousValue: number | null = null;
    let previousRank = 0;

    return sortedRows.map((row, index) => {
        const currentValue = getRankingValue(row, type);

        // 공동 순위 처리: 1, 1, 3
        const rank =
            previousValue !== null && currentValue === previousValue
                ? previousRank
                : index + 1;

        previousValue = currentValue;
        previousRank = rank;

        return {
            ...row,
            rank,
        };
    });
}

async function getMahjongRankingRows(type: RankingType) {
    const mahjongGame = await db.games.findFirst({
        where: {
            key: MAHJONG_GAME_KEY,
        },
        select: {
            id: true,
        },
    });

    if (!mahjongGame) {
        return [];
    }

    const statsRows = await db.user_game_stats.findMany({
        where: {
            game_id: mahjongGame.id,
            play_count: {
                gt: 0,
            },
        },
        select: {
            user_id: true,
            play_count: true,
            accumulated_score: true,
            average_rank: true,
            mmr: true,
            users: {
                select: {
                    nickname: true,
                    avatar_emoji: true,
                    avatar_image_key: true,
                    avatar_image_updated_at: true,
                },
            },
        },
    });

    const rows = statsRows.map((row) => ({
        userId: row.user_id,
        nickname: row.users.nickname,
        avatarEmoji: row.users.avatar_emoji,
        avatarImageUrl: getAvatarImageUrl(
            row.users.avatar_image_key,
            row.users.avatar_image_updated_at,
        ),
        playCount: row.play_count,
        accumulatedScore: row.accumulated_score,
        averageRank: row.average_rank,
        mmr: row.mmr,
    }));

    return createRankedRows(rows, type);
}

export default async function MahjongRankingPage({
  searchParams,
}: Readonly<RankingPageProps>) {
    assertGameEnabled(MAHJONG_GAME_KEY);
    const resolvedSearchParams = await searchParams;
    const rankingType = normalizeRankingType(resolvedSearchParams.type);

    const rankingRows = await getMahjongRankingRows(rankingType);
    const equippedBadgeMap = await getMahjongEquippedBadgesByUserIds(
        rankingRows.map((row) => row.userId),
    );

    const title =
        rankingType === "mmr" ? "MMR 랭킹" : "총점수 랭킹";

    const description =
        rankingType === "mmr"
            ? "대국 결과에 따른 MMR 기준 순위입니다."
            : "누적 최종 점수 기준 순위입니다.";

    return (
        <main className="max-w-5xl mx-auto space-y-6">
            <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <Link
                        href="/mahjong"
                        className="text-sm text-foreground/50 hover:text-foreground"
                    >
                        ← 리치마작 대시보드
                    </Link>

                    <h2 className="mt-3 text-3xl font-bold tracking-tight">랭킹</h2>
                    <p className="mt-2 text-sm text-foreground/60">
                        {description}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-1">
                    <Link
                        href="/mahjong/ranking?type=mmr"
                        className={`rounded-xl px-4 py-2 text-center text-sm font-semibold transition ${
                            rankingType === "mmr"
                                ? "bg-foreground text-background shadow-sm"
                                : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                        }`}
                    >
                        MMR
                    </Link>

                    <Link
                        href="/mahjong/ranking?type=score"
                        className={`rounded-xl px-4 py-2 text-center text-sm font-semibold transition ${
                            rankingType === "score"
                                ? "bg-foreground text-background shadow-sm"
                                : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                        }`}
                    >
                        총점수
                    </Link>
                </div>
            </section>

            <section className="rounded-3xl border border-foreground/10 bg-background shadow-sm overflow-hidden">
                <div className="border-b border-foreground/10 px-5 py-4 md:px-6">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <p className="mt-1 text-xs text-foreground/50">
                        공동 순위는 같은 순위로 표시하고, 다음 순위는 건너뜁니다.
                        예: 1위, 1위, 3위
                    </p>
                </div>

                {rankingRows.length === 0 ? (
                    <div className="px-5 py-16 text-center md:px-6">
                        <p className="text-sm font-semibold text-foreground/70">
                            아직 랭킹 데이터가 없습니다.
                        </p>
                        <p className="mt-2 text-sm text-foreground/45">
                            완료된 대국이 쌓이면 이곳에 순위가 표시됩니다.
                        </p>
                    </div>
                ) : (
                    <ol className="divide-y divide-foreground/10">
                        {rankingRows.map((row) => {
                            const value = getRankingValue(row, rankingType);
                            const equippedBadges = equippedBadgeMap[row.userId] ?? [];

                            return (
                                <li
                                    key={row.userId}
                                    className="flex items-start gap-3 px-4 py-4 transition hover:bg-foreground/[0.03] md:items-center md:px-6"
                                >
                                    <div className="w-8 shrink-0 pt-3 text-center md:w-10 md:pt-0">
                                        <span
                                            className={`text-lg font-black ${
                                                row.rank === 1
                                                    ? "text-yellow-500"
                                                    : row.rank === 2
                                                        ? "text-foreground/70"
                                                        : row.rank === 3
                                                            ? "text-amber-700"
                                                            : "text-foreground/35"
                                            }`}
                                        >
                                          {row.rank}
                                        </span>
                                    </div>

                                    <UserAvatar
                                        imageUrl={row.avatarImageUrl}
                                        emoji={row.avatarEmoji}
                                        name={row.nickname}
                                        size="md"
                                        className="mt-1 shrink-0 md:mt-0"
                                    />

                                    <div className="min-w-0 flex-1">
                                        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div className="min-w-0">
                                                <NicknameWithBadges
                                                    nickname={row.nickname}
                                                    badges={equippedBadges}
                                                    badgeLimit={3}
                                                    badgeSize="sm"
                                                    className="min-w-0"
                                                    nameClassName="truncate"
                                                />

                                                <p className="mt-1 text-xs text-foreground/45">
                                                    {row.playCount.toLocaleString("ko-KR")}전
                                                    {row.averageRank ? ` · 평균 ${row.averageRank.toFixed(2)}위` : ""}
                                                </p>
                                            </div>

                                            <div className="shrink-0 self-end text-right md:self-auto">
                                                <p className="text-base font-black tabular-nums md:text-lg">
                                                    {formatRankingValue(value, rankingType)}
                                                </p>

                                                {rankingType === "mmr" ? (
                                                    <p className="mt-1 text-xs text-foreground/40">
                                                        총점 {row.accumulatedScore.toLocaleString("ko-KR")}점
                                                    </p>
                                                ) : (
                                                    <p className="mt-1 text-xs text-foreground/40">
                                                        MMR {row.mmr.toLocaleString("ko-KR")}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </section>
        </main>
    );
}