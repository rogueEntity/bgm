// web/src/features/games/mahjong/lib/win.ts
import { NORMAL_YAKU, SITUATIONAL_YAKU } from "../constants/yaku";
import {
    calculateMahjongScore,
    type MahjongLimitName,
} from "./score";
import { getWindTurnDistance } from "./round";

import type {
    MahjongDetails,
    MahjongPlayerState,
    MahjongScoreMap,
    MahjongWinLog,
    ResolvedMahjongWinInput,
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

const LIMIT_RANK: Record<MahjongLimitName, number> = {
    일반: 0,
    만관: 1,
    하네만: 2,
    배만: 3,
    삼배만: 4,
    역만: 5,
    더블역만: 5,
    트리플역만: 5,
    수역만: 5,
};

type MahjongWinLimitInput = Pick<
    MahjongWinLog,
    "han" | "fu" | "selected_yaku_ids" | "yakuman_count"
>;

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

/**
 * 대국 종료 시 남아 있는 공탁 리치봉을 최종 1위에게 지급한다.
 *
 * 동점인 경우 최초 자리 순서가 빠른 작사를 우선한다.
 * initial_players의 키 순서는 대국 생성 당시
 * 동가 → 남가 → 서가 → 북가 순서다.
 */
export function settleFinalRiichiSticks({
                                            details,
                                            receiverKey,
                                        }: {
    details: MahjongDetails;
    receiverKey?: string | null;
}) {
    const riichiStickCount = Math.max(
        0,
        Math.trunc(Number(details.riichi_sticks || 0)),
    );

    if (riichiStickCount === 0) {
        details.riichi_sticks = 0;
        return null;
    }

    const players = details.players;

    const orderedPlayerKeys = Object.keys(
        details.initial_players &&
        Object.keys(details.initial_players).length > 0
            ? details.initial_players
            : players,
    ).filter((playerKey) => Boolean(players[playerKey]));

    if (orderedPlayerKeys.length === 0) {
        throw new Error("공탁 리치봉을 받을 작사를 찾을 수 없습니다.");
    }

    const resolvedReceiverKey =
        receiverKey && players[receiverKey]
            ? receiverKey
            : orderedPlayerKeys.reduce((leaderKey, playerKey) => {
                const leaderScore = players[leaderKey].score;
                const playerScore = players[playerKey].score;

                /*
                 * 점수가 같으면 기존 leaderKey를 유지한다.
                 * 따라서 최초 자리 순서가 빠른 작사가 우선된다.
                 */
                return playerScore > leaderScore
                    ? playerKey
                    : leaderKey;
            });

    players[resolvedReceiverKey].score += riichiStickCount * 1000;
    details.riichi_sticks = 0;

    return resolvedReceiverKey;
}

export function getYakumanCount(selectedYakuIds: string[]) {
    return selectedYakuIds.reduce((sum, id) => {
        const yaku = ALL_YAKU.find((item) => item.id === id);

        if (!yaku?.isYakuman) {
            return sum;
        }

        return sum + (yaku.yakumanMultiplier ?? 1);
    }, 0);
}

export function getMahjongWinLimitName(
    win: MahjongWinLimitInput,
): MahjongLimitName {
    const selectedYakuIds = Array.isArray(win.selected_yaku_ids)
        ? win.selected_yaku_ids
        : [];

    const storedYakumanCount =
        typeof win.yakuman_count === "number" &&
        Number.isFinite(win.yakuman_count)
            ? Math.max(0, Math.trunc(win.yakuman_count))
            : 0;

    const selectedYakumanCount = getYakumanCount(selectedYakuIds);

    // 저장된 값과 선택된 역에서 계산한 값은 같은 의미이므로
    // 합산하지 않고 더 신뢰할 수 있는 큰 값을 사용한다.
    const yakumanCount = Math.max(
        storedYakumanCount,
        selectedYakumanCount,
    );

    const han =
        typeof win.han === "number" && Number.isFinite(win.han)
            ? Math.max(1, Math.trunc(win.han))
            : 1;

    const fu =
        typeof win.fu === "number" && Number.isFinite(win.fu)
            ? win.fu
            : 30;

    return calculateMahjongScore({
        han,
        fu,
        isDealer: false,
        isTsumo: false,
        yakumanCount,
    }).limitName;
}

export function isMahjongWinAtLeast(
    win: MahjongWinLimitInput,
    minimum: "만관" | "하네만" | "배만" | "역만",
) {
    const limitName = getMahjongWinLimitName(win);

    return LIMIT_RANK[limitName] >= LIMIT_RANK[minimum];
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
                        isMenzen,
                    }: {
    yaku: YakuLike;
    isMenzen: boolean;
}) {
    if (yaku.isYakuman) return 0;

    const han = yaku.han;

    if (typeof han === "number") {
        return han;
    }

    if (han && typeof han === "object") {
        return isMenzen ? han.closed ?? 0 : han.open ?? han.closed ?? 0;
    }

    return 0;
}

function getTotalHan({
                         selectedYakuIds,
                         doraTotal,
                         isMenzen,
                     }: {
    selectedYakuIds: string[];
    doraTotal: number;
    isMenzen: boolean;
}) {
    const yakuHan = selectedYakuIds.reduce((sum, yakuId) => {
        const yaku = ALL_YAKU.find((item) => item.id === yakuId);

        if (!yaku) {
            return sum;
        }

        return sum + getYakuHan({ yaku, isMenzen });
    }, 0);

    return yakuHan + doraTotal;
}

export function recalculateWins({
                                    wins,
                                    players,
                                    is_tsumo,
                                }: {
    wins: ResolvedMahjongWinInput[];
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
            isMenzen: win.is_menzen !== false,
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
            yakuman_count: yakumanCount,
            limit_name: calculatedScore.limitName,
        };
    });
}