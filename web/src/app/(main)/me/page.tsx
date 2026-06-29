// web/src/app/(main)/me/page.tsx
import { auth } from "@/auth";
import ProfileEditSection from "@/components/profile/ProfileEditSection";
import UserAvatar from "@/components/common/UserAvatar";
import { getAvatarImageUrl } from "@/lib/avatar";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";

function getProviderLabel(provider?: string | null) {
  switch (provider) {
    case "google":
      return "구글";
    case "kakao":
      return "카카오";
    default:
      return "알 수 없음";
  }
}

export default async function MyPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const providerId = session.user.id;

  // @ts-ignore
  const provider = session.user.provider as string | undefined;

  if (!provider) {
    redirect("/login");
  }

  const user = await db.users.findUnique({
    where: {
      provider_provider_id: {
        provider,
        provider_id: providerId,
      },
    },
    select: {
      nickname: true,
      avatar_emoji: true,
      avatar_image_key: true,
      avatar_image_updated_at: true,
      provider: true,
    },
  });

  if (!user) {
    redirect("/onboarding");
  }

  const avatarImageUrl = getAvatarImageUrl(
    user.avatar_image_key,
    user.avatar_image_updated_at,
  );

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6">
      <section className="rounded-2xl border border-foreground/10 bg-background p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">내 정보</h1>
          <p className="text-sm text-foreground/50">
            BGM에서 사용하는 내 프로필 정보입니다.
          </p>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <UserAvatar
            imageUrl={avatarImageUrl}
            emoji={user.avatar_emoji}
            name={user.nickname}
            size="lg"
            className="rounded-2xl border border-foreground/10"
          />

          <div className="min-w-0">
            <p className="truncate text-xl font-bold">{user.nickname}</p>
            <p className="mt-1 text-sm text-foreground/50">
              {getProviderLabel(user.provider)} 계정으로 로그인
            </p>
          </div>
        </div>
      </section>

      <ProfileEditSection
        nickname={user.nickname}
        avatarEmoji={user.avatar_emoji}
        avatarImageUrl={avatarImageUrl}
        hasAvatarImage={!!user.avatar_image_key}
      />
    </main>
  );
}