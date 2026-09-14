"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { createYachtMatch } from "@/app/actions/yacht.action";
import { checkNicknameExists } from "@/app/actions/user.action";
import {
  YACHT_MAX_PLAYER_NAME_LENGTH,
  YACHT_MAX_PLAYERS,
} from "@/features/games/yacht/constants";

type PlayerStatus = "idle" | "checking" | "member" | "guest";

function isRedirectError(error: unknown) {
  return (
    (error instanceof Error && error.message === "NEXT_REDIRECT") ||
    (typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String(error.digest).startsWith("NEXT_REDIRECT"))
  );
}

export default function NewYachtGameForm() {
  const [playerNames, setPlayerNames] = useState([""]);
  const [playerStatuses, setPlayerStatuses] = useState<PlayerStatus[]>(["idle"]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updatePlayer = (index: number, value: string) => {
    setPlayerNames((current) =>
      current.map((name, playerIndex) =>
        playerIndex === index ? value.slice(0, YACHT_MAX_PLAYER_NAME_LENGTH) : name,
      ),
    );
    setPlayerStatuses((current) =>
      current.map((status, playerIndex) =>
        playerIndex === index ? "idle" : status,
      ),
    );
  };

  const checkPlayer = async (index: number) => {
    const nickname = playerNames[index].trim();
    if (!nickname) return;
    setPlayerStatuses((current) =>
      current.map((status, playerIndex) =>
        playerIndex === index ? "checking" : status,
      ),
    );
    try {
      const exists = await checkNicknameExists(nickname);
      setPlayerStatuses((current) =>
        current.map((status, playerIndex) =>
          playerIndex === index ? (exists ? "member" : "guest") : status,
        ),
      );
    } catch {
      setPlayerStatuses((current) =>
        current.map((status, playerIndex) =>
          playerIndex === index ? "idle" : status,
        ),
      );
    }
  };

  const addPlayer = () => {
    if (playerNames.length >= YACHT_MAX_PLAYERS) return;
    setPlayerNames((current) => [...current, ""]);
    setPlayerStatuses((current) => [...current, "idle"]);
  };

  const removePlayer = (index: number) => {
    if (playerNames.length === 1) return;
    setPlayerNames((current) => current.filter((_, playerIndex) => playerIndex !== index));
    setPlayerStatuses((current) => current.filter((_, playerIndex) => playerIndex !== index));
  };

  const handleSubmit = () => {
    setErrorMessage(null);
    const names = playerNames.map((name) => name.trim());
    if (names.some((name) => !name)) {
      setErrorMessage("모든 참가자의 이름을 입력해주세요.");
      return;
    }
    if (new Set(names).size !== names.length) {
      setErrorMessage("참가자 이름은 모두 달라야 합니다.");
      return;
    }

    startTransition(async () => {
      try {
        await createYachtMatch({ playerNames: names });
      } catch (error) {
        if (isRedirectError(error)) throw error;
        setErrorMessage(
          error instanceof Error ? error.message : "게임을 생성하지 못했습니다.",
        );
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <Link href="/yacht" className="mb-4 inline-flex text-sm font-semibold text-foreground/60 hover:text-foreground">
          ← 야찌 대시보드로
        </Link>
        <div className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-6 shadow-sm">
          <p className="text-sm font-black text-blue-500">Yacht Dice</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight">새 게임 시작하기</h2>
          <p className="mt-2 text-sm leading-6 text-foreground/60">
            1명부터 6명까지 입력할 수 있습니다. 가입된 닉네임은 전적과 연동됩니다.
          </p>
        </div>
      </div>

      <section className="rounded-3xl border border-foreground/10 bg-background p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black">참가자</h3>
            <p className="mt-1 text-sm text-foreground/50">입력 순서대로 플레이어 버튼이 만들어집니다.</p>
          </div>
          <span className="text-sm font-bold text-foreground/50">{playerNames.length}/6</span>
        </div>

        <div className="space-y-3">
          {playerNames.map((name, index) => (
            <div key={index} className="flex items-start gap-2">
              <label className="flex-1 space-y-1">
                <span className="text-sm font-bold">{index + 1}번 플레이어</span>
                <input
                  value={name}
                  onChange={(event) => updatePlayer(index, event.target.value)}
                  onBlur={() => checkPlayer(index)}
                  placeholder="닉네임 또는 이름"
                  disabled={isPending}
                  className="w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 text-sm outline-none focus:border-blue-500/50"
                />
                <span className="block min-h-5 text-xs text-foreground/50">
                  {playerStatuses[index] === "checking" && "닉네임 확인 중..."}
                  {playerStatuses[index] === "member" && "가입 회원 · 전적 연동"}
                  {playerStatuses[index] === "guest" && "게스트로 기록"}
                </span>
              </label>
              {playerNames.length > 1 ? (
                <button type="button" onClick={() => removePlayer(index)} className="mt-6 rounded-xl px-3 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10">
                  삭제
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {playerNames.length < YACHT_MAX_PLAYERS ? (
          <button type="button" onClick={addPlayer} disabled={isPending} className="mt-2 w-full rounded-2xl border border-dashed border-foreground/20 p-3 text-sm font-bold text-foreground/60 hover:bg-foreground/[0.03]">
            + 플레이어 추가
          </button>
        ) : null}
      </section>

      {errorMessage ? <p className="rounded-2xl bg-red-500/10 p-4 text-sm font-semibold text-red-500">{errorMessage}</p> : null}
      <button type="button" onClick={handleSubmit} disabled={isPending} className="w-full rounded-2xl bg-foreground p-4 font-black text-background disabled:opacity-50">
        {isPending ? "게임 생성 중..." : "게임 시작하기"}
      </button>
    </div>
  );
}
