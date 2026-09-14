import type { MatchStatus } from "../shared/types";
import type { YachtCategory } from "./constants";

export type YachtSpecificStats = {
  best_score: number;
};

export type YachtUserGameSpecificStats = {
  schema_version: 1;
  yacht: YachtSpecificStats;
};

export type YachtPlayer = {
  name: string;
  seat_order: number;
  scores: Partial<Record<YachtCategory, number>>;
};

export type YachtMatchDetails = {
  schema_version: 1;
  game_key: "yacht";
  status: MatchStatus;
  current_round: number;
  players: Record<string, YachtPlayer>;
  finished_at: string | null;
};
