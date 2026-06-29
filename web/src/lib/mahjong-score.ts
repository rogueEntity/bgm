// web/src/lib/mahjong-score.ts

export type MahjongLimitName =
  | "일반"
  | "만관"
  | "하네만"
  | "배만"
  | "삼배만"
  | "역만"
  | "더블역만"
  | "트리플역만"
  | "수역만";

export type MahjongCalculatedScore = {
  han: number;
  fu: number | null;
  isDealer: boolean;
  isTsumo: boolean;
  limitName: MahjongLimitName;
  basePoints: number;
  totalScore: number;
  ronPayment?: number;
  tsumoPayments?: {
    dealer?: number;
    child?: number;
    each?: number;
  };
  display: string;
};

export function roundUpToHundred(value: number) {
  return Math.ceil(value / 100) * 100;
}

function normalizeFu(fu: number) {
  if (!Number.isFinite(fu)) return 0;
  if (fu === 25) return 25;
  return Math.ceil(fu / 10) * 10;
}

function getLimitBasePoints({
  han,
  fu,
  yakumanCount,
}: {
  han: number;
  fu: number;
  yakumanCount: number;
}): {
  limitName: MahjongLimitName;
  basePoints: number;
} | null {
  if (yakumanCount >= 3) {
    return {
      limitName: "트리플역만",
      basePoints: 8000 * yakumanCount,
    };
  }

  if (yakumanCount === 2) {
    return {
      limitName: "더블역만",
      basePoints: 16000,
    };
  }

  if (yakumanCount === 1) {
    return {
      limitName: "역만",
      basePoints: 8000,
    };
  }

  // 수역만을 인정하는 룰
  if (han >= 13) {
    return {
      limitName: "수역만",
      basePoints: 8000,
    };
  }

  if (han >= 11) {
    return {
      limitName: "삼배만",
      basePoints: 6000,
    };
  }

  if (han >= 8) {
    return {
      limitName: "배만",
      basePoints: 4000,
    };
  }

  if (han >= 6) {
    return {
      limitName: "하네만",
      basePoints: 3000,
    };
  }

  if (han >= 5) {
    return {
      limitName: "만관",
      basePoints: 2000,
    };
  }

  if (han === 4 && fu >= 40) {
    return {
      limitName: "만관",
      basePoints: 2000,
    };
  }

  if (han === 3 && fu >= 70) {
    return {
      limitName: "만관",
      basePoints: 2000,
    };
  }

  return null;
}

export function calculateMahjongScore({
  han,
  fu,
  isDealer,
  isTsumo,
  yakumanCount = 0,
}: {
  han: number;
  fu: number;
  isDealer: boolean;
  isTsumo: boolean;
  yakumanCount?: number;
}): MahjongCalculatedScore {
  if (!Number.isFinite(yakumanCount) || yakumanCount < 0) {
    throw new Error("역만 수가 올바르지 않습니다.");
  }

  if (yakumanCount === 0 && (!Number.isFinite(han) || han <= 0)) {
    throw new Error("판수는 1 이상이어야 합니다.");
  }

  const normalizedFu = yakumanCount > 0 || han >= 5 ? fu : normalizeFu(fu);

  if (yakumanCount === 0 && han < 5) {
    if (!Number.isFinite(normalizedFu) || normalizedFu < 20) {
      throw new Error("부수는 20부 이상이어야 합니다.");
    }
  }

  const limit = getLimitBasePoints({
    han,
    fu: normalizedFu,
    yakumanCount,
  });

  const basePoints = limit
    ? limit.basePoints
    : Math.min(normalizedFu * Math.pow(2, han + 2), 2000);

  const limitName = limit?.limitName ?? "일반";
  const scoreLabel =
    limitName === "일반" ? `${normalizedFu}부 ${han}판` : limitName;

  if (!isTsumo) {
    const ronPayment = roundUpToHundred(basePoints * (isDealer ? 6 : 4));

    return {
      han,
      fu: yakumanCount > 0 || han >= 5 ? null : normalizedFu,
      isDealer,
      isTsumo,
      limitName,
      basePoints,
      totalScore: ronPayment,
      ronPayment,
      display: `${scoreLabel} / 론 ${ronPayment.toLocaleString()}점`,
    };
  }

  if (isDealer) {
    const each = roundUpToHundred(basePoints * 2);
    const totalScore = each * 3;

    return {
      han,
      fu: yakumanCount > 0 || han >= 5 ? null : normalizedFu,
      isDealer,
      isTsumo,
      limitName,
      basePoints,
      totalScore,
      tsumoPayments: {
        each,
      },
      display: `${scoreLabel} / 쯔모 ${each.toLocaleString()} 올`,
    };
  }

  const child = roundUpToHundred(basePoints);
  const dealer = roundUpToHundred(basePoints * 2);
  const totalScore = child * 2 + dealer;

  return {
    han,
    fu: yakumanCount > 0 || han >= 5 ? null : normalizedFu,
    isDealer,
    isTsumo,
    limitName,
    basePoints,
    totalScore,
    tsumoPayments: {
      dealer,
      child,
    },
    display: `${scoreLabel} / 쯔모 ${child.toLocaleString()}-${dealer.toLocaleString()}점`,
  };
}

export function getRecommendedFuOptions({
  isTsumo,
}: {
  isTsumo: boolean;
}) {
  const baseOptions = [
    20,
    30,
    40,
    50,
    60,
    70,
    80,
    90,
    100,
    110,
    120,
    130,
    140,
    150,
    160,
    170,
  ];

  // 20부는 보통 핑후 쯔모 전용이라 론에서는 기본 선택지에서 제외
  if (isTsumo) {
    return baseOptions;
  }

  return baseOptions.filter((fu) => fu !== 20);
}