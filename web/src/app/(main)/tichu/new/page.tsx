// web/src/app/(main)/tichu/new/page.tsx

import { TICHU_GAME_KEY } from "@/features/games/tichu/constants";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";

import NewTichuGameForm from "./NewTichuGameForm";

export default function NewTichuGamePage() {
    assertGameEnabled(TICHU_GAME_KEY);

    return <NewTichuGameForm />;
}