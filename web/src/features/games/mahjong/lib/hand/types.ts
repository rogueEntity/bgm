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

export type MahjongParsedMeldType =
    | "SEQUENCE"
    | "TRIPLET"
    | "QUAD";

export type MahjongParsedMeld = {
    type: MahjongParsedMeldType;

    /**
     * 적도라는 일반 5로 정규화해서 저장한다.
     */
    tiles: MahjongTileCode[];

    /**
     * true면 치·퐁·명깡으로 만들어진 몸통이다.
     * 암깡은 멘젠으로 취급하므로 false다.
     */
    open: boolean;

    /**
     * 원본 부로 종류.
     *
     * 손패에서 분해된 몸통이면 null이다.
     */
    source_meld_type: MahjongMeldType | null;
};

export type MahjongWinningGroupType =
    | "PAIR"
    | "SEQUENCE"
    | "TRIPLET"
    | "QUAD"
    | "KOKUSHI_PAIR"
    | "KOKUSHI_SINGLE";

export type MahjongWinningGroup = {
    type: MahjongWinningGroupType;

    /**
     * 화료패가 포함된 그룹의 인덱스.
     *
     * 일반형에서는 melds의 인덱스이고,
     * 머리 화료면 null이다.
     */
    meld_index: number | null;

    tiles: MahjongTileCode[];
};

export type MahjongStandardHandPattern = {
    type: "STANDARD";

    pair: [
        MahjongTileCode,
        MahjongTileCode,
    ];

    melds: MahjongParsedMeld[];

    winning_group: MahjongWinningGroup;
};

export type MahjongChiitoitsuPattern = {
    type: "CHIITOITSU";

    pairs: Array<
        [
            MahjongTileCode,
            MahjongTileCode,
        ]
    >;

    winning_group: MahjongWinningGroup;
};

export type MahjongKokushiPattern = {
    type: "KOKUSHI";

    /**
     * 국사무쌍의 중복된 1종.
     */
    pair_tile: MahjongTileCode;

    /**
     * 화료 전 13면 대기였는지 여부.
     */
    thirteen_wait: boolean;

    winning_group: MahjongWinningGroup;
};

export type MahjongHandPattern =
    | MahjongStandardHandPattern
    | MahjongChiitoitsuPattern
    | MahjongKokushiPattern;

export type MahjongHandParseResult =
    | {
    ok: true;
    patterns: MahjongHandPattern[];
}
    | {
    ok: false;
    code:
        | "INVALID_TILE_COUNT"
        | "NOT_COMPLETE_HAND";
    message: string;
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
    | "INVALID_CHIIHOU"
    | "NOT_COMPLETE_HAND";

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

export type MahjongWaitType =
    | "RYANMEN"
    | "KANCHAN"
    | "PENCHAN"
    | "TANKI"
    | "SHANPON"
    | "CHIITOITSU"
    | "KOKUSHI_SINGLE"
    | "KOKUSHI_THIRTEEN";

export type MahjongWaitResult = {
    type: MahjongWaitType;

    /**
     * 대기 형태로 추가되는 부수.
     *
     * - 간짱: 2부
     * - 변짱: 2부
     * - 단기: 2부
     * - 나머지: 0부
     */
    fu: number;
};

export type MahjongFuReason =
    | "BASE"
    | "MENZEN_RON"
    | "TSUMO"
    | "PAIR_DRAGON"
    | "PAIR_SEAT_WIND"
    | "PAIR_ROUND_WIND"
    | "WAIT_KANCHAN"
    | "WAIT_PENCHAN"
    | "WAIT_TANKI"
    | "OPEN_SIMPLE_TRIPLET"
    | "CLOSED_SIMPLE_TRIPLET"
    | "OPEN_TERMINAL_HONOR_TRIPLET"
    | "CLOSED_TERMINAL_HONOR_TRIPLET"
    | "OPEN_SIMPLE_QUAD"
    | "CLOSED_SIMPLE_QUAD"
    | "OPEN_TERMINAL_HONOR_QUAD"
    | "CLOSED_TERMINAL_HONOR_QUAD"
    | "CHIITOITSU_FIXED"
    | "OPEN_RON_MINIMUM"
    | "ROUND_UP";

export type MahjongFuItem = {
    reason: MahjongFuReason;
    label: string;
    fu: number;
};

export type MahjongFuCalculation = {
    /**
     * 반올림 전 부수.
     */
    raw_fu: number;

    /**
     * 실제 점수 계산에 사용할 부수.
     */
    fu: number | null;

    wait: MahjongWaitResult;

    items: MahjongFuItem[];

    /**
     * 핑후 쯔모의 20부 고정 여부.
     */
    pinfu_tsumo: boolean;

    /**
     * 국사무쌍 등 부수 계산을 하지 않는 형태인지 여부.
     */
    not_applicable: boolean;
};

export type MahjongPatternFuResult = {
    pattern: MahjongHandPattern;
    calculation: MahjongFuCalculation;
};