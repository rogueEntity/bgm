// web/src/components/mahjong/hand/MahjongMeldInput.tsx

"use client";

import { useMemo, useState } from "react";

import MahjongTile from "./MahjongTile";
import MahjongTilePalette from "./MahjongTilePalette";

import {
    areSameTile,
    getTileNumber,
    getTileSuit,
    isHonorTile,
    normalizeRedFive,
    sortMahjongTiles,
} from "@/features/games/mahjong/lib/hand/tile-utils";
import type {
    MahjongMeldSnapshot,
    MahjongMeldType,
    MahjongTileCode,
} from "@/features/games/mahjong/lib/hand/types";

type MahjongMeldInputProps = {
    melds: MahjongMeldSnapshot[];
    otherUsedTiles: MahjongTileCode[];
    disabled?: boolean;
    maxMeldCount?: number;
    onChange: (melds: MahjongMeldSnapshot[]) => void;
};

const MELD_TYPES: Array<{
    value: MahjongMeldType;
    label: string;
    description: string;
    tileCount: number;
}> = [
    {
        value: "CHI",
        label: "치",
        description: "같은 종류의 연속된 수패 3장",
        tileCount: 3,
    },
    {
        value: "PON",
        label: "퐁",
        description: "같은 패 3장",
        tileCount: 3,
    },
    {
        value: "MINKAN",
        label: "명깡",
        description: "다른 작사의 패를 포함한 같은 패 4장",
        tileCount: 4,
    },
    {
        value: "ANKAN",
        label: "암깡",
        description: "손패 안의 같은 패 4장",
        tileCount: 4,
    },
];

function isValidChi(tiles: MahjongTileCode[]) {
    if (tiles.length !== 3) {
        return false;
    }

    const normalizedTiles = tiles
        .map(normalizeRedFive)
        .sort((a, b) => getTileNumber(a) - getTileNumber(b));

    if (normalizedTiles.some(isHonorTile)) {
        return false;
    }

    const suits = normalizedTiles.map(getTileSuit);

    if (!suits.every((suit) => suit === suits[0])) {
        return false;
    }

    const numbers = normalizedTiles.map(getTileNumber);

    return (
        numbers[1] === numbers[0] + 1 &&
        numbers[2] === numbers[1] + 1
    );
}

function isValidSameTileMeld({
                                 tiles,
                                 count,
                             }: {
    tiles: MahjongTileCode[];
    count: number;
}) {
    if (tiles.length !== count) {
        return false;
    }

    return tiles.every((tile) =>
        areSameTile(tile, tiles[0]),
    );
}

function validateDraftMeld({
                               type,
                               tiles,
                           }: {
    type: MahjongMeldType;
    tiles: MahjongTileCode[];
}) {
    if (type === "CHI") {
        return isValidChi(tiles);
    }

    if (type === "PON") {
        return isValidSameTileMeld({
            tiles,
            count: 3,
        });
    }

    return isValidSameTileMeld({
        tiles,
        count: 4,
    });
}

export default function MahjongMeldInput({
                                             melds,
                                             otherUsedTiles,
                                             disabled = false,
                                             maxMeldCount = 4,
                                             onChange,
                                         }: Readonly<MahjongMeldInputProps>) {
    const [isAdding, setIsAdding] = useState(false);
    const [draftType, setDraftType] =
        useState<MahjongMeldType>("CHI");
    const [draftTiles, setDraftTiles] = useState<
        MahjongTileCode[]
    >([]);
    const [draftCalledTileIndex, setDraftCalledTileIndex] =
        useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    const selectedType =
        MELD_TYPES.find((item) => item.value === draftType) ??
        MELD_TYPES[0];

    const meldUsedTiles = useMemo(
        () => melds.flatMap((meld) => meld.tiles),
        [melds],
    );

    const allUsedTiles = [
        ...otherUsedTiles,
        ...meldUsedTiles,
        ...draftTiles,
    ];

    const resetDraft = () => {
        setDraftType("CHI");
        setDraftTiles([]);
        setDraftCalledTileIndex(null);
        setErrorMessage("");
    };

    const closeDraft = () => {
        resetDraft();
        setIsAdding(false);
    };

    const changeDraftType = (type: MahjongMeldType) => {
        setDraftType(type);
        setDraftTiles([]);
        setDraftCalledTileIndex(null);
        setErrorMessage("");
    };

    const addDraftTile = (tile: MahjongTileCode) => {
        if (draftTiles.length >= selectedType.tileCount) {
            return;
        }

        setDraftTiles((previous) => [...previous, tile]);
        setErrorMessage("");
    };

    const removeDraftTile = (index: number) => {
        setDraftTiles((previous) =>
            previous.filter((_, tileIndex) => tileIndex !== index),
        );

        setDraftCalledTileIndex((previous) => {
            if (previous === null) {
                return null;
            }

            if (previous === index) {
                return null;
            }

            if (previous > index) {
                return previous - 1;
            }

            return previous;
        });

        setErrorMessage("");
    };

    const saveDraft = () => {
        if (
            draftTiles.length !== selectedType.tileCount
        ) {
            setErrorMessage(
                `${selectedType.label}은 패 ${selectedType.tileCount}장을 입력해야 합니다.`,
            );
            return;
        }

        if (
            draftType !== "ANKAN" &&
            draftCalledTileIndex === null
        ) {
            setErrorMessage(
                "다른 작사에게서 가져온 패를 선택해주세요.",
            );
            return;
        }

        if (
            !validateDraftMeld({
                type: draftType,
                tiles: draftTiles,
            })
        ) {
            if (draftType === "CHI") {
                setErrorMessage(
                    "치는 같은 종류의 연속된 수패 3장이어야 합니다.",
                );
            } else {
                setErrorMessage(
                    `${selectedType.label}은 같은 패 ${selectedType.tileCount}장이어야 합니다.`,
                );
            }

            return;
        }

        const sortedTiles =
            draftType === "CHI"
                ? sortMahjongTiles(draftTiles)
                : [...draftTiles];

        let calledTile: MahjongTileCode | null = null;

        if (
            draftType !== "ANKAN" &&
            draftCalledTileIndex !== null
        ) {
            calledTile = draftTiles[draftCalledTileIndex] ?? null;
        }

        onChange([
            ...melds,
            {
                type: draftType,
                tiles: sortedTiles,
                called_tile: calledTile,
                from_player_key: null,
            },
        ]);

        closeDraft();
    };

    const removeMeld = (index: number) => {
        onChange(
            melds.filter((_, meldIndex) => meldIndex !== index),
        );
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h4 className="text-sm font-bold">부로·깡</h4>
                    <p className="mt-0.5 text-[11px] text-foreground/50">
                        {melds.length}/{maxMeldCount}개
                    </p>
                </div>

                {!isAdding && melds.length < maxMeldCount && (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setIsAdding(true)}
                        className="
              rounded-lg border border-foreground/10
              bg-foreground/5 px-3 py-2
              text-xs font-bold
              transition-colors
              hover:bg-foreground/10
              disabled:cursor-not-allowed disabled:opacity-40
            "
                    >
                        + 부로 추가
                    </button>
                )}
            </div>

            {melds.length > 0 && (
                <div className="flex flex-wrap gap-4">
                    {melds.map((meld, meldIndex) => {
                        const calledTileIndex =
                            meld.called_tile == null
                                ? null
                                : meld.tiles.findIndex((tile) =>
                                    areSameTile(tile, meld.called_tile!),
                                );

                        return (
                            <div
                                key={`${meld.type}-${meldIndex}`}
                                className="
                  rounded-xl border border-foreground/10
                  bg-foreground/[0.03] p-3
                "
                            >
                                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className="text-xs font-bold">
                    {
                        MELD_TYPES.find(
                            (item) => item.value === meld.type,
                        )?.label
                    }
                  </span>

                                    <button
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => removeMeld(meldIndex)}
                                        className="text-[11px] font-bold text-red-500 disabled:opacity-40"
                                    >
                                        삭제
                                    </button>
                                </div>

                                <div className="flex items-end gap-1">
                                    {meld.tiles.map((tile, tileIndex) => (
                                        <MahjongTile
                                            key={`${tile}-${tileIndex}`}
                                            tile={tile}
                                            size="sm"
                                            sideways={
                                                meld.type !== "ANKAN" &&
                                                tileIndex === calledTileIndex
                                            }
                                            hidden={
                                                meld.type === "ANKAN" &&
                                                (tileIndex === 0 ||
                                                    tileIndex === meld.tiles.length - 1)
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isAdding && (
                <div className="space-y-4 rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
                    <div className="grid grid-cols-4 gap-2">
                        {MELD_TYPES.map((type) => {
                            const active = draftType === type.value;

                            return (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => changeDraftType(type.value)}
                                    className={`
                    rounded-xl border px-2 py-2.5
                    text-xs font-bold transition-colors
                    ${
                                        active
                                            ? "border-blue-600 bg-blue-600 text-white"
                                            : "border-foreground/10 bg-background"
                                    }
                  `}
                                >
                                    {type.label}
                                </button>
                            );
                        })}
                    </div>

                    <p className="text-xs text-foreground/55">
                        {selectedType.description}
                    </p>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
              <span className="text-xs font-bold">
                선택한 패
              </span>

                            <span className="text-[11px] text-foreground/50">
                {draftTiles.length}/{selectedType.tileCount}장
              </span>
                        </div>

                        {draftTiles.length === 0 ? (
                            <div className="flex min-h-14 items-center justify-center rounded-xl border border-dashed border-foreground/15 text-xs text-foreground/40">
                                아래에서 패를 선택해주세요.
                            </div>
                        ) : (
                            <div className="flex min-h-14 flex-wrap items-center gap-2 rounded-xl border border-foreground/10 bg-background p-2">
                                {draftTiles.map((tile, tileIndex) => {
                                    const isCalled =
                                        draftCalledTileIndex === tileIndex;

                                    return (
                                        <div
                                            key={`${tile}-${tileIndex}`}
                                            className="space-y-1 text-center"
                                        >
                                            <MahjongTile
                                                tile={tile}
                                                size="md"
                                                selected={isCalled}
                                                removable
                                                onRemove={() =>
                                                    removeDraftTile(tileIndex)
                                                }
                                            />

                                            {draftType !== "ANKAN" && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDraftCalledTileIndex(tileIndex)
                                                    }
                                                    className={`
                            rounded-full px-2 py-0.5
                            text-[9px] font-bold
                            ${
                                                        isCalled
                                                            ? "bg-blue-600 text-white"
                                                            : "bg-foreground/5 text-foreground/50"
                                                    }
                          `}
                                                >
                                                    가져온 패
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <MahjongTilePalette
                        valueTiles={draftTiles}
                        allUsedTiles={allUsedTiles}
                        disabled={
                            disabled ||
                            draftTiles.length >= selectedType.tileCount
                        }
                        onSelect={addDraftTile}
                    />

                    {errorMessage && (
                        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400">
                            {errorMessage}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={closeDraft}
                            className="rounded-xl border border-foreground/10 py-2.5 text-sm font-bold"
                        >
                            취소
                        </button>

                        <button
                            type="button"
                            onClick={saveDraft}
                            className="rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white"
                        >
                            부로 추가
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}