import { assertGameEnabled } from "@/features/games/shared/enabled-games";
import { YACHT_GAME_KEY } from "@/features/games/yacht/constants";

import NewYachtGameForm from "./NewYachtGameForm";

export default function NewYachtGamePage() {
  assertGameEnabled(YACHT_GAME_KEY);
  return <NewYachtGameForm />;
}
