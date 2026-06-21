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

function getNextRound(currentRound: string) {
    const currentIdx = ROUND_ORDER.indexOf(currentRound);
    // 💡 더 이상 진행할 국이 없으면 null 반환 (예: 북4국 종료 시)
    if (currentIdx !== -1 && currentIdx < ROUND_ORDER.length - 1) {
        return ROUND_ORDER[currentIdx + 1];
    }
    return null;
}
// -----------------

// 1. 방 생성 액션
export async function createMahjongMatch(players: string[], startingScore: number, gameMode: "동풍전" | "반장전" | "전장전") {
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
    history: [],
    gameMode: gameMode,
    status: "PLAYING"
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

// 2. 점수 기록 (화료) 액션
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
  isFinal: boolean;
}) {
  const match = await db.matches.findUnique({
    where: { id: data.matchId },
    include: { match_details: true },
  });

  if (!match || !match.match_details) throw new Error("Match not found");

  const details = match.match_details.details as any;
  const players = details.players;

  // 기록용 스냅샷
  const currentRound = details.current_round;
  const currentHonba = details.honba || 0;
  const initialScores: Record<string, number> = {};
  Object.keys(players).forEach(k => initialScores[k] = players[k].score);

  // 리치 선언 점수 차감
  data.currentRiichiKeys.forEach(key => { players[key].score -= 1000; });
  const totalRiichiSticks = (details.riichi_sticks || 0) + data.currentRiichiKeys.length;

  const winner = players[data.winnerKey];
  const isWinnerOya = winner.wind === "EAST";
  let totalCollected = 0;

  // 화료 점수 분배 로직
  if (data.isTsumo) {
    if (isWinnerOya) {
      const basePayment = Math.ceil((data.baseScore / 3) / 100) * 100;
      Object.keys(players).forEach((key) => {
        if (key !== data.winnerKey) {
          const payment = basePayment + (currentHonba * 100);
          players[key].score -= payment;
          totalCollected += payment;
        }
      });
      const expectedTotal = data.baseScore + (currentHonba * 300);
      if (totalCollected !== expectedTotal) totalCollected = expectedTotal;
    } else {
      const childBasePayment = Math.ceil((data.baseScore / 4) / 100) * 100;
      const oyaBasePayment = data.baseScore - (childBasePayment * 2);

      Object.keys(players).forEach((key) => {
        if (key === data.winnerKey) return;
        if (players[key].wind === "EAST") {
          const payment = oyaBasePayment + (currentHonba * 100);
          players[key].score -= payment;
          totalCollected += payment;
        } else {
          const payment = childBasePayment + (currentHonba * 100);
          players[key].score -= payment;
          totalCollected += payment;
        }
      });
    }
  } else if (data.loserKey) {
    const payment = data.baseScore + (currentHonba * 300);
    players[data.loserKey].score -= payment;
    totalCollected += payment;
  }

  // 승자 정산 및 공탁금 초기화
  players[data.winnerKey].score += totalCollected + (totalRiichiSticks * 1000);
  details.riichi_sticks = 0;

  // 기록용 델타 및 최종 점수 계산
  const scoreDeltas: Record<string, number> = {};
  const resultScores: Record<string, number> = {};
  Object.keys(players).forEach(k => {
    scoreDeltas[k] = players[k].score - initialScores[k];
    resultScores[k] = players[k].score;
  });

  // 종료 조건 및 국 진행 체크 (3만점 조건 반영)
  const topScore = Math.max(...Object.values(players).map((p: any) => p.score));
  const winnerScore = players[data.winnerKey].score; // 화료자 점수
  const isTobi = Object.values(players).some((p: any) => p.score <= 0);

  const [wind, roundStr] = details.current_round.split("_");
  const roundMap: Record<string, number> = { "EAST": 1, "SOUTH": 2, "WEST": 3, "NORTH": 4 };
  const currentWindIdx = roundMap[wind];
  const modeLimitIdx = details.gameMode === "동풍전" ? 1 : details.gameMode === "반장전" ? 2 : 4;
  const roundNum = parseInt(roundStr);

  const isAllLast = currentWindIdx === modeLimitIdx && roundNum === 4; // 정규 오라스
  const isExtraRound = currentWindIdx > modeLimitIdx; // 연장전 (남입, 서입 등)

  if (isTobi || data.isFinal) {
    details.status = "FINISHED";
    if (data.isFinal) details.finishReason = "FORCE_FINISH"; // 조기 종료
    else if (isTobi) details.finishReason = "TOBI"; // 토비
  } else {
    if (isWinnerOya) {
      details.honba = currentHonba + 1;
      // 아가리야메: 오라스 또는 연장전에서 1등이 3만점 이상이면 즉시 종료
      if ((isAllLast || isExtraRound) && winnerScore >= 30000 && winnerScore === topScore) {
        details.status = "FINISHED";
        details.finishReason = "NORMAL";
      }
    } else {
      // 자가 화료
      if ((isAllLast || isExtraRound) && topScore >= 30000) {
        details.status = "FINISHED";
        details.finishReason = "NORMAL";
      } else {
        const absoluteLimitIdx = details.gameMode === "전장전" ? 4 : modeLimitIdx + 1;
        const isAbsoluteLast = currentWindIdx === absoluteLimitIdx && roundNum === 4;

        if (isAbsoluteLast) {
          // 최대 한계 국(예: 동풍전의 남4국)이 끝났는데도 3만점이 안 되면 그냥 1등이 승리하며 강제 종료
          details.status = "FINISHED";
          details.finishReason = "MAX_ROUND_REACHED";
        } else {
          // 그 외의 경우는 정상적으로 다음 국 진행
          const nextRound = getNextRound(details.current_round);
          if (!nextRound) {
            details.status = "FINISHED";
            details.finishReason = "MAX_ROUND_REACHED";
          } else {
            details.current_round = nextRound;
            details.honba = 0;
            rotateWinds(players);
          }
        }
      }
    }
  }

  // 화료 히스토리 저장
  if (!details.history || !Array.isArray(details.history)) details.history = [];
  details.history.push({
    timestamp: new Date().toISOString(),
    type: "AGARI",
    round: currentRound,
    honba: currentHonba,
    winnerKey: data.winnerKey,
    loserKey: data.loserKey,
    isTsumo: data.isTsumo,
    baseScore: data.baseScore,
    han: data.han,
    doraTotal: data.doraTotal,
    selectedYakuIds: data.selectedYakuIds,
    riichiKeys: data.currentRiichiKeys,
    scoreDeltas: scoreDeltas,
    resultScores: resultScores,
  });

  await db.match_details.update({
    where: { match_id: match.match_details.match_id },
    data: { details: details },
  });

  revalidatePath(`/mahjong/play/${data.matchId}`);
}

// 3. 유국 처리 액션
export async function recordRyuukyoku(data: {
  matchId: number;
  type: "황패유국" | "구종구패" | "사풍연타" | "사개깡" | "사가리치" | "삼가화";
  tenpaiKeys: string[];
  currentRiichiKeys: string[];
  isFinal: boolean;
}) {
  const match = await db.matches.findUnique({
    where: { id: data.matchId },
    include: { match_details: true },
  });

  if (!match || !match.match_details) throw new Error("Match not found");

  const details = match.match_details.details as any;
  const players = details.players;
  const isExhaustive = data.type === "황패유국";

  // 기록용 스냅샷
  const currentRound = details.current_round;
  const currentHonba = details.honba || 0;
  const initialScores: Record<string, number> = {};
  Object.keys(players).forEach(k => initialScores[k] = players[k].score);

  // 리치 선언 점수 차감 및 공탁금 누적
  data.currentRiichiKeys.forEach((key) => { players[key].score -= 1000; });
  details.riichi_sticks = (details.riichi_sticks || 0) + data.currentRiichiKeys.length;

  // 황패유국 텐파이 벌부 정산
  let isOyaTenpai = false;
  if (isExhaustive) {
    const allKeys = Object.keys(players);
    const tenpaiCount = data.tenpaiKeys.length;
    isOyaTenpai = data.tenpaiKeys.some((k) => players[k].wind === "EAST");

    if (tenpaiCount > 0 && tenpaiCount < 4) {
      const reward = 3000 / tenpaiCount;
      const penalty = 3000 / (4 - tenpaiCount);

      allKeys.forEach((key) => {
        if (data.tenpaiKeys.includes(key)) {
          players[key].score += reward;
        } else {
          players[key].score -= penalty;
        }
      });
    }
  } else {
    // 도중유국은 통상적으로 오야가 유지됨
    isOyaTenpai = true;
  }

  // 기록용 델타 및 최종 점수 계산
  const scoreDeltas: Record<string, number> = {};
  const resultScores: Record<string, number> = {};
  Object.keys(players).forEach(k => {
    scoreDeltas[k] = players[k].score - initialScores[k];
    resultScores[k] = players[k].score;
  });

  // [핵심] 종료 조건 및 국 진행 체크 (3만점 조건 반영)
  const oyaKey = Object.keys(players).find(k => players[k].wind === "EAST") as string;
  const oyaScore = players[oyaKey].score; // 💡 친의 점수 확인
  const topScore = Math.max(...Object.values(players).map((p: any) => p.score));
  const isTobi = Object.values(players).some((p: any) => p.score <= 0);

  const [wind, roundStr] = details.current_round.split("_");
  const roundMap: Record<string, number> = { "EAST": 1, "SOUTH": 2, "WEST": 3, "NORTH": 4 };
  const currentWindIdx = roundMap[wind];
  const modeLimitIdx = details.gameMode === "동풍전" ? 1 : details.gameMode === "반장전" ? 2 : 4;
  const roundNum = parseInt(roundStr);

  const isAllLast = currentWindIdx === modeLimitIdx && roundNum === 4;
  const isExtraRound = currentWindIdx > modeLimitIdx;

  if (isTobi || data.isFinal) {
    details.status = "FINISHED";
    if (data.isFinal) details.finishReason = "FORCE_FINISH"; // 조기 종료
    else if (isTobi) details.finishReason = "TOBI"; // 토비
  } else {
    details.honba = currentHonba + 1; // 유국 시 무조건 본장 증가
    if (isOyaTenpai) {
      // 친 텐파이 (텐파이야메): 1등이 3만점 이상이면 종료
      if ((isAllLast || isExtraRound) && oyaScore >= 30000 && oyaScore === topScore) {
        details.status = "FINISHED";
        details.finishReason = "NORMAL";
      }
    } else {
      // 친 노텐 -> 국 넘어감
      if ((isAllLast || isExtraRound) && topScore >= 30000) {
        details.status = "FINISHED";
        details.finishReason = "NORMAL";
      } else {
        const absoluteLimitIdx = details.gameMode === "전장전" ? 4 : modeLimitIdx + 1;
        const isAbsoluteLast = currentWindIdx === absoluteLimitIdx && roundNum === 4;

        if (isAbsoluteLast) {
          // 최대 한계 국(예: 동풍전의 남4국)이 끝났는데도 3만점이 안 되면 강제 종료
          details.status = "FINISHED";
          details.finishReason = "MAX_ROUND_REACHED";
        } else {
          // 그 외의 경우는 정상적으로 다음 국 진행
          const nextRound = getNextRound(details.current_round);
          if (!nextRound) {
            details.status = "FINISHED";
            details.finishReason = "MAX_ROUND_REACHED";
          } else {
            details.current_round = nextRound;
            rotateWinds(players);
          }
        }
      }
    }
  }

  // 유국 히스토리 저장
  if (!details.history || !Array.isArray(details.history)) details.history = [];
  details.history.push({
    timestamp: new Date().toISOString(),
    type: "RYUUKYOKU",
    ryuukyokuType: data.type,
    round: currentRound,
    honba: currentHonba,
    tenpaiKeys: data.tenpaiKeys,
    riichiKeys: data.currentRiichiKeys,
    scoreDeltas: scoreDeltas,
    resultScores: resultScores,
  });

  await db.match_details.update({
    where: { match_id: match.match_details.match_id },
    data: { details: details },
  });

  revalidatePath(`/mahjong/play/${data.matchId}`);
}