// web/src/app/(main)/mahjong/play/[id]/ScoreForm.tsx

"use client";

import React, { useEffect, useMemo, useState, } from "react";
import { useRouter } from "next/navigation";

import {
  NORMAL_YAKU,
  SITUATIONAL_YAKU,
} from "@/features/games/mahjong/constants/yaku";
import {
  calculateTotalHan,
  getValidatedYakuList,
} from "@/features/games/mahjong/lib/yaku-calc";
import {
  calculateMahjongScore,
  getRecommendedFuOptions,
} from "@/features/games/mahjong/lib/score";
import {
  recordMahjongChombo,
  recordMahjongResult,
  recordRyuukyoku,
} from "@/app/actions/mahjong.action";
import MahjongHandInput from "@/components/mahjong/hand/MahjongHandInput";

import type {
  MahjongChomboPenaltyRule,
  MahjongWind,
} from "@/features/games/mahjong/types";
import type {
  MahjongHandDraft,
  MahjongWinInputMode,
} from "@/features/games/mahjong/lib/hand/types";

import MahjongHandResult from "@/components/mahjong/hand/MahjongHandResult";

import {
  calculateMahjongHandDraftScore,
} from "@/features/games/mahjong/lib/hand/hand-score-calculator";

interface Player {
  name: string;
  wind: string;
  stateKey: string;
}

type WinFormState = {
  winner_key: string;

  input_mode: MahjongWinInputMode;
  hand: MahjongHandDraft;

  is_menzen: boolean;
  dora_indicator: number;
  red_dora: number;
  selected_yaku_ids: string[];
  fu: number | "";
};

type RyuukyokuType =
    | "황패유국"
    | "구종구패"
    | "사풍연타"
    | "사개깡"
    | "사가리치"
    | "삼가화"
    | "유국만관";

const ALL_YAKU = [
  ...NORMAL_YAKU,
  ...SITUATIONAL_YAKU,
];

type Yaku = (typeof ALL_YAKU)[number];

const RYUUKYOKU_TYPES: RyuukyokuType[] = [
  "황패유국",
  "구종구패",
  "사풍연타",
  "사개깡",
  "사가리치",
  "삼가화",
  "유국만관",
];

const TSUMO_ONLY_YAKU_NAMES = new Set([
  "멘젠쯔모",
  "해저로월",
  "영상개화",
]);

const RON_ONLY_YAKU_NAMES = new Set([
  "하저로어",
  "창깡",
]);

const CHIITOITSU_YAKU_IDS = new Set([
  "chiitoitsu",
  "chitoitsu",
  "seven_pairs",
]);

const CHIITOITSU_YAKU_NAMES = new Set([
  "치또이쯔",
  "치토이츠",
  "칠대자",
]);

function isChiitoitsuYaku(yaku: Yaku | undefined) {
  if (!yaku) return false;

  return (
      CHIITOITSU_YAKU_IDS.has(yaku.id) ||
      CHIITOITSU_YAKU_NAMES.has(yaku.name)
  );
}

function getWindLabel(wind: string) {
  if (wind === "EAST") return "東";
  if (wind === "SOUTH") return "南";
  if (wind === "WEST") return "西";

  return "北";
}

function getRoundWind(
    currentRound: string,
): MahjongWind {
  if (currentRound.startsWith("SOUTH")) {
    return "SOUTH";
  }

  if (currentRound.startsWith("WEST")) {
    return "WEST";
  }

  if (currentRound.startsWith("NORTH")) {
    return "NORTH";
  }

  return "EAST";
}

function toMahjongWind(
    wind: string,
): MahjongWind {
  if (
      wind === "EAST" ||
      wind === "SOUTH" ||
      wind === "WEST" ||
      wind === "NORTH"
  ) {
    return wind;
  }

  return "EAST";
}

function createDefaultHandDraft({
                                  winnerKey,
                                  players,
                                  currentRound,
                                  isTsumo,
                                }: {
  winnerKey: string;
  players: Player[];
  currentRound: string;
  isTsumo: boolean;
}): MahjongHandDraft {
  const winner = players.find(
      (player) => player.stateKey === winnerKey,
  );

  return {
    concealed_tiles: [],
    winning_tile: null,
    melds: [],

    dora_indicators: [],
    ura_dora_indicators: [],

    win_method: isTsumo
        ? "TSUMO"
        : "RON",

    round_wind: getRoundWind(currentRound),

    seat_wind: toMahjongWind(
        winner?.wind ?? "EAST",
    ),

    situation: {
      riichi: false,
      double_riichi: false,
      ippatsu: false,

      rinshan: false,
      chankan: false,
      haitei: false,
      houtei: false,

      tenhou: false,
      chiihou: false,
    },
  };
}

function createDefaultWin({
                            winnerKey,
                            players,
                            currentRound,
                            isTsumo,
                          }: {
  winnerKey: string;
  players: Player[];
  currentRound: string;
  isTsumo: boolean;
}): WinFormState {
  return {
    winner_key: winnerKey,

    input_mode: "YAKU_FU",

    hand: createDefaultHandDraft({
      winnerKey,
      players,
      currentRound,
      isTsumo,
    }),

    is_menzen: true,
    dora_indicator: 0,
    red_dora: 0,
    selected_yaku_ids: [],
    fu: 30,
  };
}

export default function ScoreForm({
                                    matchId,
                                    players,
                                    currentRound,
                                    honba,
                                    logCount,
                                    stateVersion,
                                  }: Readonly<{
  matchId: number;
  players: Player[];
  currentRound: string;
  honba: number;
  logCount: number;
  stateVersion: number;
}>) {
  const router = useRouter();

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    const shouldScrollTop = sessionStorage.getItem(
        "mahjong-scroll-top-after-reload",
    );

    if (shouldScrollTop !== "true") {
      return;
    }

    sessionStorage.removeItem(
        "mahjong-scroll-top-after-reload",
    );

    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }, []);

  const firstPlayerKey =
      players[0]?.stateKey ?? "";

  const secondPlayerKey =
      players[1]?.stateKey ??
      firstPlayerKey;

  const [tab, setTab] = useState<
      "WIN" | "DRAW" | "CHOMBO"
  >("WIN");

  const [isTsumo, setIsTsumo] =
      useState(false);

  const [loserKey, setLoserKey] =
      useState(secondPlayerKey);

  const [wins, setWins] = useState<
      WinFormState[]
  >([
    createDefaultWin({
      winnerKey: firstPlayerKey,
      players,
      currentRound,
      isTsumo: false,
    }),
  ]);

  const handScoreResults = useMemo(
      () =>
          wins.map((win) => {
            if (
                win.input_mode !== "HAND"
            ) {
              return null;
            }

            return calculateMahjongHandDraftScore(
                win.hand,
            );
          }),
      [wins],
  );

  const [
    chomboPlayerKey,
    setChomboPlayerKey,
  ] = useState(firstPlayerKey);

  const [
    chomboPenaltyRule,
    setChomboPenaltyRule,
  ] = useState<MahjongChomboPenaltyRule>(
      "MANGAN_PAYMENT",
  );

  const [
    currentRiichiKeys,
    setCurrentRiichiKeys,
  ] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] =
      useState(false);

  const [isForceFinish, setIsForceFinish] =
      useState(false);

  const [
    ryuukyokuType,
    setRyuukyokuType,
  ] = useState<RyuukyokuType | null>(
      null,
  );

  const [tenpaiKeys, setTenpaiKeys] =
      useState<string[]>([]);

  const [
    nagashiManganWinnerKeys,
    setNagashiManganWinnerKeys,
  ] = useState<string[]>([]);

  const getWinTotalHan = (
      win: WinFormState,
  ) => {
    const totalDora =
        win.dora_indicator +
        win.red_dora;

    return calculateTotalHan(
        win.selected_yaku_ids,
        win.is_menzen,
        totalDora,
    );
  };

  const getYakumanCount = (
      win: WinFormState,
  ) => {
    return win.selected_yaku_ids.reduce(
        (sum, id) => {
          const yaku = ALL_YAKU.find(
              (item) => item.id === id,
          );

          if (!yaku?.isYakuman) {
            return sum;
          }

          return (
              sum +
              (yaku.yakumanMultiplier ?? 1)
          );
        },
        0,
    );
  };

  const hasYakuman = (
      win: WinFormState,
  ) => {
    return getYakumanCount(win) > 0;
  };

  const isChiitoitsuWin = (
      win: WinFormState,
  ) => {
    return win.selected_yaku_ids.some(
        (id) => {
          const yaku = ALL_YAKU.find(
              (item) => item.id === id,
          );

          return isChiitoitsuYaku(yaku);
        },
    );
  };

  const getEffectiveFu = (
      win: WinFormState,
  ) => {
    if (isChiitoitsuWin(win)) {
      return 25;
    }

    return win.fu === ""
        ? null
        : Number(win.fu);
  };

  const getSafeLoserKey = (
      winnerKey: string,
  ) => {
    return (
        players.find(
            (player) =>
                player.stateKey !== winnerKey,
        )?.stateKey ?? ""
    );
  };

  const createDefaultRoundWinState =
      () => {
        const winnerKey = firstPlayerKey;

        return {
          winnerKey,
          loserKey:
              getSafeLoserKey(winnerKey),
        };
      };

  const getCalculatedScore = (
      win: WinFormState,
  ) => {
    const totalHan =
        getWinTotalHan(win);

    const yakumanCount =
        getYakumanCount(win);

    const winner = players.find(
        (player) =>
            player.stateKey ===
            win.winner_key,
    );

    const isDealer =
        winner?.wind === "EAST";

    const effectiveFu =
        getEffectiveFu(win);

    if (!winner) return null;

    if (
        totalHan <= 0 &&
        yakumanCount === 0
    ) {
      return null;
    }

    if (
        yakumanCount === 0 &&
        effectiveFu === null
    ) {
      return null;
    }

    try {
      return calculateMahjongScore({
        han: totalHan,
        fu: effectiveFu ?? 30,
        isDealer,
        isTsumo,
        yakumanCount,
      });
    } catch {
      return null;
    }
  };

  const updateWin = (
      index: number,
      patch: Partial<WinFormState>,
  ) => {
    setWins((prev) =>
        prev.map((win, winIndex) =>
            winIndex === index
                ? {
                  ...win,
                  ...patch,
                }
                : win,
        ),
    );
  };

  const handleLoserChange = (
      nextLoserKey: string,
  ) => {
    setLoserKey(nextLoserKey);

    setWins((prev) => {
      const usedWinnerKeys =
          new Set<string>();

      return prev.map((win) => {
        if (
            win.winner_key !==
            nextLoserKey &&
            !usedWinnerKeys.has(
                win.winner_key,
            )
        ) {
          usedWinnerKeys.add(
              win.winner_key,
          );

          return win;
        }

        const replacement =
            players.find(
                (player) =>
                    player.stateKey !==
                    nextLoserKey &&
                    !usedWinnerKeys.has(
                        player.stateKey,
                    ),
            );

        if (!replacement) {
          return win;
        }

        usedWinnerKeys.add(
            replacement.stateKey,
        );

        const replacementIsRiichi =
            currentRiichiKeys.includes(
                replacement.stateKey,
            );

        return {
          ...win,

          winner_key:
          replacement.stateKey,

          hand: {
            ...win.hand,

            seat_wind:
                toMahjongWind(
                    replacement.wind,
                ),

            situation: {
              ...win.hand.situation,

              riichi:
              replacementIsRiichi,

              double_riichi: false,
              ippatsu: false,
            },

            ura_dora_indicators: [],
          },
        };
      });
    });
  };

  const addRonWinner = () => {
    if (isTsumo) return;

    if (wins.length >= 2) {
      alert(
          "론 화료자는 최대 2명까지 가능합니다.\n" +
          "3명 론은 유국 탭에서 삼가화로 기록해주세요.",
      );

      return;
    }

    const usedWinnerKeys =
        new Set(wins.map(
            (win) => win.winner_key,
        ));

    const nextPlayer = players.find(
        (player) =>
            player.stateKey !== loserKey &&
            !usedWinnerKeys.has(
                player.stateKey,
            ),
    );

    if (!nextPlayer) {
      alert(
          "추가할 수 있는 화료자가 없습니다.",
      );

      return;
    }

    setWins((prev) => [
      ...prev,

      createDefaultWin({
        winnerKey:
        nextPlayer.stateKey,
        players,
        currentRound,
        isTsumo: false,
      }),
    ]);
  };

  const removeRonWinner = (
      index: number,
  ) => {
    if (wins.length <= 1) return;

    setWins((prev) =>
        prev.filter(
            (_, winIndex) =>
                winIndex !== index,
        ),
    );
  };

  const toggleTsumo = () => {
    const nextIsTsumo =
        !isTsumo;

    setIsTsumo(nextIsTsumo);

    setWins((prev) => {
      const targetWins =
          nextIsTsumo
              ? prev.slice(0, 1)
              : prev;

      return targetWins.map(
          (win) => ({
            ...win,

            hand: {
              ...win.hand,

              win_method:
                  nextIsTsumo
                      ? "TSUMO"
                      : "RON",
            },

            selected_yaku_ids:
                win.selected_yaku_ids.filter(
                    (id) => {
                      const yaku =
                          ALL_YAKU.find(
                              (item) =>
                                  item.id === id,
                          );

                      if (!yaku) {
                        return false;
                      }

                      if (
                          nextIsTsumo &&
                          RON_ONLY_YAKU_NAMES.has(
                              yaku.name,
                          )
                      ) {
                        return false;
                      }

                      if (
                          !nextIsTsumo &&
                          TSUMO_ONLY_YAKU_NAMES.has(
                              yaku.name,
                          )
                      ) {
                        return false;
                      }

                      return true;
                    },
                ),
          }),
      );
    });
  };

  const toggleMenzen = (
      index: number,
  ) => {
    setWins((prev) =>
        prev.map((win, winIndex) => {
          if (winIndex !== index) {
            return win;
          }

          const nextIsMenzen =
              !win.is_menzen;

          return {
            ...win,

            is_menzen:
            nextIsMenzen,

            selected_yaku_ids:
                nextIsMenzen
                    ? win.selected_yaku_ids
                    : win.selected_yaku_ids.filter(
                        (id) => {
                          const yaku =
                              ALL_YAKU.find(
                                  (item) =>
                                      item.id ===
                                      id,
                              );

                          return (
                              !yaku?.isMenzenOnly
                          );
                        },
                    ),
          };
        }),
    );
  };

  const handleToggleYaku = (
      index: number,
      id: string,
  ) => {
    const targetYaku =
        ALL_YAKU.find(
            (yaku) =>
                yaku.id === id,
        );

    if (!targetYaku) return;

    setWins((prev) =>
        prev.map((win, winIndex) => {
          if (winIndex !== index) {
            return win;
          }

          const isTsumoOnly =
              TSUMO_ONLY_YAKU_NAMES.has(
                  targetYaku.name,
              );

          const isRonOnly =
              RON_ONLY_YAKU_NAMES.has(
                  targetYaku.name,
              );

          if (
              !win.is_menzen &&
              targetYaku.isMenzenOnly &&
              !win.selected_yaku_ids.includes(
                  id,
              )
          ) {
            return win;
          }

          if (
              !isTsumo &&
              isTsumoOnly
          ) {
            return win;
          }

          if (
              isTsumo &&
              isRonOnly
          ) {
            return win;
          }

          let nextIds =
              getValidatedYakuList(
                  win.selected_yaku_ids,
                  id,
              );

          if (
              targetYaku.name === "일발"
          ) {
            nextIds =
                nextIds.filter(
                    (nextId) => {
                      const nextYakuName =
                          ALL_YAKU.find(
                              (yaku) =>
                                  yaku.id ===
                                  nextId,
                          )?.name ?? "";

                      return ![
                        "영상개화",
                        "창깡",
                      ].includes(
                          nextYakuName,
                      );
                    },
                );
          } else if (
              [
                "영상개화",
                "창깡",
              ].includes(
                  targetYaku.name,
              )
          ) {
            nextIds =
                nextIds.filter(
                    (nextId) => {
                      const nextYakuName =
                          ALL_YAKU.find(
                              (yaku) =>
                                  yaku.id ===
                                  nextId,
                          )?.name ?? "";

                      return (
                          nextYakuName !==
                          "일발"
                      );
                    },
                );
          }

          const hasYakumanNow =
              nextIds.some((nextId) => {
                const yaku =
                    ALL_YAKU.find(
                        (item) =>
                            item.id === nextId,
                    );

                return yaku?.isYakuman;
              });

          if (hasYakumanNow) {
            return {
              ...win,

              dora_indicator: 0,
              red_dora: 0,

              selected_yaku_ids:
                  nextIds.filter(
                      (nextId) => {
                        const yaku =
                            ALL_YAKU.find(
                                (item) =>
                                    item.id ===
                                    nextId,
                            );

                        return (
                            yaku?.isYakuman
                        );
                      },
                  ),
            };
          }

          const nextHasChiitoitsu =
              nextIds.some(
                  (nextId) => {
                    const yaku =
                        ALL_YAKU.find(
                            (item) =>
                                item.id ===
                                nextId,
                        );

                    return isChiitoitsuYaku(
                        yaku,
                    );
                  },
              );

          return {
            ...win,

            selected_yaku_ids:
            nextIds,

            fu: nextHasChiitoitsu
                ? 25
                : win.fu === 25
                    ? 30
                    : win.fu,
          };
        }),
    );
  };

  const toggleRiichiPlayer = (
      stateKey: string,
  ) => {
    setCurrentRiichiKeys((prev) => {
      const nextIsRiichi =
          !prev.includes(stateKey);

      const nextKeys = nextIsRiichi
          ? [...prev, stateKey]
          : prev.filter(
              (key) => key !== stateKey,
          );

      setWins((currentWins) =>
          currentWins.map((win) => {
            if (
                win.winner_key !== stateKey
            ) {
              return win;
            }

            return {
              ...win,

              hand: {
                ...win.hand,

                situation: {
                  ...win.hand.situation,

                  riichi: nextIsRiichi,

                  /**
                   * 리치 선언을 해제하면
                   * 더블 리치와 일발도 함께 해제한다.
                   */
                  double_riichi:
                      nextIsRiichi
                          ? win.hand.situation
                              .double_riichi
                          : false,

                  ippatsu:
                      nextIsRiichi
                          ? win.hand.situation
                              .ippatsu
                          : false,
                },

                ura_dora_indicators:
                    nextIsRiichi
                        ? win.hand
                            .ura_dora_indicators
                        : [],
              },
            };
          }),
      );

      return nextKeys;
    });
  };

  const toggleTenpaiPlayer = (
      stateKey: string,
  ) => {
    setTenpaiKeys((prev) =>
        prev.includes(stateKey)
            ? prev.filter(
                (key) =>
                    key !== stateKey,
            )
            : [
              ...prev,
              stateKey,
            ],
    );
  };

  const toggleNagashiManganWinner =
      (stateKey: string) => {
        setNagashiManganWinnerKeys(
            (prev) =>
                prev.includes(stateKey)
                    ? prev.filter(
                        (key) =>
                            key !== stateKey,
                    )
                    : [
                      ...prev,
                      stateKey,
                    ],
        );
      };

  const renderPlayerSelectButtons = ({
                                       value,
                                       onChange,
                                       disabledKeys = [],
                                       activeClassName =
                                       "bg-blue-600 text-white border-blue-600",
                                     }: {
    value: string;
    onChange: (
        stateKey: string,
    ) => void;
    disabledKeys?: string[];
    activeClassName?: string;
  }) => {
    return (
        <div className="grid grid-cols-4 gap-2">
          {players.map((player) => {
            const isSelected =
                value ===
                player.stateKey;

            const isDisabled =
                disabledKeys.includes(
                    player.stateKey,
                );

            return (
                <button
                    key={player.stateKey}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) {
                        return;
                      }

                      onChange(
                          player.stateKey,
                      );
                    }}
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-2 text-xs font-bold transition-all ${
                        isSelected
                            ? activeClassName
                            : "border-foreground/10 bg-white opacity-70 hover:opacity-100 dark:bg-background"
                    } ${
                        isDisabled
                            ? "cursor-not-allowed opacity-30"
                            : ""
                    }`}
                >
              <span>
                {getWindLabel(
                    player.wind,
                )}
              </span>

                  <span>
                {player.name}
              </span>
                </button>
            );
          })}
        </div>
    );
  };

  const getDisabledStatus = (
      win: WinFormState,
      yName: string,
      isMenzenOnly:
          | boolean
          | undefined,
      isYakuman:
          | boolean
          | undefined,
  ) => {
    const winHasYakuman =
        hasYakuman(win);

    const isTsumoOnly =
        TSUMO_ONLY_YAKU_NAMES.has(
            yName,
        );

    const isRonOnly =
        RON_ONLY_YAKU_NAMES.has(
            yName,
        );

    return (
        (!win.is_menzen &&
            isMenzenOnly) ||
        (winHasYakuman &&
            !isYakuman) ||
        (!isTsumo &&
            isTsumoOnly) ||
        (isTsumo &&
            isRonOnly)
    );
  };

  const getCurrentHan = (
      win: WinFormState,
      yaku: Yaku,
  ) => {
    if (win.is_menzen) {
      return yaku.han.closed;
    }

    if (yaku.isMenzenOnly) {
      return yaku.han.closed;
    }

    return yaku.han.open;
  };

  const createHanCategory = (
      label: string,
      han: number,
      win: WinFormState,
  ) => ({
    label,

    filter: (yaku: Yaku) =>
        getCurrentHan(
            win,
            yaku,
        ) === han &&
        !yaku.isYakuman,
  });

  const getNormalYakuCategories =
      (win: WinFormState) => [
        createHanCategory(
            "1판 역",
            1,
            win,
        ),

        createHanCategory(
            "2판 역",
            2,
            win,
        ),

        createHanCategory(
            "3판 역",
            3,
            win,
        ),

        createHanCategory(
            "5판 역",
            5,
            win,
        ),

        createHanCategory(
            "6판 역",
            6,
            win,
        ),

        {
          label: "역만",

          filter: (yaku: Yaku) =>
              Boolean(
                  yaku.isYakuman,
              ),
        },
      ];

  const handleStaleMahjongStateError =
      (message?: string) => {
        alert(
            message ??
            "이미 다른 화면에서 대국이 기록되었습니다.\n" +
            "최신 상태를 확인하기 위해 새로고침합니다.",
        );

        sessionStorage.setItem(
            "mahjong-scroll-top-after-reload",
            "true",
        );

        globalThis.location.reload();
      };

  const handleRecordChombo =
      async () => {
        if (isSubmitting) {
          return;
        }

        const chomboPlayer =
            players.find(
                (player) =>
                    player.stateKey ===
                    chomboPlayerKey,
            );

        if (!chomboPlayer) {
          alert(
              "촌보한 작사를 선택해주세요.",
          );

          return;
        }

        const isLightPenalty =
            chomboPenaltyRule ===
            "LIGHT_1000";

        let penaltyDescription:
            string;

        let progressionDescription:
            string;

        if (isLightPenalty) {
          penaltyDescription =
              `${chomboPlayer.name} -3,000점\n` +
              "나머지 작사 각 +1,000점";

          progressionDescription =
              "현재 국, 본장, 친을 유지한 채 같은 국을 다시 시작합니다.";
        } else {
          const isDealer =
              chomboPlayer.wind ===
              "EAST";

          penaltyDescription =
              isDealer
                  ? `${chomboPlayer.name} -12,000점\n` +
                  "나머지 작사 각 +4,000점"
                  : `${chomboPlayer.name} -8,000점\n` +
                  "친 +4,000점 / 나머지 자 각 +2,000점";

          progressionDescription =
              "현재 국, 본장, 친을 유지한 채 재배패합니다.";
        }

        const riichiDescription =
            currentRiichiKeys.length >
            0
                ? `\n\n이번 국의 리치 선언 ${currentRiichiKeys.length}건은 취소됩니다.\n` +
                `선언자마다 1,000점이 차감되고 공탁 리치봉이 ${currentRiichiKeys.length}개 증가합니다.`
                : "\n\n이번 국에 취소할 리치 선언은 없습니다.";

        const confirmed = confirm(
            `${chomboPlayer.name}의 ${
                isLightPenalty
                    ? "경미한 반칙"
                    : "촌보"
            }를 기록합니다.\n\n` +
            `${penaltyDescription}` +
            `${riichiDescription}\n\n` +
            progressionDescription,
        );

        if (!confirmed) {
          return;
        }

        setIsSubmitting(true);

        try {
          const result =
              await recordMahjongChombo(
                  {
                    match_id: matchId,

                    expected_round:
                    currentRound,

                    expected_honba:
                    honba,

                    expected_log_count:
                    logCount,

                    expected_version:
                    stateVersion,

                    chombo_player_key:
                    chomboPlayerKey,

                    penalty_rule:
                    chomboPenaltyRule,

                    current_riichi_keys:
                    currentRiichiKeys,
                  },
              );

          if (!result.ok) {
            if (
                result.code ===
                "STALE_MAHJONG_STATE"
            ) {
              handleStaleMahjongStateError(
                  result.message,
              );

              return;
            }

            alert(
                result.message ??
                "촌보 기록에 실패했습니다.",
            );

            return;
          }

          alert(
              isLightPenalty
                  ? "경미한 반칙이 기록되었습니다."
                  : "촌보가 기록되었습니다.",
          );

          setCurrentRiichiKeys(
              [],
          );

          setChomboPlayerKey(
              firstPlayerKey,
          );

          setChomboPenaltyRule(
              "MANGAN_PAYMENT",
          );

          router.refresh();

          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        } catch (error) {
          console.error(error);

          alert(
              "촌보 기록에 실패했습니다.",
          );
        } finally {
          setIsSubmitting(false);
        }
      };

  const handleRecordRyuukyoku =
      async () => {
        if (!ryuukyokuType) {
          alert(
              "유국 유형을 선택해주세요.",
          );

          return;
        }

        if (
            ryuukyokuType ===
            "유국만관" &&
            nagashiManganWinnerKeys.length ===
            0
        ) {
          alert(
              "유국만관 대상자를 1명 이상 선택해주세요.",
          );

          return;
        }

        setIsSubmitting(true);

        try {
          const result =
              await recordRyuukyoku(
                  {
                    match_id: matchId,

                    expected_round:
                    currentRound,

                    expected_honba:
                    honba,

                    expected_log_count:
                    logCount,

                    expected_version:
                    stateVersion,

                    type: ryuukyokuType,

                    tenpai_keys:
                        ryuukyokuType ===
                        "황패유국" ||
                        ryuukyokuType ===
                        "유국만관"
                            ? tenpaiKeys
                            : [],

                    current_riichi_keys:
                    currentRiichiKeys,

                    is_final:
                    isForceFinish,

                    nagashi_mangan_winner_keys:
                        ryuukyokuType ===
                        "유국만관"
                            ? nagashiManganWinnerKeys
                            : [],
                  },
              );

          if (!result.ok) {
            if (
                result.code ===
                "STALE_MAHJONG_STATE"
            ) {
              handleStaleMahjongStateError(
                  result.message,
              );

              return;
            }

            alert(
                result.message ??
                "유국 기록 실패!",
            );

            return;
          }

          alert(
              "유국이 기록되었습니다.",
          );

          router.refresh();

          setRyuukyokuType(null);
          setTenpaiKeys([]);
          setCurrentRiichiKeys([]);
          setNagashiManganWinnerKeys(
              [],
          );
          setIsForceFinish(false);

          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        } catch (error) {
          console.error(error);

          alert(
              "유국 기록 실패!",
          );
        } finally {
          setIsSubmitting(false);
        }
      };

  const handleRyuukyokuTypeChange =
      (type: RyuukyokuType) => {
        setRyuukyokuType(type);

        if (
            type !== "황패유국" &&
            type !== "유국만관"
        ) {
          setTenpaiKeys([]);
        }

        if (type !== "유국만관") {
          setNagashiManganWinnerKeys(
              [],
          );
        }
      };

  const handleSubmit = async (
      e: React.SubmitEvent,
  ) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (
        isTsumo &&
        wins.length !== 1
    ) {
      alert(
          "쯔모 화료자는 1명만 선택할 수 있습니다.",
      );

      return;
    }

    if (
        !isTsumo &&
        wins.length > 2
    ) {
      alert(
          "론 화료자는 최대 2명까지 가능합니다.\n" +
          "3명 론은 유국 탭에서 삼가화로 기록해주세요.",
      );

      return;
    }

    const winnerKeys =
        wins.map(
            (win) =>
                win.winner_key,
        );

    if (
        new Set(winnerKeys)
            .size !==
        winnerKeys.length
    ) {
      alert(
          "화료자가 중복되었습니다.",
      );

      return;
    }

    if (
        !isTsumo &&
        winnerKeys.includes(
            loserKey,
        )
    ) {
      alert(
          "방총자는 화료자가 될 수 없습니다.",
      );

      return;
    }

    const invalidHandInputWin =
        wins.some((win, index) => {
          if (
              win.input_mode !== "HAND"
          ) {
            return false;
          }

          const result =
              handScoreResults[index];

          return (
              result === null ||
              !result.ok
          );
        });

    if (invalidHandInputWin) {
      alert(
          "패 입력 자동 계산을 완료할 수 없는 화료자가 있습니다.\n" +
          "손패·화료패·부로·화료 상황을 확인해주세요.",
      );

      return;
    }

    const noYakuWin =
        wins.find(
            (win) =>
                win.input_mode ===
                "YAKU_FU" &&
                win.selected_yaku_ids
                    .length === 0,
        );

    if (noYakuWin) {
      alert(
          "모든 화료자는 최소 1개 이상의 역을 선택해야 합니다.\n" +
          "도라만으로는 화료할 수 없습니다.",
      );

      return;
    }

    const invalidFuWin =
        wins.some((win) => {
          if (
              win.input_mode !==
              "YAKU_FU"
          ) {
            return false;
          }

          const yakumanCount =
              getYakumanCount(win);

          if (
              yakumanCount > 0
          ) {
            return false;
          }

          if (
              isChiitoitsuWin(win)
          ) {
            return false;
          }

          return (
              win.fu === "" ||
              Number(win.fu) < 20
          );
        });

    if (invalidFuWin) {
      alert(
          "모든 화료자의 부수를 올바르게 입력해주세요.",
      );

      return;
    }

    const invalidCalculatedScoreWin =
        wins.find((win) => {
          if (
              win.input_mode !== "YAKU_FU"
          ) {
            return false;
          }

          return !getCalculatedScore(win);
        });

    if (
        invalidCalculatedScoreWin
    ) {
      alert(
          "점수 계산에 실패했습니다. 역과 부수를 확인해주세요.",
      );

      return;
    }

    for (const win of wins) {
      if (
          win.input_mode === "HAND"
      ) {
        continue;
      }

      const winHasYakuman =
          hasYakuman(win);

      if (winHasYakuman) {
        continue;
      }

      const selectedYakuNames =
          new Set(
              win.selected_yaku_ids.map(
                  (id) =>
                      ALL_YAKU.find(
                          (item) =>
                              item.id === id,
                      )?.name,
              ),
          );

      const hasRiichiYaku =
          selectedYakuNames.has(
              "리치",
          ) ||
          selectedYakuNames.has(
              "더블 리치",
          ) ||
          selectedYakuNames.has(
              "더블리치",
          );

      if (
          currentRiichiKeys.includes(
              win.winner_key,
          ) &&
          !hasRiichiYaku
      ) {
        const proceed =
            globalThis.confirm(
                "화료자가 이번 국에 리치를 선언했는데 " +
                "'리치' 또는 '더블 리치' 역이 선택되지 않았습니다.\n" +
                "이대로 점수를 기록하시겠습니까?",
            );

        if (!proceed) {
          return;
        }
      }

      if (
          win.is_menzen &&
          isTsumo &&
          !selectedYakuNames.has(
              "멘젠쯔모",
          )
      ) {
        const proceed =
            globalThis.confirm(
                "멘젠 상태에서 쯔모 화료를 했는데 " +
                "'멘젠쯔모' 역이 선택되지 않았습니다.\n" +
                "이대로 점수를 기록하시겠습니까?",
            );

        if (!proceed) {
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const result =
          await recordMahjongResult(
              {
                match_id: matchId,

                expected_round:
                currentRound,

                expected_honba:
                honba,

                expected_log_count:
                logCount,

                expected_version:
                stateVersion,

                is_tsumo:
                isTsumo,

                wins: wins.map((win) => {
                  const winnerKey =
                      win.winner_key;

                  const loserKeyForWin =
                      isTsumo
                          ? null
                          : loserKey;

                  if (
                      win.input_mode === "HAND"
                  ) {
                    if (!win.hand.winning_tile) {
                      throw new Error(
                          "화료패가 입력되지 않았습니다.",
                      );
                    }

                    return {
                      input_mode: "HAND" as const,

                      winner_key:
                      winnerKey,

                      loser_key:
                      loserKeyForWin,

                      hand: {
                        ...win.hand,

                        winning_tile:
                        win.hand.winning_tile,

                        win_method:
                            isTsumo
                                ? "TSUMO"
                                : "RON",
                      },
                    };
                  }

                  return {
                    input_mode:
                        "YAKU_FU" as const,

                    winner_key:
                    winnerKey,

                    loser_key:
                    loserKeyForWin,

                    is_menzen:
                    win.is_menzen,

                    fu:
                        getEffectiveFu(win),

                    dora_total:
                        win.dora_indicator +
                        win.red_dora,

                    selected_yaku_ids:
                    win.selected_yaku_ids,
                  };
                }),

                current_riichi_keys:
                currentRiichiKeys,

                is_final:
                isForceFinish,
              },
          );

      if (!result.ok) {
        if (
            result.code ===
            "STALE_MAHJONG_STATE"
        ) {
          handleStaleMahjongStateError(
              result.message,
          );

          return;
        }

        alert(
            result.message ??
            "기록 실패!",
        );

        return;
      }

      alert(
          "기록되었습니다.",
      );

      router.refresh();

      const nextDefault =
          createDefaultRoundWinState();

      setLoserKey(
          nextDefault.loserKey,
      );

      setWins([
        createDefaultWin({
          winnerKey:
          nextDefault.winnerKey,

          players,
          currentRound,
          isTsumo: false,
        }),
      ]);

      setCurrentRiichiKeys([]);
      setIsForceFinish(false);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(error);

      alert(
          error instanceof Error
              ? error.message
              : "기록 실패!",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <button
              type="button"
              onClick={() => setTab("WIN")}
              className={`rounded-xl border py-3 font-bold transition-colors ${
                  tab === "WIN"
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-foreground/10 bg-foreground/5"
              }`}
          >
            화료
          </button>

          <button
              type="button"
              onClick={() => setTab("DRAW")}
              className={`rounded-xl border py-3 font-bold transition-colors ${
                  tab === "DRAW"
                      ? "border-orange-500 bg-orange-500 text-white"
                      : "border-foreground/10 bg-foreground/5"
              }`}
          >
            유국
          </button>

          <button
              type="button"
              onClick={() => setTab("CHOMBO")}
              className={`rounded-xl border py-3 font-bold transition-colors ${
                  tab === "CHOMBO"
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-foreground/10 bg-foreground/5"
              }`}
          >
            촌보
          </button>
        </div>

        {tab === "WIN" ? (
            <form
                onSubmit={handleSubmit}
                className="space-y-4"
            >
              <div className="space-y-3 rounded-2xl border bg-foreground/5 p-4">
                <p className="text-sm font-bold">
                  이번 국 리치 선언{" "}

                  <span className="text-xs text-foreground/50">
                (선택 시 1000점 차감)
              </span>
                </p>

                <div className="grid grid-cols-4 gap-2">
                  {players.map(
                      (player) => {
                        const isRiichi =
                            currentRiichiKeys.includes(
                                player.stateKey,
                            );

                        return (
                            <button
                                key={
                                  player.stateKey
                                }
                                type="button"
                                onClick={() =>
                                    toggleRiichiPlayer(
                                        player.stateKey,
                                    )
                                }
                                className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-2 text-xs font-bold transition-all ${
                                    isRiichi
                                        ? "border-red-500 bg-red-500 text-white"
                                        : "border-foreground/10 bg-white opacity-70 hover:opacity-100 dark:bg-background"
                                }`}
                            >
                      <span>
                        {getWindLabel(
                            player.wind,
                        )}
                      </span>

                              <span>
                        {player.name}
                      </span>
                            </button>
                        );
                      },
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={toggleTsumo}
                    className={`rounded-xl border py-3 font-bold transition-colors ${
                        isTsumo
                            ? "border-green-600 bg-green-600 text-white"
                            : "border-foreground/10 bg-foreground/5"
                    }`}
                >
                  {isTsumo
                      ? "쯔모 화료"
                      : "론 화료"}
                </button>

                <div className="rounded-xl border border-foreground/10 bg-foreground/5 py-3 text-center text-sm font-bold">
                  {isTsumo
                      ? "화료자 1명"
                      : `화료자 ${wins.length}명`}
                </div>
              </div>

              {!isTsumo && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold">
                      방총자
                    </label>

                    {renderPlayerSelectButtons(
                        {
                          value: loserKey,

                          onChange:
                          handleLoserChange,

                          activeClassName:
                              "bg-red-500 text-white border-red-500",
                        },
                    )}
                  </div>
              )}

              {wins.map(
                  (win, index) => {
                    const winHasYakuman =
                        hasYakuman(win);

                    const totalHan =
                        getWinTotalHan(win);

                    const calculatedScore =
                        getCalculatedScore(
                            win,
                        );

                    const handScoreResult =
                        handScoreResults[index];

                    const fuOptions =
                        isChiitoitsuWin(
                            win,
                        )
                            ? [25]
                            : getRecommendedFuOptions(
                                {
                                  isTsumo,
                                },
                            );

                    const disabledWinnerKeys =
                        [
                          ...(isTsumo
                              ? []
                              : [loserKey]),

                          ...wins
                              .filter(
                                  (
                                      _,
                                      winIndex,
                                  ) =>
                                      winIndex !==
                                      index,
                              )
                              .map(
                                  (
                                      otherWin,
                                  ) =>
                                      otherWin.winner_key,
                              ),
                        ];

                    return (
                        <div
                            key={`${win.winner_key}-${index}`}
                            className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:bg-blue-950/20"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-black text-blue-700 dark:text-blue-200">
                              {isTsumo
                                  ? "쯔모 화료"
                                  : wins.length >
                                  1
                                      ? `론 화료 ${index + 1}`
                                      : "론 화료"}
                            </p>

                            {!isTsumo &&
                                wins.length >
                                1 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeRonWinner(
                                                index,
                                            )
                                        }
                                        className="text-xs font-bold text-red-500"
                                    >
                                      삭제
                                    </button>
                                )}
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-bold">
                              화료자
                            </label>

                            {renderPlayerSelectButtons(
                                {
                                  value:
                                  win.winner_key,

                                  onChange:
                                      (
                                          stateKey,
                                      ) => {
                                        const nextWinner =
                                            players.find(
                                                (
                                                    player,
                                                ) =>
                                                    player.stateKey ===
                                                    stateKey,
                                            );

                                        const nextWinnerIsRiichi =
                                            currentRiichiKeys.includes(
                                                stateKey,
                                            );

                                        updateWin(index, {
                                          winner_key: stateKey,

                                          hand: {
                                            ...win.hand,

                                            seat_wind: toMahjongWind(
                                                nextWinner?.wind ?? "EAST",
                                            ),

                                            situation: {
                                              ...win.hand.situation,

                                              riichi:
                                              nextWinnerIsRiichi,

                                              double_riichi:
                                                  nextWinnerIsRiichi
                                                      ? win.hand.situation
                                                          .double_riichi
                                                      : false,

                                              ippatsu:
                                                  nextWinnerIsRiichi
                                                      ? win.hand.situation
                                                          .ippatsu
                                                      : false,
                                            },

                                            ura_dora_indicators:
                                                nextWinnerIsRiichi
                                                    ? win.hand
                                                        .ura_dora_indicators
                                                    : [],
                                          },
                                        });
                                      },

                                  disabledKeys:
                                  disabledWinnerKeys,
                                },
                            )}
                          </div>

                          <section className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold">
                                점수 입력 방식
                              </h4>

                              <span className="text-[11px] text-foreground/45">
                        화료자별로 선택
                      </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                  type="button"
                                  disabled={
                                    isSubmitting
                                  }
                                  onClick={() =>
                                      updateWin(
                                          index,
                                          {
                                            input_mode:
                                                "YAKU_FU",
                                          },
                                      )
                                  }
                                  className={`rounded-xl border px-3 py-3 text-sm font-bold transition-colors disabled:opacity-40 ${
                                      win.input_mode ===
                                      "YAKU_FU"
                                          ? "border-blue-600 bg-blue-600 text-white"
                                          : "border-foreground/10 bg-foreground/5"
                                  }`}
                              >
                                역·부수 직접 선택
                              </button>

                              <button
                                  type="button"
                                  disabled={
                                    isSubmitting
                                  }
                                  onClick={() =>
                                      updateWin(
                                          index,
                                          {
                                            input_mode:
                                                "HAND",
                                          },
                                      )
                                  }
                                  className={`rounded-xl border px-3 py-3 text-sm font-bold transition-colors disabled:opacity-40 ${
                                      win.input_mode ===
                                      "HAND"
                                          ? "border-emerald-600 bg-emerald-600 text-white"
                                          : "border-foreground/10 bg-foreground/5"
                                  }`}
                              >
                                패 입력 자동 계산
                              </button>
                            </div>
                          </section>

                          {win.input_mode ===
                          "YAKU_FU" ? (
                              <>
                                <button
                                    type="button"
                                    onClick={() =>
                                        toggleMenzen(
                                            index,
                                        )
                                    }
                                    className={`w-full rounded-xl border py-2 font-bold transition-colors ${
                                        win.is_menzen
                                            ? "border-blue-600 bg-blue-600 text-white"
                                            : "border-foreground/10 bg-foreground/5"
                                    }`}
                                >
                                  {win.is_menzen
                                      ? "멘젠 상태"
                                      : "후로 상태"}
                                </button>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-bold dark:bg-background">
                                      총{" "}
                                      {totalHan} 판
                                    </div>

                                    {!winHasYakuman && (
                                        <select
                                            value={
                                              isChiitoitsuWin(
                                                  win,
                                              )
                                                  ? 25
                                                  : win.fu
                                            }
                                            disabled={
                                              isChiitoitsuWin(
                                                  win,
                                              )
                                            }
                                            onChange={(
                                                e,
                                            ) =>
                                                updateWin(
                                                    index,
                                                    {
                                                      fu: e
                                                          .target
                                                          .value
                                                          ? Number(
                                                              e
                                                                  .target
                                                                  .value,
                                                          )
                                                          : "",
                                                    },
                                                )
                                            }
                                            className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white p-2 text-sm font-bold disabled:opacity-60 dark:bg-background"
                                        >
                                          {fuOptions.map(
                                              (
                                                  fu,
                                              ) => (
                                                  <option
                                                      key={
                                                        fu
                                                      }
                                                      value={
                                                        fu
                                                      }
                                                  >
                                                    {
                                                      fu
                                                    }
                                                    부
                                                  </option>
                                              ),
                                          )}
                                        </select>
                                    )}
                                  </div>

                                  <div className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-blue-700 dark:bg-background dark:text-blue-200">
                                    {calculatedScore
                                        ? calculatedScore.display
                                        : "역과 부수를 입력하면 점수가 자동 계산됩니다."}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <p className="text-sm font-bold">
                                    역 선택{" "}

                                    {winHasYakuman && (
                                        <span className="text-xs text-red-500">
                              (역만 성립 시 일반 역 무효)
                            </span>
                                    )}
                                  </p>

                                  <div className="space-y-2">
                                    <p className="text-xs font-black text-foreground/50">
                                      상황 역
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                      {SITUATIONAL_YAKU.map(
                                          (
                                              yaku,
                                          ) => {
                                            const isDisabled =
                                                getDisabledStatus(
                                                    win,
                                                    yaku.name,
                                                    yaku.isMenzenOnly,
                                                    yaku.isYakuman,
                                                );

                                            const isSelected =
                                                win.selected_yaku_ids.includes(
                                                    yaku.id,
                                                );

                                            return (
                                                <button
                                                    key={
                                                      yaku.id
                                                    }
                                                    type="button"
                                                    disabled={
                                                      isDisabled
                                                    }
                                                    onClick={() =>
                                                        handleToggleYaku(
                                                            index,
                                                            yaku.id,
                                                        )
                                                    }
                                                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                                                        isSelected
                                                            ? yaku.isYakuman
                                                                ? "border-red-500 bg-red-500 text-white shadow-md"
                                                                : "border-blue-500 bg-blue-500 text-white shadow-md"
                                                            : "border-foreground/10 bg-white dark:bg-background"
                                                    } ${
                                                        isDisabled
                                                            ? "cursor-not-allowed opacity-30"
                                                            : "hover:scale-105 active:scale-95"
                                                    }`}
                                                >
                                                  {
                                                    yaku.name
                                                  }
                                                </button>
                                            );
                                          },
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <p className="text-xs font-black text-foreground/50">
                                      일반 역
                                    </p>

                                    {getNormalYakuCategories(
                                        win,
                                    ).map(
                                        (
                                            category,
                                        ) => {
                                          const yakuList =
                                              NORMAL_YAKU.filter(
                                                  category.filter,
                                              );

                                          if (
                                              yakuList.length ===
                                              0
                                          ) {
                                            return null;
                                          }

                                          return (
                                              <div
                                                  key={
                                                    category.label
                                                  }
                                                  className="space-y-1"
                                              >
                                                <p className="text-xs font-bold text-foreground/40">
                                                  {
                                                    category.label
                                                  }
                                                </p>

                                                <div className="flex flex-wrap gap-2">
                                                  {yakuList.map(
                                                      (
                                                          yaku,
                                                      ) => {
                                                        const isDisabled =
                                                            getDisabledStatus(
                                                                win,
                                                                yaku.name,
                                                                yaku.isMenzenOnly,
                                                                yaku.isYakuman,
                                                            );

                                                        const isSelected =
                                                            win.selected_yaku_ids.includes(
                                                                yaku.id,
                                                            );

                                                        return (
                                                            <button
                                                                key={
                                                                  yaku.id
                                                                }
                                                                type="button"
                                                                disabled={
                                                                  isDisabled
                                                                }
                                                                onClick={() =>
                                                                    handleToggleYaku(
                                                                        index,
                                                                        yaku.id,
                                                                    )
                                                                }
                                                                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                                                                    isSelected
                                                                        ? yaku.isYakuman
                                                                            ? "border-red-500 bg-red-500 text-white shadow-md"
                                                                            : "border-blue-500 bg-blue-500 text-white shadow-md"
                                                                        : "border-foreground/10 bg-white dark:bg-background"
                                                                } ${
                                                                    isDisabled
                                                                        ? "cursor-not-allowed opacity-30"
                                                                        : "hover:scale-105 active:scale-95"
                                                                }`}
                                                            >
                                                              {
                                                                yaku.name
                                                              }
                                                            </button>
                                                        );
                                                      },
                                                  )}
                                                </div>
                                              </div>
                                          );
                                        },
                                    )}
                                  </div>
                                </div>

                                {!winHasYakuman && (
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <p className="text-xs font-bold text-foreground/50">
                                          일반 도라
                                        </p>

                                        <div className="flex items-center gap-2">
                                          <button
                                              type="button"
                                              onClick={() =>
                                                  updateWin(
                                                      index,
                                                      {
                                                        dora_indicator:
                                                            Math.max(
                                                                0,
                                                                win.dora_indicator -
                                                                1,
                                                            ),
                                                      },
                                                  )
                                              }
                                              className="flex h-8 w-8 items-center justify-center rounded-full border bg-background"
                                          >
                                            -
                                          </button>

                                          <span className="font-bold">
                                {
                                  win.dora_indicator
                                }
                              </span>

                                          <button
                                              type="button"
                                              onClick={() =>
                                                  updateWin(
                                                      index,
                                                      {
                                                        dora_indicator:
                                                            win.dora_indicator +
                                                            1,
                                                      },
                                                  )
                                              }
                                              className="flex h-8 w-8 items-center justify-center rounded-full border bg-background"
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>

                                      <div className="space-y-1">
                                        <p className="text-xs font-bold text-foreground/50">
                                          적도라
                                        </p>

                                        <div className="flex items-center gap-2">
                                          <button
                                              type="button"
                                              onClick={() =>
                                                  updateWin(
                                                      index,
                                                      {
                                                        red_dora:
                                                            Math.max(
                                                                0,
                                                                win.red_dora -
                                                                1,
                                                            ),
                                                      },
                                                  )
                                              }
                                              className="flex h-8 w-8 items-center justify-center rounded-full border bg-background"
                                          >
                                            -
                                          </button>

                                          <span className="font-bold">
                                {
                                  win.red_dora
                                }
                              </span>

                                          <button
                                              type="button"
                                              onClick={() =>
                                                  updateWin(
                                                      index,
                                                      {
                                                        red_dora:
                                                            win.red_dora +
                                                            1,
                                                      },
                                                  )
                                              }
                                              className="flex h-8 w-8 items-center justify-center rounded-full border bg-background"
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                )}
                              </>
                          ) : (
                              <div className="space-y-4">
                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
                                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                    패 입력 자동 계산
                                  </p>

                                  <p className="mt-1 text-xs leading-relaxed text-foreground/55">
                                    손패·화료패·부로·도라 표시패를 입력하면 역과 부수를
                                    자동으로 계산합니다.
                                  </p>
                                </div>

                                <section className="space-y-3 rounded-2xl border border-foreground/10 p-4">
                                  <div>
                                    <h4 className="text-sm font-bold">
                                      화료 상황
                                    </h4>

                                    <p className="mt-1 text-[11px] text-foreground/50">
                                      패 모양만으로 확인할 수 없는 상황역을 선택합니다.
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        disabled={
                                            isSubmitting ||
                                            !currentRiichiKeys.includes(
                                                win.winner_key,
                                            )
                                        }
                                        onClick={() => {
                                          const nextDoubleRiichi =
                                              !win.hand.situation
                                                  .double_riichi;

                                          updateWin(index, {
                                            hand: {
                                              ...win.hand,

                                              situation: {
                                                ...win.hand.situation,

                                                riichi: true,

                                                double_riichi:
                                                nextDoubleRiichi,
                                              },
                                            },
                                          });
                                        }}
                                        className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                                            win.hand.situation
                                                .double_riichi
                                                ? "border-blue-600 bg-blue-600 text-white"
                                                : "border-foreground/10 bg-background"
                                        }`}
                                    >
                                      더블 리치
                                    </button>

                                    <button
                                        type="button"
                                        disabled={
                                            isSubmitting ||
                                            !(
                                                win.hand.situation.riichi ||
                                                win.hand.situation
                                                    .double_riichi
                                            )
                                        }
                                        onClick={() =>
                                            updateWin(index, {
                                              hand: {
                                                ...win.hand,

                                                situation: {
                                                  ...win.hand.situation,

                                                  ippatsu:
                                                      !win.hand.situation
                                                          .ippatsu,

                                                  /**
                                                   * 일발과 영상·창깡은
                                                   * 동시에 성립하지 않는다.
                                                   */
                                                  rinshan: false,
                                                  chankan: false,
                                                },
                                              },
                                            })
                                        }
                                        className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                                            win.hand.situation.ippatsu
                                                ? "border-blue-600 bg-blue-600 text-white"
                                                : "border-foreground/10 bg-background"
                                        }`}
                                    >
                                      일발
                                    </button>

                                    <button
                                        type="button"
                                        disabled={
                                            isSubmitting || !isTsumo
                                        }
                                        onClick={() =>
                                            updateWin(index, {
                                              hand: {
                                                ...win.hand,

                                                situation: {
                                                  ...win.hand.situation,

                                                  rinshan:
                                                      !win.hand.situation
                                                          .rinshan,

                                                  chankan: false,
                                                  ippatsu: false,
                                                },
                                              },
                                            })
                                        }
                                        className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                                            win.hand.situation.rinshan
                                                ? "border-blue-600 bg-blue-600 text-white"
                                                : "border-foreground/10 bg-background"
                                        }`}
                                    >
                                      영상개화
                                    </button>

                                    <button
                                        type="button"
                                        disabled={
                                            isSubmitting || isTsumo
                                        }
                                        onClick={() =>
                                            updateWin(index, {
                                              hand: {
                                                ...win.hand,

                                                situation: {
                                                  ...win.hand.situation,

                                                  chankan:
                                                      !win.hand.situation
                                                          .chankan,

                                                  rinshan: false,
                                                  ippatsu: false,
                                                },
                                              },
                                            })
                                        }
                                        className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                                            win.hand.situation.chankan
                                                ? "border-blue-600 bg-blue-600 text-white"
                                                : "border-foreground/10 bg-background"
                                        }`}
                                    >
                                      창깡
                                    </button>

                                    <button
                                        type="button"
                                        disabled={
                                            isSubmitting || !isTsumo
                                        }
                                        onClick={() =>
                                            updateWin(index, {
                                              hand: {
                                                ...win.hand,

                                                situation: {
                                                  ...win.hand.situation,

                                                  haitei:
                                                      !win.hand.situation
                                                          .haitei,

                                                  houtei: false,
                                                },
                                              },
                                            })
                                        }
                                        className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                                            win.hand.situation.haitei
                                                ? "border-blue-600 bg-blue-600 text-white"
                                                : "border-foreground/10 bg-background"
                                        }`}
                                    >
                                      해저로월
                                    </button>

                                    <button
                                        type="button"
                                        disabled={
                                            isSubmitting || isTsumo
                                        }
                                        onClick={() =>
                                            updateWin(index, {
                                              hand: {
                                                ...win.hand,

                                                situation: {
                                                  ...win.hand.situation,

                                                  houtei:
                                                      !win.hand.situation
                                                          .houtei,

                                                  haitei: false,
                                                },
                                              },
                                            })
                                        }
                                        className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                                            win.hand.situation.houtei
                                                ? "border-blue-600 bg-blue-600 text-white"
                                                : "border-foreground/10 bg-background"
                                        }`}
                                    >
                                      하저로어
                                    </button>
                                  </div>

                                  {currentRiichiKeys.includes(
                                      win.winner_key,
                                  ) && (
                                      <p className="text-[11px] text-blue-600 dark:text-blue-400">
                                        이번 국 리치 선언이 반영되어 리치와 뒷도라 계산이 활성화됩니다.
                                      </p>
                                  )}
                                </section>

                                <MahjongHandInput
                                    value={win.hand}
                                    disabled={isSubmitting}
                                    showUraDora={
                                        win.hand.situation.riichi ||
                                        win.hand.situation.double_riichi
                                    }
                                    onChange={(hand) => {
                                      const isMenzen = !hand.melds.some(
                                          (meld) =>
                                              meld.type === "CHI" ||
                                              meld.type === "PON" ||
                                              meld.type === "MINKAN",
                                      );

                                      updateWin(index, {
                                        hand,
                                        is_menzen: isMenzen,
                                      });
                                    }}
                                />

                                <MahjongHandResult
                                    result={handScoreResult}
                                />
                              </div>
                          )}
                        </div>
                    );
                  },
              )}

              {!isTsumo &&
                  wins.length < 2 && (
                      <button
                          type="button"
                          onClick={
                            addRonWinner
                          }
                          className="w-full rounded-xl border border-dashed border-blue-300 py-3 text-sm font-bold text-blue-600"
                      >
                        + 더블 론 화료자 추가
                      </button>
                  )}

              {!isTsumo && (
                  <p className="text-xs text-foreground/50">
                    세 명이 론한 경우는 화료가 아니라 유국 탭에서 “삼가화”로 기록해주세요.
                  </p>
              )}

              <label className="flex items-center gap-2 text-sm font-bold text-red-500">
                <input
                    type="checkbox"
                    checked={isForceFinish}
                    onChange={(e) =>
                        setIsForceFinish(
                            e.target.checked,
                        )
                    }
                    className="h-4 w-4 accent-red-500"
                />

                기록 후 대국 조기 종료하기
              </label>

              <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-blue-600 py-4 font-black text-white shadow-lg disabled:opacity-50"
              >
                {isSubmitting
                    ? "기록 중..."
                    : "점수 기록"}
              </button>
            </form>
        ) : tab === "DRAW" ? (
            <div className="space-y-4">
              <div className="space-y-3 rounded-2xl border bg-foreground/5 p-4">
                <p className="text-sm font-bold">
                  이번 국 리치 선언{" "}

                  <span className="text-xs text-foreground/50">
                (선택 시 1000점 차감 후 공탁금 이월)
              </span>
                </p>

                <div className="grid grid-cols-4 gap-2">
                  {players.map((player) => {
                    const isRiichi =
                        currentRiichiKeys.includes(
                            player.stateKey,
                        );

                    return (
                        <button
                            key={player.stateKey}
                            type="button"
                            onClick={() =>
                                toggleRiichiPlayer(
                                    player.stateKey,
                                )
                            }
                            className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-2 text-xs font-bold transition-all ${
                                isRiichi
                                    ? "border-red-500 bg-red-500 text-white"
                                    : "border-foreground/10 bg-white opacity-70 hover:opacity-100 dark:bg-background"
                            }`}
                        >
                    <span>
                      {getWindLabel(
                          player.wind,
                      )}
                    </span>

                          <span>
                      {player.name}
                    </span>
                        </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-bold">
                  유국 유형 선택
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {RYUUKYOKU_TYPES.map(
                      (type) => (
                          <button
                              key={type}
                              type="button"
                              onClick={() =>
                                  handleRyuukyokuTypeChange(
                                      type,
                                  )
                              }
                              className={`rounded-xl border py-3 text-sm font-bold transition-all ${
                                  ryuukyokuType ===
                                  type
                                      ? "scale-[1.02] border-orange-500 bg-orange-500 text-white shadow-md"
                                      : "bg-foreground/5 hover:bg-foreground/10"
                              }`}
                          >
                            {type}
                          </button>
                      ),
                  )}
                </div>
              </div>

              {ryuukyokuType ===
                  "황패유국" && (
                      <div className="space-y-2">
                        <p className="text-sm font-bold">
                          텐파이인 작사를 모두 체크해주세요
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                          {players.map(
                              (player) => {
                                const isTenpai =
                                    tenpaiKeys.includes(
                                        player.stateKey,
                                    );

                                return (
                                    <button
                                        key={
                                          player.stateKey
                                        }
                                        type="button"
                                        onClick={() =>
                                            toggleTenpaiPlayer(
                                                player.stateKey,
                                            )
                                        }
                                        className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-all ${
                                            isTenpai
                                                ? "border-blue-600 bg-blue-600 text-white shadow-inner"
                                                : "border-foreground/10 bg-white dark:bg-background"
                                        }`}
                                    >
                        <span>
                          {getWindLabel(
                              player.wind,
                          )}
                        </span>

                                      <span>
                          {player.name}
                        </span>

                                      {isTenpai && (
                                          <span>
                            텐파이
                          </span>
                                      )}
                                    </button>
                                );
                              },
                          )}
                        </div>
                      </div>
                  )}

              {ryuukyokuType ===
                  "유국만관" && (
                      <div className="space-y-5">
                        <div className="space-y-3">
                          <p className="text-sm font-bold text-foreground/80">
                            유국만관 대상자를 모두 선택해주세요
                          </p>

                          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                            {players.map(
                                (player) => {
                                  const isSelected =
                                      nagashiManganWinnerKeys.includes(
                                          player.stateKey,
                                      );

                                  return (
                                      <button
                                          key={
                                            player.stateKey
                                          }
                                          type="button"
                                          onClick={() =>
                                              toggleNagashiManganWinner(
                                                  player.stateKey,
                                              )
                                          }
                                          className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-all ${
                                              isSelected
                                                  ? "border-blue-600 bg-blue-600 text-white shadow-inner"
                                                  : "border-foreground/10 bg-white dark:bg-background"
                                          }`}
                                      >
                                        {getWindLabel(
                                            player.wind,
                                        )}{" "}
                                        {player.name}

                                        {isSelected &&
                                            " 유국만관"}
                                      </button>
                                  );
                                },
                            )}
                          </div>

                          <p className="text-xs text-foreground/50">
                            복수 유국만관도 선택할 수 있습니다. 다가화 규칙과 무관하게 각각 만관 정산합니다.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <p className="text-sm font-bold text-foreground/80">
                            텐파이인 작사를 모두 체크해주세요
                          </p>

                          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                            {players.map(
                                (player) => {
                                  const isTenpai =
                                      tenpaiKeys.includes(
                                          player.stateKey,
                                      );

                                  return (
                                      <button
                                          key={
                                            player.stateKey
                                          }
                                          type="button"
                                          onClick={() =>
                                              toggleTenpaiPlayer(
                                                  player.stateKey,
                                              )
                                          }
                                          className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-all ${
                                              isTenpai
                                                  ? "border-green-600 bg-green-600 text-white shadow-inner"
                                                  : "border-foreground/10 bg-white dark:bg-background"
                                          }`}
                                      >
                                        {getWindLabel(
                                            player.wind,
                                        )}{" "}
                                        {player.name}

                                        {isTenpai &&
                                            " 텐파이"}
                                      </button>
                                  );
                                },
                            )}
                          </div>

                          <p className="text-xs text-foreground/50">
                            유국만관 여부와 관계없이 친 텐파이 여부로 연장 여부를 결정합니다.
                          </p>
                        </div>
                      </div>
                  )}

              <label className="flex items-center gap-2 text-sm font-bold text-red-500">
                <input
                    type="checkbox"
                    checked={isForceFinish}
                    onChange={(e) =>
                        setIsForceFinish(
                            e.target.checked,
                        )
                    }
                    className="h-4 w-4 accent-red-500"
                />

                기록 후 대국 조기 종료하기
              </label>

              <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={
                    handleRecordRyuukyoku
                  }
                  className="w-full rounded-2xl bg-orange-500 py-4 font-black text-white shadow-lg disabled:opacity-50"
              >
                {isSubmitting
                    ? "기록 중..."
                    : "유국 기록 완료"}
              </button>
            </div>
        ) : (
            <div className="space-y-5">
              <section className="space-y-3">
                <div>
                  <p className="font-bold">
                    반칙한 작사
                  </p>

                  <p className="mt-1 text-xs text-foreground/60">
                    반칙한 작사와 처리 방식을 선택해주세요.
                  </p>
                </div>

                {renderPlayerSelectButtons(
                    {
                      value:
                      chomboPlayerKey,

                      onChange:
                      setChomboPlayerKey,

                      activeClassName:
                          chomboPenaltyRule ===
                          "LIGHT_1000"
                              ? "bg-orange-500 text-white border-orange-500"
                              : "bg-red-600 text-white border-red-600",
                    },
                )}
              </section>

              <section className="space-y-3">
                <div>
                  <p className="font-bold">
                    처리 방식
                  </p>

                  <p className="mt-1 text-xs text-foreground/60">
                    반칙의 정도에 맞는 처리 방식을 선택해주세요.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                      type="button"
                      onClick={() =>
                          setChomboPenaltyRule(
                              "MANGAN_PAYMENT",
                          )
                      }
                      className={`rounded-xl border p-3 text-left transition-all ${
                          chomboPenaltyRule ===
                          "MANGAN_PAYMENT"
                              ? "border-red-600 bg-red-600 text-white"
                              : "border-foreground/10 bg-foreground/5"
                      }`}
                  >
                    <p className="font-bold">
                      일반 촌보
                    </p>

                    <p
                        className={`mt-1 text-xs ${
                            chomboPenaltyRule ===
                            "MANGAN_PAYMENT"
                                ? "text-white/80"
                                : "text-foreground/60"
                        }`}
                    >
                      만관 지불 후 재배패
                    </p>
                  </button>

                  <button
                      type="button"
                      onClick={() =>
                          setChomboPenaltyRule(
                              "LIGHT_1000",
                          )
                      }
                      className={`rounded-xl border p-3 text-left transition-all ${
                          chomboPenaltyRule ===
                          "LIGHT_1000"
                              ? "border-orange-500 bg-orange-500 text-white"
                              : "border-foreground/10 bg-foreground/5"
                      }`}
                  >
                    <p className="font-bold">
                      경미한 반칙
                    </p>

                    <p
                        className={`mt-1 text-xs ${
                            chomboPenaltyRule ===
                            "LIGHT_1000"
                                ? "text-white/80"
                                : "text-foreground/60"
                        }`}
                    >
                      나머지 작사에게 각 1,000점 지급
                    </p>
                  </button>
                </div>
              </section>

              <section
                  className={`rounded-xl border p-4 text-sm ${
                      chomboPenaltyRule ===
                      "LIGHT_1000"
                          ? "border-orange-500/20 bg-orange-500/5"
                          : "border-red-500/20 bg-red-500/5"
                  }`}
              >
                <p
                    className={`font-bold ${
                        chomboPenaltyRule ===
                        "LIGHT_1000"
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-red-600 dark:text-red-400"
                    }`}
                >
                  {chomboPenaltyRule ===
                  "LIGHT_1000"
                      ? "경미한 반칙 처리 규칙"
                      : "일반 촌보 처리 규칙"}
                </p>

                {chomboPenaltyRule ===
                "LIGHT_1000" ? (
                    <>
                      <p>
                        반칙자가 나머지 작사에게 각각 1,000점을 지급합니다.
                      </p>

                      <p>
                        반칙자는 총 3,000점을 잃습니다.
                      </p>

                      <p>
                        이번 국의 리치 선언은 모두 취소됩니다.
                      </p>

                      <p>
                        리치 선언자에게서 1,000점씩 차감하고, 해당 리치봉은 공탁에 남깁니다.
                      </p>

                      <p>
                        현재 국·본장·친을 유지하고 같은 국을 다시 시작합니다.
                      </p>
                    </>
                ) : (
                    <>
                      <p>
                        친 촌보: 나머지 작사에게 각각 4,000점 지급
                      </p>

                      <p>
                        자 촌보: 친에게 4,000점, 다른 자에게 각각 2,000점 지급
                      </p>

                      <p>
                        현재 국·본장·친을 유지하고 같은 국을 다시 시작합니다.
                      </p>

                      <p>
                        이번 국의 리치 선언은 모두 취소됩니다.
                      </p>

                      <p>
                        리치 선언자에게서 1,000점씩 차감하고, 해당 리치봉은 공탁에 남깁니다.
                      </p>
                    </>
                )}
              </section>

              <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={
                    handleRecordChombo
                  }
                  className={`w-full rounded-xl py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                      chomboPenaltyRule ===
                      "LIGHT_1000"
                          ? "bg-orange-500"
                          : "bg-red-600"
                  }`}
              >
                {isSubmitting
                    ? "기록 중..."
                    : chomboPenaltyRule ===
                    "LIGHT_1000"
                        ? "경미한 반칙 기록"
                        : "촌보 기록"}
              </button>
            </div>
        )}
      </div>
  );
}