"use client";

import { useState, useTransition } from "react";

import {
  completeYachtMatch,
  recordAdditionalYacht,
  recordYachtScore,
} from "@/app/actions/yacht.action";
import {
  YACHT_CATEGORIES,
  YACHT_CATEGORY_LABELS,
  YACHT_SCORE_OPTIONS,
  type YachtCategory,
} from "@/features/games/yacht/constants";
import {
  getYachtBonus,
  getYachtFilledCount,
  getYachtTotal,
  getYachtUpperSubtotal,
} from "@/features/games/yacht/scoring";
import type { YachtMatchDetails } from "@/features/games/yacht/types";

type YachtScorecardProps = {
  matchId: number;
  expectedVersion: number;
  details: YachtMatchDetails;
  canManage: boolean;
};

function isRedirectError(error: unknown) {
  return (
    (error instanceof Error && error.message === "NEXT_REDIRECT") ||
    (typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String(error.digest).startsWith("NEXT_REDIRECT"))
  );
}

export default function YachtScorecard({
  matchId,
  expectedVersion,
  details,
  canManage,
}: YachtScorecardProps) {
  const players = Object.entries(details.players).sort(
    ([, a], [, b]) => a.seat_order - b.seat_order,
  );
  const [activePlayerKey, setActivePlayerKey] = useState(players[0]?.[0] ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activePlayer = details.players[activePlayerKey] ?? players[0]?.[1];
  const isScorecardComplete = players.every(
    ([, player]) => getYachtFilledCount(player.scores) === YACHT_CATEGORIES.length,
  );

  const saveScore = (category: YachtCategory, rawScore: string) => {
    if (!activePlayerKey || rawScore === "") return;
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await recordYachtScore({
          matchId,
          expectedVersion,
          playerKey: activePlayerKey,
          category,
          score: Number(rawScore),
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "점수를 저장하지 못했습니다.",
        );
      }
    });
  };

  const saveAdditionalYacht = (zeroCategory: string) => {
    if (!activePlayerKey || !zeroCategory) return;
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await recordAdditionalYacht({
          matchId,
          expectedVersion,
          playerKey: activePlayerKey,
          zeroCategory,
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "추가 Yacht를 저장하지 못했습니다.",
        );
      }
    });
  };

  const finishGame = () => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await completeYachtMatch({ matchId, expectedVersion });
      } catch (error) {
        if (isRedirectError(error)) throw error;
        setErrorMessage(
          error instanceof Error ? error.message : "게임을 완료하지 못했습니다.",
        );
      }
    });
  };

  if (!activePlayer) return null;

  return (
    <div className="space-y-4">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {players.map(([playerKey, player]) => {
          const isActive = playerKey === activePlayerKey;
          return (
            <button
              key={playerKey}
              type="button"
              onClick={() => setActivePlayerKey(playerKey)}
              className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-bold transition ${
                isActive
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-foreground/10 bg-background hover:bg-foreground/5"
              }`}
            >
              {player.name} ({getYachtFilledCount(player.scores)}/12)
            </button>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-3xl border border-foreground/10 bg-background shadow-sm">
        <div className="flex items-end justify-between border-b border-foreground/10 p-5">
          <div>
            <p className="text-sm text-foreground/50">선택한 플레이어</p>
            <h3 className="mt-1 text-2xl font-black">{activePlayer.name}</h3>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-foreground/50">현재 합계</p>
            <p className="text-2xl font-black">{getYachtTotal(activePlayer.scores)}점</p>
          </div>
        </div>

        <div className="divide-y divide-foreground/10">
          {YACHT_CATEGORIES.map((category, index) => {
            const score = activePlayer.scores[category];
            const isUpperEnd = index === 5;
            const isAdditionalYachtScore = category === "YACHT" && (score ?? 0) > 50;
            return (
              <div key={category}>
                <div className="flex items-center justify-between gap-4 px-5 py-3">
                  <label htmlFor={`${activePlayerKey}-${category}`} className="font-bold">
                    {YACHT_CATEGORY_LABELS[category]}
                  </label>
                  {isAdditionalYachtScore ? (
                    <span className="min-w-28 text-right text-lg font-black">{score}점</span>
                  ) : (
                    <select
                      id={`${activePlayerKey}-${category}`}
                      value={typeof score === "number" ? String(score) : ""}
                      onChange={(event) => saveScore(category, event.target.value)}
                      disabled={!canManage || isPending}
                      className="min-w-28 rounded-xl border border-foreground/15 bg-background px-3 py-2 text-right text-sm font-bold disabled:opacity-50"
                    >
                      <option value="" disabled>점수 선택</option>
                      {YACHT_SCORE_OPTIONS[category].map((option) => (
                        <option key={option} value={option}>{option}점</option>
                      ))}
                    </select>
                  )}
                </div>
                {isUpperEnd ? (
                  <div className="grid grid-cols-2 gap-3 bg-foreground/[0.03] px-5 py-3 text-sm">
                    <p>상단 합계 <strong>{getYachtUpperSubtotal(activePlayer.scores)}점</strong></p>
                    <p className="text-right">보너스 <strong>+{getYachtBonus(activePlayer.scores)}점</strong></p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {(activePlayer.scores.YACHT ?? 0) >= 50 &&
      YACHT_CATEGORIES.some(
        (category) =>
          category !== "YACHT" && typeof activePlayer.scores[category] !== "number",
      ) ? (
        <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
          <h4 className="font-black">추가 Yacht 기록</h4>
          <p className="mt-1 text-sm text-foreground/60">
            빈 항목 하나를 0점으로 채우고 Yacht 점수를 50점 올립니다.
          </p>
          <select
            value=""
            onChange={(event) => saveAdditionalYacht(event.target.value)}
            disabled={!canManage || isPending}
            className="mt-3 w-full rounded-xl border border-foreground/15 bg-background px-3 py-3 text-sm font-bold disabled:opacity-50"
          >
            <option value="" disabled>0점으로 처리할 항목 선택</option>
            {YACHT_CATEGORIES.filter(
              (category) =>
                category !== "YACHT" &&
                typeof activePlayer.scores[category] !== "number",
            ).map((category) => (
              <option key={category} value={category}>
                {YACHT_CATEGORY_LABELS[category]} → 0점
              </option>
            ))}
          </select>
        </section>
      ) : null}

      {canManage && isScorecardComplete ? (
        <button
          type="button"
          onClick={finishGame}
          disabled={isPending}
          className="w-full rounded-2xl bg-foreground p-4 font-black text-background disabled:opacity-50"
        >
          {isPending ? "처리 중..." : "게임 완료"}
        </button>
      ) : null}

      {!canManage ? (
        <p className="text-sm text-foreground/50">게임 생성자와 관리자만 점수를 기록할 수 있습니다.</p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-2xl bg-red-500/10 p-4 text-sm font-semibold text-red-500">{errorMessage}</p>
      ) : null}
    </div>
  );
}
