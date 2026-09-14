import type { GameModule } from "../shared/types";
import {
  YACHT_GAME_KEY,
  YACHT_GAME_NAME,
  YACHT_GAME_NAME_EN,
  YACHT_MAX_PLAYERS,
  YACHT_MIN_PLAYERS,
} from "./constants";

export const yachtModule = {
  key: YACHT_GAME_KEY,
  name: YACHT_GAME_NAME,
  nameEn: YACHT_GAME_NAME_EN,
  shortName: "야찌",
  description: "야찌 점수표와 게임 결과를 기록합니다.",
  icon: "🎲",
  minPlayers: YACHT_MIN_PLAYERS,
  maxPlayers: YACHT_MAX_PLAYERS,
  routes: {
    dashboard: "/yacht",
    newMatch: "/yacht/new",
    matches: "/yacht/matches",
    ranking: "/yacht/ranking",
  },
} satisfies GameModule;
