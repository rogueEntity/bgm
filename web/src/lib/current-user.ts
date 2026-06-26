// web/src/lib/current-user.ts

import { auth } from "@/auth";
import { db } from "@/lib/prisma";

export async function getCurrentDbUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const providerId = session.user.id;

  // auth.config.ts에서 session.user.provider를 주입하고 있음
  // 기존 타입 확장이 없다면 일단 안전하게 캐스팅
  const provider = (session.user as { provider?: string }).provider;

  if (!provider) {
    return null;
  }

  return db.users.findUnique({
    where: {
      provider_provider_id: {
        provider,
        provider_id: providerId,
      },
    },
  });
}

export async function getCurrentOnboardedDbUser() {
  const user = await getCurrentDbUser();

  if (!user?.nickname || !user?.avatar_emoji) {
    return null;
  }

  return user;
}