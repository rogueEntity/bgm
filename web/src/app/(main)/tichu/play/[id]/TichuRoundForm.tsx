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

function getPlayerTeamName(
    player: TichuPlayerState,
    teamAName: string,
    teamBName: string,
) {
  if (player.team_key === "TEAM_A") {
    return teamAName;
  }

  if (player.team_key === "TEAM_B") {
    return teamBName;
  }

  return "소속 팀 없음";
}

export default function TichuRoundForm({
                                         matchId,
                                         expectedVersion,
                                         details,
                                       }: Readonly<TichuRoundFormProps>) {
  const router = useRouter();

  const [oneTwoTeamKey, setOneTwoTeamKey] = useState<"NONE" | TichuTeamKey>(
      "NONE",
  );
  const [teamACardScore, setTeamACardScore] = useState("50");
  const [teamBCardScore, setTeamBCardScore] = useState("50");
  const [firstOutPlayerKey, setFirstOutPlayerKey] = useState("NONE");
  const [smallTichuPlayerKeys, setSmallTichuPlayerKeys] = useState<string[]>(
      [],
  );
  const [largeTichuPlayerKeys, setLargeTichuPlayerKeys] = useState<string[]>(
      [],
  );
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

  const resetForm = () => {
    setOneTwoTeamKey("NONE");
    setTeamACardScore("50");
    setTeamBCardScore("50");
    setFirstOutPlayerKey("NONE");
    setSmallTichuPlayerKeys([]);
    setLargeTichuPlayerKeys([]);
    setIsForceFinish(false);
  };

  const handleToggleSmallTichu = (playerKey: string) => {
    setSmallTichuPlayerKeys((prev) => togglePlayerKey(prev, playerKey));

    setLargeTichuPlayerKeys((prev) => {
      return prev.filter((currentPlayerKey) => currentPlayerKey !== playerKey);
    });
  };

  const handleToggleLargeTichu = (playerKey: string) => {
    setLargeTichuPlayerKeys((prev) => togglePlayerKey(prev, playerKey));

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
          oneTwoTeamKey: oneTwoTeamKey === "NONE" ? null : oneTwoTeamKey,
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

        router.refresh();
        globalThis.scrollTo({ top: 0, behavior: "smooth" });
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
            카드 점수, 1등 플레이어, 스몰/라지 티츄 선언, 원투 여부를 입력해주세요.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-bold text-foreground/70">원투 여부</p>

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
                        onClick={() => {
                          setOneTwoTeamKey(option.value as "NONE" | TichuTeamKey);
                        }}
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

          <div
              className={`grid gap-4 transition sm:grid-cols-2 ${
                  isOneTwo ? "opacity-50" : "opacity-100"
              }`}
          >
            <label className="space-y-2">
            <span className="text-sm font-bold text-foreground/70">
              {teamAName} 카드 점수
            </span>
              <input
                  value={teamACardScore}
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
                  value={teamBCardScore}
                  onChange={(event) => setTeamBCardScore(event.target.value)}
                  disabled={isPending || isOneTwo}
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-blue-500/50 disabled:cursor-not-allowed disabled:bg-foreground/[0.03]"
                  placeholder="예: 30"
              />
            </label>

            {isOneTwo ? (
                <p className="text-xs font-bold text-foreground/45 sm:col-span-2">
                  원투를 선택하면 카드 점수는 저장하지 않고, 원투 팀 +200점 / 상대 팀
                  0점으로 자동 처리됩니다.
                </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
            <p className="text-sm font-black">1등 플레이어</p>
            <p className="mt-1 text-xs font-bold text-foreground/45">
              스몰/라지 티츄 성공 여부는 1등 플레이어 기준으로 자동 판정됩니다.
            </p>

            <select
                value={firstOutPlayerKey}
                onChange={(event) => setFirstOutPlayerKey(event.target.value)}
                disabled={isPending}
                className="mt-3 w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-blue-500/50"
            >
              <option value="NONE">1등 플레이어 선택</option>
              {players.map(([playerKey, player]) => (
                  <option key={playerKey} value={playerKey}>
                    {player.name ?? "이름 없음"} ·{" "}
                    {getPlayerTeamName(player, teamAName, teamBName)}
                  </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
              <p className="text-sm font-black">스몰 티츄 선언자</p>
              <p className="mt-1 text-xs font-bold text-foreground/45">
                성공 +100점, 실패 -100점
              </p>

              <div className="mt-3 space-y-2">
                {players.map(([playerKey, player]) => {
                  const checked = smallTichuPlayerKeys.includes(playerKey);
                  const disabled =
                      isPending || largeTichuPlayerKeys.includes(playerKey);

                  return (
                      <label
                          key={playerKey}
                          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                              checked
                                  ? "border-blue-500 bg-blue-500/10 text-blue-500"
                                  : "border-foreground/10 bg-background text-foreground/70"
                          } ${
                              disabled
                                  ? "cursor-not-allowed opacity-50"
                                  : "cursor-pointer"
                          }`}
                      >
                    <span>
                      {player.name ?? "이름 없음"}
                      <span className="ml-2 text-xs text-foreground/40">
                        {getPlayerTeamName(player, teamAName, teamBName)}
                      </span>
                    </span>

                        <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => handleToggleSmallTichu(playerKey)}
                            className="h-4 w-4"
                        />
                      </label>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
              <p className="text-sm font-black">라지 티츄 선언자</p>
              <p className="mt-1 text-xs font-bold text-foreground/45">
                성공 +200점, 실패 -200점
              </p>

              <div className="mt-3 space-y-2">
                {players.map(([playerKey, player]) => {
                  const checked = largeTichuPlayerKeys.includes(playerKey);
                  const disabled =
                      isPending || smallTichuPlayerKeys.includes(playerKey);

                  return (
                      <label
                          key={playerKey}
                          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                              checked
                                  ? "border-blue-500 bg-blue-500/10 text-blue-500"
                                  : "border-foreground/10 bg-background text-foreground/70"
                          } ${
                              disabled
                                  ? "cursor-not-allowed opacity-50"
                                  : "cursor-pointer"
                          }`}
                      >
                    <span>
                      {player.name ?? "이름 없음"}
                      <span className="ml-2 text-xs text-foreground/40">
                        {getPlayerTeamName(player, teamAName, teamBName)}
                      </span>
                    </span>

                        <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => handleToggleLargeTichu(playerKey)}
                            className="h-4 w-4"
                        />
                      </label>
                  );
                })}
              </div>
            </div>
          </div>

          {errorMessage ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-500">
                {errorMessage}
              </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-red-500">
              <input
                  type="checkbox"
                  checked={isForceFinish}
                  disabled={isPending}
                  onChange={(event) => setIsForceFinish(event.target.checked)}
                  className="h-4 w-4 accent-red-500"
              />
              기록 후 게임 강제 종료하기
            </label>

            <button
                type="button"
                disabled={isPending}
                onClick={handleSubmit}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending
                  ? "기록 중..."
                  : isForceFinish
                      ? "기록하고 종료하기"
                      : "라운드 기록하기"}
            </button>
          </div>
        </div>
      </section>
  );
}