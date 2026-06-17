// web/src/app/(main)/mahjong/detail/[id]/page.tsx

import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import MatchResultDetails from "@/components/mahjong/MatchResultDetails";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const matchId = Number(resolvedParams.id);

  if (isNaN(matchId)) return notFound();

  // 💡 1. 이름 정보를 가져오기 위해 match_players와 users를 함께 불러옵니다.
  const match = await db.matches.findUnique({
    where: { id: matchId },
    include: {
      match_players: {
        include: { users: true },
      },
      match_details: true,
    },
  });

  if (!match || !match.match_details) return notFound();

  const details = match.match_details.details as any;
  const playersState = details.players;

  // 💡 2. DB에서 가져온 진짜 이름(닉네임 or 게스트명)을 JSON 데이터에 주입합니다.
  match.match_players.forEach((mp) => {
    const displayName = (mp.user_id ? mp.users?.nickname : mp.guest_name) ?? "이름 없음";
    const stateKey = mp.user_id ? `user_${mp.user_id}` : `guest_${mp.guest_name}`;

    // details.players 객체 안에 name 속성을 강제로 추가!
    if (playersState[stateKey]) {
      playersState[stateKey].name = displayName;
    }
  });

  return (
    <div className="container py-8 max-w-3xl mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between bg-foreground/5 p-4 rounded-xl border border-foreground/10">
        <h1 className="text-2xl font-black">대국 상세 기록</h1>
        <div className="text-sm font-bold opacity-60">
          대국 ID: {matchId}
        </div>
      </div>

      {/* 이제 이름이 포함된 details가 넘어가서 순위표에 닉네임이 정상 출력됩니다. */}
      <MatchResultDetails details={details} />
    </div>
  );
}