// web/src/app/(main)/mahjong/new/NewGameForm.tsx
"use client";

import React, { useState } from "react";

import { createMahjongMatch } from "@/app/actions/mahjong.action";
import { checkNicknameExists } from "@/app/actions/user.action";

export default function NewGameForm() {
    const [players, setPlayers] = useState(["", "", "", ""]);
    const [startingScore] = useState(25000);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [gameMode, setGameMode] = useState<"동풍전" | "반장전" | "전장전">(
        "동풍전",
    );

    const MAX_NICKNAME_LENGTH = 6;

    const [playerStatus, setPlayerStatus] = useState<
        ("idle" | "member" | "guest")[]
    >(["idle", "idle", "idle", "idle"]);

    const handleBlur = async (index: number, nickname: string) => {
        if (!nickname.trim()) {
            const newStatus = [...playerStatus];
            newStatus[index] = "idle";
            setPlayerStatus(newStatus);
            return;
        }

        const isExist = await checkNicknameExists(nickname);
        const newStatus = [...playerStatus];

        newStatus[index] = isExist ? "member" : "guest";
        setPlayerStatus(newStatus);
    };

    const handleStartGame = async (e: React.FormEvent) => {
        e.preventDefault();

        const playerNames = players.map((player) => player.trim());

        if (playerNames.some((playerName) => playerName === "")) {
            alert("4명의 작사 이름을 모두 입력해주세요.");
            return;
        }

        if (
            playerNames.some(
                (playerName) => playerName.length > MAX_NICKNAME_LENGTH,
            )
        ) {
            alert(`작사 이름은 ${MAX_NICKNAME_LENGTH}글자까지 입력할 수 있습니다.`);
            return;
        }

        if (new Set(playerNames).size !== 4) {
            alert("작사 이름은 모두 달라야 합니다.");
            return;
        }

        try {
            setIsSubmitting(true);

            await createMahjongMatch(playerNames, startingScore, gameMode);
        } catch (error) {
            const isRedirect =
                (error instanceof Error && error.message === "NEXT_REDIRECT") ||
                (error &&
                    typeof error === "object" &&
                    "digest" in error &&
                    String(error.digest).startsWith("NEXT_REDIRECT"));

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
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-8">
            <section className="rounded-3xl border border-foreground/10 bg-background p-5 shadow-sm md:p-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-black md:text-3xl">새 대국 시작</h1>
                    <p className="mt-2 text-sm text-foreground/60">
                        참여할 플레이어의 이름을 입력해 주세요.
                    </p>
                </div>

                <form onSubmit={handleStartGame} className="flex flex-col gap-8">
                    <section className="flex flex-col gap-3">
                        <h2 className="text-lg font-bold">게임 모드</h2>

                        <div className="grid grid-cols-3 gap-2">
                            {(["동풍전", "반장전", "전장전"] as const).map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setGameMode(mode)}
                                    className={`rounded-xl border py-3 font-bold transition-all ${
                                        gameMode === mode
                                            ? "border-blue-600 bg-blue-600 text-white shadow-md"
                                            : "bg-foreground/5"
                                    }`}
                                    disabled={isSubmitting}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="flex flex-col gap-3">
                        <h2 className="text-lg font-bold">플레이어 (초기 좌석)</h2>

                        <div className="flex flex-col gap-3">
                            {players.map((player, idx) => (
                                <div key={idx} className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-foreground/70">
                                        {winds[idx]}
                                    </label>

                                    <input
                                        value={player}
                                        onChange={(e) => {
                                            const newPlayers = [...players];
                                            newPlayers[idx] = e.target.value.slice(
                                                0,
                                                MAX_NICKNAME_LENGTH,
                                            );
                                            setPlayers(newPlayers);

                                            const newStatus = [...playerStatus];
                                            newStatus[idx] = "idle";
                                            setPlayerStatus(newStatus);
                                        }}
                                        maxLength={MAX_NICKNAME_LENGTH}
                                        onBlur={() => handleBlur(idx, player)}
                                        placeholder="닉네임 또는 이름"
                                        className="rounded-xl border p-3 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={isSubmitting}
                                    />

                                    {playerStatus[idx] === "member" && (
                                        <p className="text-xs font-semibold text-blue-600">
                                            ✓ 가입된 작사입니다. 전적이 연동됩니다.
                                        </p>
                                    )}

                                    {playerStatus[idx] === "guest" && (
                                        <p className="text-xs text-foreground/50">
                                            · 게스트로 참여합니다. (텍스트 기록)
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="flex flex-col gap-3">
                        <h2 className="text-lg font-bold">기본 설정</h2>

                        <div className="rounded-2xl bg-foreground/5 p-4">
                            <p className="text-sm text-foreground/60">시작 점수</p>
                            <p className="mt-1 text-xl font-black">
                                {startingScore.toLocaleString()} 점
                            </p>
                        </div>
                    </section>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-2xl bg-blue-600 px-5 py-4 font-black text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? "대국을 생성하는 중..." : "대국 생성하기"}
                    </button>
                </form>
            </section>
        </main>
    );
}