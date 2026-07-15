// web/src/components/mahjong/MahjongRoundLogCards.tsx

import {
  NORMAL_YAKU,
  SITUATIONAL_YAKU,
} from "@/features/games/mahjong/constants/yaku";

type MahjongRoundLogCardsDetails = {
  players?: Record<string, MahjongPlayerState>;
  logs?: MahjongRoundLog[];
};

type MahjongRoundLogCardsProps = {
  details: MahjongRoundLogCardsDetails;
  playerNameMap?: Record<string, string>;
};

type ScoreMap = Record<string, number>;

type MahjongPlayerState = {
  wind: "EAST" | "SOUTH" | "WEST" | "NORTH";
  score: number;
  name?: string;
};

type MahjongWinLog = {
  winner_key: string;
  loser_key: string | null;
  base_score: number;
  han: number;
  fu?: number | null;
  dora_total: number;
  selected_yaku_ids: string[];
  limit_name?: string;
  score_deltas?: ScoreMap;
};

type MahjongRoundLog = {
  timestamp?: string;
  type?: "AGARI" | "RYUUKYOKU" | "CHOMBO" | string;
  round?: string;
  honba?: number;
  is_tsumo?: boolean;
  wins?: MahjongWinLog[];

  // 유국
  ryuukyoku_type?: string;
  tenpai_keys?: string[];
  nagashi_mangan_winner_keys?: string[];

  // 촌보
  chombo_player_key?: string;
  chombo_penalty_rule?:
    | "MANGAN_PAYMENT"
    | "LIGHT_1000"
    | string;
  cancelled_riichi_keys?: string[];

  // 점수
  score_deltas?: ScoreMap;
  result_scores?: ScoreMap;
};

const ALL_YAKU = [...NORMAL_YAKU, ...SITUATIONAL_YAKU];

type Yaku = (typeof ALL_YAKU)[number];

const YAKU_NAME_MAP = Object.fromEntries(
    ALL_YAKU.map((yaku: Yaku) => [yaku.id, yaku.name]),
) as Record<string, string>;

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

const SCORE_LINE_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
];

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

function formatScore(value: number) {
  return value.toLocaleString();
}

function getYakuLabel(yakuId: string) {
  return YAKU_NAME_MAP[yakuId] ?? yakuId;
}

function isValidNumber(value: unknown): value is number {
  return (
      typeof value === "number" &&
      Number.isFinite(value)
  );
}

function getLogs(
    details: MahjongRoundLogCardsDetails,
): MahjongRoundLog[] {
  const logs = details?.logs ?? [];

  return Array.isArray(logs) ? logs : [];
}

function getScoreDeltas(log: MahjongRoundLog): ScoreMap {
  return log.score_deltas ?? {};
}

function getResultScores(
    log: MahjongRoundLog,
): ScoreMap | null {
  return log.result_scores ?? null;
}

function getIsTsumo(log: MahjongRoundLog) {
  return Boolean(log.is_tsumo);
}

function getRyuukyokuType(log: MahjongRoundLog) {
  return log.ryuukyoku_type ?? "유국";
}

function getTenpaiKeys(log: MahjongRoundLog) {
  return log.tenpai_keys ?? [];
}

function getNagashiManganWinnerKeys(
    log: MahjongRoundLog,
) {
  if (
      Array.isArray(log.nagashi_mangan_winner_keys) &&
      log.nagashi_mangan_winner_keys.length > 0
  ) {
    return log.nagashi_mangan_winner_keys;
  }

  return [];
}

function getCancelledRiichiKeys(
    log: MahjongRoundLog,
) {
  if (Array.isArray(log.cancelled_riichi_keys)) {
    return log.cancelled_riichi_keys;
  }

  return [];
}

function getLogWins(
    log: MahjongRoundLog,
): MahjongWinLog[] {
  return Array.isArray(log.wins) ? log.wins : [];
}

function getWinScoreLabel(win: MahjongWinLog) {
  if (
      win.limit_name &&
      win.limit_name !== "일반"
  ) {
    return win.limit_name;
  }

  if (typeof win.fu === "number") {
    return `${win.fu}부 ${win.han}판`;
  }

  return `${win.han}판`;
}

function getScoreSnapshotLabel(log: MahjongRoundLog) {
  const baseLabel =
      `${getRoundName(log.round)} ${log.honba ?? 0}본장`;

  if (
    log.type === "CHOMBO" &&
    log.chombo_penalty_rule === "LIGHT_1000"
  ) {
    return `${baseLabel} 반칙`;
  }

  if (log.type === "CHOMBO") {
    return `${baseLabel} 촌보`;
  }

  return baseLabel;
}

function buildScoreSnapshots(
    logs: MahjongRoundLog[],
    players: Record<string, MahjongPlayerState>,
) {
  const playerKeys = Object.keys(players).sort(
      (aKey, bKey) => {
        const aWind = players[aKey]?.wind;
        const bWind = players[bKey]?.wind;

        return (
            (WIND_ORDER[aWind] ?? 99) -
            (WIND_ORDER[bWind] ?? 99)
        );
      },
  );

  if (playerKeys.length === 0) {
    return [];
  }

  const firstScoreLog = logs.find((log) => {
    const resultScores = getResultScores(log);
    const scoreDeltas = getScoreDeltas(log);

    return (
        resultScores &&
        Object.keys(scoreDeltas).length > 0
    );
  });

  const firstResultScores = firstScoreLog
      ? getResultScores(firstScoreLog)
      : null;

  const firstScoreDeltas = firstScoreLog
      ? getScoreDeltas(firstScoreLog)
      : {};

  const initialScores = Object.fromEntries(
      playerKeys.map((playerKey) => {
        const resultScore =
            firstResultScores?.[playerKey];

        const scoreDelta =
            firstScoreDeltas?.[playerKey];

        if (
            isValidNumber(resultScore) &&
            isValidNumber(scoreDelta)
        ) {
          return [
            playerKey,
            resultScore - scoreDelta,
          ];
        }

        return [
          playerKey,
          players[playerKey]?.score ?? 0,
        ];
      }),
  ) as ScoreMap;

  const snapshots: {
    label: string;
    scores: ScoreMap;
  }[] = [
    {
      label: "시작",
      scores: initialScores,
    },
  ];

  let currentScores = {
    ...initialScores,
  };

  logs.forEach((log) => {
    const resultScores = getResultScores(log);
    const scoreDeltas = getScoreDeltas(log);

    if (resultScores) {
      currentScores = {
        ...currentScores,
        ...resultScores,
      };
    } else if (
        Object.keys(scoreDeltas).length > 0
    ) {
      currentScores = Object.fromEntries(
          playerKeys.map((playerKey) => [
            playerKey,
            (currentScores[playerKey] ?? 0) +
            (scoreDeltas[playerKey] ?? 0),
          ]),
      ) as ScoreMap;
    }

    snapshots.push({
      label: getScoreSnapshotLabel(log),
      scores: {
        ...currentScores,
      },
    });
  });

  return snapshots;
}

function MahjongScoreTrendChart({
                                  logs,
                                  players,
                                  getPlayerName,
                                }: Readonly<{
  logs: MahjongRoundLog[];
  players: Record<string, MahjongPlayerState>;
  getPlayerName: (key: string) => string;
}>) {
  const playerKeys = Object.keys(players).sort(
      (aKey, bKey) => {
        const aWind = players[aKey]?.wind;
        const bWind = players[bKey]?.wind;

        return (
            (WIND_ORDER[aWind] ?? 99) -
            (WIND_ORDER[bWind] ?? 99)
        );
      },
  );

  const snapshots = buildScoreSnapshots(
      logs,
      players,
  );

  if (
      playerKeys.length === 0 ||
      snapshots.length <= 1
  ) {
    return (
        <section className="rounded-2xl border border-foreground/10 bg-foreground/5 p-4">
          <h3 className="font-bold">
            작사별 점수 그래프
          </h3>

          <p className="mt-3 text-sm text-foreground/50">
            아직 점수 변동 기록이 없습니다.
          </p>
        </section>
    );
  }

  const allScores = snapshots.flatMap(
      (snapshot) =>
          playerKeys.map(
              (playerKey) =>
                  snapshot.scores[playerKey] ?? 0,
          ),
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

  const plotWidth =
      width - padding.left - padding.right;

  const plotHeight =
      height - padding.top - padding.bottom;

  const getX = (index: number) => {
    if (snapshots.length === 1) {
      return padding.left + plotWidth / 2;
    }

    return (
        padding.left +
        (index / (snapshots.length - 1)) *
        plotWidth
    );
  };

  const getY = (score: number) => {
    return (
        padding.top +
        ((chartMax - score) / scoreRange) *
        plotHeight
    );
  };

  const yTicks = [
    chartMax,
    (chartMax + chartMin) / 2,
    chartMin,
  ];

  return (
      <section className="rounded-2xl border border-foreground/10 bg-foreground/5 p-4">
        <div>
          <h3 className="font-bold">
            작사별 점수 그래프
          </h3>

          <p className="mt-1 text-xs text-foreground/50">
            국 진행에 따른 점수 변화를 보여줍니다.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-auto min-w-[360px] w-full"
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
                        strokeOpacity={0.1}
                        strokeWidth={1}
                    />

                    <text
                        x={padding.left - 8}
                        y={y + 4}
                        textAnchor="end"
                        fontSize={10}
                        fill="currentColor"
                        opacity={0.55}
                    >
                      {Math.round(tick).toLocaleString()}
                    </text>
                  </g>
              );
            })}

            {playerKeys.map(
                (playerKey, playerIndex) => {
                  const color =
                      SCORE_LINE_COLORS[
                      playerIndex %
                      SCORE_LINE_COLORS.length
                          ];

                  const points = snapshots
                      .map((snapshot, snapshotIndex) => {
                        const score =
                            snapshot.scores[playerKey] ?? 0;

                        return `${getX(snapshotIndex)},${getY(score)}`;
                      })
                      .join(" ");

                  return (
                      <g key={playerKey}>
                        <polyline
                            fill="none"
                            stroke={color}
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={points}
                        />

                        {snapshots.map(
                            (snapshot, snapshotIndex) => {
                              const score =
                                  snapshot.scores[
                                      playerKey
                                      ] ?? 0;

                              return (
                                  <circle
                                      key={`${playerKey}-${snapshotIndex}`}
                                      cx={getX(snapshotIndex)}
                                      cy={getY(score)}
                                      r={3}
                                      fill={color}
                                  >
                                    <title>
                                      {`${getPlayerName(playerKey)} · ${snapshot.label} · ${formatScore(score)}점`}
                                    </title>
                                  </circle>
                              );
                            },
                        )}
                      </g>
                  );
                },
            )}

            <text
                x={padding.left}
                y={height - 12}
                textAnchor="start"
                fontSize={10}
                fill="currentColor"
                opacity={0.55}
            >
              {snapshots[0]?.label}
            </text>

            <text
                x={width - padding.right}
                y={height - 12}
                textAnchor="end"
                fontSize={10}
                fill="currentColor"
                opacity={0.55}
            >
              {
                snapshots[
                snapshots.length - 1
                    ]?.label
              }
            </text>
          </svg>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {playerKeys.map((playerKey, index) => {
            const latestScore =
                snapshots[snapshots.length - 1]
                    ?.scores[playerKey] ?? 0;

            const color =
                SCORE_LINE_COLORS[
                index % SCORE_LINE_COLORS.length
                    ];

            return (
                <div
                    key={playerKey}
                    className="rounded-xl border border-foreground/10 bg-background/60 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: color,
                    }}
                />

                    <p className="min-w-0 truncate text-xs font-bold">
                      {getPlayerName(playerKey)}
                    </p>
                  </div>

                  <p className="mt-1 text-right text-sm font-black tabular-nums">
                    {formatScore(latestScore)}점
                  </p>
                </div>
            );
          })}
        </div>
      </section>
  );
}

export default function MahjongRoundLogCards({
                                               details,
                                               playerNameMap = {},
                                             }: Readonly<MahjongRoundLogCardsProps>) {
  const logs = getLogs(details);

  const players = (
      details?.players ?? {}
  ) as Record<string, MahjongPlayerState>;

  const getPlayerName = (
      key: string | null | undefined,
  ) => {
    if (!key) {
      return "-";
    }

    return (
        playerNameMap[key] ??
        players[key]?.name ??
        key
    );
  };

  const getSortedScoreDeltas = (
      scoreDeltas: ScoreMap = {},
  ) => {
    return Object.entries(scoreDeltas).sort(
        ([aKey], [bKey]) => {
          const aWind = players[aKey]?.wind;
          const bWind = players[bKey]?.wind;

          return (
              (WIND_ORDER[aWind] ?? 99) -
              (WIND_ORDER[bWind] ?? 99)
          );
        },
    );
  };

  return (
      <div className="space-y-4">
        <MahjongScoreTrendChart
            logs={logs}
            players={players}
            getPlayerName={getPlayerName}
        />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">
              국별 기록
            </h3>

            <span className="text-xs text-foreground/50">
            {logs.length}건
          </span>
          </div>

          {logs.length === 0 ? (
              <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-5 text-center text-sm text-foreground/50">
                아직 기록된 국이 없습니다.
              </div>
          ) : (
              <div className="space-y-3">
                {logs.map((log, index) => {
                  const isAgari =
                      log.type === "AGARI";

                  const isRyuukyoku =
                      log.type === "RYUUKYOKU";

                  const isChombo =
                      log.type === "CHOMBO";

                  const isLightChombo =
                      isChombo &&
                      log.chombo_penalty_rule === "LIGHT_1000";

                  const isTsumo =
                      getIsTsumo(log);

                  const wins =
                      getLogWins(log);

                  const scoreDeltas =
                      getSortedScoreDeltas(
                          getScoreDeltas(log),
                      );

                  const isDoubleRon =
                      isAgari &&
                      !isTsumo &&
                      wins.length > 1;

                  const isYakuman = wins.some(
                      (win) =>
                          win.han >= 13 ||
                          win.limit_name === "역만" ||
                          win.limit_name ===
                          "더블역만" ||
                          win.limit_name ===
                          "트리플역만" ||
                          win.limit_name ===
                          "수역만",
                  );

                  const cancelledRiichiKeys =
                      getCancelledRiichiKeys(log);

                  return (
                      <article
                          key={`${log.timestamp ?? index}-${index}`}
                          className="rounded-2xl border border-foreground/10 bg-foreground/5 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-black">
                            {getRoundName(log.round)}{" "}
                            {log.honba ?? 0}본장
                          </h4>

                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {isAgari && (
                                <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                                  {isTsumo
                                      ? "쯔모"
                                      : isDoubleRon
                                          ? "더블 론"
                                          : "론"}
                                </span>
                            )}

                            {isRyuukyoku && (
                                <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-600 dark:text-orange-400">
                                  유국
                                </span>
                            )}

                              {isChombo && (
                                  <span
                                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                          isLightChombo
                                              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                                      }`}
                                  >
                                    {isLightChombo ? "경미한 반칙" : "촌보"}
                                  </span>
                              )}

                            {isYakuman && (
                                <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-purple-600 dark:text-purple-400">
                                  역만
                                </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 space-y-3">
                          {isAgari &&
                              wins.length > 0 && (
                                  <p className="text-sm font-bold">
                                    {wins
                                        .map((win) =>
                                            getPlayerName(
                                                win.winner_key,
                                            ),
                                        )
                                        .join(", ")}{" "}
                                    화료
                                    {!isTsumo &&
                                        wins[0]?.loser_key && (
                                            <>
                                              {" "}
                                              / 방총자{" "}
                                              {getPlayerName(
                                                  wins[0]
                                                      .loser_key,
                                              )}
                                            </>
                                        )}
                                  </p>
                              )}

                          {isRyuukyoku && (
                              <div className="space-y-1 text-sm">
                                <p className="font-bold">
                                  {getRyuukyokuType(log)}
                                </p>

                                {getNagashiManganWinnerKeys(
                                    log,
                                ).length > 0 && (
                                    <p className="text-foreground/60">
                                      유국만관:{" "}
                                      {getNagashiManganWinnerKeys(
                                          log,
                                      )
                                          .map((key) =>
                                              getPlayerName(key),
                                          )
                                          .join(", ")}
                                    </p>
                                )}

                                {getTenpaiKeys(log)
                                    .length > 0 && (
                                    <p className="text-foreground/60">
                                      텐파이:{" "}
                                      {getTenpaiKeys(log)
                                          .map((key) =>
                                              getPlayerName(key),
                                          )
                                          .join(", ")}
                                    </p>
                                )}
                              </div>
                          )}

                          {isChombo && (
                              <div className="space-y-1 text-sm">
                                  <p className="font-bold">
                                      {getPlayerName(log.chombo_player_key)}{" "}
                                      {isLightChombo ? "경미한 반칙" : "촌보"}
                                  </p>

                                  {isLightChombo ? (
                                      <>
                                          <p className="text-foreground/60">
                                              나머지 작사에게 각각 1,000점 지급
                                          </p>

                                          <p className="text-foreground/60">
                                              반칙자 총 3,000점 차감
                                          </p>

                                          <p className="text-foreground/60">
                                              공탁 리치봉 변동 없음
                                          </p>

                                          <p className="text-foreground/60">
                                              현재 국·본장·친을 유지하고 그대로 진행
                                          </p>
                                      </>
                                  ) : (
                                      <>
                                          <p className="text-foreground/60">
                                              만관 지불 · 현재 국, 본장과 친을 유지하고 재배패
                                          </p>

                                          {cancelledRiichiKeys.length > 0 && (
                                              <p className="text-foreground/60">
                                                  취소된 리치:{" "}
                                                  {cancelledRiichiKeys
                                                      .map((key) => getPlayerName(key))
                                                      .join(", ")}
                                              </p>
                                          )}
                                      </>
                                  )}
                              </div>
                          )}

                          {isAgari &&
                              wins.length > 0 && (
                                  <div className="rounded-xl border border-foreground/10 bg-background/60 px-3 py-2">
                                    <p className="font-black">
                                      {wins.length > 1
                                          ? `${wins.length}명`
                                          : getWinScoreLabel(
                                              wins[0],
                                          )}
                                    </p>

                                    <p className="mt-0.5 text-xs text-foreground/50">
                                      {wins.length > 1
                                          ? "동시 화료"
                                          : `도라 ${wins[0].dora_total}`}
                                    </p>
                                  </div>
                              )}

                          {scoreDeltas.length > 0 && (
                              <section>
                                <h5 className="text-xs font-bold text-foreground/60">
                                  점수 변동
                                </h5>

                                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                  {scoreDeltas.map(
                                      ([
                                         playerKey,
                                         delta,
                                       ]) => (
                                          <div
                                              key={playerKey}
                                              className="rounded-xl border border-foreground/10 bg-background/60 px-3 py-2"
                                          >
                                            <p className="truncate text-xs font-bold">
                                              {getPlayerName(
                                                  playerKey,
                                              )}
                                            </p>

                                            <p
                                                className={`mt-1 text-right text-sm font-black tabular-nums ${getDeltaClassName(delta)}`}
                                            >
                                              {formatDelta(
                                                  delta,
                                              )}
                                            </p>
                                          </div>
                                      ),
                                  )}
                                </div>
                              </section>
                          )}

                          {isAgari &&
                              wins.length > 0 && (
                                  <section>
                                    <h5 className="text-xs font-bold text-foreground/60">
                                      화료 상세
                                    </h5>

                                    <div className="mt-2 space-y-2">
                                      {wins.map(
                                          (
                                              win,
                                              winIndex,
                                          ) => {
                                            const yakuLabels =
                                                win.selected_yaku_ids.map(
                                                    (yakuId) =>
                                                        getYakuLabel(
                                                            yakuId,
                                                        ),
                                                );

                                            return (
                                                <div
                                                    key={`${win.winner_key}-${winIndex}`}
                                                    className="rounded-xl border border-foreground/10 bg-background/60 p-3"
                                                >
                                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                      <p className="font-bold">
                                                        {getPlayerName(
                                                            win.winner_key,
                                                        )}
                                                      </p>

                                                      {!isTsumo && (
                                                          <p className="mt-0.5 text-xs text-foreground/50">
                                                            방총자{" "}
                                                            {getPlayerName(
                                                                win.loser_key,
                                                            )}
                                                          </p>
                                                      )}
                                                    </div>

                                                    <div className="text-right">
                                                      <p className="font-black tabular-nums">
                                                        {win.base_score.toLocaleString()}
                                                        점
                                                      </p>

                                                      <p className="mt-0.5 text-xs text-foreground/50">
                                                        {getWinScoreLabel(
                                                            win,
                                                        )}{" "}
                                                        · 도라{" "}
                                                        {
                                                          win.dora_total
                                                        }
                                                      </p>
                                                    </div>
                                                  </div>

                                                  {yakuLabels.length >
                                                  0 ? (
                                                      <div className="mt-3 flex flex-wrap gap-1.5">
                                                        {yakuLabels.map(
                                                            (
                                                                yakuLabel,
                                                                yakuIndex,
                                                            ) => (
                                                                <span
                                                                    key={`${yakuLabel}-${yakuIndex}`}
                                                                    className="rounded-full bg-foreground/5 px-2 py-1 text-xs font-bold"
                                                                >
                                                                  {
                                                                    yakuLabel
                                                                  }
                                                                </span>
                                                            ),
                                                        )}
                                                      </div>
                                                  ) : (
                                                      <p className="mt-3 text-xs text-foreground/50">
                                                        기록된 역이
                                                        없습니다.
                                                      </p>
                                                  )}
                                                </div>
                                            );
                                          },
                                      )}
                                    </div>
                                  </section>
                              )}
                        </div>
                      </article>
                  );
                })}
              </div>
          )}
        </section>
      </div>
  );
}