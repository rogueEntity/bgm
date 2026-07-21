// web/src/features/games/mahjong/lib/hand/types.ts

import type { MahjongWind } from "../../types";

export type MahjongWinInputMode = "HAND" | "YAKU_FU";

export type MahjongSuit = "m" | "p" | "s" | "z";

/**
 * 수패
 * - m: 만수
 * - p: 통수
 * - s: 삭수
 *
 * 0은 적도라 5를 의미한다.
 */
export type MahjongNumberTileCode =
    | "1m" | "2m" | "3m" | "4m" | "5m" | "0m" | "6m" | "7m" | "8m" | "9m"
    | "1p" | "2p" | "3p" | "4p" | "5p" | "0p" | "6p" | "7p" | "8p" | "9p"
    | "1s" | "2s" | "3s" | "4s" | "5s" | "0s" | "6s" | "7s" | "8s" | "9s";

/**
 * 자패
 *
 * 1z: 동
 * 2z: 남
 * 3z: 서
 * 4z: 북
 * 5z: 백
 * 6z: 발
 * 7z: 중
 */
export type MahjongHonorTileCode =
    | "1z" | "2z" | "3z" | "4z" | "5z" | "6z" | "7z";

export type MahjongTileCode =
    | MahjongNumberTileCode
    | MahjongHonorTileCode;

export type MahjongMeldType =
    | "CHI"
    | "PON"
    | "MINKAN"
    | "ANKAN";

export type MahjongWinMethod = "RON" | "TSUMO";

export type MahjongMeldSnapshot = {
    type: MahjongMeldType;
    tiles: MahjongTileCode[];

    /**
     * 다른 작사에게서 가져온 패.
     *
     * 암깡에서는 존재하지 않는다.
     */
    called_tile?: MahjongTileCode | null;

    /**
     * 부로패를 버린 작사의 stateKey.
     *
     * 현재 단계에서는 선택값으로 두고,
     * 이후 전체 패보 확장 시 활용할 수 있다.
     */
    from_player_key?: string | null;
};

export type MahjongHandSituation = {
    riichi: boolean;
    double_riichi: boolean;
    ippatsu: boolean;

    rinshan: boolean;
    chankan: boolean;
    haitei: boolean;
    houtei: boolean;

    tenhou: boolean;
    chiihou: boolean;
};

export type MahjongHandSnapshot = {
    /**
     * 화료패를 제외한 손패.
     *
     * 부로가 없다면 일반적으로 13장이다.
     * 부로 1개당 3장씩 줄어든다.
     */
    concealed_tiles: MahjongTileCode[];

    winning_tile: MahjongTileCode;

    melds: MahjongMeldSnapshot[];

    /**
     * 도라 자체가 아닌 도라 표시패다.
     */
    dora_indicators: MahjongTileCode[];

    /**
     * 리치 화료 시에만 사용한다.
     */
    ura_dora_indicators: MahjongTileCode[];

    win_method: MahjongWinMethod;

    round_wind: MahjongWind;
    seat_wind: MahjongWind;

    situation: MahjongHandSituation;
};

export type MahjongHandDraft = Omit<
    MahjongHandSnapshot,
    "winning_tile"
> & {
    /**
     * UI 입력 중에는 아직 화료패가 선택되지 않을 수 있다.
     * 서버에 기록하기 전에는 반드시 MahjongTileCode여야 한다.
     */
    winning_tile: MahjongTileCode | null;
};

export type MahjongHandValidationErrorCode =
    | "INVALID_TILE_CODE"
    | "TOO_MANY_SAME_TILE"
    | "INVALID_CONCEALED_TILE_COUNT"
    | "INVALID_MELD_COUNT"
    | "INVALID_CHI"
    | "INVALID_PON"
    | "INVALID_KAN"
    | "INVALID_CALLED_TILE"
    | "OPEN_RIICHI"
    | "CONFLICTING_RIICHI"
    | "IPPATSU_WITHOUT_RIICHI"
    | "TSUMO_RON_CONFLICT"
    | "INVALID_TENHOU"
    | "INVALID_CHIIHOU";

export type MahjongHandValidationError = {
    code: MahjongHandValidationErrorCode;
    message: string;
};

export type MahjongHandValidationResult =
    | {
    ok: true;
    normalized_hand: MahjongHandSnapshot;
}
    | {
    ok: false;
    errors: MahjongHandValidationError[];
};

export type MahjongHandScoreResult = {
    selected_yaku_ids: string[];

    han: number;
    fu: number | null;
    yakuman_count: number;

    dora_count: number;
    ura_dora_count: number;
    red_dora_count: number;

    /**
     * 기존 calculateMahjongScore 결과와 연결할 최종 점수다.
     */
    base_score: number;

    limit_name?: string;
};