// web/src/app/(main)/mahjong/players/[userId]/page.tsx
import { notFound } from "next/navigation";

import {
    getMahjongPlayerProfile,
    MahjongModeDetailStats,
    MahjongPlayerProfileData,
} from "@/features/games/mahjong/lib/profile";
import React from "react";
import { MAHJONG_GAME_KEY } from "@/features/games/mahjong/constants";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type MahjongPlayerProfilePageProps = {
    params: Promise<{
        userId: string;
    }>;
};

const MODE_LABELS = {
    all: "전체",
    east: "동풍전",
    half: "반장전",
    full: "전장전",
} as const;

export default async function MahjongPlayerProfilePage({
   params,
}: Readonly<MahjongPlayerProfilePageProps>) {
    assertGameEnabled(MAHJONG_GAME_KEY);
    const { userId } = await params;

    if (!UUID_REGEX.test(userId)) {
        return notFound();
    }

    const profile = await getMahjongPlayerProfile(userId);

    if (!profile) {
        return notFound();
    }

    return (
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6">
            <section className="rounded-3xl border border-foreground/10 bg-card p-5 shadow-sm">
                <p className="text-sm font-bold text-muted-foreground">작사 평가</p>
                <p className="mt-2 text-xl font-black leading-relaxed md:text-2xl">
                    {profile.headline}
                </p>
            </section>

            <MahjongPlayerHero profile={profile} />

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <MahjongStyleCard style={profile.style} />
                <MahjongRecentRankChart recentRanks={profile.recentRanks} />
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <MahjongWinGraphCard data={profile.winGraph} />
                <MahjongRankGraphCard data={profile.rankRates} />
            </section>

            <MahjongModeDetailCard detailByMode={profile.detailByMode} />

            <MahjongYakuCountList yakuCounts={profile.yakuCounts} />
        </main>
    );
}

function MahjongPlayerHero({
   profile,
}: Readonly<{
    profile: MahjongPlayerProfileData;
}>) {
    return (
        <section className="rounded-3xl border border-foreground/10 bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-foreground/5 text-4xl">
                        {profile.user.avatarImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={profile.user.avatarImageUrl}
                                alt={profile.user.nickname}
                                className="size-full object-cover"
                            />
                        ) : (
                            <span>{profile.user.avatarEmoji ?? "🀄"}</span>
                        )}
                    </div>

                    <div className="min-w-0">
                        <h1 className="truncate text-2xl font-black">
                            {profile.user.nickname}
                        </h1>

                        <div className="mt-2 flex flex-wrap gap-2">
                            {profile.equippedBadges.length > 0 ? (
                                profile.equippedBadges.map((badge) => (
                                    <span
                                        key={badge.id}
                                        className="rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1 text-sm font-bold"
                                        title={badge.name}
                                    >
                    {badge.display} {badge.name}
                  </span>
                                ))
                            ) : (
                                <span className="text-sm text-muted-foreground">
                  장착한 배지가 없습니다.
                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:min-w-72">
                    <StatBox label="MMR" value={profile.mmr.toLocaleString()} />
                    <StatBox label="총점수" value={profile.totalScore.toLocaleString()} />
                </div>
            </div>
        </section>
    );
}

function MahjongStyleCard({
  style,
}: Readonly<{
    style: MahjongPlayerProfileData["style"];
}>) {
    const items = [
        {
            key: "attack",
            label: "공",
            title: "공격",
            description: "화료율, 평균 타점, 1위율, 리치율 기반",
        },
        {
            key: "defense",
            label: "방",
            title: "방어",
            description: "방총률, 4위율, 토비율 기반",
        },
        {
            key: "speed",
            label: "속",
            title: "속도",
            description: "후로율, 화료율 기반",
        },
        {
            key: "luck",
            label: "운",
            title: "운",
            description: "쯔모, 도라, 희귀 역 기반",
        },
    ] as const;

    return (
        <section className="rounded-3xl border border-foreground/10 bg-card p-5 shadow-sm">
            <h2 className="text-xl font-black">스타일</h2>

            <div className="mt-4 grid gap-3">
                {items.map((item) => {
                    const value = style[item.key];

                    return (
                        <div key={item.key}>
                            <div className="mb-1 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <span className="text-lg font-black">{item.label}</span>
                                    <span className="ml-2 font-bold">{item.title}</span>
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                        {item.description}
                                    </p>
                                </div>

                                <span className="font-black text-primary">{value}</span>
                            </div>

                            <div className="h-3 overflow-hidden rounded-full bg-foreground/10">
                                <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${value}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function MahjongRecentRankChart({
    recentRanks,
}: Readonly<{
    recentRanks: MahjongPlayerProfileData["recentRanks"];
}>) {
    const width = 320;
    const height = 160;
    const paddingX = 32;
    const paddingY = 20;

    const points = recentRanks.map((item, index) => {
        const x =
            recentRanks.length <= 1
                ? width / 2
                : paddingX +
                (index * (width - paddingX * 2)) / (recentRanks.length - 1);

        const y = paddingY + ((item.rank - 1) * (height - paddingY * 2)) / 3;

        return {
            ...item,
            x,
            y,
        };
    });

    const polylinePoints = points
        .map((point) => `${point.x},${point.y}`)
        .join(" ");

    return (
        <section className="rounded-3xl border border-foreground/10 bg-card p-5 shadow-sm">
            <div className="flex items-end justify-between gap-3">
                <h2 className="text-xl font-black">대국 기록</h2>
                <p className="text-xs font-bold text-muted-foreground">최근 10국</p>
            </div>

            {recentRanks.length === 0 ? (
                <EmptyText>아직 표시할 대국 기록이 없습니다.</EmptyText>
            ) : (
                <div className="mt-5 overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-3">
                    <svg
                        viewBox={`0 0 ${width} ${height}`}
                        className="h-44 w-full"
                        role="img"
                        aria-label="최근 대국 순위 그래프"
                    >
                        {[1, 2, 3, 4].map((rank) => {
                            const y =
                                paddingY + ((rank - 1) * (height - paddingY * 2)) / 3;

                            return (
                                <g key={rank}>
                                    <line
                                        x1={paddingX}
                                        x2={width - paddingX}
                                        y1={y}
                                        y2={y}
                                        stroke="currentColor"
                                        strokeWidth="1"
                                        strokeOpacity="0.14"
                                        className="text-foreground"
                                    />

                                    <text
                                        x="4"
                                        y={y + 4}
                                        fill="currentColor"
                                        className="text-[10px] font-black text-muted-foreground"
                                    >
                                        {rank}위
                                    </text>
                                </g>
                            );
                        })}

                        {points.length >= 2 ? (
                            <polyline
                                points={polylinePoints}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-primary"
                            />
                        ) : null}

                        {points.map((point, index) => (
                            <g key={`${point.matchId}-${index}`} className="text-primary">
                                <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r="8"
                                    fill="currentColor"
                                    fillOpacity="0.18"
                                />
                                <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r="4.5"
                                    fill="currentColor"
                                />
                                <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r="4.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="text-background"
                                />
                            </g>
                        ))}
                    </svg>

                    <div
                        className="mt-2 grid px-1 text-center text-[10px] font-bold text-muted-foreground md:mx-auto md:w-[calc(100%-6rem)] md:px-0"
                        style={{
                            gridTemplateColumns: `repeat(${recentRanks.length}, minmax(0, 1fr))`,
                        }}
                    >
                        {recentRanks.map((item, index) => (
                            <span
                                key={`${item.matchId}-label-${index}`}
                                className="min-w-0 leading-none"
                            >
                              {item.rank}위
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

function MahjongWinGraphCard({
  data,
}: Readonly<{
    data: MahjongPlayerProfileData["winGraph"];
}>) {
    const items = [
        { key: "riichiRate", label: "리치" },
        { key: "callRate", label: "후로" },
        { key: "damatenRate", label: "다마텐" },
    ] as const;

    return (
        <section className="rounded-3xl border border-foreground/10 bg-card p-5 shadow-sm">
            <h2 className="text-xl font-black">화료 그래프</h2>

            <div className="mt-4 grid gap-3">
                {items.map((item) => (
                    <BarRow
                        key={item.key}
                        label={item.label}
                        value={data[item.key]}
                    />
                ))}
            </div>
        </section>
    );
}

function MahjongRankGraphCard({
  data,
}: Readonly<{
    data: MahjongPlayerProfileData["rankRates"];
}>) {
    const items = [
        { key: "rank1", label: "1위" },
        { key: "rank2", label: "2위" },
        { key: "rank3", label: "3위" },
        { key: "rank4", label: "4위" },
        { key: "tobi", label: "토비" },
    ] as const;

    return (
        <section className="rounded-3xl border border-foreground/10 bg-card p-5 shadow-sm">
            <h2 className="text-xl font-black">순위 그래프</h2>

            <div className="mt-4 grid gap-3">
                {items.map((item) => (
                    <BarRow
                        key={item.key}
                        label={item.label}
                        value={data[item.key]}
                    />
                ))}
            </div>
        </section>
    );
}

function MahjongModeDetailCard({
   detailByMode,
}: Readonly<{
    detailByMode: MahjongPlayerProfileData["detailByMode"];
}>) {
    const entries = Object.entries(detailByMode) as [
        keyof typeof MODE_LABELS,
        MahjongModeDetailStats,
    ][];

    return (
        <section className="rounded-3xl border border-foreground/10 bg-card p-5 shadow-sm">
            <h2 className="text-xl font-black">상세 정보</h2>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {entries.map(([mode, stats]) => (
                    <div
                        key={mode}
                        className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4"
                    >
                        <h3 className="text-lg font-black">{MODE_LABELS[mode]}</h3>

                        {stats.totalGames === 0 ? (
                            <EmptyText>아직 기록이 없습니다.</EmptyText>
                        ) : (
                            <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
                                <DetailStat label="총 대국 수" value={stats.totalGames} />
                                <DetailStat label="평균 순위" value={stats.avgRank.toFixed(2)} />
                                <DetailStat label="1위" value={formatPercent(stats.rank1Rate)} />
                                <DetailStat label="2위" value={formatPercent(stats.rank2Rate)} />
                                <DetailStat label="3위" value={formatPercent(stats.rank3Rate)} />
                                <DetailStat label="4위" value={formatPercent(stats.rank4Rate)} />
                                <DetailStat label="토비" value={formatPercent(stats.tobiRate)} />
                                <DetailStat
                                    label="평균 타점"
                                    value={Math.round(stats.avgWinScore).toLocaleString()}
                                />
                                <DetailStat label="화료" value={formatPercent(stats.agariRate)} />
                                <DetailStat label="쯔모" value={formatPercent(stats.tsumoRate)} />
                                <DetailStat label="방총" value={formatPercent(stats.dealInRate)} />
                                <DetailStat label="리치" value={formatPercent(stats.riichiRate)} />
                                <DetailStat label="후로" value={formatPercent(stats.callRate)} />
                                <DetailStat label="최대 연장" value={stats.maxRenchan} />
                            </dl>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

function MahjongYakuCountList({
  yakuCounts,
}: Readonly<{
    yakuCounts: MahjongPlayerProfileData["yakuCounts"];
}>) {
    return (
        <section className="rounded-3xl border border-foreground/10 bg-card p-5 shadow-sm">
            <h2 className="text-xl font-black">역 완성 횟수</h2>

            {yakuCounts.length === 0 ? (
                <EmptyText>아직 완성한 역 기록이 없습니다.</EmptyText>
            ) : (
                <div className="mt-4 grid gap-2">
                    {yakuCounts.map((item) => (
                        <div
                            key={item.yakuId}
                            className="grid grid-cols-[8rem_1fr_4rem] items-center gap-3 rounded-xl px-2 py-2"
                        >
                            <span className="truncate font-bold">{item.label}</span>
                            <div className="h-px bg-foreground/15" />
                            <span className="text-right font-black text-primary">
                {item.count.toLocaleString()}
              </span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function StatBox({ label, value }: Readonly<{ label: string; value: string | number }>) {
    return (
        <div className="rounded-2xl bg-foreground/5 p-4">
            <p className="text-xs font-bold text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-black">{value}</p>
        </div>
    );
}

function DetailStat({
    label,
    value,
}: Readonly<{
    label: string;
    value: string | number;
}>) {
    return (
        <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-black text-primary">{value}</dd>
        </div>
    );
}

function BarRow({ label, value }: Readonly<{ label: string; value: number }>) {
    return (
        <div className="grid grid-cols-[4rem_1fr_4.5rem] items-center gap-3">
            <span className="font-black">{label}</span>

            <div className="h-4 overflow-hidden rounded-full bg-foreground/10">
                <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                />
            </div>

            <span className="text-right font-black text-primary">
        {formatPercent(value)}
      </span>
        </div>
    );
}

function EmptyText({ children }: Readonly<{ children: React.ReactNode }>) {
    return <p className="mt-4 text-sm text-muted-foreground">{children}</p>;
}

function formatPercent(value: number) {
    return `${value.toFixed(2)}%`;
}