// web/src/app/(main)/mahjong/detail/[id]/page.tsx

import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import MatchResultDetails from "@/components/mahjong/MatchResultDetails";
import MahjongRoundLogCards from "@/components/mahjong/MahjongRoundLogCards";
import { getMahjongEquippedBadgesByUserIds } from "@/app/actions/mahjong-achievement.action";
import { getUserIdFromPlayerKey } from "@/features/games/mahjong/lib/achievements";
import { getAvatarImageUrl } from "@/lib/avatar";
import MahjongMatchDangerActions from "@/components/mahjong/MahjongMatchDangerActions";
import { getCurrentUserWithAdmin } from "@/lib/admin";
import { MAHJONG_GAME_KEY } from "@/features/games/mahjong/constants";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";

export default async function MatchDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  assertGameEnabled(MAHJONG_GAME_KEY);
  const resolvedParams = await params;
  const matchId = Number(resolvedParams.id);

  if (Number.isNaN(matchId)) return notFound();

  // 1. 이름 정보를 가져오기 위해 match_players와 users를 함께 불러옵니다.
  const match = await db.matches.findUnique({
    where: { id: matchId },
    include: {
      match_players: {
        include: { users: true },
      },
      match_details: true,
    },
  });

  if (!match?.match_details) return notFound();

  if (match.deleted_at) return notFound();

  const details = match.match_details.details as any;

  if (details.status === "DELETED") {
    return notFound();
  }

  if (details.status !== "FINISHED") {
    return notFound();
  }

  const currentUser = await getCurrentUserWithAdmin();

  const canManageMatch = Boolean(
      currentUser?.isAdmin || currentUser?.id === match.created_by,
  );

  const canUndo = Array.isArray(details.logs) && details.logs.length > 0;

  const playersState = details.players ?? {};

  const userIds = Array.from(
    new Set(
      match.match_players
        .map((mp) => mp.user_id)
        .filter((userId): userId is string => userId !== null),
    ),
  );

  const equippedBadgeMap = await getMahjongEquippedBadgesByUserIds(userIds);

  // 2. DB에서 가져온 진짜 이름(닉네임 or 게스트명)을 JSON 데이터에 주입합니다.
  // 3. 가입 유저라면 장착 배지도 같이 주입합니다.
  match.match_players.forEach((mp) => {
    const displayName =
      (mp.user_id ? mp.users?.nickname : mp.guest_name) ?? "이름 없음";

    const stateKey = mp.user_id
      ? `user_${mp.user_id}`
      : `guest_${mp.guest_name}`;

    if (playersState[stateKey]) {
      playersState[stateKey].name = displayName;

      const userId = getUserIdFromPlayerKey(stateKey);

      playersState[stateKey].equipped_badges = userId
        ? equippedBadgeMap[userId] ?? []
        : [];

      playersState[stateKey].avatar_image_url = getAvatarImageUrl(
        mp.users?.avatar_image_key,
        mp.users?.avatar_image_updated_at,
      );

      playersState[stateKey].avatar_emoji = mp.users?.avatar_emoji ?? null;
    }
  });

  return (
    <div className="container py-8 max-w-3xl mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between bg-foreground/5 p-4 rounded-xl border border-foreground/10">
        <h1 className="text-2xl font-black">대국 상세 기록</h1>
        <div className="text-right text-sm font-bold opacity-60">
          <div>대국 ID: {matchId}</div>
          <div>{details.game_mode ?? "동풍전"}</div>
        </div>
      </div>

      {canManageMatch && (
          <MahjongMatchDangerActions
              matchId={matchId}
              canManage={canManageMatch}
              canUndo={canUndo}
              redirectAfterDelete="/mahjong/matches"
              showUndo
              showDelete
          />
      )}

      {/* 이름과 장착 배지가 포함된 details가 넘어갑니다. */}
      <MatchResultDetails details={details} />
      <MahjongRoundLogCards details={details} />
    </div>
  );
}