// web/src/app/onboarding/page.tsx

import ProfileForm from "@/components/profile/ProfileForm";
import LogoutButton from "@/components/LogOutButton";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/current-user";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const currentUser = await getCurrentDbUser();

  if (currentUser?.nickname && currentUser?.avatar_emoji) {
    redirect("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-md space-y-6">
        <section className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">프로필 설정</h1>
          <p className="text-sm text-foreground/60">
            BGM에서 사용할 대표 이모지와 닉네임을 설정해 주세요.
          </p>
        </section>

        <div className="rounded-2xl border border-foreground/10 p-5">
          <ProfileForm mode="onboarding" submitLabel="완료" />
        </div>

        <div className="flex justify-center">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}