// web/src/components/profile/ProfileForm.tsx
"use client";

import React, { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { AVATAR_EMOJIS } from "@/constants/avatars";
import {
  checkNicknameDuplication,
  checkMyNicknameDuplication,
  deleteMyAvatar,
  saveOnboardingProfile,
  updateMyProfile,
  uploadMyAvatar,
} from "@/app/actions/user.action";

type ProfileFormMode = "onboarding" | "edit";

type ProfileFormProps = {
  mode: ProfileFormMode;
  defaultNickname?: string;
  defaultAvatarEmoji?: string;
  defaultAvatarImageUrl?: string | null;
  hasAvatarImage?: boolean;
  submitLabel?: string;
  onCancelAction?: () => void;
};

export default function ProfileForm({
  mode,
  defaultNickname = "",
  defaultAvatarEmoji = AVATAR_EMOJIS[0],
  defaultAvatarImageUrl = null,
  hasAvatarImage = false,
  submitLabel,
  onCancelAction,
}: Readonly<ProfileFormProps>) {
  const NICKNAME_MIN_LENGTH = 1;
  const NICKNAME_MAX_LENGTH = 6;

  const router = useRouter();
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedAvatar, setSelectedAvatar] = useState(defaultAvatarEmoji);
  const [nickname, setNickname] = useState(defaultNickname);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(
    defaultNickname ? true : null,
  );
  const [isChecking, setIsChecking] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null,
  );
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarMessageType, setAvatarMessageType] = useState<
    "success" | "error" | null
  >(null);

  const [isPending, startTransition] = useTransition();
  const [isAvatarPending, startAvatarTransition] = useTransition();

  const trimmedNickname = nickname.trim();
  const nicknameChanged = trimmedNickname !== defaultNickname.trim();
  const avatarChanged = selectedAvatar !== defaultAvatarEmoji;

  const shouldCheckNickname = mode === "onboarding" || nicknameChanged;

  const nicknameLengthValid =
      trimmedNickname.length >= NICKNAME_MIN_LENGTH &&
      trimmedNickname.length <= NICKNAME_MAX_LENGTH;

  const canSubmit =
      nicknameLengthValid &&
      selectedAvatar.length > 0 &&
      (!shouldCheckNickname || isAvailable === true) &&
      !isPending;

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    if (!canSubmit) {
      e.preventDefault();
      return;
    }

    if (mode !== "edit") {
      return;
    }

    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    startTransition(() => {
      void (async () => {
        try {
          const result = await updateMyProfile(formData);

          if (!result.success) {
            alert(result.message);
            return;
          }

          globalThis.location.href = "/me";
        } catch (error) {
          console.error("updateMyProfile error:", error);
          alert("내 정보 저장 중 오류가 발생했습니다.");
        }
      })();
    });
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, NICKNAME_MAX_LENGTH);

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

  const handleUploadAvatar = () => {
    if (!selectedAvatarFile) {
      setAvatarMessage("업로드할 이미지를 선택해 주세요.");
      setAvatarMessageType("error");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", selectedAvatarFile);

    startAvatarTransition(() => {
      void (async () => {
        const result = await uploadMyAvatar(formData);

        setAvatarMessage(result.message);
        setAvatarMessageType(result.success ? "success" : "error");

        if (result.success) {
          setSelectedAvatarFile(null);

          if (avatarFileInputRef.current) {
            avatarFileInputRef.current.value = "";
          }

          router.refresh();
        }
      })();
    });
  };

  const handleDeleteAvatar = () => {
    startAvatarTransition(() => {
      void (async () => {
        const result = await deleteMyAvatar();

        setAvatarMessage(result.message);
        setAvatarMessageType(result.success ? "success" : "error");

        if (result.success) {
          setSelectedAvatarFile(null);

          if (avatarFileInputRef.current) {
            avatarFileInputRef.current.value = "";
          }

          router.refresh();
        }
      })();
    });
  };

  return (
    <form
        action={mode === "onboarding" ? saveOnboardingProfile : undefined}
        onSubmit={handleSubmit}
        className="space-y-6"
    >
      <input type="hidden" name="avatarEmoji" value={selectedAvatar} />

      {mode === "edit" && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground/70">
            프로필 사진
          </h2>

          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-foreground/10 text-4xl">
              {defaultAvatarImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={defaultAvatarImageUrl}
                  alt="현재 프로필 이미지"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{selectedAvatar}</span>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setSelectedAvatarFile(file);
                  setAvatarMessage(null);
                  setAvatarMessageType(null);
                }}
                className="block w-full text-sm text-foreground/70 file:mr-3 file:rounded-lg file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-sm file:font-semibold file:text-background hover:file:opacity-90"
              />

              <p className="text-xs text-foreground/40">
                jpg, png, webp 이미지를 5MB 이하로 업로드할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUploadAvatar}
              disabled={!selectedAvatarFile || isAvatarPending}
              className="flex-1 rounded-xl border border-foreground/10 px-4 py-3 text-sm font-semibold transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isAvatarPending ? "처리 중..." : "사진 업로드"}
            </button>

            {hasAvatarImage && (
              <button
                type="button"
                onClick={handleDeleteAvatar}
                disabled={isAvatarPending}
                className="flex-1 rounded-xl border border-red-500/20 px-4 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-500/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                사진 삭제
              </button>
            )}
          </div>

          {avatarMessage && (
            <p
              className={`text-sm ${
                avatarMessageType === "success"
                  ? "text-green-600"
                  : "text-red-500"
              }`}
            >
              {avatarMessage}
            </p>
          )}
        </section>
      )}

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

        {mode === "edit" && (
          <p className="text-xs text-foreground/40">
            프로필 사진이 없을 때 대표 이모지가 표시됩니다.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground/70">닉네임</h2>

        <div className="flex gap-2">
          <input
              name="nickname"
              value={nickname}
              minLength={NICKNAME_MIN_LENGTH}
              maxLength={NICKNAME_MAX_LENGTH}
              onChange={handleNicknameChange}
              placeholder="닉네임을 입력해 주세요"
              className="flex-1 rounded-xl border border-foreground/10 bg-background px-4 py-3 text-base outline-none transition focus:border-foreground/40 md:text-sm"
              autoComplete="off"
          />

          <button
              type="button"
              onClick={handleCheckDuplicate}
              disabled={!nicknameLengthValid || isChecking}
              className="shrink-0 rounded-xl border border-foreground/10 px-4 py-3 text-sm font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isChecking ? "확인 중..." : "중복 확인"}
          </button>
        </div>

        <div className="flex items-start justify-between gap-3 text-xs">
          <div className="min-w-0 flex-1">
            {isAvailable === true && (
                <p className="text-green-600">사용 가능한 닉네임입니다.</p>
            )}

            {isAvailable === false && (
                <p className="text-red-500">이미 사용 중인 닉네임입니다.</p>
            )}

            {shouldCheckNickname && isAvailable === null && trimmedNickname && (
                <p className="text-foreground/50">닉네임 중복 확인을 해주세요.</p>
            )}

            {trimmedNickname && trimmedNickname.length < NICKNAME_MIN_LENGTH && (
                <p className="text-red-500">
                  닉네임은 {NICKNAME_MIN_LENGTH}자 이상 입력해 주세요.
                </p>
            )}

            {!trimmedNickname && (
                <p className="text-foreground/40">
                  닉네임은 {NICKNAME_MIN_LENGTH}~{NICKNAME_MAX_LENGTH}자까지 입력할 수 있습니다.
                </p>
            )}
          </div>

          <p className="shrink-0 text-foreground/40">
            {trimmedNickname.length}/{NICKNAME_MAX_LENGTH}
          </p>
        </div>
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