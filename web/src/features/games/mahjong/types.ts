// web/src/features/games/mahjong/types.ts

import type { MatchStatus } from "../shared/types";

export type GameMode = "동풍전" | "반장전" | "전장전";

export type MahjongStatus = MatchStatus;

export type MahjongWind = "EAST" | "SOUTH" | "WEST" | "NORTH";

export type MahjongFinishReason =
    | "FORCE_FINISH"
    | "TOBI"
    | "NORMAL"
    | "MAX_ROUND_REACHED";

export type MahjongPlayerState = {
    wind: MahjongWind;
    score: number;
};

export type MahjongDetails = {
    schema_version: number;
    game_key?: "mahjong";
    current_round: string;
    honba: number;
    riichi_sticks: number;
    players: Record<string, MahjongPlayerState>;
    initial_players?: Record<string, MahjongPlayerState>;
    logs: MahjongRoundLog[];
    game_mode: GameMode;
    status: MahjongStatus;
    finish_reason?: MahjongFinishReason;
    stats_applied?: boolean;
    deleted_at?: string;
    deleted_by?: string;
};

export type MahjongScoreMap = Record<string, number>;

export type MahjongChomboPenaltyRule = "MANGAN_PAYMENT";

export type MahjongWinLog = {
    winner_key: string;
    loser_key?: string | null;
    base_score: number;
    han: number;
    fu?: number | null;
    dora_total: number;
    selected_yaku_ids: string[];
    score_deltas?: MahjongScoreMap;
    yakuman_count?: number;
    is_menzen?: boolean;
    is_mengen?: boolean;
};

export type MahjongRoundLog = {
    timestamp?: string;

    type?: "AGARI" | "RYUUKYOKU" | "CHOMBO" | string;
    round?: string;
    honba?: number;

    is_tsumo?: boolean;
    is_final?: boolean;
    forced_end?: boolean;

    riichi_keys?: string[];
    riichi_declared_keys?: string[];

    wins?: MahjongWinLog[];

    score_deltas?: MahjongScoreMap;
    result_scores?: MahjongScoreMap;

    ryuukyoku_type?: string;
    tenpai_keys?: string[];
    nagashi_mangan_winner_keys?: string[];

    // 촌보
    chombo_player_key?: string;
    chombo_penalty_rule?: MahjongChomboPenaltyRule;
    cancelled_riichi_keys?: string[];
};

export type RecordMahjongChomboInput = MahjongExpectedStateInput & {
    match_id: number;
    chombo_player_key: string;

    /**
     * 해당 국에서 선언됐지만 촌보로 취소된 리치.
     * 점수에는 반영하지 않고 로그 표시 목적으로만 저장한다.
     */
    current_riichi_keys: string[];
};

export type MahjongExpectedStateInput = {
    expected_round: string;
    expected_honba: number;
    expected_log_count: number;
    expected_version: number;
};

export type MahjongWinInput = {
    winner_key: string;
    loser_key: string | null;
    is_mengen?: boolean;
    fu?: number | null;
    dora_total: number;
    selected_yaku_ids: string[];
};

export type RecalculatedMahjongWin = MahjongWinInput & {
    base_score: number;
    han: number;
    limit_name?: string;
    score_deltas?: MahjongScoreMap;
};

export type RecordMahjongResultInput = MahjongExpectedStateInput & {
    match_id: number;
    is_tsumo: boolean;
    wins: MahjongWinInput[];
    current_riichi_keys: string[];
    is_final: boolean;
};

export type RecordRyuukyokuInput = MahjongExpectedStateInput & {
    match_id: number;
    type:
        | "황패유국"
        | "구종구패"
        | "사풍연타"
        | "사개깡"
        | "사가리치"
        | "삼가화"
        | "유국만관";
    tenpai_keys: string[];
    current_riichi_keys: string[];
    is_final: boolean;
    nagashi_mangan_winner_keys?: string[];
};

export type MahjongStatsModeKey = "east" | "half" | "full";

export type MahjongModeStats = {
    play_count: number;

    rank_counts: {
        "1": number;
        "2": number;
        "3": number;
        "4": number;
    };

    rank_rates: {
        "1": number;
        "2": number;
        "3": number;
        "4": number;
    };

    tobi_count: number;
    tobi_rate: number;

    total_agari_point: number;
    agari_count: number;
    average_agari_point: number;

    total_rank: number;
    average_rank: number;

    max_honba: number;

    round_count: number;
    agari_round_count: number;
    tsumo_agari_count: number;
    deal_in_count: number;

    riichi_count: number;

    open_win_count: number;
    riichi_win_count: number;

    agari_rate: number;
    tsumo_rate: number;
    deal_in_rate: number;

    riichi_rate: number;

    open_win_rate: number;
    riichi_win_rate: number;
};

export type MahjongSpecificStats = {
    schema_version: number;
    mahjong: {
        modes: Record<MahjongStatsModeKey, MahjongModeStats>;
        yaku_counts: Record<string, number>;
    };
};

export type RankedMahjongPlayerResult = {
    player_key: string;
    user_id: string | null;
    final_score: number;
    rank: number;
    is_tobi: boolean;
    uma: number;
};

export type MahjongWinLogForStats = {
    winner_key?: string;
    loser_key?: string | null;
    base_score?: number;
    han?: number;
    fu?: number | null;
    dora_total?: number;
    selected_yaku_ids?: string[];
    is_mengen?: boolean;
};

export type MahjongLogForStats = {
    type?: string;
    honba?: number;
    is_tsumo?: boolean;
    riichi_keys?: string[];
    wins?: MahjongWinLogForStats[];
};

export type YakuHanValue =
    | number
    | {
    closed?: number;
    open?: number;
};

export type YakuLike = {
    id: string;
    name: string;
    han?: YakuHanValue;
    isYakuman?: boolean;
    yakumanMultiplier?: number;
};

export type MahjongMatchListFilter = {
    status?: "ALL" | "PLAYING" | "FINISHED";
    game_mode?: "ALL" | GameMode;
    keyword?: string;
    only_mine?: boolean;
    take?: number;
};

export type MahjongMatchListItem = {
    id: number;
    created_by: string | null;
    can_manage: boolean;
    log_count: number;
    play_date: string | null;
    game_mode: GameMode;
    status: Exclude<MahjongStatus, "DELETED">;
    current_round: string;
    honba: number;
    riichi_sticks: number;
    finish_reason: MahjongDetails["finish_reason"] | null;
    players: {
        key: string;
        name: string;
        wind: MahjongPlayerState["wind"] | null;
        score: number | null;
        rank: number | null;
        avatar_image_key: string | null;
        avatar_image_updated_at: Date | null;
        avatar_emoji: string | null;
    }[];
};