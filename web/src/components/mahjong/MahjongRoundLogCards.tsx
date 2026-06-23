// web/src/components/mahjong/MahjongRoundLogCards.tsx
import { NORMAL_YAKU, SITUATIONAL_YAKU } from "@/constants/yaku";

type MahjongRoundLogCardsProps = {
  details: any;
  playerNameMap?: Record<string, string>;
};

const YAKU_NAME_MAP = Object.fromEntries(
  [...NORMAL_YAKU, ...SITUATIONAL_YAKU].map((yaku) => [yaku.id, yaku.name]),
);

const ROUND_NAME_MAP: Record<string, string> = {
  EAST_1: "동 1국",
  EAST_2: "동 2국",
  EAST_3: "동 3국",
  EAST_4: "동 4국",
  SOUTH_1: "남 1국",
  SOUTH_2: "남 2국",
  SOUTH_3: "남 3국",
  SOUTH_4: "남 4국",
  WEST_1: "서 1국",
  WEST_2: "서 2국",
  WEST_3: "서 3국",
  WEST_4: "서 4국",
  NORTH_1: "북 1국",
  NORTH_2: "북 2국",
  NORTH_3: "북 3국",
  NORTH_4: "북 4국",
};

const WIND_ORDER: Record<string, number> = {
  EAST: 1,
  SOUTH: 2,
  WEST: 3,
  NORTH: 4,
};

function getRoundName(round: string | undefined) {
  if (!round) {
    return "-";
  }

  return ROUND_NAME_MAP[round] ?? round;
}

function getDeltaClassName(delta: number) {
  if (delta > 0) {
    return "text-blue-600 dark:text-blue-400";
  }

  if (delta < 0) {
    return "text-red-500";
  }

  return "text-foreground/50";
}

function formatDelta(delta: number) {
  if (delta > 0) {
    return `+${delta.toLocaleString()}`;
  }

  return delta.toLocaleString();
}

function getYakuLabel(yakuId: string) {
  return YAKU_NAME_MAP[yakuId] ?? yakuId;
}

const SCORE_LINE_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
];

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatScore(value: number) {
  return value.toLocaleString();
}

function buildScoreSnapshots(logs: any[], players: Record<string, any>) {
  const playerKeys = Object.keys(players).sort((aKey, bKey) => {
    const aWind = players[aKey]?.wind;
    const bWind = players[bKey]?.wind;

    return (WIND_ORDER[aWind] ?? 99) - (WIND_ORDER[bWind] ?? 99);
  });

  if (playerKeys.length === 0) {
    return [];
  }

  const firstScoreLog = logs.find(
    (log) => log?.result_scores && log?.score_deltas,
  );

  const initialScores = Object.fromEntries(
    playerKeys.map((playerKey) => {
      const resultScore = firstScoreLog?.result_scores?.[playerKey];
      const scoreDelta = firstScoreLog?.score_deltas?.[playerKey];

      if (isValidNumber(resultScore) && isValidNumber(scoreDelta)) {
        return [playerKey, resultScore - scoreDelta];
      }

      return [playerKey, players[playerKey]?.score ?? 0];
    }),
  );

  const snapshots: {
    label: string;
    scores: Record<string, number>;
  }[] = [
    {
      label: "시작",
      scores: initialScores,
    },
  ];

  let currentScores = { ...initialScores };

  logs.forEach((log) => {
    if (log?.result_scores) {
      currentScores = {
        ...currentScores,
        ...log.result_scores,
      };
    } else if (log?.score_deltas) {
      currentScores = Object.fromEntries(
        playerKeys.map((playerKey) => [
          playerKey,
          (currentScores[playerKey] ?? 0) + (log.score_deltas[playerKey] ?? 0),
        ]),
      );
    }

    snapshots.push({
      label: `${getRoundName(log.round)} ${log.honba ?? 0}본장`,
      scores: { ...currentScores },
    });
  });

  return snapshots;
}

function MahjongScoreTrendChart({
  logs,
  players,
  getPlayerName,
}: {
  logs: any[];
  players: Record<string, any>;
  getPlayerName: (key: string) => string;
}) {
  const playerKeys = Object.keys(players).sort((aKey, bKey) => {
    const aWind = players[aKey]?.wind;
    const bWind = players[bKey]?.wind;

    return (WIND_ORDER[aWind] ?? 99) - (WIND_ORDER[bWind] ?? 99);
  });

  const snapshots = buildScoreSnapshots(logs, players);

  if (playerKeys.length === 0 || snapshots.length <= 1) {
    return (
      <div className="bg-foreground/5 p-5 rounded-2xl border border-foreground/10 space-y-2">
        <h3 className="text-xl font-black">작사별 점수 그래프</h3>
        <p className="text-sm font-bold text-foreground/50">
          아직 점수 변동 기록이 없습니다.
        </p>
      </div>
    );
  }

  const allScores = snapshots.flatMap((snapshot) =>
    playerKeys.map((playerKey) => snapshot.scores[playerKey] ?? 0),
  );

  const minScore = Math.min(...allScores);
  const maxScore = Math.max(...allScores);
  const scorePadding = 1000;

  const chartMin = minScore - scorePadding;
  const chartMax = maxScore + scorePadding;
  const scoreRange = chartMax - chartMin || 1;

  const width = 360;
  const height = 220;
  const padding = {
    top: 18,
    right: 18,
    bottom: 42,
    left: 54,
  };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const getX = (index: number) => {
    if (snapshots.length === 1) {
      return padding.left + plotWidth / 2;
    }

    return padding.left + (index / (snapshots.length - 1)) * plotWidth;
  };

  const getY = (score: number) => {
    return padding.top + ((chartMax - score) / scoreRange) * plotHeight;
  };

  const yTicks = [chartMax, (chartMax + chartMin) / 2, chartMin];

  return (
    <div className="bg-foreground/5 p-5 rounded-2xl border border-foreground/10 space-y-4">
      <div>
        <h3 className="text-xl font-black">작사별 점수 그래프</h3>
        <p className="text-sm font-bold text-foreground/50 mt-1">
          국 진행에 따른 점수 변화를 보여줍니다.
        </p>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[320px]"
          role="img"
          aria-label="작사별 점수 변화 그래프"
        >
          {yTicks.map((tick) => {
            const y = getY(tick);

            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  className="text-foreground/10"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-current text-[10px] text-foreground/40 font-bold"
                >
                  {Math.round(tick).toLocaleString()}
                </text>
              </g>
            );
          })}

          {playerKeys.map((playerKey, playerIndex) => {
            const points = snapshots
              .map((snapshot, snapshotIndex) => {
                const score = snapshot.scores[playerKey] ?? 0;

                return `${getX(snapshotIndex)},${getY(score)}`;
              })
              .join(" ");

            return (
              <g key={playerKey}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={SCORE_LINE_COLORS[playerIndex % SCORE_LINE_COLORS.length]}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {snapshots.map((snapshot, snapshotIndex) => {
                  const score = snapshot.scores[playerKey] ?? 0;

                  return (
                    <circle
                      key={`${playerKey}-${snapshotIndex}`}
                      cx={getX(snapshotIndex)}
                      cy={getY(score)}
                      r="3.5"
                      fill={SCORE_LINE_COLORS[playerIndex % SCORE_LINE_COLORS.length]}
                    />
                  );
                })}
              </g>
            );
          })}

          <text
            x={padding.left}
            y={height - 16}
            textAnchor="start"
            className="fill-current text-[10px] text-foreground/40 font-bold"
          >
            {snapshots[0]?.label}
          </text>

          <text
            x={width - padding.right}
            y={height - 16}
            textAnchor="end"
            className="fill-current text-[10px] text-foreground/40 font-bold"
          >
            {snapshots[snapshots.length - 1]?.label}
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {playerKeys.map((playerKey, index) => {
          const latestScore =
            snapshots[snapshots.length - 1]?.scores[playerKey] ?? 0;

          return (
            <div
              key={playerKey}
              className="flex items-center gap-2 bg-background/60 rounded-xl p-2 border border-foreground/5"
            >
              <span
                className="size-3 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    SCORE_LINE_COLORS[index % SCORE_LINE_COLORS.length],
                }}
              />
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">
                  {getPlayerName(playerKey)}
                </div>
                <div className="text-xs font-black text-foreground/50">
                  {formatScore(latestScore)}점
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MahjongRoundLogCards({
  details,
  playerNameMap = {},
}: MahjongRoundLogCardsProps) {
  const logs = Array.isArray(details?.logs) ? details.logs : [];
  const players = details?.players ?? {};

  const getPlayerName = (key: string | null | undefined) => {
    if (!key) {
      return "-";
    }

    return playerNameMap[key] ?? players[key]?.name ?? key;
  };

  const getSortedScoreDeltas = (scoreDeltas: Record<string, number> = {}) => {
    return Object.entries(scoreDeltas).sort(([aKey], [bKey]) => {
      const aWind = players[aKey]?.wind;
      const bWind = players[bKey]?.wind;

      return (WIND_ORDER[aWind] ?? 99) - (WIND_ORDER[bWind] ?? 99);
    });
  };

return (
    <section className="w-full max-w-2xl mx-auto space-y-6">
      <MahjongScoreTrendChart
        logs={logs}
        players={players}
        getPlayerName={getPlayerName}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black">국별 기록</h3>
          <span className="text-sm font-bold text-foreground/50">
            {logs.length}건
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="bg-foreground/5 p-6 rounded-2xl border border-foreground/10 text-center text-sm font-bold text-foreground/50">
            아직 기록된 국이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log: any, index: number) => {
              const isAgari = log.type === "AGARI";
              const isRyuukyoku = log.type === "RYUUKYOKU";
              const isYakuman = isAgari && Number(log.han ?? 0) >= 13;

              const scoreDeltas = getSortedScoreDeltas(log.score_deltas ?? {});
              const yakuLabels = Array.isArray(log.selected_yaku_ids)
                ? log.selected_yaku_ids.map((yakuId: string) => getYakuLabel(yakuId))
                : [];

              return (
                <article
                  key={`${log.timestamp ?? index}-${log.round ?? "round"}`}
                  className="bg-foreground/5 p-4 rounded-2xl border border-foreground/10 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black">
                          {getRoundName(log.round)} {log.honba ?? 0}본장
                        </span>

                        {isAgari && (
                          <span className="text-xs font-black px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            {log.is_tsumo ? "쯔모" : "론"}
                          </span>
                        )}

                        {isRyuukyoku && (
                          <span className="text-xs font-black px-2 py-1 rounded-full bg-foreground/10 text-foreground/60 border border-foreground/10">
                            유국
                          </span>
                        )}

                        {isYakuman && (
                          <span className="text-xs font-black px-2 py-1 rounded-full bg-red-500 text-white">
                            역만
                          </span>
                        )}
                      </div>

                      {isAgari && (
                        <p className="text-sm font-bold text-foreground/60">
                          화료자 {getPlayerName(log.winner_key)}
                          {!log.is_tsumo && (
                            <>
                              {" "}
                              / 방총자 {getPlayerName(log.loser_key)}
                            </>
                          )}
                        </p>
                      )}

                      {isRyuukyoku && (
                        <p className="text-sm font-bold text-foreground/60">
                          {log.ryuukyoku_type ?? "유국"}
                        </p>
                      )}
                    </div>

                    {isAgari && (
                      <div className="text-right">
                        <div className="text-xl font-black">{log.han ?? 0}판</div>
                        <div className="text-xs font-bold text-foreground/50">
                          도라 {log.dora_total ?? 0}
                        </div>
                      </div>
                    )}
                  </div>

                  {scoreDeltas.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-foreground/50">
                        점수 변동
                      </h4>

                      <div className="grid grid-cols-2 gap-2">
                        {scoreDeltas.map(([playerKey, delta]) => (
                          <div
                            key={playerKey}
                            className="bg-background/60 rounded-xl p-3 border border-foreground/5"
                          >
                            <div className="text-xs font-bold text-foreground/50 truncate">
                              {getPlayerName(playerKey)}
                            </div>
                            <div
                              className={`text-lg font-black ${getDeltaClassName(
                                delta,
                              )}`}
                            >
                              {formatDelta(delta)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isAgari && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-foreground/50">
                        화료 역
                      </h4>

                      {yakuLabels.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {yakuLabels.map((yakuLabel: string) => (
                            <span
                              key={yakuLabel}
                              className="text-xs font-bold px-2 py-1 rounded-full bg-background border border-foreground/10"
                            >
                              {yakuLabel}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-foreground/40">
                          기록된 역이 없습니다.
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}