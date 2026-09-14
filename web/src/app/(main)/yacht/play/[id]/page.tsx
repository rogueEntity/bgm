import { notFound, redirect } from "next/navigation";

import { assertGameEnabled } from "@/features/games/shared/enabled-games";
import { YACHT_GAME_KEY } from "@/features/games/yacht/constants";
import type { YachtMatchDetails } from "@/features/games/yacht/types";
import { getCurrentUserWithAdmin } from "@/lib/admin";
import { db } from "@/lib/prisma";
import YachtMatchDangerActions from "@/components/yacht/YachtMatchDangerActions";

import YachtScorecard from "./YachtScorecard";

type Props = { params: Promise<{ id: string }> };

export default async function YachtPlayPage({ params }: Props) {
  assertGameEnabled(YACHT_GAME_KEY);
  const { id } = await params;
  const matchId = Number.parseInt(id, 10);
  if (Number.isNaN(matchId)) notFound();

  const match = await db.matches.findUnique({
    where: { id: matchId },
    include: { games: true, match_details: true },
  });
  if (
    !match?.match_details ||
    match.deleted_at ||
    match.games.key !== YACHT_GAME_KEY
  ) {
    notFound();
  }

  const details = match.match_details.details as YachtMatchDetails;
  if (details.status === "FINISHED") redirect(`/yacht/detail/${matchId}`);
  if (details.status !== "PLAYING") notFound();

  const currentUser = await getCurrentUserWithAdmin();
  const canManage = Boolean(
    currentUser && (currentUser.isAdmin || currentUser.id === match.created_by),
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-6 shadow-sm">
        <p className="text-sm font-black text-blue-500">Yacht Dice</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">야찌 점수 기록</h2>
        <p className="mt-2 text-sm text-foreground/60">
          {details.current_round}라운드 · 플레이어 버튼을 눌러 점수표를 전환하세요.
        </p>
      </div>

      <YachtMatchDangerActions matchId={matchId} canManage={canManage} />

      <YachtScorecard
        matchId={matchId}
        expectedVersion={match.match_details.version}
        details={details}
        canManage={canManage}
      />
    </div>
  );
}
