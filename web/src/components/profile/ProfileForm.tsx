// web/src/components/ProfileForm.tsx
"use client";

import React, { useState, useTransition } from "react";
import { AVATAR_EMOJIS } from "@/constants/avatars";
import {
  checkNicknameDuplication,
  checkMyNicknameDuplication,
  saveOnboardingProfile,
  updateMyProfile,
} from "@/app/actions/user.action";

type ProfileFormMode = "onboarding" | "edit";

type ProfileFormProps = {
  mode: ProfileFormMode;
  defaultNickname?: string;
  defaultAvatarEmoji?: string;
  submitLabel?: string;
  onCancelAction?: () => void;
};

export default function ProfileForm({
  mode,
  defaultNickname = "",
  defaultAvatarEmoji = AVATAR_EMOJIS[0],
  submitLabel,
  onCancelAction,
}: ProfileFormProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(defaultAvatarEmoji);
  const [nickname, setNickname] = useState(defaultNickname);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(
    defaultNickname ? true : null
  );
  const [isChecking, setIsChecking] = useState(false);
  const [isPending, startTransition] = useTransition();

  const trimmedNickname = nickname.trim();
  const nicknameChanged = trimmedNickname !== defaultNickname.trim();
  const avatarChanged = selectedAvatar !== defaultAvatarEmoji;

  const shouldCheckNickname = mode === "onboarding" || nicknameChanged;

  const canSubmit =
    trimmedNickname.length > 0 &&
    selectedAvatar.length > 0 &&
    (!shouldCheckNickname || isAvailable === true) &&
    !isPending;

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setNickname(value);

    if (mode === "edit" && value.trim() === defaultNickname.trim()) {
      setIsAvailable(true);
      return;
    }

    setIsAvailable(null);
  };

  const handleCheckDuplicate = async () => {
    if (!trimmedNickname) return;

    if (mode === "edit" && trimmedNickname === defaultNickname.trim()) {
      setIsAvailable(true);
      return;
    }

    setIsChecking(true);

    try {
      const available =
        mode === "edit"
          ? await checkMyNicknameDuplication(trimmedNickname)
          : await checkNicknameDuplication(trimmedNickname);

      setIsAvailable(available);
    } finally {
      setIsChecking(false);
    }
  };

  const action = mode === "edit" ? updateMyProfile : saveOnboardingProfile;

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!canSubmit) e.preventDefault();
      }}
      className="space-y-6"
    >
      <input type="hidden" name="avatarEmoji" value={selectedAvatar} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground/70">
          대표 이모지
        </h2>

        <div className="grid grid-cols-6 gap-2">
          {AVATAR_EMOJIS.map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              type="button"
              onClick={() => setSelectedAvatar(emoji)}
              className={`aspect-square flex items-center justify-center text-2xl rounded-xl border-2 transition-all ${
                selectedAvatar === emoji
                  ? "border-foreground bg-foreground/5 scale-105"
                  : "border-foreground/10 hover:border-foreground/30"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground/70">닉네임</h2>

        <div className="flex gap-2">
          <input
            name="nickname"
            value={nickname}
            onChange={handleNicknameChange}
            placeholder="닉네임을 입력해 주세요"
            className="flex-1 rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/40"
            maxLength={20}
            autoComplete="off"
          />

          <button
            type="button"
            onClick={handleCheckDuplicate}
            disabled={!trimmedNickname || isChecking}
            className="shrink-0 rounded-xl border border-foreground/10 px-4 py-3 text-sm font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isChecking ? "확인 중..." : "중복 확인"}
          </button>
        </div>

        {isAvailable === true && (
          <p className="text-sm text-green-600">사용 가능한 닉네임입니다.</p>
        )}

        {isAvailable === false && (
          <p className="text-sm text-red-500">이미 사용 중인 닉네임입니다.</p>
        )}

        {shouldCheckNickname && isAvailable === null && trimmedNickname && (
          <p className="text-sm text-foreground/50">
            닉네임 중복 확인을 해주세요.
          </p>
        )}
      </section>

      <div className="flex gap-2">
        {onCancelAction && (
          <button
            type="button"
            onClick={onCancelAction}
            className="flex-1 rounded-xl border border-foreground/10 px-4 py-3 text-sm font-semibold transition hover:bg-foreground/5"
          >
            취소
          </button>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending
            ? "저장 중..."
            : submitLabel ?? (mode === "edit" ? "수정 완료" : "완료")}
        </button>
      </div>

      {mode === "edit" && !nicknameChanged && !avatarChanged && (
        <p className="text-center text-xs text-foreground/40">
          변경된 내용이 없어도 저장은 가능합니다.
        </p>
      )}
    </form>
  );
}