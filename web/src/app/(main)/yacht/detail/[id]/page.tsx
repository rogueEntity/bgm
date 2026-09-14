import Link from "next/link";
import { notFound } from "next/navigation";

import { assertGameEnabled } from "@/features/games/shared/enabled-games";
import {
  YACHT_CATEGORIES,
  YACHT_CATEGORY_LABELS,
  YACHT_GAME_KEY,
} from "@/features/games/yacht/constants";
import { getYachtBonus, getYachtTotal } from "@/features/games/yacht/scoring";
import type { YachtMatchDetails } from "@/features/games/yacht/types";
import { db } from "@/lib/prisma";
import YachtMatchDangerActions from "@/components/yacht/YachtMatchDangerActions";
import { getCurrentUserWithAdmin } from "@/lib/admin";

type Props = { params: Promise<{ id: string }> };

export default async function YachtDetailPage({ params }: Props) {
  assertGameEnabled(YACHT_GAME_KEY);
  const { id } = await params;
  const matchId = Number.parseInt(id, 10);
  if (Number.isNaN(matchId)) notFound();

  const match = await db.matches.findUnique({
    where: { id: matchId },
    include: { games: true, match_details: true },
  });
  if (!match?.match_details || match.deleted_at || match.games.key !== YACHT_GAME_KEY) {
    notFound();
  }
  const details = match.match_details.details as YachtMatchDetails;
  if (details.status !== "FINISHED") notFound();
  const currentUser = await getCurrentUserWithAdmin();
  const canManage = Boolean(
    currentUser && (currentUser.isAdmin || currentUser.id === match.created_by),
  );
  const players = Object.values(details.players).sort(
    (a, b) => getYachtTotal(b.scores) - getYachtTotal(a.scores),
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <Link href="/yacht" className="mb-4 inline-flex text-sm font-semibold text-foreground/60 hover:text-foreground">
          ← 야찌 대시보드로
        </Link>
        <div className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-6 shadow-sm">
          <p className="text-sm font-black text-blue-500">Yacht Dice</p>
          <h2 className="mt-1 text-3xl font-black">게임 결과</h2>
        </div>
      </div>

      <YachtMatchDangerActions matchId={matchId} canManage={canManage} />

      <div className="overflow-x-auto rounded-3xl border border-foreground/10 bg-background shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-foreground/[0.04]">
            <tr>
              <th className="p-4 text-left">항목</th>
              {players.map((player) => <th key={player.seat_order} className="p-4 text-right">{player.name}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {YACHT_CATEGORIES.map((category) => (
              <tr key={category}>
                <th className="p-4 text-left">{YACHT_CATEGORY_LABELS[category]}</th>
                {players.map((player) => <td key={player.seat_order} className="p-4 text-right">{player.scores[category] ?? 0}점</td>)}
              </tr>
            ))}
            <tr className="bg-foreground/[0.03]">
              <th className="p-4 text-left">상단 보너스</th>
              {players.map((player) => <td key={player.seat_order} className="p-4 text-right font-bold">+{getYachtBonus(player.scores)}점</td>)}
            </tr>
            <tr>
              <th className="p-4 text-left text-lg">총점</th>
              {players.map((player) => <td key={player.seat_order} className="p-4 text-right text-xl font-black">{getYachtTotal(player.scores)}점</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
