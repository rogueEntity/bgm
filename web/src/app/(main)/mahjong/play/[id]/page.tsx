// web/src/app/(main)/mahjong/play/[id]/page.tsx

import { db } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

import { getMahjongEquippedBadgesByUserIds } from "@/app/actions/mahjong-achievement.action";
import UserAvatar from "@/components/common/UserAvatar";
import MahjongRoundLogCards from "@/components/mahjong/MahjongRoundLogCards";
import NicknameWithBadges from "@/components/mahjong/NicknameWithBadges";
import { getAvatarImageUrl } from "@/lib/avatar";
import { getUserIdFromPlayerKey } from "@/lib/mahjong-achievements";
import MahjongMatchDangerActions from "@/components/mahjong/MahjongMatchDangerActions";
import { getCurrentUserWithAdmin } from "@/lib/admin";

import ScoreForm from "./ScoreForm";
import { MAHJONG_GAME_KEY } from "@/features/games/mahjong/constants";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";

type ScoreboardPlayer = {
  name: string;
  wind: string;
  score: number;
  stateKey: string;
  avatarImageUrl: string | null;
  avatarEmoji: string | null;
};

export default async function MahjongPlayPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  assertGameEnabled(MAHJONG_GAME_KEY);
  const resolvedParams = await params;
  const matchId = Number.parseInt(resolvedParams.id, 10);

  // 숫자가 아닌 이상한 주소로 접근하면 404 페이지로 보냄
  if (Number.isNaN(matchId)) return notFound();

  // 1. DB에서 매치 정보, 참가자 목록, JSON 디테일을 한 번에 가져옴
  const match = await db.matches.findUnique({
    where: { id: matchId },
    include: {
      match_players: {
        include: { users: true }, // 가입 유저인 경우 닉네임을 가져오기 위함
      },
      match_details: true,
    },
  });

  // 방이 없거나 초기화된 JSON 데이터가 없으면 404
  if (!match?.match_details) return notFound();
  if (match.deleted_at) return notFound();

  // 2. JSON 데이터 파싱
  const details = match.match_details.details as any;

  if (details.status === "DELETED") {
    return notFound();
  }

  // [핵심] 대국이 종료된 상태면 강제로 상세(detail) 페이지로 리디렉션
  if (details.status === "FINISHED") {
    redirect(`/mahjong/detail/${matchId}`);
  }

  const currentUser = await getCurrentUserWithAdmin();

  const isRecorder = currentUser?.id === match.created_by;
  const canManageMatch = Boolean(isRecorder || currentUser?.isAdmin);
  const canUndo = Array.isArray(details.logs) && details.logs.length > 0;

  const playersState = details.players;

  // DB에 저장된 게임 모드 가져오기
  const gameMode = details.game_mode || "동풍전";

  const scoreboard: ScoreboardPlayer[] = match.match_players.map((mp) => {
    // 이름 판별 (회원이면 닉네임, 아니면 게스트 이름)
    const displayName =
      (mp.user_id ? mp.users?.nickname : mp.guest_name) ?? "이름 없음";

    // JSON 안에 저장해 둔 고유 Key값 재조립
    const stateKey = mp.user_id
      ? `user_${mp.user_id}`
      : `guest_${mp.guest_name}`;

    const state = playersState[stateKey] || { wind: "UNKNOWN", score: 0 };

    return {
      name: displayName,
      wind: state.wind,
      score: state.score,
      stateKey,
      avatarImageUrl: getAvatarImageUrl(
        mp.users?.avatar_image_key,
        mp.users?.avatar_image_updated_at,
      ),
      avatarEmoji: mp.users?.avatar_emoji ?? null,
    };
  });

  // 바람(Wind) 정렬 순서를 위한 맵
  const windOrder: Record<string, number> = {
    EAST: 1,
    SOUTH: 2,
    WEST: 3,
    NORTH: 4,
  };

  // 동-남-서-북 순서대로 정렬
  scoreboard.sort(
    (a, b) => (windOrder[a.wind] ?? 99) - (windOrder[b.wind] ?? 99),
  );

  const playerNameMap = Object.fromEntries(
    scoreboard.map((player) => [player.stateKey, player.name]),
  );

  const userIds = Array.from(
    new Set(
      scoreboard
        .map((player) => getUserIdFromPlayerKey(player.stateKey))
        .filter((userId): userId is string => userId !== null),
    ),
  );

  const equippedBadgeMap = await getMahjongEquippedBadgesByUserIds(userIds);

  // 라운드 이름 한글 변환기
  const roundNameMap: Record<string, string> = {
    EAST_1: "동 1국",
    EAST_2: "동 2국",
    EAST_3: "동 3국",
    EAST_4: "동 4국",
    SOUTH_1: "남 1국",
    SOUTH_2: "남 2국",
    SOUTH_3: "남 3국",
    SOUTH_4: "남 4국",
    WEST_1: "서 1국",
    WEST_2: "서 2국",
    WEST_3: "서 3국",
    WEST_4: "서 4국",
    NORTH_1: "북 1국",
    NORTH_2: "북 2국",
    NORTH_3: "북 3국",
    NORTH_4: "북 4국",
  };

  const windNameMap: Record<string, string> = {
    EAST: "동(東)",
    SOUTH: "남(南)",
    WEST: "서(西)",
    NORTH: "북(北)",
  };

  const riichiSticksCount = details.riichi_sticks ?? 0;

  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        {/* 상단 헤더: 대국 정보 */}
        <header className="bg-foreground text-background p-6 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden">
          {/* 좌측 상단 게임 모드 뱃지 */}
          <div className="absolute top-0 left-0 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-br-lg opacity-90">
            {gameMode}
          </div>

          <div className="mt-2">
            <h2 className="text-3xl font-black mb-1">
              {roundNameMap[details.current_round] || details.current_round}
            </h2>
            <div className="flex gap-3 text-sm font-bold opacity-80">
              <span>{details.honba || 0} 본장</span>
              <span>리치봉 {riichiSticksCount}개</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs opacity-60 block mb-1">총 공탁금</span>
            <span className="text-xl font-black">
              {riichiSticksCount * 1000} 점
            </span>
          </div>
        </header>
        {canManageMatch && (
            <MahjongMatchDangerActions
                matchId={matchId}
                canManage={canManageMatch}
                canUndo={canUndo}
                redirectAfterDelete="/mahjong"
                showUndo
                showDelete
            />
        )}

        {/* 중단: 점수판 그리드 (기존 디자인 유지) */}
        <div className="grid grid-cols-2 gap-4">
          {scoreboard.map((player) => {
            const userId = getUserIdFromPlayerKey(player.stateKey);
            const badges = userId ? equippedBadgeMap[userId] ?? [] : [];
            const isDealer = player.wind === "EAST";

            return (
              <div
                key={player.stateKey}
                className={`relative rounded-3xl border p-6 md:p-8 ${
                  isDealer
                    ? "border-red-500/40 bg-red-500/10"
                    : "border-foreground/10 bg-foreground/5"
                }`}
              >
                {isDealer && (
                  <div className="absolute left-6 top-6 rounded-full bg-red-500 px-3 py-1.5 text-sm font-black text-white">
                    오야
                  </div>
                )}

                <div className="flex h-full min-h-[220px] flex-col items-center justify-center">
                  <div
                    className={`flex h-8 items-center justify-center text-center text-xl font-black ${
                      isDealer ? "text-red-500" : "text-foreground/50"
                    }`}
                  >
                    {windNameMap[player.wind] ?? player.wind}
                  </div>

                  <div className="mt-4 flex h-12 items-center justify-center">
                    <UserAvatar
                      imageUrl={player.avatarImageUrl}
                      emoji={player.avatarEmoji}
                      name={player.name}
                      size="md"
                      className="h-12 w-12 text-xl"
                    />
                  </div>

                  <div className="mt-3 flex h-10 max-w-full items-center justify-center">
                    <NicknameWithBadges
                      nickname={player.name}
                      badges={badges}
                      badgeSize="sm"
                      className="max-w-full justify-center"
                      nameClassName="max-w-[8rem] truncate text-center text-2xl font-black md:max-w-[10rem]"
                    />
                  </div>

                  <div className="mt-6 flex h-12 items-center justify-center text-center text-4xl font-black text-blue-500">
                    {player.score.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isRecorder && (
          <MahjongRoundLogCards
            details={details}
            playerNameMap={playerNameMap}
          />
        )}
      </div>

      {isRecorder && (
        <>
          {/* 하단: 점수 기록 폼 */}
          <div className="w-full max-w-2xl mx-auto">
            <ScoreForm
                matchId={matchId}
                players={scoreboard}
                currentRound={details.current_round}
                honba={details.honba ?? 0}
                logCount={Array.isArray(details.logs) ? details.logs.length : 0}
                stateVersion={match.match_details.version}
            />
          </div>

          <div className="w-full max-w-2xl mx-auto">
            <MahjongRoundLogCards
              details={details}
              playerNameMap={playerNameMap}
            />
          </div>
        </>
      )}
    </div>
  );
}