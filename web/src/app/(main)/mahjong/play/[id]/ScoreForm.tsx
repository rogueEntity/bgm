// web/src/app/(main)/mahjong/play/[id]/ScoreForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { NORMAL_YAKU, SITUATIONAL_YAKU } from "@/constants/yaku";
import { getValidatedYakuList, calculateTotalHan } from "@/lib/mahjong-calc";
import { recordMahjongResult, recordRyuukyoku } from "@/app/actions/mahjong.action";

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
  const [isForceFinish, setIsForceFinish] = useState(false); // 💡 조기 종료 체크박스 상태

  const [ryuukyokuType, setRyuukyokuType] = useState<"황패유국" | "구종구패" | "사풍연타" | "사개깡" | "사가리치" | "삼가화" | null>(null);
  const [tenpaiKeys, setTenpaiKeys] = useState<string[]>([]);

  const hasYakuman = selectedIds.some((id) => {
    const yaku = ALL_YAKU.find((y) => y.id === id);
    return yaku?.isYakuman;
  });

  useEffect(() => {
    const totalDora = doraIndicator + redDora;
    setTotalHan(calculateTotalHan(selectedIds, isMengen, totalDora));
  }, [selectedIds, isMengen, doraIndicator, redDora]);

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

  const toggleTenpaiPlayer = (stateKey: string) => {
    setTenpaiKeys(prev =>
      prev.includes(stateKey) ? prev.filter(k => k !== stateKey) : [...prev, stateKey]
    );
  };

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
        match_id: matchId,
        winner_key: winnerKey,
        loser_key: isTsumo ? null : loserKey,
        is_tsumo: isTsumo,
        base_score: Number(score),
        han: totalHan,
        dora_total: doraIndicator + redDora,
        selected_yaku_ids: selectedIds,
        current_riichi_keys: currentRiichiKeys,
        is_final: isForceFinish,
      });
      alert("기록되었습니다.");

      setScore("");
      setSelectedIds([]);
      setDoraIndicator(0);
      setRedDora(0);
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

        {/* 상단 탭 (대국 종료 버튼 제거) */}
        <div className="flex gap-2 w-full">
          <div className="flex flex-1 p-1 bg-foreground/5 rounded-lg">
            <button type="button" className={`flex-1 py-2 font-bold rounded-md transition-all ${tab === "WIN" ? "bg-background shadow text-blue-600" : "opacity-50"}`} onClick={() => setTab("WIN")}>화료</button>
            <button type="button" className={`flex-1 py-2 font-bold rounded-md transition-all ${tab === "DRAW" ? "bg-background shadow text-orange-600" : "opacity-50"}`} onClick={() => setTab("DRAW")}>유국</button>
          </div>
        </div>

        {/* 폼 내부 렌더링 영역 */}
        <div className="min-h-[420px]">
          {tab === "WIN" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
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

                {/* 💡 화료 시 조기 종료 체크박스 추가 */}
                <div className="flex items-center gap-2 py-2">
                  <input type="checkbox" id="forceFinishWin" checked={isForceFinish} onChange={(e) => setIsForceFinish(e.target.checked)} className="w-4 h-4 accent-red-500" />
                  <label htmlFor="forceFinishWin" className="text-sm font-bold text-red-500 cursor-pointer">기록 후 대국 조기 종료하기</label>
                </div>

                <button type="submit" className="w-full bg-foreground text-background p-3 rounded-xl font-bold">점수 기록</button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2 p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900">
                <p className="text-xs font-bold text-red-600 dark:text-red-400">이번 국 리치 선언 (선택 시 1000점 차감 후 공탁금 이월)</p>
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

              <div className="space-y-2">
                <p className="text-sm font-bold opacity-60">유국 유형 선택</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["황패유국", "구종구패", "사풍연타", "사개깡", "사가리치", "삼가화"] as const).map((type) => (
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
                <div className="space-y-3 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-200 dark:border-orange-900/50">
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                    텐파이인 작사를 모두 체크해주세요
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {players.map(p => {
                      const isTenpai = tenpaiKeys.includes(p.stateKey);
                      return (
                        <button
                          key={p.stateKey}
                          type="button"
                          onClick={() => toggleTenpaiPlayer(p.stateKey)}
                          className={`py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                            isTenpai 
                              ? "bg-blue-600 text-white border-blue-600 shadow-inner" 
                              : "bg-white dark:bg-background border-foreground/10"
                          }`}
                        >
                          <span className={isTenpai ? "opacity-80" : "opacity-50"}>
                            {p.wind === "EAST" ? "東" : p.wind === "SOUTH" ? "南" : p.wind === "WEST" ? "西" : "北"}
                          </span>
                          <span>{p.name}</span>
                          {isTenpai && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full ml-1">텐파이</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 💡 유국 시 조기 종료 체크박스 추가 */}
              <div className="flex items-center gap-2 py-2">
                <input type="checkbox" id="forceFinishDraw" checked={isForceFinish} onChange={(e) => setIsForceFinish(e.target.checked)} className="w-4 h-4 accent-red-500" />
                <label htmlFor="forceFinishDraw" className="text-sm font-bold text-red-500 cursor-pointer">기록 후 대국 조기 종료하기</label>
              </div>

              <button
                type="button"
                disabled={isSubmitting || !ryuukyokuType}
                onClick={handleRecordRyuukyoku}
                className={`w-full p-4 rounded-xl font-bold text-lg transition-all ${
                  !ryuukyokuType || isSubmitting
                    ? "bg-foreground/20 text-foreground/50 cursor-not-allowed"
                    : "bg-orange-500 text-white hover:bg-orange-600 shadow-lg"
                }`}
              >
                {isSubmitting ? "기록 중..." : "유국 기록 완료"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}