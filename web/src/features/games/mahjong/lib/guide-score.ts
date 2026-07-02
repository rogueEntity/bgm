// web/src/features/games/mahjong/lib/guide-score.ts

export type MahjongWinnerType = "dealer" | "child";
export type MahjongWinMethod = "ron" | "tsumo";

export type MahjongScoreResult = {
    label: string;
    ronPoint?: number;
    tsumoDealerPoint?: number;
    tsumoChildPoint?: number;
    paymentText: string;
};

export const HAN_OPTIONS = [
    { value: 1, label: "1판" },
    { value: 2, label: "2판" },
    { value: 3, label: "3판" },
    { value: 4, label: "4판" },
    { value: 5, label: "만관" },
    { value: 6, label: "하네만" },
    { value: 8, label: "배만" },
    { value: 11, label: "삼배만" },
    { value: 13, label: "역만" },
    { value: 26, label: "더블역만" },
] as const;

export const FU_OPTIONS = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110] as const;

function ceilToHundred(value: number) {
    return Math.ceil(value / 100) * 100;
}

function getLimitBasePoint(han: number) {
    if (han >= 26) {
        return {
            label: "더블역만",
            basePoint: 16000,
        };
    }

    if (han >= 13) {
        return {
            label: "역만",
            basePoint: 8000,
        };
    }

    if (han >= 11) {
        return {
            label: "삼배만",
            basePoint: 6000,
        };
    }

    if (han >= 8) {
        return {
            label: "배만",
            basePoint: 4000,
        };
    }

    if (han >= 6) {
        return {
            label: "하네만",
            basePoint: 3000,
        };
    }

    if (han >= 5) {
        return {
            label: "만관",
            basePoint: 2000,
        };
    }

    return null;
}

function getBasePoint(han: number, fu: number) {
    const rawBasePoint = fu * 2 ** (han + 2);

    if (rawBasePoint >= 2000) {
        return {
            label: "만관",
            basePoint: 2000,
        };
    }

    return {
        label: `${han}판 ${fu}부`,
        basePoint: rawBasePoint,
    };
}

export function calculateMahjongGuideScore({
                                               winnerType,
                                               winMethod,
                                               han,
                                               fu,
                                           }: {
    winnerType: MahjongWinnerType;
    winMethod: MahjongWinMethod;
    han: number;
    fu: number;
}): MahjongScoreResult {
    const limit = getLimitBasePoint(han);
    const scoreBase = limit ?? getBasePoint(han, fu);
    const { basePoint, label } = scoreBase;

    if (winMethod === "ron") {
        const ronPoint =
            winnerType === "dealer"
                ? ceilToHundred(basePoint * 6)
                : ceilToHundred(basePoint * 4);

        return {
            label,
            ronPoint,
            paymentText:
                winnerType === "dealer"
                    ? `방총자가 ${ronPoint.toLocaleString("ko-KR")}점 지급`
                    : `방총자가 ${ronPoint.toLocaleString("ko-KR")}점 지급`,
        };
    }

    if (winnerType === "dealer") {
        const tsumoPoint = ceilToHundred(basePoint * 2);

        return {
            label,
            tsumoDealerPoint: tsumoPoint,
            tsumoChildPoint: tsumoPoint,
            paymentText: `자 3명이 각각 ${tsumoPoint.toLocaleString("ko-KR")}점 지급`,
        };
    }

    const tsumoDealerPoint = ceilToHundred(basePoint * 2);
    const tsumoChildPoint = ceilToHundred(basePoint);

    return {
        label,
        tsumoDealerPoint,
        tsumoChildPoint,
        paymentText: `친 ${tsumoDealerPoint.toLocaleString("ko-KR")}점 / 자 ${tsumoChildPoint.toLocaleString("ko-KR")}점씩 지급`,
    };
}

export function isLimitHan(han: number) {
    return han >= 5;
}

export function normalizeFuForHan(han: number, fu: number) {
    if (isLimitHan(han)) return fu;

    if (han === 1 && fu === 20) return 30;
    if (han === 1 && fu === 25) return 30;

    if (han === 2 && fu === 20) return 20;

    return fu;
}