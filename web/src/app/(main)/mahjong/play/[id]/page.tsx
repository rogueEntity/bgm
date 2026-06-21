// web/src/app/(main)/mahjong/play/[id]/page.tsx
import { db } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import ScoreForm from "./ScoreForm";

export default async function MahjongPlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const matchId = parseInt(resolvedParams.id, 10);

  // 숫자가 아닌 이상한 주소로 접근하면 404 페이지로 보냄
  if (isNaN(matchId)) return notFound();

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
  if (!match || !match.match_details) return notFound();

  // 2. JSON 데이터 파싱
  const details = match.match_details.details as any;

  // 💡 [핵심] 대국이 종료된 상태면 강제로 상세(detail) 페이지로 리디렉션
  if (details.status === "FINISHED") {
    redirect(`/mahjong/detail/${matchId}`);
  }

  const playersState = details.players;

  // DB에 저장된 게임 모드 가져오기
  const gameMode = details.gameMode || "동풍전";

  const scoreboard = match.match_players.map((mp) => {
    // 이름 판별 (회원이면 닉네임, 아니면 게스트 이름)
    const displayName = (mp.user_id ? mp.users?.nickname : mp.guest_name) ?? "이름 없음";
    // JSON 안에 저장해 둔 고유 Key값 재조립
    const stateKey = mp.user_id ? `user_${mp.user_id}` : `guest_${mp.guest_name}`;
    const state = playersState[stateKey] || { wind: "UNKNOWN", score: 0 };

    return {
      name: displayName,
      wind: state.wind,
      score: state.score,
      stateKey: stateKey,
    };
  });

  // 바람(Wind) 정렬 순서를 위한 맵
  const windOrder: Record<string, number> = { EAST: 1, SOUTH: 2, WEST: 3, NORTH: 4 };
  // 동-남-서-북 순서대로 정렬
  scoreboard.sort((a, b) => windOrder[a.wind] - windOrder[b.wind]);

  // 라운드 이름 한글 변환기
  const roundNameMap: Record<string, string> = {
    EAST_1: "동 1국", EAST_2: "동 2국", EAST_3: "동 3국", EAST_4: "동 4국",
    SOUTH_1: "남 1국", SOUTH_2: "남 2국", SOUTH_3: "남 3국", SOUTH_4: "남 4국",
    WEST_1: "서 1국", WEST_2: "서 2국", WEST_3: "서 3국", WEST_4: "서 4국",
    NORTH_1: "북 1국", NORTH_2: "북 2국", NORTH_3: "북 3국", NORTH_4: "북 4국",
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

          {/* 중단: 점수판 그리드 (기존 디자인 유지) */}
          <div className="grid grid-cols-2 gap-4">
            {scoreboard.map((player) => (
              <div
                key={player.stateKey}
                className={`p-5 rounded-2xl flex flex-col items-center justify-center border relative transition-all
                  ${player.wind === "EAST" 
                    ? "bg-red-50/50 border-red-200 dark:bg-red-900/20 dark:border-red-900/50" 
                    : "bg-foreground/5 border-foreground/10"
                  }
                `}
              >
                {/* 오야(동풍)일 경우 특별한 표시 */}
                {player.wind === "EAST" && (
                  <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-sm">
                    오야
                  </span>
                )}

                <span className={`text-sm font-bold mb-2 ${player.wind === "EAST" ? "text-red-500" : "opacity-60"}`}>
                  {player.wind === "EAST" ? "동(東)" : player.wind === "SOUTH" ? "남(南)" : player.wind === "WEST" ? "서(西)" : "북(北)"}
                </span>
                <span className="text-xl font-black mb-2">{player.name}</span>
                <span className={`text-2xl font-black tracking-tighter ${player.score < 0 ? "text-red-500" : "text-blue-600 dark:text-blue-400"}`}>
                  {player.score.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 하단: 점수 기록 폼 */}
        <div className="w-full max-w-2xl mx-auto">
          <ScoreForm matchId={matchId} players={scoreboard} />
        </div>
      </div>
  );
}