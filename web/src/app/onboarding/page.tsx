// web/src/onboarding/page.tsx
"use client";

import React, { useState } from "react";
import { saveOnboardingProfile, checkNicknameDuplication } from "@/app/actions/user.action";
import { AVATAR_EMOJIS } from "@/constants/avatars";
import LogoutButton from "@/components/LogOutButton";

export default function OnboardingPage() {
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_EMOJIS[0]);
  const [nickname, setNickname] = useState("");
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null); // null: 확인 전, true: 사용 가능, false: 중복
  const [isChecking, setIsChecking] = useState(false);

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
    setIsAvailable(null); // 타이핑을 다시 하면 중복 확인 상태 초기화
  };

  const handleCheckDuplicate = async () => {
    if (!nickname.trim()) return;
    setIsChecking(true);

    // 서버 액션 호출하여 중복 확인
    const available = await checkNicknameDuplication(nickname);
    setIsAvailable(available);
    setIsChecking(false);
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-background p-8 border border-foreground/10 rounded-2xl shadow-sm">

        <h1 className="text-2xl font-black text-foreground text-center mb-8">
          프로필 설정
        </h1>

        <form action={saveOnboardingProfile} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-foreground mb-3">
              대표 이모지
            </label>
            <input type="hidden" name="avatarEmoji" value={selectedAvatar} />

            <div className="grid grid-cols-4 gap-3 max-h-[160px] overflow-y-auto p-2 pr-2 custom-scrollbar">
              {AVATAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
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
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              닉네임
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="nickname"
                required
                value={nickname}
                onChange={handleNicknameChange}
                maxLength={6}
                placeholder="닉네임을 입력하세요. (최대 6글자)"
                className="flex-1 px-4 py-3 border-2 border-foreground/10 rounded-lg bg-background text-foreground font-medium focus:outline-none focus:border-foreground transition"
              />
              <button
                type="button"
                onClick={handleCheckDuplicate}
                disabled={!nickname.trim() || isChecking}
                className="shrink-0 px-4 py-3 bg-foreground/10 hover:bg-foreground/20 text-foreground font-bold rounded-lg transition disabled:opacity-50"
              >
                {isChecking ? "확인 중..." : "중복 확인"}
              </button>
            </div>
          </div>

          {/* 중복 확인 결과 메시지 */}
          <div className="h-5 mt-2">
            {isAvailable === true && (
              <p className="text-sm text-green-500 font-bold">사용 가능한 닉네임입니다.</p>
            )}
            {isAvailable === false && (
              <p className="text-sm text-red-500 font-bold">이미 사용 중인 닉네임입니다.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isAvailable} // 중복 확인을 통과해야만 완료 가능
            className="w-full bg-foreground text-background py-3 rounded-xl font-bold transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            완료
          </button>
        </form>

        <div className="mt-6 text-center">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}