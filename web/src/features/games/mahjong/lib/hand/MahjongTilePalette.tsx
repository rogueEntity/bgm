// web/src/components/mahjong/hand/MahjongTilePalette.tsx

"use client";

import MahjongTile from "./MahjongTile";

import {
    HONOR_TILES,
    MANZU_TILES,
    PINZU_TILES,
    SOUZU_TILES,
} from "@/features/games/mahjong/lib/hand/tiles";
import {
    countNormalizedTiles,
    normalizeRedFive,
} from "@/features/games/mahjong/lib/hand/tile-utils";
import type { MahjongTileCode } from "@/features/games/mahjong/lib/hand/types";

type MahjongTilePaletteProps = {
    valueTiles: MahjongTileCode[];
    allUsedTiles?: MahjongTileCode[];
    disabled?: boolean;
    allowRedFive?: boolean;
    onSelect: (tile: MahjongTileCode) => void;
};

type TileGroup = {
    label: string;
    tiles: MahjongTileCode[];
};

const TILE_GROUPS: TileGroup[] = [
    {
        label: "만수",
        tiles: MANZU_TILES,
    },
    {
        label: "통수",
        tiles: PINZU_TILES,
    },
    {
        label: "삭수",
        tiles: SOUZU_TILES,
    },
    {
        label: "자패",
        tiles: HONOR_TILES,
    },
];

export default function MahjongTilePalette({
                                               valueTiles,
                                               allUsedTiles = valueTiles,
                                               disabled = false,
                                               allowRedFive = true,
                                               onSelect,
                                           }: Readonly<MahjongTilePaletteProps>) {
    const usedTileCounts = countNormalizedTiles(allUsedTiles);

    const canSelectTile = (tile: MahjongTileCode) => {
        if (disabled) {
            return false;
        }

        if (!allowRedFive && tile.startsWith("0")) {
            return false;
        }

        const normalizedTile = normalizeRedFive(tile);
        const currentCount = usedTileCounts.get(normalizedTile) ?? 0;

        if (currentCount >= 4) {
            return false;
        }

        /**
         * 적도라는 각 색상마다 1장만 허용한다.
         */
        if (
            tile.startsWith("0") &&
            allUsedTiles.includes(tile)
        ) {
            return false;
        }

        return true;
    };

    return (
        <div className="space-y-4">
            {TILE_GROUPS.map((group) => (
                <section key={group.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-foreground/60">
                            {group.label}
                        </h4>

                        {group.label !== "자패" && allowRedFive && (
                            <span className="text-[10px] font-medium text-red-500">
                적5 포함
              </span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {group.tiles.map((tile) => {
                            const selectable = canSelectTile(tile);

                            return (
                                <MahjongTile
                                    key={tile}
                                    tile={tile}
                                    size="md"
                                    disabled={!selectable}
                                    showLabel
                                    onClick={() => {
                                        if (!selectable) {
                                            return;
                                        }

                                        onSelect(tile);
                                    }}
                                />
                            );
                        })}
                    </div>
                </section>
            ))}

            <p className="text-[11px] leading-relaxed text-foreground/45">
                같은 패는 적도라를 포함해 최대 4장까지 입력할 수
                있습니다.
            </p>
        </div>
    );
}