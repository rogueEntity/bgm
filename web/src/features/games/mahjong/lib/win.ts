// web/src/features/games/mahjong/lib/win.ts
import { NORMAL_YAKU, SITUATIONAL_YAKU } from "../constants/yaku";
import { calculateMahjongScore } from "./score";
import { getWindTurnDistance } from "./round";

import type {
    MahjongPlayerState,
    MahjongScoreMap,
    MahjongWinInput,
    RecalculatedMahjongWin,
    YakuLike,
} from "../types";

const ALL_YAKU = [...NORMAL_YAKU, ...SITUATIONAL_YAKU] as YakuLike[];

const CHIITOITSU_YAKU_IDS = new Set([
    "chiitoitsu",
    "chitoitsu",
    "seven_pairs",
]);

const CHIITOITSU_YAKU_NAMES = new Set([
    "치또이쯔",
    "치토이츠",
    "칠대자",
]);

export function createEmptyScoreMap(
    players: Record<string, MahjongPlayerState>,
) {
    return Object.keys(players).reduce<MahjongScoreMap>((acc, key) => {
        acc[key] = 0;
        return acc;
    }, {});
}

export function getRiichiStickReceiverKey({
                                              wins,
                                              players,
                                              is_tsumo,
                                          }: {
    wins: { winner_key: string; loser_key: string | null }[];
    players: Record<string, MahjongPlayerState>;
    is_tsumo: boolean;
}) {
    if (wins.length === 0) {
        throw new Error("공탁금 수령자를 계산할 화료 정보가 없습니다.");
    }

    if (is_tsumo || wins.length === 1) {
        return wins[0].winner_key;
    }

    const loserKey = wins[0].loser_key;

    if (!loserKey) {
        throw new Error("더블 론의 공탁금 수령자 계산에는 방총자가 필요합니다.");
    }

    const loserWind = players[loserKey]?.wind;

    const sortedWins = [...wins].sort((a, b) => {
        const aDistance = getWindTurnDistance(
            loserWind,
            players[a.winner_key]?.wind,
        );
        const bDistance = getWindTurnDistance(
            loserWind,
            players[b.winner_key]?.wind,
        );

        return aDistance - bDistance;
    });

    return sortedWins[0].winner_key;
}

function getYakumanCount(selectedYakuIds: string[]) {
    return selectedYakuIds.reduce((sum, id) => {
        const yaku = ALL_YAKU.find((item) => item.id === id);

        if (!yaku?.isYakuman) {
            return sum;
        }

        return sum + (yaku.yakumanMultiplier ?? 1);
    }, 0);
}

function isChiitoitsuWin(selectedYakuIds: string[]) {
    return selectedYakuIds.some((yakuId) => {
        if (CHIITOITSU_YAKU_IDS.has(yakuId)) return true;

        const yaku = ALL_YAKU.find((item) => item.id === yakuId);
        return yaku ? CHIITOITSU_YAKU_NAMES.has(yaku.name) : false;
    });
}

function getYakuHan({
                        yaku,
                        isMengen,
                    }: {
    yaku: YakuLike;
    isMengen: boolean;
}) {
    if (yaku.isYakuman) return 0;

    const han = yaku.han;

    if (typeof han === "number") {
        return han;
    }

    if (han && typeof han === "object") {
        return isMengen ? han.closed ?? 0 : han.open ?? han.closed ?? 0;
    }

    return 0;
}

function getTotalHan({
                         selectedYakuIds,
                         doraTotal,
                         isMengen,
                     }: {
    selectedYakuIds: string[];
    doraTotal: number;
    isMengen: boolean;
}) {
    const yakuHan = selectedYakuIds.reduce((sum, yakuId) => {
        const yaku = ALL_YAKU.find((item) => item.id === yakuId);

        if (!yaku) {
            return sum;
        }

        return sum + getYakuHan({ yaku, isMengen });
    }, 0);

    return yakuHan + doraTotal;
}

export function recalculateWins({
                                    wins,
                                    players,
                                    is_tsumo,
                                }: {
    wins: MahjongWinInput[];
    players: Record<string, MahjongPlayerState>;
    is_tsumo: boolean;
}): RecalculatedMahjongWin[] {
    return wins.map((win) => {
        const winner = players[win.winner_key];

        if (!winner) {
            throw new Error("존재하지 않는 화료자입니다.");
        }

        const yakumanCount = getYakumanCount(win.selected_yaku_ids);
        const han = getTotalHan({
            selectedYakuIds: win.selected_yaku_ids,
            doraTotal: win.dora_total,
            isMengen: win.is_mengen !== false,
        });

        const effectiveFu =
            yakumanCount > 0
                ? null
                : isChiitoitsuWin(win.selected_yaku_ids)
                    ? 25
                    : win.fu ?? 30;

        const calculatedScore = calculateMahjongScore({
            han,
            fu: effectiveFu ?? 30,
            isDealer: winner.wind === "EAST",
            isTsumo: is_tsumo,
            yakumanCount,
        });

        return {
            ...win,
            base_score: calculatedScore.totalScore,
            han,
            fu: effectiveFu,
            limit_name: calculatedScore.limitName,
        };
    });
}