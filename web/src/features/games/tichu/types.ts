// web/src/features/games/tichu/types.ts

export type TichuStatus = "PLAYING" | "FINISHED" | "DELETED";

export type TichuTeamKey = "TEAM_A" | "TEAM_B";

export type TichuCallResult = "SUCCESS" | "FAIL";

export type TichuPlayerState = {
    name: string;
    team_key: TichuTeamKey;
    seat_order: number;
};

export type TichuTeamState = {
    name: string;
    score: number;
    player_keys: string[];
};

export type TichuCallLog = {
    player_key: string;
    result: TichuCallResult;
    score_delta: number;
};

export type TichuRoundLog = {
    round: number;
    first_out_player_key: string;
    team_a_card_score: number | null;
    team_b_card_score: number | null;
    one_two_team_key: TichuTeamKey | null;
    small_tichu_calls: TichuCallLog[];
    large_tichu_calls: TichuCallLog[];
    score_deltas: Record<TichuTeamKey, number>;
    total_scores: Record<TichuTeamKey, number>;
    created_at: string;
};

export type TichuMatchDetails = {
    schema_version: number;
    game_key: string;
    status: TichuStatus;
    current_round: number;
    target_score: number;
    winner_team_key: TichuTeamKey | null;
    finished_at: string | null;
    teams: Record<TichuTeamKey, TichuTeamState>;
    players: Record<string, TichuPlayerState>;
    logs: TichuRoundLog[];
    stats_applied: boolean;
};

export type RawTichuPlayerState = {
    name?: unknown;
    team_key?: unknown;
    seat_order?: unknown;
};

export type RawTichuTeamState = {
    name?: unknown;
    score?: unknown;
    player_keys?: unknown;
};

export type RawTichuMatchDetails = {
    schema_version?: unknown;
    game_key?: unknown;
    status?: unknown;
    current_round?: unknown;
    target_score?: unknown;
    winner_team_key?: unknown;
    finished_at?: unknown;
    teams?: unknown;
    players?: unknown;
    logs?: unknown;
    stats_applied?: unknown;
};

export type TichuSpecificStats = {
    play_count: number;
    win_count: number;
    loss_count: number;
    draw_count: number;
    round_count: number;

    tichu_calls: number;
    tichu_successes: number;
    tichu_failures: number;

    grand_tichu_calls: number;
    grand_tichu_successes: number;
    grand_tichu_failures: number;

    first_out_count: number;

    one_two_success_count: number;
    one_two_suffered_count: number;

    total_score_diff: number;
    best_score_diff: number;
    worst_score_diff: number;
};

export type TichuUserGameSpecificStats = {
    schema_version: 2;
    tichu: TichuSpecificStats;
};

export type CalculateTichuEloChangeParams = {
    teamARating: number;
    teamBRating: number;
    teamAScore: number;
    teamBScore: number;
};

export type TichuEloChangeResult = {
    teamAChange: number;
    teamBChange: number;
    expectedA: number;
    expectedB: number;
    actualA: number;
    actualB: number;
    scoreMultiplier: number;
};