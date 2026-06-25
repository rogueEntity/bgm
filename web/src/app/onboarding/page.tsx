// web/src/onboarding/page.tsx
"use client";

import ProfileForm from "@/components/profile/ProfileForm";
import LogoutButton from "@/components/LogOutButton";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">프로필 설정</h1>
          <p className="text-sm text-foreground/50">
            BGM에서 사용할 대표 이모지와 닉네임을 설정해 주세요.
          </p>
        </div>

        <div className="rounded-2xl border border-foreground/10 p-5">
          <ProfileForm mode="onboarding" submitLabel="완료" />
        </div>

        <div className="flex justify-center">
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}