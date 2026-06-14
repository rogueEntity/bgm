// web/src/lib/user-action.ts
"use server";
import { auth } from "@/auth";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function saveOnboardingProfile(formData: FormData) {
  // 1. 서버 측 로그인 상태 검증
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    throw new Error("인증되지 않은 사용자입니다.");
  }

  // 2. 폼 데이터에서 닉네임과 아바타 값 추출
  const nickname = formData.get("nickname") as string;
  const avatarEmoji = formData.get("avatarEmoji") as string;

  if (!nickname || !avatarEmoji) {
    throw new Error("모든 필드를 입력해 주세요.");
  }

  const providerId = session.user.id;

  // 3. DB에 유저가 있는지 먼저 확인
  const existingUser = await db.users.findFirst({
    where: { provider_id: providerId }
  });

  if (existingUser) {
    // 이미 있다면 수정 (중복 생성 에러 방지)
    await db.users.updateMany({
      where: { provider_id: providerId },
      data: {
        nickname: nickname,
        avatar_emoji: avatarEmoji
      },
    });
  } else {
    // 4. 최초 온보딩: DB에 유저 새로 생성! (Lazy Creation 핵심)
    await db.users.create({
      data: {
        provider: "google",
        provider_id: providerId,
        nickname: nickname,
        avatar_emoji: avatarEmoji,
      },
    });
  }

  // 5. 처리가 완료되면 메인 페이지로 리다이렉트
  redirect("/");
}

export async function checkNicknameDuplication(nickname: string) {
  if (!nickname || nickname.trim() === "") return false;

  const existingUser = await db.users.findFirst({
    where: { nickname: nickname.trim() },
  });

  // existingUser가 null이면 사용 가능(true), 데이터가 있으면 중복(false)
  return existingUser === null;
}