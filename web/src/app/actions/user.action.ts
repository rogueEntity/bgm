// web/src/actions/user.action.ts
"use server";

import { auth } from "@/auth";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function normalizeNickname(nickname: FormDataEntryValue | string | null) {
  return String(nickname ?? "").trim();
}

function normalizeAvatarEmoji(avatarEmoji: FormDataEntryValue | string | null) {
  return String(avatarEmoji ?? "").trim();
}

async function getCurrentSessionUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("인증되지 않은 사용자입니다.");
  }

  // auth.config.ts에서 session.user.id는 providerAccountId로 세팅되어 있음
  const providerId = session.user.id;

  // @ts-ignore
  const provider = session.user.provider as string | undefined;

  if (!provider) {
    throw new Error("로그인 제공자 정보를 찾을 수 없습니다.");
  }

  return {
    provider,
    providerId,
  };
}

export async function saveOnboardingProfile(formData: FormData) {
  const { provider, providerId } = await getCurrentSessionUser();

  const nickname = normalizeNickname(formData.get("nickname"));
  const avatarEmoji = normalizeAvatarEmoji(formData.get("avatarEmoji"));

  if (!nickname || !avatarEmoji) {
    throw new Error("모든 필드를 입력해 주세요.");
  }

  const duplicatedUser = await db.users.findFirst({
    where: {
      nickname,
      NOT: {
        provider,
        provider_id: providerId,
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicatedUser) {
    throw new Error("이미 사용 중인 닉네임입니다.");
  }

  const existingUser = await db.users.findUnique({
    where: {
      provider_provider_id: {
        provider,
        provider_id: providerId,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    await db.users.update({
      where: {
        id: existingUser.id,
      },
      data: {
        nickname,
        avatar_emoji: avatarEmoji,
      },
    });
  } else {
    await db.users.create({
      data: {
        provider,
        provider_id: providerId,
        nickname,
        avatar_emoji: avatarEmoji,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/onboarding");

  redirect("/");
}

export async function updateMyProfile(formData: FormData) {
  const { provider, providerId } = await getCurrentSessionUser();

  const nickname = normalizeNickname(formData.get("nickname"));
  const avatarEmoji = normalizeAvatarEmoji(formData.get("avatarEmoji"));

  if (!nickname || !avatarEmoji) {
    throw new Error("모든 필드를 입력해 주세요.");
  }

  const currentUser = await db.users.findUnique({
    where: {
      provider_provider_id: {
        provider,
        provider_id: providerId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!currentUser) {
    throw new Error("사용자 정보를 찾을 수 없습니다.");
  }

  const duplicatedUser = await db.users.findFirst({
    where: {
      nickname,
      id: {
        not: currentUser.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicatedUser) {
    throw new Error("이미 사용 중인 닉네임입니다.");
  }

  await db.users.update({
    where: {
      id: currentUser.id,
    },
    data: {
      nickname,
      avatar_emoji: avatarEmoji,
    },
  });

  revalidatePath("/");
  revalidatePath("/me");

  redirect("/me");
}

export async function checkNicknameDuplication(nickname: string) {
  const normalizedNickname = nickname.trim();

  if (!normalizedNickname) return false;

  const existingUser = await db.users.findFirst({
    where: {
      nickname: normalizedNickname,
    },
    select: {
      id: true,
    },
  });

  return existingUser === null;
}

export async function checkMyNicknameDuplication(nickname: string) {
  const normalizedNickname = nickname.trim();

  if (!normalizedNickname) return false;

  const { provider, providerId } = await getCurrentSessionUser();

  const currentUser = await db.users.findUnique({
    where: {
      provider_provider_id: {
        provider,
        provider_id: providerId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!currentUser) return false;

  const existingUser = await db.users.findFirst({
    where: {
      nickname: normalizedNickname,
    },
    select: {
      id: true,
    },
  });

  if (!existingUser) return true;

  return existingUser.id === currentUser.id;
}

export async function checkNicknameExists(nickname: string) {
  const normalizedNickname = nickname.trim();

  if (!normalizedNickname) return false;

  const user = await db.users.findFirst({
    where: {
      nickname: normalizedNickname,
    },
    select: {
      id: true,
    },
  });

  return !!user;
}