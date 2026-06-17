// web/src/actions/mahjong.action.ts
"use server";

import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// --- 헬퍼 함수 ---
const ROUND_ORDER = [
    "EAST_1", "EAST_2", "EAST_3", "EAST_4",
    "SOUTH_1", "SOUTH_2", "SOUTH_3", "SOUTH_4",
    "WEST_1", "WEST_2", "WEST_3", "WEST_4",
    "NORTH_1", "NORTH_2", "NORTH_3", "NORTH_4",
];

function getNextWind(currentWind: string) {
  const map: Record<string, string> = { "EAST": "SOUTH", "SOUTH": "WEST", "WEST": "NORTH", "NORTH": "EAST" };
  return map[currentWind] || "EAST";
}

function rotateWinds(players: Record<string, any>) {
  Object.keys(players).forEach(key => {
    players[key].wind = getNextWind(players[key].wind);
  });
}
// -----------------

// 1. 방 생성 액션
export async function createMahjongMatch(players: string[], startingScore: number) {
  const session = await auth();
  if (!session || !session.user) throw new Error("Unauthorized");

  const providerId = session.user.id as string;
  const me = await db.users.findFirst({ where: { provider_id: providerId } });
  if (!me) throw new Error("DB에서 로그인한 유저 정보를 찾을 수 없습니다.");

  const myUserUuid = me.id;
  const winds = ["EAST", "SOUTH", "WEST", "NORTH"];

  let game = await db.games.findFirst({ where: { name: "리치마작" } });
  if (!game) {
    game = await db.games.create({ data: { name: "리치마작", min_players: 4, max_players: 4 } });
  }

  const playerNames = players.map((p) => p.trim());
  const existingUsers = await db.users.findMany({ where: { nickname: { in: playerNames } } });
  const userMap = new Map(existingUsers.map((user) => [user.nickname, user.id]));
  const initialPlayersState: Record<string, any> = {};

  const matchPlayersData = playerNames.map((playerName, index) => {
    const foundUserId = userMap.get(playerName);
    const playerKey = foundUserId ? `user_${foundUserId}` : `guest_${playerName}`;

    initialPlayersState[playerKey] = { wind: winds[index], score: startingScore };
    return { user_id: foundUserId ? foundUserId : null, guest_name: foundUserId ? null : playerName };
  });

  const initialDetails = {
    current_round: "EAST_1",
    honba: 0,
    riichi_sticks: 0,
    players: initialPlayersState,
    logs: [],
  };

  const newMatch = await db.matches.create({
    data: {
      game_id: game.id,
      created_by: myUserUuid,
      match_players: { create: matchPlayersData },
      match_details: { create: { details: initialDetails } },
    },
  });

  redirect(`/mahjong/play/${newMatch.id}`);
}

// 2. 점수 기록 액션
export async function recordMahjongResult(data: {
  matchId: number;
  winnerKey: string;
  loserKey: string | null;
  isTsumo: boolean;
  baseScore: number;
  han: number;
  doraTotal: number;
  selectedYakuIds: string[];
  currentRiichiKeys: string[];
}) {
  const match = await db.matches.findUnique({
    where: { id: data.matchId },
    include: { match_details: true },
  });

  if (!match || !match.match_details) throw new Error("Match not found");

  const details = match.match_details.details as any;
  const players = details.players;
  const honba = details.honba || 0;

  data.currentRiichiKeys.forEach(key => { players[key].score -= 1000; });
  const totalRiichiSticks = (details.riichiSticks || 0) + data.currentRiichiKeys.length;

  const winner = players[data.winnerKey];
  const isWinnerOya = winner.wind === "EAST";
  let totalCollected = 0;

  if (data.isTsumo) {
    if (isWinnerOya) {
      const basePayment = Math.ceil((data.baseScore / 3) / 100) * 100;
      Object.keys(players).forEach((key) => {
        if (key !== data.winnerKey) {
          const payment = basePayment + (honba * 100);
          players[key].score -= payment;
          totalCollected += payment;
        }
      });
      const expectedTotal = data.baseScore + (honba * 300);
      if (totalCollected !== expectedTotal) totalCollected = expectedTotal;
    } else {
      const childBasePayment = Math.ceil((data.baseScore / 4) / 100) * 100;
      const oyaBasePayment = data.baseScore - (childBasePayment * 2);

      Object.keys(players).forEach((key) => {
        if (key === data.winnerKey) return;
        if (players[key].wind === "EAST") {
          const payment = oyaBasePayment + (honba * 100);
          players[key].score -= payment;
          totalCollected += payment;
        } else {
          const payment = childBasePayment + (honba * 100);
          players[key].score -= payment;
          totalCollected += payment;
        }
      });
    }
  } else if (data.loserKey) {
    const payment = data.baseScore + (honba * 300);
    players[data.loserKey].score -= payment;
    totalCollected += payment;
  }

  players[data.winnerKey].score += totalCollected + (totalRiichiSticks * 1000);
  details.riichiSticks = 0;

  let isTobi = false;
  Object.keys(players).forEach(key => { if (players[key].score <= 0) isTobi = true; });

  if (isTobi) {
    details.status = "FINISHED";
  } else {
    if (isWinnerOya) {
      details.honba = honba + 1;
    } else {
      const currentIdx = ROUND_ORDER.indexOf(details.current_round);
      if (details.current_round === "SOUTH_4") {
        const topScore = Math.max(...Object.values(players).map((p: any) => p.score));
        if (topScore >= 30000) details.status = "FINISHED";
        else { details.current_round = "WEST_1"; details.honba = 0; rotateWinds(players); }
      } else if (currentIdx !== -1 && currentIdx < ROUND_ORDER.length - 1) {
        details.current_round = ROUND_ORDER[currentIdx + 1];
        details.honba = 0; rotateWinds(players);
      } else {
        details.status = "FINISHED";
      }
    }
  }

  if (!details.history || !Array.isArray(details.history)) details.history = [];
  details.history.push({ timestamp: new Date().toISOString(), ...data });

  await db.match_details.update({
    where: { match_id: match.match_details.match_id },
    data: { details: details },
  });

  revalidatePath(`/mahjong/play/${data.matchId}`);
}

// 3. 대국 강제 종료 액션
export async function finishMatch(matchId: number) {
  const match = await db.matches.findUnique({
    where: { id: matchId },
    include: { match_details: true },
  });

  if (!match || !match.match_details) throw new Error("Match not found");

  const details = match.match_details.details as any;
  details.status = "FINISHED";

  await db.match_details.update({
    where: { match_id: match.match_details.match_id },
    data: { details: details },
  });

  revalidatePath(`/mahjong/play/${matchId}`);
}