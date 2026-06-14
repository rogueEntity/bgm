// web/src/app/actions/user.ts
"use server"
import { db } from "@/lib/prisma"

export async function updateProfile(userId: string, nickname: string, avatar_emoji: string) {
  await db.users.update({
    where: { id: userId },
    data: { nickname, avatar_emoji }
  });
}