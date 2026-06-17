// web/src/app/(main)/mahjong/play/[id]/ScoreForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { NORMAL_YAKU, SITUATIONAL_YAKU } from "@/constants/yaku";
import { getValidatedYakuList, calculateTotalHan } from "@/lib/mahjong-calc";
import { recordMahjongResult, finishMatch } from "@/app/actions/mahjong.action";

interface Player {
  name: string;
  wind: string;
  stateKey: string;
}

const ALL_YAKU = [...NORMAL_YAKU, ...SITUATIONAL_YAKU];

export default function ScoreForm({
  matchId,
  players,
}: {
  matchId: number;
  players: Player[];
}) {
  const [tab, setTab] = useState<"WIN" | "DRAW">("WIN");
  const [isMengen, setIsMengen] = useState(true);
  const [isTsumo, setIsTsumo] = useState(false);

  const [winnerKey, setWinnerKey] = useState(players[0].stateKey);
  const [loserKey, setLoserKey] = useState(players[1].stateKey);

  const [doraIndicator, setDoraIndicator] = useState(0);
  const [redDora, setRedDora] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [totalHan, setTotalHan] = useState(0);

  const [score, setScore] = useState<number | "">("");
  const [currentRiichiKeys, setCurrentRiichiKeys] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasYakuman = selectedIds.some((id) => {
    const yaku = ALL_YAKU.find((y) => y.id === id);
    return yaku?.isYakuman;
  });

  useEffect(() => {
    const totalDora = doraIndicator + redDora;
    setTotalHan(calculateTotalHan(selectedIds, isMengen, totalDora));
  }, [selectedIds, isMengen, doraIndicator, redDora]);

  const toggleTsumo = () => {
    const nextIsTsumo = !isTsumo;
    setIsTsumo(nextIsTsumo);
    setSelectedIds(prev => prev.filter(id => {
      const yaku = ALL_YAKU.find(y => y.id === id);
      if (!yaku) return false;
      if (nextIsTsumo && ["하저로어", "창깡"].includes(yaku.name)) return false;
      if (!nextIsTsumo && ["멘젠쯔모", "해저로월", "영상개화"].includes(yaku.name)) return false;
      return true;
    }));
  };

  const toggleMengen = () => {
    const nextIsMengen = !isMengen;
    setIsMengen(nextIsMengen);
    if (!nextIsMengen) {
      setSelectedIds(prev => prev.filter(id => {
        const yaku = ALL_YAKU.find(y => y.id === id);
        return !yaku?.isMengenOnly;
      }));
    }
  };

  const handleToggleYaku = (id: string) => {
    const targetYaku = ALL_YAKU.find(y => y.id === id);
    if (!targetYaku) return;

    const isTsumoOnly = ["멘젠쯔모", "해저로월", "영상개화"].includes(targetYaku.name);
    const isRonOnly = ["하저로어", "창깡"].includes(targetYaku.name);
    if (!isMengen && targetYaku.isMengenOnly && !selectedIds.includes(id)) return;
    if (!isTsumo && isTsumoOnly) return;
    if (isTsumo && isRonOnly) return;

    setSelectedIds(prev => {
      let nextIds = getValidatedYakuList(prev, id);
      if (targetYaku.name === "일발") {
        nextIds = nextIds.filter(nId => !["영상개화", "창깡"].includes(ALL_YAKU.find(y => y.id === nId)?.name || ""));
      } else if (["영상개화", "창깡"].includes(targetYaku.name)) {
        nextIds = nextIds.filter(nId => ALL_YAKU.find(y => y.id === nId)?.name !== "일발");
      }
      const hasYakumanNow = nextIds.some(nextId => ALL_YAKU.find(y => y.id === nextId)?.isYakuman);
      if (hasYakumanNow) {
        setDoraIndicator(0);
        setRedDora(0);
        return nextIds.filter(nextId => ALL_YAKU.find(y => y.id === nextId)?.isYakuman);
      }
      return nextIds;
    });
  };

  const toggleRiichiPlayer = (stateKey: string) => {
    setCurrentRiichiKeys(prev =>
      prev.includes(stateKey) ? prev.filter(k => k !== stateKey) : [...prev, stateKey]
    );
  };

  // 대국 수동 종료 핸들러
  const handleFinishMatch = async () => {
    const proceed = window.confirm("정말로 대국을 조기 종료하시겠습니까?\n(현재 점수 기준으로 최종 순위가 결정됩니다.)");
    if (!proceed) return;

    try {
      await finishMatch(matchId);
      alert("대국이 종료되었습니다.");
      window.scrollTo({ top: 0, behavior: "smooth" }); // 💡 스크롤 초기화
    } catch (error) {
      console.error(error);
      alert("대국 종료 처리 실패!");
    }
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (score === "" || Number(score) <= 0) {
      alert("올바른 점수를 입력해주세요.");
      return;
    }

    if (!hasYakuman) {
      const selectedYakuNames = selectedIds.map(id => ALL_YAKU.find(y => y.id === id)?.name);
      const hasRiichiYaku = selectedYakuNames.includes("리치") || selectedYakuNames.includes("더블 리치") || selectedYakuNames.includes("더블리치");

      if (currentRiichiKeys.includes(winnerKey) && !hasRiichiYaku) {
        const proceed = window.confirm("화료자가 이번 국에 리치를 선언했는데 '리치' 또는 '더블 리치' 역이 선택되지 않았습니다.\n이대로 점수를 기록하시겠습니까?");
        if (!proceed) return;
      }
      if (isMengen && isTsumo && !selectedYakuNames.includes("멘젠쯔모")) {
        const proceed = window.confirm("멘젠 상태에서 쯔모 화료를 했는데 '멘젠쯔모' 역이 선택되지 않았습니다.\n이대로 점수를 기록하시겠습니까?");
        if (!proceed) return;
      }
    }

    setIsSubmitting(true);
    try {
      await recordMahjongResult({
        matchId,
        winnerKey,
        loserKey: isTsumo ? null : loserKey,
        isTsumo,
        baseScore: Number(score),
        han: totalHan,
        doraTotal: hasYakuman ? 0 : (doraIndicator + redDora),
        selectedYakuIds: selectedIds,
        currentRiichiKeys,
      });
      alert("기록되었습니다.");

      setScore("");
      setSelectedIds([]);
      setDoraIndicator(0);
      setRedDora(0);
      setCurrentRiichiKeys([]);

      window.scrollTo({ top: 0, behavior: "smooth" }); // 💡 스크롤 맨 위로 초기화
    } catch (error) {
      console.error(error);
      alert("기록 실패!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDisabledStatus = (yName: string, isMengenOnly: boolean | undefined, isYakuman: boolean | undefined) => {
    const isTsumoOnly = ["멘젠쯔모", "해저로월", "영상개화"].includes(yName);
    const isRonOnly = ["하저로어", "창깡"].includes(yName);
    return ((!isMengen && isMengenOnly) || (hasYakuman && !isYakuman) || (!isTsumo && isTsumoOnly) || (isTsumo && isRonOnly));
  };

  const getCurrentHan = (y: any) => {
    if (isMengen) return y.han.closed;
    if (y.isMengenOnly) return y.han.closed;
    return y.han.open;
  };

  const NORMAL_YAKU_CATEGORIES = [
    { label: "1판 역", filter: (y: any) => getCurrentHan(y) === 1 && !y.isYakuman },
    { label: "2판 역", filter: (y: any) => getCurrentHan(y) === 2 && !y.isYakuman },
    { label: "3판 역", filter: (y: any) => getCurrentHan(y) === 3 && !y.isYakuman },
    { label: "5판 역", filter: (y: any) => getCurrentHan(y) === 5 && !y.isYakuman },
    { label: "6판 역", filter: (y: any) => getCurrentHan(y) === 6 && !y.isYakuman },
    { label: "역만", filter: (y: any) => y.isYakuman },
  ];

  return (
    <div className="w-full bg-background border border-foreground/10 rounded-2xl p-4 shadow-lg overflow-hidden contain-layout">
      <div className="space-y-4">

        {/* 💡 상단 탭 & 대국 종료 버튼 합침 */}
        <div className="flex gap-2 w-full">
          <div className="flex flex-1 p-1 bg-foreground/5 rounded-lg">
            <button type="button" className={`flex-1 py-2 font-bold rounded-md transition-all ${tab === "WIN" ? "bg-background shadow text-blue-600" : "opacity-50"}`} onClick={() => setTab("WIN")}>화료</button>
            <button type="button" className={`flex-1 py-2 font-bold rounded-md transition-all ${tab === "DRAW" ? "bg-background shadow text-orange-600" : "opacity-50"}`} onClick={() => setTab("DRAW")}>유국</button>
          </div>
          <button
            type="button"
            onClick={handleFinishMatch}
            className="px-4 py-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 font-extrabold rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
          >
            대국 종료
          </button>
        </div>

        {/* (이하 폼 내부 렌더링 영역은 기존과 완벽히 동일합니다.) */}
        <div className="min-h-[420px]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "WIN" ? (
              <div className="space-y-4">

                <div className="space-y-2 p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">이번 국 리치 선언 (선택 시 1000점 차감)</p>
                  <div className="grid grid-cols-4 gap-2">
                    {players.map(p => {
                      const isRiichi = currentRiichiKeys.includes(p.stateKey);
                      return (
                        <button key={p.stateKey} type="button" onClick={() => toggleRiichiPlayer(p.stateKey)}
                          className={`py-2 text-xs font-bold rounded-lg border transition-all flex flex-col items-center justify-center gap-1
                            ${isRiichi ? "bg-red-500 text-white border-red-500" : "bg-white dark:bg-background border-foreground/10 opacity-70 hover:opacity-100"}`}
                        >
                          <span className={isRiichi ? "opacity-80" : "opacity-50"}>
                            {p.wind === "EAST" ? "東" : p.wind === "SOUTH" ? "南" : p.wind === "WEST" ? "西" : "北"}
                          </span>
                          <span>{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={toggleMengen} className={`py-2 rounded-xl font-bold border transition-colors ${isMengen ? "bg-blue-600 text-white border-blue-600" : "bg-foreground/5 border-foreground/10"}`}>
                    {isMengen ? "멘젠 상태" : "후로 상태"}
                  </button>
                  <button type="button" onClick={toggleTsumo} className={`py-2 rounded-xl font-bold border transition-colors ${isTsumo ? "bg-green-600 text-white border-green-600" : "bg-foreground/5 border-foreground/10"}`}>
                    {isTsumo ? "쯔모 화료" : "론 화료"}
                  </button>
                </div>

                <div className="space-y-4 bg-foreground/5 p-3 rounded-xl border border-foreground/5">
                  <p className="text-xs font-bold opacity-60">
                    역 선택 {hasYakuman && <span className="text-red-500 ml-2">(역만 성립 시 일반 역 무효)</span>}
                  </p>

                  <div className="space-y-2">
                    <p className="text-[11px] font-extrabold text-blue-500/80">상황 역</p>
                    <div className="flex flex-wrap gap-2">
                      {SITUATIONAL_YAKU.map(y => {
                        const isDisabled = getDisabledStatus(y.name, y.isMengenOnly, y.isYakuman);
                        const isSelected = selectedIds.includes(y.id);
                        return (
                          <button key={y.id} type="button" disabled={isDisabled} onClick={() => handleToggleYaku(y.id)}
                          className={`px-3 py-1.5 text-xs rounded-full border font-bold transition-all 
                              ${isSelected 
                                ? (y.isYakuman ? "bg-red-500 text-white border-red-500 shadow-md" : "bg-blue-500 text-white border-blue-500 shadow-md") 
                                : "bg-white dark:bg-background border-foreground/10"}
                              ${isDisabled ? "opacity-30 cursor-not-allowed" : "hover:scale-105 active:scale-95"}`}>
                              {y.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-foreground/10 my-2"></div>

                  <div className="space-y-3">
                    <p className="text-[11px] font-extrabold text-blue-500/80">일반 역</p>
                    {NORMAL_YAKU_CATEGORIES.map(category => {
                      const yakuList = NORMAL_YAKU.filter(category.filter);
                      if (yakuList.length === 0) return null;

                      return (
                        <div key={category.label} className="space-y-1.5">
                          <p className={`text-[10px] font-bold opacity-60 ${category.label === "역만" ? "text-red-500" : ""}`}>
                            {category.label}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {yakuList.map(y => {
                              const isDisabled = getDisabledStatus(y.name, y.isMengenOnly, y.isYakuman);
                              const isSelected = selectedIds.includes(y.id);
                              return (
                                <button key={y.id} type="button" disabled={isDisabled} onClick={() => handleToggleYaku(y.id)}
                                className={`px-3 py-1.5 text-xs rounded-full border font-bold transition-all 
                                    ${isSelected 
                                      ? (y.isYakuman ? "bg-red-500 text-white border-red-500 shadow-md" : "bg-blue-500 text-white border-blue-500 shadow-md") 
                                      : "bg-white dark:bg-background border-foreground/10"}
                                    ${isDisabled ? "opacity-30 cursor-not-allowed" : "hover:scale-105 active:scale-95"}`}>
                                    {y.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>

                <div className={`space-y-3 p-3 bg-foreground/5 rounded-xl border border-foreground/5 transition-opacity ${hasYakuman ? "opacity-30 pointer-events-none grayscale" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">일반 도라</span>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setDoraIndicator(Math.max(0, doraIndicator - 1))} className="w-8 h-8 rounded-full bg-background border flex items-center justify-center">-</button>
                      <span className="font-black text-xl w-6 text-center">{doraIndicator}</span>
                      <button type="button" onClick={() => setDoraIndicator(doraIndicator + 1)} className="w-8 h-8 rounded-full bg-background border flex items-center justify-center">+</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-red-500">적도라</span>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setRedDora(Math.max(0, redDora - 1))} className="w-8 h-8 rounded-full bg-background border flex items-center justify-center">-</button>
                      <span className="font-black text-xl w-6 text-center text-red-500">{redDora}</span>
                      <button type="button" onClick={() => setRedDora(redDora + 1)} className="w-8 h-8 rounded-full bg-background border flex items-center justify-center">+</button>
                    </div>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-3 rounded-xl border ${hasYakuman ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900" : "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900"}`}>
                  <span className={`text-lg font-black min-w-[100px] ${hasYakuman ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
                    총 {totalHan} 판 {hasYakuman && "(역만)"}
                  </span>
                  <input
                    type="number"
                    value={score}
                    onChange={(e) => setScore(e.target.value ? Number(e.target.value) : "")}
                    placeholder={hasYakuman ? "32000" : "점수 입력 (예: 8000)"}
                    className="flex-1 p-2 rounded-lg border border-blue-200 font-bold text-sm bg-white dark:bg-background"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <label className="text-[10px] font-bold opacity-60">화료자</label>
                      <select value={winnerKey} onChange={(e) => setWinnerKey(e.target.value)} className="w-full p-2 rounded-xl border bg-background font-bold text-sm">
                        {players.map(p => <option key={p.stateKey} value={p.stateKey}>{p.name}</option>)}
                      </select>
                  </div>
                  {!isTsumo && (
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-red-500">방총자</label>
                        <select value={loserKey} onChange={(e) => setLoserKey(e.target.value)} className="w-full p-2 rounded-xl border border-red-200 bg-red-50 text-red-700 font-bold text-sm">
                            {players.map(p => <option key={p.stateKey} value={p.stateKey}>{p.name}</option>)}
                        </select>
                    </div>
                  )}
                </div>

                <button type="submit" className="w-full bg-foreground text-background p-3 rounded-xl font-bold">점수 기록</button>
              </div>
            ) : (
              <div className="py-20 text-center opacity-60">유국 상세 로직은 추후 구현됩니다.</div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}