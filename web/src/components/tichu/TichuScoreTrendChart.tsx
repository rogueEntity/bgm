"use client";

import { useEffect, useRef, useState } from "react";

type TichuRoundScore = {
    round?: number;
    score_deltas?: { TEAM_A?: number; TEAM_B?: number };
    total_scores?: { TEAM_A?: number; TEAM_B?: number };
};

type TichuScoreTrendChartProps = {
    logs: TichuRoundScore[];
    teamAName: string;
    teamBName: string;
};

export default function TichuScoreTrendChart({
    logs,
    teamAName,
    teamBName,
}: Readonly<TichuScoreTrendChartProps>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(360);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) return;

        const updateWidth = () => setContainerWidth(Math.round(container.clientWidth));
        updateWidth();

        const observer = new ResizeObserver(updateWidth);
        observer.observe(container);

        return () => observer.disconnect();
    }, []);

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
    const width = Math.max(360, containerWidth, 80 + (snapshots.length - 1) * 40);
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
        <section className="min-w-0 shrink-0 rounded-3xl border border-foreground/10 bg-background p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <h3 className="text-sm font-black">팀별 점수 그래프</h3>
                {teams.map((team) => (
                    <span key={team.scoreKey} className="flex items-center gap-1 text-xs font-bold">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
                        {team.name}
                    </span>
                ))}
            </div>
            <div ref={containerRef} className="mt-1 min-w-0 overflow-x-auto">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    width={width}
                    height={height}
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
