import { randomInt } from "node:crypto";

import { db } from "@/lib/prisma";

const GUEST_NAMES = [
  "제시카", "톰", "브랜든", "에밀리", "마이클", "올리버",
  "소피아", "제임스", "올리비아", "루카스", "아멜리아", "헨리",
  "그레이스", "잭", "클로이", "노아", "릴리", "윌리엄",
];

export async function fillEmptyPlayerNames(names: string[]): Promise<string[]> {
  if (names.every((name) => name.trim())) return names;

  const members = await db.users.findMany({
    where: { nickname: { in: GUEST_NAMES } },
    select: { nickname: true },
  });
  const used = new Set([
    ...names.map((name) => name.trim()).filter(Boolean),
    ...members.map((member) => member.nickname),
  ]);

  const result: string[] = [];
  for (const name of names) {
    if (name.trim()) {
      result.push(name);
      continue;
    }

    let guestName = GUEST_NAMES.find((candidate) => !used.has(candidate));
    if (!guestName) {
      do {
        guestName = Array.from({ length: 6 }, () =>
          String.fromCharCode(65 + randomInt(26)),
        ).join("");
      } while (
        used.has(guestName) ||
        await db.users.findFirst({
          where: { nickname: guestName },
          select: { id: true },
        })
      );
    }
    used.add(guestName);
    result.push(guestName);
  }
  return result;
}
