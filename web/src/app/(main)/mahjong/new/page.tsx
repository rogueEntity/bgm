// web/src/app/(main)/mahjong/new/page.tsx
import { MAHJONG_GAME_KEY } from "@/features/games/mahjong/constants";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";

import NewGameForm from "./NewGameForm";

export default function NewGamePage() {
  assertGameEnabled(MAHJONG_GAME_KEY);

  return <NewGameForm />;
}