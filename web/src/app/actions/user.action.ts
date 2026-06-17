// web/src/actions/user.action.ts
"use server";

import { auth } from "@/auth";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function saveOnboardingProfile(formData: FormData) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    throw new Error("인증되지 않은 사용자입니다.");
  }

  // @ts-ignore
  const currentProvider = session.user.provider || "unknown";
  const nickname = formData.get("nickname") as string;
  const avatarEmoji = formData.get("avatarEmoji") as string;

  if (!nickname || !avatarEmoji) throw new Error("모든 필드를 입력해 주세요.");

  const providerId = session.user.id;
  const existingUser = await db.users.findFirst({ where: { provider_id: providerId } });

  if (existingUser) {
    await db.users.updateMany({
      where: { provider_id: providerId },
      data: { nickname: nickname, avatar_emoji: avatarEmoji },
    });
  } else {
    await db.users.create({
      data: {
        provider: currentProvider,
        provider_id: providerId,
        nickname: nickname,
        avatar_emoji: avatarEmoji,
      },
    });
  }
  redirect("/");
}

export async function checkNicknameDuplication(nickname: string) {
  if (!nickname || nickname.trim() === "") return false;
  const existingUser = await db.users.findFirst({ where: { nickname: nickname.trim() } });
  return existingUser === null;
}

export async function checkNicknameExists(nickname: string) {
  if (!nickname.trim()) return false;
  const user = await db.users.findFirst({
    where: { nickname: nickname.trim() },
    select: { id: true },
  });
  return !!user;
}

export async function updateProfile(userId: string, nickname: string, avatar_emoji: string) {
  await db.users.update({
    where: { id: userId },
    data: { nickname, avatar_emoji }
  });
}