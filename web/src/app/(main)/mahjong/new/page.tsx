"use client";

import React, { useState } from "react";
import { createMahjongMatch } from "@/app/actions/mahjong.action";
import { checkNicknameExists } from "@/app/actions/user.action";

export default function NewGamePage() {
  const [players, setPlayers] = useState(["", "", "", ""]);
  const [startingScore, setStartingScore] = useState(25000);
  const [isSubmitting, setIsSubmitting] = useState(false); // 중복 클릭 방지용 상태
  const [gameMode, setGameMode] = useState<"동풍전" | "반장전" | "전장전">("동풍전");
  const MAX_NICKNAME_LENGTH = 6;
  
  // 각 플레이어의 회원 여부 상태 저장 ("idle" | "member" | "guest")
  const [playerStatus, setPlayerStatus] = useState<("idle" | "member" | "guest")[]>([
    "idle", "idle", "idle", "idle"
  ]);

  // 닉네임 입력 후 포커스를 잃을 때(onBlur) DB 조회
  const handleBlur = async (index: number, nickname: string) => {
    if (!nickname.trim()) {
      const newStatus = [...playerStatus];
      newStatus[index] = "idle";
      setPlayerStatus(newStatus);
      return;
    }

    // 서버 액션을 통해 유저 존재 여부 확인
    const isExist = await checkNicknameExists(nickname);
    
    const newStatus = [...playerStatus];
    newStatus[index] = isExist ? "member" : "guest";
    setPlayerStatus(newStatus);
  };

  // 대국 시작 제출 핸들러
  const handleStartGame = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const playerNames = players.map((p) => p.trim());

    // 빈칸 검사
    if (playerNames.some((p) => p === "")) {
      alert("4명의 작사 이름을 모두 입력해주세요.");
      return;
    }

    // 닉네임 길이 검사
    if (playerNames.some((p) => p.length > MAX_NICKNAME_LENGTH)) {
      alert(`작사 이름은 ${MAX_NICKNAME_LENGTH}글자까지 입력할 수 있습니다.`);
      return;
    }

    // 중복 이름 검사
    const uniquePlayers = new Set(playerNames);
    if (uniquePlayers.size !== 4) {
      alert("작사 이름은 모두 달라야 합니다.");
      return;
    }

    try {
      setIsSubmitting(true);
      // 서버 액션 호출 (DB에 대국 세션 생성 및 리다이렉트)
      await createMahjongMatch(playerNames, startingScore, gameMode);
    } catch (error) {
      // 리다이렉트 에러인 경우 에러창을 띄우지 않고 그대로 통과(Throw)
      const isRedirect =
        (error instanceof Error && error.message === "NEXT_REDIRECT") ||
        (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT"));

      if (isRedirect) {
        throw error;
      }

      console.error("대국 생성 중 오류 발생:", error);
      alert("대국을 생성하는 중 문제가 발생했습니다.");
      setIsSubmitting(false);
    }
  };

  const winds = ["동(東)", "남(南)", "서(西)", "북(北)"];

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <header>
        <h2 className="text-2xl font-black">새 대국 시작</h2>
        <p className="text-foreground/60 text-sm mt-1">
          참여할 플레이어의 이름을 입력해 주세요.
        </p>
      </header>

      <form onSubmit={handleStartGame} className="space-y-8">
        <div className="space-y-3">
        <h3 className="font-bold border-b pb-2">게임 모드</h3>
        <div className="grid grid-cols-3 gap-2">
          {(["동풍전", "반장전", "전장전"] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => setGameMode(mode)}
              className={`py-3 rounded-xl font-bold border transition-all ${gameMode === mode ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-foreground/5"}`}>
              {mode}
            </button>
          ))}
        </div>
      </div>
        <div className="space-y-5">
          <h3 className="font-bold border-b pb-2">플레이어 (초기 좌석)</h3>
          {players.map((player, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="w-12 font-bold text-lg text-center bg-foreground/5 rounded-lg py-2">
                  {winds[idx]}
                </span>
                <input
                  type="text"
                  value={player}
                  onChange={(e) => {
                    const newPlayers = [...players];
                    newPlayers[idx] = e.target.value.slice(0, MAX_NICKNAME_LENGTH);
                    setPlayers(newPlayers);

                    // 글자를 수정하면 다시 상태를 idle로 초기화
                    const newStatus = [...playerStatus];
                    newStatus[idx] = "idle";
                    setPlayerStatus(newStatus);
                  }}
                  maxLength={MAX_NICKNAME_LENGTH}
                  onBlur={() => handleBlur(idx, player)}
                  placeholder="닉네임 또는 이름"
                  className="flex-1 p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  disabled={isSubmitting}
                />
              </div>

              {/* 상태에 따른 뱃지(안내문) 출력 영역 */}
              <div className="ml-16 h-4">
                {playerStatus[idx] === "member" && (
                  <span className="text-xs font-bold text-blue-500">
                    ✓ 가입된 작사입니다. 전적이 연동됩니다.
                  </span>
                )}
                {playerStatus[idx] === "guest" && (
                  <span className="text-xs font-bold text-foreground/50">
                    · 게스트로 참여합니다. (텍스트 기록)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 시작 점수 (추후 확장을 위해 UI로 빼둠) */}
        <div className="space-y-3">
          <h3 className="font-bold border-b pb-2">기본 설정</h3>
          <div className="flex items-center justify-between p-3 border rounded-xl bg-foreground/5">
            <span className="font-medium">시작 점수</span>
            <span className="font-bold">{startingScore.toLocaleString()} 점</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full p-4 rounded-xl font-bold text-lg transition-all ${
            isSubmitting 
              ? "bg-foreground/50 text-background cursor-not-allowed" 
              : "bg-foreground text-background hover:opacity-90 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          }`}
        >
          {isSubmitting ? "대국을 생성하는 중..." : "대국 생성하기"}
        </button>
      </form>
    </div>
  );
}