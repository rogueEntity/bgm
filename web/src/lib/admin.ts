// web/src/lib/admin.ts
import { auth } from "@/auth";
import { db } from "@/lib/prisma";

export async function getCurrentUserWithAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const providerId = session.user.id;

  const user = await db.users.findFirst({
    where: {
      provider_id: providerId,
    },
    select: {
      id: true,
      nickname: true,
      avatar_emoji: true,
      admin_users: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    nickname: user.nickname,
    avatarEmoji: user.avatar_emoji,
    isAdmin: Boolean(user.admin_users),
  };
}

export async function isCurrentUserAdmin() {
  const currentUser = await getCurrentUserWithAdmin();
  return Boolean(currentUser?.isAdmin);
}

export async function requireAdminUser() {
  const currentUser = await getCurrentUserWithAdmin();

  if (!currentUser) {
    throw new Error("로그인이 필요합니다.");
  }

  if (!currentUser.isAdmin) {
    throw new Error("관리자 권한이 필요합니다.");
  }

  return currentUser;
}