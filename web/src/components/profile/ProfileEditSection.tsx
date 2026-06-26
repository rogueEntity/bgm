// web/src/components/ProfileEditSection.tsx
"use client";

import { useState } from "react";
import ProfileForm from "@/components/profile/ProfileForm";

type ProfileEditSectionProps = {
  nickname: string;
  avatarEmoji: string;
};

export default function ProfileEditSection({
  nickname,
  avatarEmoji,
}: ProfileEditSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div className="rounded-2xl border border-foreground/10 p-5">
        <ProfileForm
          mode="edit"
          defaultNickname={nickname}
          defaultAvatarEmoji={avatarEmoji}
          submitLabel="내 정보 저장"
          onCancelAction={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="w-full rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:opacity-90"
    >
      내 정보 수정
    </button>
  );
}