// web/src/components/OnboardingForm.tsx
"use client"
import { useState } from "react";
import { updateProfile } from "@/app/actions/user";

export default function OnboardingForm({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎮");

  return (
    <div className="flex flex-col gap-4 p-6 border rounded-xl">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="닉네임" />
      <button onClick={() => updateProfile(userId, name, emoji)}>확인</button>
    </div>
  );
}