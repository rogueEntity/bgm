// web/src/app/(main)/mahjong/play/[id]/ScoreForm.tsx

"use client";

import React, { useState } from "react";
import { NORMAL_YAKU, SITUATIONAL_YAKU } from "@/constants/yaku";
import { getValidatedYakuList, calculateTotalHan } from "@/lib/mahjong-calc";
import {
  calculateMahjongScore,
  getRecommendedFuOptions,
} from "@/lib/mahjong-score";
import {
  recordMahjongResult,
  recordRyuukyoku,
} from "@/app/actions/mahjong.action";

interface Player {
  name: string;
  wind: string;
  stateKey: string;
}

type WinFormState = {
  winner_key: string;
  is_mengen: boolean;
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
  | "삼가화";

const ALL_YAKU = [...NORMAL_YAKU, ...SITUATIONAL_YAKU];

type Yaku = (typeof ALL_YAKU)[number];

const RYUUKYOKU_TYPES: RyuukyokuType[] = [
  "황패유국",
  "구종구패",
  "사풍연타",
  "사개깡",
  "사가리치",
  "삼가화",
];

const TSUMO_ONLY_YAKU_NAMES = ["멘젠쯔모", "해저로월", "영상개화"];
const RON_ONLY_YAKU_NAMES = ["하저로어", "창깡"];

function getWindLabel(wind: string) {
  if (wind === "EAST") return "東";
  if (wind === "SOUTH") return "南";
  if (wind === "WEST") return "西";

  return "北";
}

function createDefaultWin(winnerKey: string): WinFormState {
  return {
    winner_key: winnerKey,
    is_mengen: true,
    dora_indicator: 0,
    red_dora: 0,
    selected_yaku_ids: [],
    fu: 30,
  };
}

export default function ScoreForm({
  matchId,
  players,
}: {
  matchId: number;
  players: Player[];
}) {
  const firstPlayerKey = players[0]?.stateKey ?? "";
  const secondPlayerKey = players[1]?.stateKey ?? firstPlayerKey;

  const [tab, setTab] = useState<"WIN" | "DRAW">("WIN");
  const [isTsumo, setIsTsumo] = useState(false);
  const [loserKey, setLoserKey] = useState(secondPlayerKey);
  const [wins, setWins] = useState<WinFormState[]>([
    createDefaultWin(firstPlayerKey),
  ]);
  const [currentRiichiKeys, setCurrentRiichiKeys] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForceFinish, setIsForceFinish] = useState(false);
  const [ryuukyokuType, setRyuukyokuType] = useState<RyuukyokuType | null>(null);
  const [tenpaiKeys, setTenpaiKeys] = useState<string[]>([]);

  const getWinTotalHan = (win: WinFormState) => {
    const totalDora = win.dora_indicator + win.red_dora;

    return calculateTotalHan(
      win.selected_yaku_ids,
      win.is_mengen,
      totalDora,
    );
  };

  const getYakumanCount = (win: WinFormState) => {
    return win.selected_yaku_ids.filter((id) => {
      const yaku = ALL_YAKU.find((item) => item.id === id);

      return yaku?.isYakuman;
    }).length;
  };

  const hasYakuman = (win: WinFormState) => {
    return getYakumanCount(win) > 0;
  };

  const getCalculatedScore = (win: WinFormState) => {
    const totalHan = getWinTotalHan(win);
    const yakumanCount = getYakumanCount(win);
    const winner = players.find((player) => player.stateKey === win.winner_key);
    const isDealer = winner?.wind === "EAST";

    if (!winner) return null;
    if (totalHan <= 0 && yakumanCount === 0) return null;
    if (yakumanCount === 0 && win.fu === "") return null;

    try {
      return calculateMahjongScore({
        han: totalHan,
        fu: win.fu === "" ? 30 : Number(win.fu),
        isDealer,
        isTsumo,
        yakumanCount,
      });
    } catch {
      return null;
    }
  };

  const updateWin = (index: number, patch: Partial<WinFormState>) => {
    setWins((prev) =>
      prev.map((win, winIndex) =>
        winIndex === index ? { ...win, ...patch } : win,
      ),
    );
  };

  const handleLoserChange = (nextLoserKey: string) => {
    setLoserKey(nextLoserKey);

    setWins((prev) => {
      const usedWinnerKeys = new Set<string>();

      return prev.map((win) => {
        if (
          win.winner_key !== nextLoserKey &&
          !usedWinnerKeys.has(win.winner_key)
        ) {
          usedWinnerKeys.add(win.winner_key);

          return win;
        }

        const replacement = players.find(
          (player) =>
            player.stateKey !== nextLoserKey &&
            !usedWinnerKeys.has(player.stateKey),
        );

        if (!replacement) return win;

        usedWinnerKeys.add(replacement.stateKey);

        return {
          ...win,
          winner_key: replacement.stateKey,
        };
      });
    });
  };

  const addRonWinner = () => {
    if (isTsumo) return;

    if (wins.length >= 2) {
      alert(
        "론 화료자는 최대 2명까지 가능합니다.\n3명 론은 유국 탭에서 삼가화로 기록해주세요.",
      );
      return;
    }

    const usedWinnerKeys = wins.map((win) => win.winner_key);
    const nextPlayer = players.find(
      (player) =>
        player.stateKey !== loserKey &&
        !usedWinnerKeys.includes(player.stateKey),
    );

    if (!nextPlayer) {
      alert("추가할 수 있는 화료자가 없습니다.");
      return;
    }

    setWins((prev) => [...prev, createDefaultWin(nextPlayer.stateKey)]);
  };

  const removeRonWinner = (index: number) => {
    if (wins.length <= 1) return;

    setWins((prev) => prev.filter((_, winIndex) => winIndex !== index));
  };

  const toggleTsumo = () => {
    const nextIsTsumo = !isTsumo;

    setIsTsumo(nextIsTsumo);

    setWins((prev) => {
      const nextWins = nextIsTsumo ? [prev[0]] : prev;

      return nextWins.map((win) => ({
        ...win,
        selected_yaku_ids: win.selected_yaku_ids.filter((id) => {
          const yaku = ALL_YAKU.find((item) => item.id === id);

          if (!yaku) return false;

          if (nextIsTsumo && RON_ONLY_YAKU_NAMES.includes(yaku.name)) {
            return false;
          }

          if (!nextIsTsumo && TSUMO_ONLY_YAKU_NAMES.includes(yaku.name)) {
            return false;
          }

          return true;
        }),
      }));
    });
  };

  const toggleMengen = (index: number) => {
    setWins((prev) =>
      prev.map((win, winIndex) => {
        if (winIndex !== index) return win;

        const nextIsMengen = !win.is_mengen;

        return {
          ...win,
          is_mengen: nextIsMengen,
          selected_yaku_ids: nextIsMengen
            ? win.selected_yaku_ids
            : win.selected_yaku_ids.filter((id) => {
                const yaku = ALL_YAKU.find((item) => item.id === id);

                return !yaku?.isMengenOnly;
              }),
        };
      }),
    );
  };

  const handleToggleYaku = (index: number, id: string) => {
    const targetYaku = ALL_YAKU.find((yaku) => yaku.id === id);

    if (!targetYaku) return;

    setWins((prev) =>
      prev.map((win, winIndex) => {
        if (winIndex !== index) return win;

        const isTsumoOnly = TSUMO_ONLY_YAKU_NAMES.includes(targetYaku.name);
        const isRonOnly = RON_ONLY_YAKU_NAMES.includes(targetYaku.name);

        if (
          !win.is_mengen &&
          targetYaku.isMengenOnly &&
          !win.selected_yaku_ids.includes(id)
        ) {
          return win;
        }

        if (!isTsumo && isTsumoOnly) return win;
        if (isTsumo && isRonOnly) return win;

        let nextIds = getValidatedYakuList(win.selected_yaku_ids, id);

        if (targetYaku.name === "일발") {
          nextIds = nextIds.filter((nextId) => {
            const nextYakuName =
              ALL_YAKU.find((yaku) => yaku.id === nextId)?.name ?? "";

            return !["영상개화", "창깡"].includes(nextYakuName);
          });
        } else if (["영상개화", "창깡"].includes(targetYaku.name)) {
          nextIds = nextIds.filter((nextId) => {
            const nextYakuName =
              ALL_YAKU.find((yaku) => yaku.id === nextId)?.name ?? "";

            return nextYakuName !== "일발";
          });
        }

        const hasYakumanNow = nextIds.some((nextId) => {
          const yaku = ALL_YAKU.find((item) => item.id === nextId);

          return yaku?.isYakuman;
        });

        if (hasYakumanNow) {
          return {
            ...win,
            dora_indicator: 0,
            red_dora: 0,
            selected_yaku_ids: nextIds.filter((nextId) => {
              const yaku = ALL_YAKU.find((item) => item.id === nextId);

              return yaku?.isYakuman;
            }),
          };
        }

        return {
          ...win,
          selected_yaku_ids: nextIds,
        };
      }),
    );
  };

  const toggleRiichiPlayer = (stateKey: string) => {
    setCurrentRiichiKeys((prev) =>
      prev.includes(stateKey)
        ? prev.filter((key) => key !== stateKey)
        : [...prev, stateKey],
    );
  };

  const toggleTenpaiPlayer = (stateKey: string) => {
    setTenpaiKeys((prev) =>
      prev.includes(stateKey)
        ? prev.filter((key) => key !== stateKey)
        : [...prev, stateKey],
    );
  };

  const getDisabledStatus = (
    win: WinFormState,
    yName: string,
    isMengenOnly: boolean | undefined,
    isYakuman: boolean | undefined,
  ) => {
    const winHasYakuman = hasYakuman(win);
    const isTsumoOnly = TSUMO_ONLY_YAKU_NAMES.includes(yName);
    const isRonOnly = RON_ONLY_YAKU_NAMES.includes(yName);

    return (
      (!win.is_mengen && isMengenOnly) ||
      (winHasYakuman && !isYakuman) ||
      (!isTsumo && isTsumoOnly) ||
      (isTsumo && isRonOnly)
    );
  };

  const getCurrentHan = (win: WinFormState, yaku: Yaku) => {
    if (win.is_mengen) return yaku.han.closed;
    if (yaku.isMengenOnly) return yaku.han.closed;

    return yaku.han.open;
  };

  const createHanCategory = (label: string, han: number, win: WinFormState) => ({
    label,
    filter: (yaku: Yaku) => getCurrentHan(win, yaku) === han && !yaku.isYakuman,
  });

  const getNormalYakuCategories = (win: WinFormState) => [
    createHanCategory("1판 역", 1, win),
    createHanCategory("2판 역", 2, win),
    createHanCategory("3판 역", 3, win),
    createHanCategory("5판 역", 5, win),
    createHanCategory("6판 역", 6, win),
    {
      label: "역만",
      filter: (yaku: Yaku) => Boolean(yaku.isYakuman),
    },
  ];

  const handleRecordRyuukyoku = async () => {
    if (!ryuukyokuType) {
      alert("유국 유형을 선택해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      await recordRyuukyoku({
        match_id: matchId,
        type: ryuukyokuType,
        tenpai_keys: tenpaiKeys,
        current_riichi_keys: currentRiichiKeys,
        is_final: isForceFinish,
      });

      alert("유국이 기록되었습니다.");
      setRyuukyokuType(null);
      setTenpaiKeys([]);
      setCurrentRiichiKeys([]);
      setIsForceFinish(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(error);
      alert("유국 기록 실패!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (isTsumo && wins.length !== 1) {
      alert("쯔모 화료자는 1명만 선택할 수 있습니다.");
      return;
    }

    if (!isTsumo && wins.length > 2) {
      alert(
        "론 화료자는 최대 2명까지 가능합니다.\n3명 론은 유국 탭에서 삼가화로 기록해주세요.",
      );
      return;
    }

    const winnerKeys = wins.map((win) => win.winner_key);

    if (new Set(winnerKeys).size !== winnerKeys.length) {
      alert("화료자가 중복되었습니다.");
      return;
    }

    if (!isTsumo && winnerKeys.includes(loserKey)) {
      alert("방총자는 화료자가 될 수 없습니다.");
      return;
    }

    const noYakuWin = wins.find((win) => win.selected_yaku_ids.length === 0);

    if (noYakuWin) {
      alert(
        "모든 화료자는 최소 1개 이상의 역을 선택해야 합니다.\n도라만으로는 화료할 수 없습니다.",
      );
      return;
    }

    const invalidFuWin = wins.find((win) => {
      const yakumanCount = getYakumanCount(win);

      if (yakumanCount > 0) return false;

      return win.fu === "" || Number(win.fu) < 20;
    });

    if (invalidFuWin) {
      alert("모든 화료자의 부수를 올바르게 입력해주세요.");
      return;
    }

    const invalidCalculatedScoreWin = wins.find((win) => !getCalculatedScore(win));

    if (invalidCalculatedScoreWin) {
      alert("점수 계산에 실패했습니다. 역과 부수를 확인해주세요.");
      return;
    }

    for (const win of wins) {
      const winHasYakuman = hasYakuman(win);

      if (winHasYakuman) continue;

      const selectedYakuNames = win.selected_yaku_ids.map(
        (id) => ALL_YAKU.find((item) => item.id === id)?.name,
      );

      const hasRiichiYaku =
        selectedYakuNames.includes("리치") ||
        selectedYakuNames.includes("더블 리치") ||
        selectedYakuNames.includes("더블리치");

      if (currentRiichiKeys.includes(win.winner_key) && !hasRiichiYaku) {
        const proceed = window.confirm(
          "화료자가 이번 국에 리치를 선언했는데 '리치' 또는 '더블 리치' 역이 선택되지 않았습니다.\n이대로 점수를 기록하시겠습니까?",
        );

        if (!proceed) return;
      }

      if (
        win.is_mengen &&
        isTsumo &&
        !selectedYakuNames.includes("멘젠쯔모")
      ) {
        const proceed = window.confirm(
          "멘젠 상태에서 쯔모 화료를 했는데 '멘젠쯔모' 역이 선택되지 않았습니다.\n이대로 점수를 기록하시겠습니까?",
        );

        if (!proceed) return;
      }
    }

    setIsSubmitting(true);

    try {
      await recordMahjongResult({
        match_id: matchId,
        is_tsumo: isTsumo,
        wins: wins.map((win) => ({
          winner_key: win.winner_key,
          loser_key: isTsumo ? null : loserKey,
          is_mengen: win.is_mengen,
          fu: win.fu === "" ? null : Number(win.fu),
          dora_total: win.dora_indicator + win.red_dora,
          selected_yaku_ids: win.selected_yaku_ids,
        })),
        current_riichi_keys: currentRiichiKeys,
        is_final: isForceFinish,
      });

      alert("기록되었습니다.");
      setWins([createDefaultWin(firstPlayerKey)]);
      setCurrentRiichiKeys([]);
      setIsForceFinish(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(error);
      alert("기록 실패!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTab("WIN")}
          className={`py-3 rounded-xl font-bold text-sm border transition-all ${
            tab === "WIN"
              ? "bg-blue-600 text-white border-blue-600 shadow-md"
              : "bg-foreground/5 border-foreground/10"
          }`}
        >
          화료
        </button>

        <button
          type="button"
          onClick={() => setTab("DRAW")}
          className={`py-3 rounded-xl font-bold text-sm border transition-all ${
            tab === "DRAW"
              ? "bg-orange-500 text-white border-orange-500 shadow-md"
              : "bg-foreground/5 border-foreground/10"
          }`}
        >
          유국
        </button>
      </div>

      {tab === "WIN" ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 rounded-2xl border bg-foreground/5 space-y-3">
            <p className="text-sm font-bold">
              이번 국 리치 선언{" "}
              <span className="text-xs text-foreground/50">
                (선택 시 1000점 차감)
              </span>
            </p>

            <div className="grid grid-cols-4 gap-2">
              {players.map((player) => {
                const isRiichi = currentRiichiKeys.includes(player.stateKey);

                return (
                  <button
                    key={player.stateKey}
                    type="button"
                    onClick={() => toggleRiichiPlayer(player.stateKey)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${
                      isRiichi
                        ? "bg-red-500 text-white border-red-500"
                        : "bg-white dark:bg-background border-foreground/10 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <span>{getWindLabel(player.wind)}</span>
                    <span>{player.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={toggleTsumo}
              className={`py-3 rounded-xl font-bold border transition-colors ${
                isTsumo
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-foreground/5 border-foreground/10"
              }`}
            >
              {isTsumo ? "쯔모 화료" : "론 화료"}
            </button>

            <div className="py-3 rounded-xl border border-foreground/10 bg-foreground/5 text-center text-sm font-bold">
              {isTsumo ? "화료자 1명" : `화료자 ${wins.length}명`}
            </div>
          </div>

          {!isTsumo && (
            <div className="space-y-2">
              <label className="text-sm font-bold">방총자</label>
              <select
                value={loserKey}
                onChange={(e) => handleLoserChange(e.target.value)}
                className="w-full p-2 rounded-xl border border-red-200 bg-red-50 text-red-700 font-bold text-sm"
              >
                {players.map((player) => (
                  <option key={player.stateKey} value={player.stateKey}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {wins.map((win, index) => {
            const winHasYakuman = hasYakuman(win);
            const totalHan = getWinTotalHan(win);
            const calculatedScore = getCalculatedScore(win);
            const fuOptions = getRecommendedFuOptions({
              isTsumo,
            });

            return (
              <div
                key={`${win.winner_key}-${index}`}
                className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-black text-blue-700 dark:text-blue-200">
                    {isTsumo
                      ? "쯔모 화료"
                      : wins.length > 1
                        ? `론 화료 ${index + 1}`
                        : "론 화료"}
                  </p>

                  {!isTsumo && wins.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRonWinner(index)}
                      className="text-xs font-bold text-red-500"
                    >
                      삭제
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">화료자</label>
                  <select
                    value={win.winner_key}
                    onChange={(e) =>
                      updateWin(index, { winner_key: e.target.value })
                    }
                    className="w-full p-2 rounded-xl border bg-background font-bold text-sm"
                  >
                    {players
                      .filter(
                        (player) => isTsumo || player.stateKey !== loserKey,
                      )
                      .map((player) => (
                        <option key={player.stateKey} value={player.stateKey}>
                          {player.name}
                        </option>
                      ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => toggleMengen(index)}
                  className={`w-full py-2 rounded-xl font-bold border transition-colors ${
                    win.is_mengen
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-foreground/5 border-foreground/10"
                  }`}
                >
                  {win.is_mengen ? "멘젠 상태" : "후로 상태"}
                </button>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-2 rounded-lg bg-white dark:bg-background border border-blue-200 text-sm font-bold">
                      총 {totalHan} 판
                    </div>

                    {!winHasYakuman && (
                      <select
                        value={win.fu}
                        onChange={(e) =>
                          updateWin(index, {
                            fu: e.target.value ? Number(e.target.value) : "",
                          })
                        }
                        className="flex-1 p-2 rounded-lg border border-blue-200 font-bold text-sm bg-white dark:bg-background min-w-0"
                      >
                        {fuOptions.map((fu) => (
                          <option key={fu} value={fu}>
                            {fu}부
                          </option>
                        ))}
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
                      {SITUATIONAL_YAKU.map((yaku) => {
                        const isDisabled = getDisabledStatus(
                          win,
                          yaku.name,
                          yaku.isMengenOnly,
                          yaku.isYakuman,
                        );
                        const isSelected = win.selected_yaku_ids.includes(
                          yaku.id,
                        );

                        return (
                          <button
                            key={yaku.id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => handleToggleYaku(index, yaku.id)}
                            className={`px-3 py-1.5 text-xs rounded-full border font-bold transition-all ${
                              isSelected
                                ? yaku.isYakuman
                                  ? "bg-red-500 text-white border-red-500 shadow-md"
                                  : "bg-blue-500 text-white border-blue-500 shadow-md"
                                : "bg-white dark:bg-background border-foreground/10"
                            } ${
                              isDisabled
                                ? "opacity-30 cursor-not-allowed"
                                : "hover:scale-105 active:scale-95"
                            }`}
                          >
                            {yaku.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-black text-foreground/50">
                      일반 역
                    </p>

                    {getNormalYakuCategories(win).map((category) => {
                      const yakuList = NORMAL_YAKU.filter(category.filter);

                      if (yakuList.length === 0) return null;

                      return (
                        <div key={category.label} className="space-y-1">
                          <p className="text-xs font-bold text-foreground/40">
                            {category.label}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {yakuList.map((yaku) => {
                              const isDisabled = getDisabledStatus(
                                win,
                                yaku.name,
                                yaku.isMengenOnly,
                                yaku.isYakuman,
                              );
                              const isSelected = win.selected_yaku_ids.includes(
                                yaku.id,
                              );

                              return (
                                <button
                                  key={yaku.id}
                                  type="button"
                                  disabled={isDisabled}
                                  onClick={() =>
                                    handleToggleYaku(index, yaku.id)
                                  }
                                  className={`px-3 py-1.5 text-xs rounded-full border font-bold transition-all ${
                                    isSelected
                                      ? yaku.isYakuman
                                        ? "bg-red-500 text-white border-red-500 shadow-md"
                                        : "bg-blue-500 text-white border-blue-500 shadow-md"
                                      : "bg-white dark:bg-background border-foreground/10"
                                  } ${
                                    isDisabled
                                      ? "opacity-30 cursor-not-allowed"
                                      : "hover:scale-105 active:scale-95"
                                  }`}
                                >
                                  {yaku.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
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
                            updateWin(index, {
                              dora_indicator: Math.max(
                                0,
                                win.dora_indicator - 1,
                              ),
                            })
                          }
                          className="w-8 h-8 rounded-full bg-background border flex items-center justify-center"
                        >
                          -
                        </button>

                        <span className="font-bold">{win.dora_indicator}</span>

                        <button
                          type="button"
                          onClick={() =>
                            updateWin(index, {
                              dora_indicator: win.dora_indicator + 1,
                            })
                          }
                          className="w-8 h-8 rounded-full bg-background border flex items-center justify-center"
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
                            updateWin(index, {
                              red_dora: Math.max(0, win.red_dora - 1),
                            })
                          }
                          className="w-8 h-8 rounded-full bg-background border flex items-center justify-center"
                        >
                          -
                        </button>

                        <span className="font-bold">{win.red_dora}</span>

                        <button
                          type="button"
                          onClick={() =>
                            updateWin(index, {
                              red_dora: win.red_dora + 1,
                            })
                          }
                          className="w-8 h-8 rounded-full bg-background border flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!isTsumo && wins.length < 2 && (
            <button
              type="button"
              onClick={addRonWinner}
              className="w-full py-3 rounded-xl border border-dashed border-blue-300 text-blue-600 font-bold text-sm"
            >
              + 더블 론 화료자 추가
            </button>
          )}

          {!isTsumo && (
            <p className="text-xs text-foreground/50">
              세 명이 론한 경우는 화료가 아니라 유국 탭에서 “삼가화”로
              기록해주세요.
            </p>
          )}

          <label className="flex items-center gap-2 text-sm font-bold text-red-500">
            <input
              type="checkbox"
              checked={isForceFinish}
              onChange={(e) => setIsForceFinish(e.target.checked)}
              className="w-4 h-4 accent-red-500"
            />
            기록 후 대국 조기 종료하기
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black shadow-lg disabled:opacity-50"
          >
            {isSubmitting ? "기록 중..." : "점수 기록"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border bg-foreground/5 space-y-3">
            <p className="text-sm font-bold">
              이번 국 리치 선언{" "}
              <span className="text-xs text-foreground/50">
                (선택 시 1000점 차감 후 공탁금 이월)
              </span>
            </p>

            <div className="grid grid-cols-4 gap-2">
              {players.map((player) => {
                const isRiichi = currentRiichiKeys.includes(player.stateKey);

                return (
                  <button
                    key={player.stateKey}
                    type="button"
                    onClick={() => toggleRiichiPlayer(player.stateKey)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${
                      isRiichi
                        ? "bg-red-500 text-white border-red-500"
                        : "bg-white dark:bg-background border-foreground/10 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <span>{getWindLabel(player.wind)}</span>
                    <span>{player.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold">유국 유형 선택</p>

            <div className="grid grid-cols-2 gap-2">
              {RYUUKYOKU_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRyuukyokuType(type)}
                  className={`py-3 rounded-xl border font-bold text-sm transition-all ${
                    ryuukyokuType === type
                      ? "bg-orange-500 text-white border-orange-500 shadow-md scale-[1.02]"
                      : "bg-foreground/5 hover:bg-foreground/10"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {ryuukyokuType === "황패유국" && (
            <div className="space-y-2">
              <p className="text-sm font-bold">
                텐파이인 작사를 모두 체크해주세요
              </p>

              <div className="grid grid-cols-2 gap-2">
                {players.map((player) => {
                  const isTenpai = tenpaiKeys.includes(player.stateKey);

                  return (
                    <button
                      key={player.stateKey}
                      type="button"
                      onClick={() => toggleTenpaiPlayer(player.stateKey)}
                      className={`py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        isTenpai
                          ? "bg-blue-600 text-white border-blue-600 shadow-inner"
                          : "bg-white dark:bg-background border-foreground/10"
                      }`}
                    >
                      <span>{getWindLabel(player.wind)}</span>
                      <span>{player.name}</span>
                      {isTenpai && <span>텐파이</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm font-bold text-red-500">
            <input
              type="checkbox"
              checked={isForceFinish}
              onChange={(e) => setIsForceFinish(e.target.checked)}
              className="w-4 h-4 accent-red-500"
            />
            기록 후 대국 조기 종료하기
          </label>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleRecordRyuukyoku}
            className="w-full py-4 rounded-2xl bg-orange-500 text-white font-black shadow-lg disabled:opacity-50"
          >
            {isSubmitting ? "기록 중..." : "유국 기록 완료"}
          </button>
        </div>
      )}
    </div>
  );
}