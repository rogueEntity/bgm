"use client";

import { useMemo, useState, useTransition } from "react";

import { recordTichuRound } from "@/app/actions/tichu.action";

type TichuTeamKey = "TEAM_A" | "TEAM_B";
type TichuDeclarationResult = "NONE" | "SUCCESS" | "FAIL";

type TichuPlayerState = {
  name?: string;
  team_key?: TichuTeamKey;
  seat_order?: number;
};

type TichuDetails = {
  current_round?: number;
  target_score?: number;
  teams?: {
    TEAM_A?: {
      name?: string;
      score?: number;
    };
    TEAM_B?: {
      name?: string;
      score?: number;
    };
  };
  players?: Record<string, TichuPlayerState>;
};

type TichuRoundFormProps = {
  matchId: number;
  expectedVersion: number;
  details: TichuDetails;
};

function parseNullableNumber(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return parsedValue;
}

export default function TichuRoundForm({
  matchId,
  expectedVersion,
  details,
}: Readonly<TichuRoundFormProps>) {
  const [oneTwoTeamKey, setOneTwoTeamKey] = useState<"NONE" | TichuTeamKey>(
    "NONE",
  );
  const [teamACardScore, setTeamACardScore] = useState("50");
  const [teamBCardScore, setTeamBCardScore] = useState("50");
  const [calledTichuPlayerKey, setCalledTichuPlayerKey] = useState("NONE");
  const [tichuResult, setTichuResult] =
    useState<TichuDeclarationResult>("NONE");
  const [calledGrandTichuPlayerKey, setCalledGrandTichuPlayerKey] =
    useState("NONE");
  const [grandTichuResult, setGrandTichuResult] =
    useState<TichuDeclarationResult>("NONE");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const players = useMemo(() => {
    return Object.entries(details.players ?? {}).sort(([, a], [, b]) => {
      return (a.seat_order ?? 0) - (b.seat_order ?? 0);
    });
  }, [details.players]);

  const teamAName = details.teams?.TEAM_A?.name ?? "A팀";
  const teamBName = details.teams?.TEAM_B?.name ?? "B팀";
  const isOneTwo = oneTwoTeamKey !== "NONE";

  const handleSubmit = () => {
    setErrorMessage(null);

    const parsedTeamACardScore = isOneTwo
      ? null
      : parseNullableNumber(teamACardScore);
    const parsedTeamBCardScore = isOneTwo
      ? null
      : parseNullableNumber(teamBCardScore);

    startTransition(async () => {
      try {
        await recordTichuRound({
          matchId,
          expectedVersion,
          teamACardScore: parsedTeamACardScore,
          teamBCardScore: parsedTeamBCardScore,
          oneTwoTeamKey: oneTwoTeamKey === "NONE" ? null : oneTwoTeamKey,
          calledTichuPlayerKey:
            calledTichuPlayerKey === "NONE" ? null : calledTichuPlayerKey,
          tichuResult,
          calledGrandTichuPlayerKey:
            calledGrandTichuPlayerKey === "NONE"
              ? null
              : calledGrandTichuPlayerKey,
          grandTichuResult,
        });

        setOneTwoTeamKey("NONE");
        setTeamACardScore("50");
        setTeamBCardScore("50");
        setCalledTichuPlayerKey("NONE");
        setTichuResult("NONE");
        setCalledGrandTichuPlayerKey("NONE");
        setGrandTichuResult("NONE");
      } catch (error) {
        console.error("티츄 라운드 기록 실패:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "티츄 라운드를 기록하지 못했습니다.",
        );
      }
    });
  };

  return (
    <section className="rounded-3xl border border-foreground/10 bg-background p-5 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-black">
          {details.current_round ?? 1}라운드 기록
        </h3>
        <p className="mt-1 text-sm text-foreground/50">
          카드 점수, 티츄 선언, 원투 여부를 입력해주세요.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-bold text-foreground/70">
            원투 여부
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { value: "NONE", label: "원투 없음" },
              { value: "TEAM_A", label: `${teamAName} 원투` },
              { value: "TEAM_B", label: `${teamBName} 원투` },
            ].map((option) => {
              const isSelected = oneTwoTeamKey === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    setOneTwoTeamKey(option.value as "NONE" | TichuTeamKey)
                  }
                  className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-foreground/10 bg-foreground/[0.03] text-foreground/70 hover:border-blue-500/40"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`grid gap-4 sm:grid-cols-2 transition ${isOneTwo ? "opacity-50" : "opacity-100"}`}>
          <label className="space-y-2">
            <span className="text-sm font-bold text-foreground/70">
              {teamAName} 카드 점수
            </span>
            <input
              value={isOneTwo ? "원투 시 자동 처리" : teamACardScore}
              onChange={(event) => setTeamACardScore(event.target.value)}
              disabled={isPending || isOneTwo}
              inputMode="numeric"
              className="w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-blue-500/50 disabled:cursor-not-allowed disabled:bg-foreground/[0.03]"
              placeholder="예: 70"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-foreground/70">
              {teamBName} 카드 점수
            </span>
            <input
              value={isOneTwo ? "원투 시 자동 처리" : teamBCardScore}
              onChange={(event) => setTeamBCardScore(event.target.value)}
              disabled={isPending || isOneTwo}
              inputMode="numeric"
              className="w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-blue-500/50 disabled:cursor-not-allowed disabled:bg-foreground/[0.03]"
              placeholder="예: 30"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
            <p className="text-sm font-black">티츄 선언</p>

            <select
              value={calledTichuPlayerKey}
              onChange={(event) => {
                setCalledTichuPlayerKey(event.target.value);

                if (event.target.value === "NONE") {
                  setTichuResult("NONE");
                }
              }}
              disabled={isPending}
              className="mt-3 w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-blue-500/50"
            >
              <option value="NONE">선언 없음</option>
              {players.map(([playerKey, player]) => (
                <option key={playerKey} value={playerKey}>
                  {player.name ?? "이름 없음"}
                </option>
              ))}
            </select>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { value: "NONE", label: "없음" },
                { value: "SUCCESS", label: "성공" },
                { value: "FAIL", label: "실패" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={isPending || calledTichuPlayerKey === "NONE"}
                  onClick={() =>
                    setTichuResult(option.value as TichuDeclarationResult)
                  }
                  className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                    tichuResult === option.value
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-foreground/10 bg-background text-foreground/60 hover:border-blue-500/40"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
            <p className="text-sm font-black">그랜드 티츄 선언</p>

            <select
              value={calledGrandTichuPlayerKey}
              onChange={(event) => {
                setCalledGrandTichuPlayerKey(event.target.value);

                if (event.target.value === "NONE") {
                  setGrandTichuResult("NONE");
                }
              }}
              disabled={isPending}
              className="mt-3 w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-blue-500/50"
            >
              <option value="NONE">선언 없음</option>
              {players.map(([playerKey, player]) => (
                <option key={playerKey} value={playerKey}>
                  {player.name ?? "이름 없음"}
                </option>
              ))}
            </select>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { value: "NONE", label: "없음" },
                { value: "SUCCESS", label: "성공" },
                { value: "FAIL", label: "실패" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={isPending || calledGrandTichuPlayerKey === "NONE"}
                  onClick={() =>
                    setGrandTichuResult(option.value as TichuDeclarationResult)
                  }
                  className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                    grandTichuResult === option.value
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-foreground/10 bg-background text-foreground/60 hover:border-blue-500/40"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-500">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            disabled={isPending}
            onClick={handleSubmit}
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "기록 중..." : "라운드 기록하기"}
          </button>
        </div>
      </div>
    </section>
  );
}