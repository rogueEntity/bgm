// web/src/app/(main)/tichu/new/NewTichuGameForm.tsx

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { createTichuMatch } from "@/app/actions/tichu.action";
import { checkNicknameExists } from "@/app/actions/user.action";

type PlayerKey = "PLAYER_1" | "PLAYER_2" | "PLAYER_3" | "PLAYER_4";
type PlayerStatus = "idle" | "checking" | "member" | "guest";

const MAX_TICHU_PLAYER_NAME_LENGTH = 20;
const MAX_TICHU_TEAM_NAME_LENGTH = 20;

const PLAYER_FIELDS: {
    key: PlayerKey;
    label: string;
    teamLabel: string;
    placeholder: string;
}[] = [
    {
        key: "PLAYER_1",
        label: "1번 플레이어",
        teamLabel: "A팀",
        placeholder: "닉네임 또는 이름",
    },
    {
        key: "PLAYER_2",
        label: "2번 플레이어",
        teamLabel: "B팀",
        placeholder: "닉네임 또는 이름",
    },
    {
        key: "PLAYER_3",
        label: "3번 플레이어",
        teamLabel: "A팀",
        placeholder: "닉네임 또는 이름",
    },
    {
        key: "PLAYER_4",
        label: "4번 플레이어",
        teamLabel: "B팀",
        placeholder: "닉네임 또는 이름",
    },
];

function isRedirectError(error: unknown) {
    return (
        (error instanceof Error && error.message === "NEXT_REDIRECT") ||
        (typeof error === "object" &&
            error !== null &&
            "digest" in error &&
            String(error.digest).startsWith("NEXT_REDIRECT"))
    );
}

export default function NewTichuGameForm() {
    const [teamAName, setTeamAName] = useState("A팀");
    const [teamBName, setTeamBName] = useState("B팀");
    const [targetScore, setTargetScore] = useState<500 | 1000>(1000);
    const [playerNames, setPlayerNames] = useState<Record<PlayerKey, string>>({
        PLAYER_1: "",
        PLAYER_2: "",
        PLAYER_3: "",
        PLAYER_4: "",
    });
    const [playerStatus, setPlayerStatus] = useState<Record<PlayerKey, PlayerStatus>>({
        PLAYER_1: "idle",
        PLAYER_2: "idle",
        PLAYER_3: "idle",
        PLAYER_4: "idle",
    });
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const updatePlayerName = (key: PlayerKey, value: string) => {
        setPlayerNames((prev) => ({
            ...prev,
            [key]: value.slice(0, MAX_TICHU_PLAYER_NAME_LENGTH),
        }));

        setPlayerStatus((prev) => ({
            ...prev,
            [key]: "idle",
        }));
    };

    const handlePlayerBlur = async (key: PlayerKey) => {
        const nickname = playerNames[key].trim();

        if (!nickname) {
            setPlayerStatus((prev) => ({
                ...prev,
                [key]: "idle",
            }));
            return;
        }

        setPlayerStatus((prev) => ({
            ...prev,
            [key]: "checking",
        }));

        try {
            const exists = await checkNicknameExists(nickname);

            setPlayerStatus((prev) => ({
                ...prev,
                [key]: exists ? "member" : "guest",
            }));
        } catch (error) {
            console.error("티츄 참가자 닉네임 확인 실패:", error);

            setPlayerStatus((prev) => ({
                ...prev,
                [key]: "idle",
            }));
        }
    };

    const handleSubmit = () => {
        setErrorMessage(null);

        const normalizedPlayerNames = PLAYER_FIELDS.map((field) =>
            playerNames[field.key].trim(),
        ) as [string, string, string, string];

        if (normalizedPlayerNames.some((name) => name.length === 0)) {
            setErrorMessage("참가자 4명의 이름을 모두 입력해주세요.");
            return;
        }

        if (
            normalizedPlayerNames.some(
                (name) => name.length > MAX_TICHU_PLAYER_NAME_LENGTH,
            )
        ) {
            setErrorMessage(
                `참가자 이름은 ${MAX_TICHU_PLAYER_NAME_LENGTH}글자까지 입력할 수 있습니다.`,
            );
            return;
        }

        if (new Set(normalizedPlayerNames).size !== normalizedPlayerNames.length) {
            setErrorMessage("참가자 이름은 모두 달라야 합니다.");
            return;
        }

        if (
            teamAName.trim().length > MAX_TICHU_TEAM_NAME_LENGTH ||
            teamBName.trim().length > MAX_TICHU_TEAM_NAME_LENGTH
        ) {
            setErrorMessage(
                `팀 이름은 ${MAX_TICHU_TEAM_NAME_LENGTH}글자까지 입력할 수 있습니다.`,
            );
            return;
        }

        startTransition(async () => {
            try {
                await createTichuMatch({
                    teamAName,
                    teamBName,
                    playerNames: normalizedPlayerNames,
                    targetScore,
                });
            } catch (error) {
                if (isRedirectError(error)) {
                    throw error;
                }

                console.error("티츄 게임 생성 실패:", error);

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "티츄 게임을 생성하지 못했습니다.",
                );
            }
        });
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div>
                <Link
                    href="/tichu"
                    className="mb-4 inline-flex text-sm font-semibold text-foreground/60 transition hover:text-foreground"
                >
                    ← 티츄 대시보드로
                </Link>

                <div className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-6 shadow-sm">
                    <p className="text-sm font-black text-blue-500">Tichu</p>
                    <h2 className="mt-1 text-3xl font-black tracking-tight">
                        새 티츄 게임 시작하기
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-foreground/60">
                        4명의 참가자를 입력해 주세요. 가입된 닉네임은 전적이 연동되고,
                        가입되지 않은 이름은 게스트로 기록됩니다.
                    </p>
                </div>
            </div>

            <section className="rounded-3xl border border-foreground/10 bg-background p-5 shadow-sm">
                <div className="mb-5">
                    <h3 className="text-lg font-black">게임 설정</h3>
                    <p className="mt-1 text-sm text-foreground/50">
                        목표 점수와 팀 이름을 정해주세요.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
            <span className="text-sm font-bold text-foreground/70">
              A팀 이름
            </span>
                        <input
                            value={teamAName}
                            onChange={(event) =>
                                setTeamAName(
                                    event.target.value.slice(0, MAX_TICHU_TEAM_NAME_LENGTH),
                                )
                            }
                            maxLength={MAX_TICHU_TEAM_NAME_LENGTH}
                            className="w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-blue-500/50"
                            placeholder="A팀"
                            disabled={isPending}
                        />
                    </label>

                    <label className="space-y-2">
            <span className="text-sm font-bold text-foreground/70">
              B팀 이름
            </span>
                        <input
                            value={teamBName}
                            onChange={(event) =>
                                setTeamBName(
                                    event.target.value.slice(0, MAX_TICHU_TEAM_NAME_LENGTH),
                                )
                            }
                            maxLength={MAX_TICHU_TEAM_NAME_LENGTH}
                            className="w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-blue-500/50"
                            placeholder="B팀"
                            disabled={isPending}
                        />
                    </label>
                </div>

                <div className="mt-5">
                    <p className="mb-2 text-sm font-bold text-foreground/70">
                        목표 점수
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        {[500, 1000].map((score) => {
                            const isSelected = targetScore === score;

                            return (
                                <button
                                    key={score}
                                    type="button"
                                    onClick={() => setTargetScore(score as 500 | 1000)}
                                    className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                                        isSelected
                                            ? "border-blue-500 bg-blue-500 text-white"
                                            : "border-foreground/10 bg-foreground/[0.03] text-foreground/70 hover:border-blue-500/40"
                                    }`}
                                    disabled={isPending}
                                >
                                    {score}점
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-foreground/10 bg-background p-5 shadow-sm">
                <div className="mb-5">
                    <h3 className="text-lg font-black">참가자</h3>
                    <p className="mt-1 text-sm text-foreground/50">
                        1·3번은 A팀, 2·4번은 B팀으로 저장됩니다.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    {PLAYER_FIELDS.map((field) => {
                        const status = playerStatus[field.key];

                        return (
                            <label
                                key={field.key}
                                className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"
                            >
                <span className="flex items-center justify-between gap-2 text-sm font-bold text-foreground/70">
                  {field.label}
                    <span className="rounded-full bg-foreground/10 px-2 py-1 text-xs text-foreground/50">
                    {field.teamLabel}
                  </span>
                </span>

                                <input
                                    value={playerNames[field.key]}
                                    onChange={(event) =>
                                        updatePlayerName(field.key, event.target.value)
                                    }
                                    onBlur={() => handlePlayerBlur(field.key)}
                                    maxLength={MAX_TICHU_PLAYER_NAME_LENGTH}
                                    className="mt-3 w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-blue-500/50"
                                    placeholder={field.placeholder}
                                    disabled={isPending}
                                />

                                {status === "checking" ? (
                                    <p className="mt-2 text-xs font-bold text-foreground/45">
                                        닉네임 확인 중...
                                    </p>
                                ) : null}

                                {status === "member" ? (
                                    <p className="mt-2 text-xs font-bold text-green-600">
                                        ✓ 가입된 플레이어입니다. 전적이 연동됩니다.
                                    </p>
                                ) : null}

                                {status === "guest" ? (
                                    <p className="mt-2 text-xs font-bold text-foreground/45">
                                        · 게스트로 참여합니다. 전적은 연동되지 않습니다.
                                    </p>
                                ) : null}
                            </label>
                        );
                    })}
                </div>
            </section>

            {errorMessage ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-500">
                    {errorMessage}
                </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Link
                    href="/tichu"
                    className="inline-flex items-center justify-center rounded-2xl border border-foreground/10 px-5 py-3 text-sm font-black text-foreground/60 transition hover:bg-foreground/5"
                >
                    취소
                </Link>

                <button
                    type="button"
                    disabled={isPending}
                    onClick={handleSubmit}
                    className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isPending ? "생성 중..." : "티츄 게임 시작하기"}
                </button>
            </div>
        </div>
    );
}