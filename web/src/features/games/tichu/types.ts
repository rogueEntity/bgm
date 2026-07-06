// web/src/features/games/tichu/types.ts

export type TichuStatus = "PLAYING" | "FINISHED" | "DELETED";

export type TichuTeamKey = "TEAM_A" | "TEAM_B";

export type TichuPlayerPosition = "A1" | "B1" | "A2" | "B2";

export type TichuMatchDetails = {
    schema_version: number;
    status: TichuStatus;
    target_score: number;
    current_round: number;
    teams: {
        TEAM_A: {
            name: string;
            score: number;
        };
        TEAM_B: {
            name: string;
            score: number;
        };
    };
    players: Record<
        TichuPlayerPosition,
        {
            name: string;
            user_id?: string | null;
            team_key: TichuTeamKey;
        }
    >;
    logs: TichuRoundLog[];
};

export type TichuRoundLog = {
    round: number;
    team_a_score: number;
    team_b_score: number;
    team_a_total: number;
    team_b_total: number;
    grand_tichu_player_key?: TichuPlayerPosition | null;
    tichu_player_key?: TichuPlayerPosition | null;
    success_player_keys?: TichuPlayerPosition[];
    created_at?: string;
};