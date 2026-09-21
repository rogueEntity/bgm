// web/src/app/(main)/tichu/play/[id]/TichuRoundForm.tsx

"use client";

import { useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";
import { recordTichuRound } from "@/app/actions/tichu.action";

type TichuTeamKey = "TEAM_A" | "TEAM_B";

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

function togglePlayerKey(playerKeys: string[], playerKey: string) {
  if (playerKeys.includes(playerKey)) {
    return playerKeys.filter((currentPlayerKey) => {
      return currentPlayerKey !== playerKey;
    });
  }

  return [...playerKeys, playerKey];
}

export default function TichuRoundForm({
                                         matchId,
                                         expectedVersion,
                                         details,
                                       }: Readonly<TichuRoundFormProps>) {
  const router = useRouter();

  const [oneTwoTeamKey, setOneTwoTeamKey] = useState<
      "NONE" | TichuTeamKey
  >("NONE");

  const [teamACardScore, setTeamACardScore] = useState("50");
  const [teamBCardScore, setTeamBCardScore] = useState("50");

  const [firstOutPlayerKey, setFirstOutPlayerKey] = useState("NONE");

  const [smallTichuPlayerKeys, setSmallTichuPlayerKeys] = useState<
      string[]
  >([]);

  const [largeTichuPlayerKeys, setLargeTichuPlayerKeys] = useState<
      string[]
  >([]);

  const [isForceFinish, setIsForceFinish] = useState(false);
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

  const changeCardScore = (teamKey: TichuTeamKey, nextScore: number) => {
    const score = Math.max(-25, Math.min(125, nextScore));

    setTeamACardScore(String(teamKey === "TEAM_A" ? score : 100 - score));
    setTeamBCardScore(String(teamKey === "TEAM_B" ? score : 100 - score));
  };

  const handleFirstOutChange = (playerKey: string) => {
    setFirstOutPlayerKey((current) => current === playerKey ? "NONE" : playerKey);
    setErrorMessage(null);
  };

  const resetForm = () => {
    setOneTwoTeamKey("NONE");
    setTeamACardScore("50");
    setTeamBCardScore("50");
    setFirstOutPlayerKey("NONE");
    setSmallTichuPlayerKeys([]);
    setLargeTichuPlayerKeys([]);
    setIsForceFinish(false);
  };

  const handleOneTwoTeamChange = (
      nextOneTwoTeamKey: "NONE" | TichuTeamKey,
  ) => {
    setOneTwoTeamKey(nextOneTwoTeamKey);
    setErrorMessage(null);

    if (
        nextOneTwoTeamKey === "NONE" ||
        firstOutPlayerKey === "NONE"
    ) {
      return;
    }

    const firstOutPlayer = details.players?.[firstOutPlayerKey];

    if (firstOutPlayer?.team_key !== nextOneTwoTeamKey) {
      setFirstOutPlayerKey("NONE");
    }
  };

  const handleToggleSmallTichu = (playerKey: string) => {
    setSmallTichuPlayerKeys((prev) =>
        togglePlayerKey(prev, playerKey),
    );

    setLargeTichuPlayerKeys((prev) => {
      return prev.filter((currentPlayerKey) => currentPlayerKey !== playerKey);
    });
  };

  const handleToggleLargeTichu = (playerKey: string) => {
    setLargeTichuPlayerKeys((prev) =>
        togglePlayerKey(prev, playerKey),
    );

    setSmallTichuPlayerKeys((prev) => {
      return prev.filter((currentPlayerKey) => currentPlayerKey !== playerKey);
    });
  };

  const handleSubmit = () => {
    setErrorMessage(null);

    if (firstOutPlayerKey === "NONE") {
      setErrorMessage("1등으로 나간 플레이어를 선택해주세요.");
      return;
    }

    if (oneTwoTeamKey !== "NONE") {
      const firstOutPlayer = details.players?.[firstOutPlayerKey];

      if (!firstOutPlayer) {
        setErrorMessage(
            "1등으로 나간 플레이어 정보를 찾을 수 없습니다.",
        );
        return;
      }

      if (firstOutPlayer.team_key !== oneTwoTeamKey) {
        setErrorMessage(
            "원투를 달성한 팀의 플레이어만 1등으로 선택할 수 있습니다.",
        );
        return;
      }
    }

    if (isForceFinish) {
      const ok = globalThis.confirm(
          "이번 라운드를 기록한 뒤 티츄 게임을 강제 종료할까요?",
      );

      if (!ok) {
        return;
      }
    }

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
          firstOutPlayerKey,
          teamACardScore: parsedTeamACardScore,
          teamBCardScore: parsedTeamBCardScore,
          oneTwoTeamKey:
              oneTwoTeamKey === "NONE" ? null : oneTwoTeamKey,
          smallTichuPlayerKeys,
          largeTichuPlayerKeys,
          isForceFinish,
        });

        const shouldMoveToDetail = isForceFinish;

        resetForm();

        if (shouldMoveToDetail) {
          globalThis.location.href = `/tichu/detail/${matchId}`;
          return;
        }

        const roundLogScroll = globalThis.document.getElementById("tichu-round-log-scroll");
        if (roundLogScroll) {
          roundLogScroll.scrollTop = 0;
        }

        router.refresh();
        globalThis.scrollTo({
          top: 0,
          behavior: "smooth",
        });
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
    <section className="shrink-0 rounded-3xl border border-foreground/10 bg-background p-2 shadow-lg sm:p-3">
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
        {([
          ["TEAM_A", teamAName, teamACardScore],
          ["TEAM_B", teamBName, teamBCardScore],
        ] as const).map(([teamKey, teamName, cardScore]) => {
          const isWinningTeam = oneTwoTeamKey === teamKey;
          const displayScore = isOneTwo ? (isWinningTeam ? 200 : 0) : Number(cardScore);

          return (
            <div key={teamKey} className="min-w-0 rounded-xl border border-foreground/10 p-1.5 sm:p-2">
              <div className="flex items-center gap-1">
                <p className="min-w-0 flex-1 truncate text-xs font-black sm:text-sm" title={teamName}>{teamName}</p>
                <p className="shrink-0 text-lg font-black sm:text-xl">{displayScore}</p>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleOneTwoTeamChange(isWinningTeam ? "NONE" : teamKey)}
                  aria-pressed={isWinningTeam}
                  className={`shrink-0 rounded-lg border px-1.5 py-0.5 text-[11px] font-bold transition ${isWinningTeam
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-foreground/10 text-foreground/60 hover:border-blue-500/40"}`}
                >
                  원투
                </button>
              </div>

              <div className="mt-1 space-y-0.5">
                {players
                  .filter(([, player]) => player.team_key === teamKey)
                  .map(([playerKey, player]) => {
                    const isFirstOut = firstOutPlayerKey === playerKey;
                    const isSmall = smallTichuPlayerKeys.includes(playerKey);
                    const isLarge = largeTichuPlayerKeys.includes(playerKey);

                    return (
                      <div key={playerKey} className="flex min-w-0 items-center gap-1 rounded-lg bg-foreground/[0.03] px-1.5 py-1">
                        <p className="min-w-0 flex-1 truncate text-[11px] font-bold sm:text-xs" title={player.name ?? "이름 없음"}>
                          {player.name ?? "이름 없음"}
                        </p>
                        <div className="flex shrink-0 gap-0.5">
                          {([
                            ["라티", isLarge, () => handleToggleLargeTichu(playerKey)],
                            ["스티", isSmall, () => handleToggleSmallTichu(playerKey)],
                            ["1등", isFirstOut, () => handleFirstOutChange(playerKey)],
                          ] as const).map(([label, selected, onClick]) => (
                            <button
                              key={label}
                              type="button"
                              disabled={isPending || (label === "1등" && isOneTwo && !isWinningTeam)}
                              onClick={onClick}
                              aria-pressed={selected}
                              aria-label={`${player.name ?? "이름 없음"} ${label}`}
                              className={`rounded-md border px-1 py-0.5 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${selected
                                ? "border-blue-500 bg-blue-500 text-white"
                                : "border-foreground/10 text-foreground/60 hover:border-blue-500/40"}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`mt-1.5 rounded-xl border border-foreground/10 px-2 py-1 ${isOneTwo ? "opacity-50" : ""}`}>
        <div className="flex items-center justify-between gap-1.5">
          <button
            type="button"
            disabled={isPending || isOneTwo || Number(teamACardScore) <= -25}
            onClick={() => changeCardScore("TEAM_A", Number(teamACardScore) - 5)}
            aria-label={`${teamAName} 카드 점수 5점 감소`}
            className="h-7 w-7 shrink-0 rounded-lg border border-foreground/10 text-lg font-bold disabled:opacity-40"
          >
            −
          </button>
          <input
            type="range"
            min="-25"
            max="125"
            step="5"
            value={teamACardScore}
            disabled={isPending || isOneTwo}
            onChange={(event) => changeCardScore("TEAM_A", Number(event.target.value))}
            aria-label={`${teamAName} 카드 점수`}
            className="min-w-0 flex-1 accent-blue-600"
          />
          <button
            type="button"
            disabled={isPending || isOneTwo || Number(teamACardScore) >= 125}
            onClick={() => changeCardScore("TEAM_A", Number(teamACardScore) + 5)}
            aria-label={`${teamAName} 카드 점수 5점 증가`}
            className="h-7 w-7 shrink-0 rounded-lg border border-foreground/10 text-lg font-bold disabled:opacity-40"
          >
            +
          </button>
        </div>
        <p className="text-center text-[11px] text-foreground/50">
          {isOneTwo
            ? "원투 팀 +200점 / 상대 팀 0점 · 카드 점수 미적용"
            : `카드 점수 · ${teamAName} ${teamACardScore} / ${teamBName} ${teamBCardScore}`}
        </p>
      </div>

      {errorMessage ? (
        <p role="alert" className="mt-2 rounded-xl bg-red-500/10 p-2 text-xs font-bold text-red-500">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-background">
        <label className="flex items-center gap-1.5 text-xs font-bold text-red-500">
          <input
            type="checkbox"
            checked={isForceFinish}
            disabled={isPending}
            onChange={(event) => setIsForceFinish(event.target.checked)}
            className="h-4 w-4 accent-red-500"
          />
          기록 후 종료
        </label>
        <span className="text-xs font-black">{details.current_round ?? 1}라운드</span>
        <button
          type="button"
          disabled={isPending}
          onClick={handleSubmit}
          className="justify-self-end rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "기록 중..." : isForceFinish ? "기록하고 종료" : "라운드 기록"}
        </button>
      </div>
    </section>
  );
}
