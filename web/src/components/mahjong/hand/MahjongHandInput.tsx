// web/src/components/mahjong/hand/MahjongHandInput.tsx

"use client";

import { useMemo, useState } from "react";

import MahjongMeldInput from "./MahjongMeldInput";
import MahjongTile from "./MahjongTile";
import MahjongTilePalette from "./MahjongTilePalette";

import {
    countNormalizedTiles,
    normalizeRedFive,
    sortMahjongTiles,
} from "@/features/games/mahjong/lib/hand/tile-utils";
import type {
    MahjongHandDraft,
    MahjongTileCode,
} from "@/features/games/mahjong/lib/hand/types";

type HandInputTarget =
    | "CONCEALED"
    | "WINNING"
    | "DORA"
    | "URA_DORA";

type MahjongHandInputProps = {
    value: MahjongHandDraft;
    disabled?: boolean;
    showUraDora?: boolean;
    onChange: (value: MahjongHandDraft) => void;
};

const TARGET_LABELS: Record<HandInputTarget, string> = {
    CONCEALED: "손패",
    WINNING: "화료패",
    DORA: "도라 표시패",
    URA_DORA: "뒷도라 표시패",
};

function getExpectedConcealedTileCount(meldCount: number) {
    return 13 - meldCount * 3;
}

export default function MahjongHandInput({
                                             value,
                                             disabled = false,
                                             showUraDora = false,
                                             onChange,
                                         }: Readonly<MahjongHandInputProps>) {
    const [target, setTarget] =
        useState<HandInputTarget>("CONCEALED");
    const [errorMessage, setErrorMessage] = useState("");

    const expectedConcealedTileCount =
        getExpectedConcealedTileCount(value.melds.length);

    const physicalTiles = useMemo(
        () => [
            ...value.concealed_tiles,

            ...(value.winning_tile
                ? [value.winning_tile]
                : []),

            ...value.melds.flatMap((meld) => meld.tiles),
        ],
        [
            value.concealed_tiles,
            value.winning_tile,
            value.melds,
        ],
    );

    /**
     * winning_tile은 타입상 필수지만 입력 도중에는 빈 값이 필요하다.
     * 연결 단계에서 별도 Draft 타입을 도입하기 전까지는
     * 화면 입력용으로 null 가능 상태를 외부에서 관리하지 않는다.
     *
     * 현재 컴포넌트는 전달받은 winning_tile을 항상 표시한다.
     */
    const allUsedTiles = useMemo(
        () => [
            ...physicalTiles,
            ...value.dora_indicators,
            ...value.ura_dora_indicators,
        ],
        [
            physicalTiles,
            value.dora_indicators,
            value.ura_dora_indicators,
        ],
    );

    const updateValue = (
        patch: Partial<MahjongHandDraft>,
    ) => {
        onChange({
            ...value,
            ...patch,
        });

        setErrorMessage("");
    };

    const canAddPhysicalTile = (tile: MahjongTileCode) => {
        const counts = countNormalizedTiles(physicalTiles);
        const normalizedTile = normalizeRedFive(tile);

        return (counts.get(normalizedTile) ?? 0) < 4;
    };

    const addTile = (tile: MahjongTileCode) => {
        if (disabled) {
            return;
        }

        if (
            (target === "CONCEALED" ||
                target === "WINNING") &&
            !canAddPhysicalTile(tile)
        ) {
            setErrorMessage(
                "같은 패는 적도라를 포함해 4장을 초과할 수 없습니다.",
            );
            return;
        }

        if (target === "CONCEALED") {
            if (
                value.concealed_tiles.length >=
                expectedConcealedTileCount
            ) {
                setErrorMessage(
                    `현재 부로 수 기준으로 손패는 ${expectedConcealedTileCount}장까지 입력할 수 있습니다.`,
                );
                return;
            }

            updateValue({
                concealed_tiles: sortMahjongTiles([
                    ...value.concealed_tiles,
                    tile,
                ]),
            });

            return;
        }

        if (target === "WINNING") {
            updateValue({
                winning_tile: tile,
            });

            return;
        }

        if (target === "DORA") {
            if (value.dora_indicators.length >= 5) {
                setErrorMessage(
                    "도라 표시패는 최대 5장까지 입력할 수 있습니다.",
                );
                return;
            }

            updateValue({
                dora_indicators: [
                    ...value.dora_indicators,
                    tile,
                ],
            });

            return;
        }

        if (value.ura_dora_indicators.length >= 5) {
            setErrorMessage(
                "뒷도라 표시패는 최대 5장까지 입력할 수 있습니다.",
            );
            return;
        }

        updateValue({
            ura_dora_indicators: [
                ...value.ura_dora_indicators,
                tile,
            ],
        });
    };

    const removeConcealedTile = (index: number) => {
        updateValue({
            concealed_tiles: value.concealed_tiles.filter(
                (_, tileIndex) => tileIndex !== index,
            ),
        });
    };

    const removeIndicator = ({
                                 type,
                                 index,
                             }: {
        type: "DORA" | "URA_DORA";
        index: number;
    }) => {
        if (type === "DORA") {
            updateValue({
                dora_indicators:
                    value.dora_indicators.filter(
                        (_, tileIndex) => tileIndex !== index,
                    ),
            });

            return;
        }

        updateValue({
            ura_dora_indicators:
                value.ura_dora_indicators.filter(
                    (_, tileIndex) => tileIndex !== index,
                ),
        });
    };

    const renderTargetButton = (
        targetValue: HandInputTarget,
        description: string,
    ) => {
        const active = target === targetValue;

        return (
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    setTarget(targetValue);
                    setErrorMessage("");
                }}
                className={`
          rounded-xl border px-3 py-2.5 text-left
          transition-colors
          ${
                    active
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-foreground/10 bg-background"
                }
          disabled:cursor-not-allowed disabled:opacity-40
        `}
            >
        <span className="block text-xs font-bold">
          {TARGET_LABELS[targetValue]}
        </span>

                <span
                    className={`
            mt-0.5 block text-[10px]
            ${
                        active
                            ? "text-white/70"
                            : "text-foreground/45"
                    }
          `}
                >
          {description}
        </span>
            </button>
        );
    };

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {renderTargetButton(
                    "CONCEALED",
                    `${value.concealed_tiles.length}/${expectedConcealedTileCount}장`,
                )}

                {renderTargetButton(
                    "WINNING",
                    "1장 선택",
                )}

                {renderTargetButton(
                    "DORA",
                    `${value.dora_indicators.length}/5장`,
                )}

                {showUraDora &&
                    renderTargetButton(
                        "URA_DORA",
                        `${value.ura_dora_indicators.length}/5장`,
                    )}
            </div>

            <section
                className={`
          space-y-3 rounded-2xl border p-4
          ${
                    target === "CONCEALED"
                        ? "border-blue-500/30 bg-blue-500/[0.03]"
                        : "border-foreground/10"
                }
        `}
            >
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold">손패</h4>

                    <span className="text-xs text-foreground/50">
            {value.concealed_tiles.length}/
                        {expectedConcealedTileCount}장
          </span>
                </div>

                {value.concealed_tiles.length === 0 ? (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setTarget("CONCEALED")}
                        className="
              flex min-h-16 w-full items-center justify-center
              rounded-xl border border-dashed border-foreground/15
              text-xs text-foreground/40
              disabled:cursor-not-allowed
            "
                    >
                        손패 영역을 선택하고 아래에서 패를 입력해주세요.
                    </button>
                ) : (
                    <div className="flex min-h-16 flex-wrap items-center gap-1.5 rounded-xl bg-background p-2">
                        {value.concealed_tiles.map((tile, index) => (
                            <MahjongTile
                                key={`${tile}-${index}`}
                                tile={tile}
                                size="md"
                                removable
                                onRemove={() =>
                                    removeConcealedTile(index)
                                }
                            />
                        ))}
                    </div>
                )}
            </section>

            <section
                className={`
          space-y-3 rounded-2xl border p-4
          ${
                    target === "WINNING"
                        ? "border-blue-500/30 bg-blue-500/[0.03]"
                        : "border-foreground/10"
                }
        `}
            >
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold">화료패</h4>

                    <span className="text-[11px] text-foreground/45">
            새 패를 선택하면 교체됩니다.
          </span>
                </div>

                <div className="flex min-h-16 items-center rounded-xl bg-background p-2">
                    <MahjongTile
                        tile={value.winning_tile}
                        size="lg"
                        selected={target === "WINNING"}
                        onClick={() => setTarget("WINNING")}
                    />
                </div>
            </section>

            <MahjongMeldInput
                melds={value.melds}
                otherUsedTiles={[
                    ...value.concealed_tiles,

                    ...(value.winning_tile
                        ? [value.winning_tile]
                        : []),
                ]}
                disabled={disabled}
                onChange={(melds) => {
                    const nextExpectedCount =
                        getExpectedConcealedTileCount(melds.length);

                    updateValue({
                        melds,
                        concealed_tiles:
                            value.concealed_tiles.length >
                            nextExpectedCount
                                ? value.concealed_tiles.slice(
                                    0,
                                    nextExpectedCount,
                                )
                                : value.concealed_tiles,
                    });
                }}
            />

            <section
                className={`
          space-y-3 rounded-2xl border p-4
          ${
                    target === "DORA"
                        ? "border-blue-500/30 bg-blue-500/[0.03]"
                        : "border-foreground/10"
                }
        `}
            >
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold">
                        도라 표시패
                    </h4>

                    <span className="text-xs text-foreground/50">
            {value.dora_indicators.length}/5장
          </span>
                </div>

                {value.dora_indicators.length === 0 ? (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setTarget("DORA")}
                        className="
              flex min-h-14 w-full items-center justify-center
              rounded-xl border border-dashed border-foreground/15
              text-xs text-foreground/40
            "
                    >
                        도라 자체가 아니라 표시패를 입력합니다.
                    </button>
                ) : (
                    <div className="flex min-h-14 flex-wrap items-center gap-1.5 rounded-xl bg-background p-2">
                        {value.dora_indicators.map(
                            (tile, index) => (
                                <MahjongTile
                                    key={`${tile}-${index}`}
                                    tile={tile}
                                    size="md"
                                    removable
                                    onRemove={() =>
                                        removeIndicator({
                                            type: "DORA",
                                            index,
                                        })
                                    }
                                />
                            ),
                        )}
                    </div>
                )}
            </section>

            {showUraDora && (
                <section
                    className={`
            space-y-3 rounded-2xl border p-4
            ${
                        target === "URA_DORA"
                            ? "border-blue-500/30 bg-blue-500/[0.03]"
                            : "border-foreground/10"
                    }
          `}
                >
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold">
                            뒷도라 표시패
                        </h4>

                        <span className="text-xs text-foreground/50">
              {value.ura_dora_indicators.length}/5장
            </span>
                    </div>

                    {value.ura_dora_indicators.length === 0 ? (
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => setTarget("URA_DORA")}
                            className="
                flex min-h-14 w-full items-center justify-center
                rounded-xl border border-dashed border-foreground/15
                text-xs text-foreground/40
              "
                        >
                            리치 화료인 경우에만 입력합니다.
                        </button>
                    ) : (
                        <div className="flex min-h-14 flex-wrap items-center gap-1.5 rounded-xl bg-background p-2">
                            {value.ura_dora_indicators.map(
                                (tile, index) => (
                                    <MahjongTile
                                        key={`${tile}-${index}`}
                                        tile={tile}
                                        size="md"
                                        removable
                                        onRemove={() =>
                                            removeIndicator({
                                                type: "URA_DORA",
                                                index,
                                            })
                                        }
                                    />
                                ),
                            )}
                        </div>
                    )}
                </section>
            )}

            <section className="space-y-3 rounded-2xl border border-foreground/10 p-4">
                <div>
                    <h4 className="text-sm font-bold">
                        {TARGET_LABELS[target]} 입력
                    </h4>

                    <p className="mt-1 text-[11px] text-foreground/50">
                        위에서 입력할 영역을 바꿀 수 있습니다.
                    </p>
                </div>

                <MahjongTilePalette
                    valueTiles={allUsedTiles}
                    allUsedTiles={
                        target === "DORA" ||
                        target === "URA_DORA"
                            ? []
                            : physicalTiles
                    }
                    disabled={
                        disabled ||
                        (target === "CONCEALED" &&
                            value.concealed_tiles.length >=
                            expectedConcealedTileCount)
                    }
                    onSelect={addTile}
                />
            </section>

            {errorMessage && (
                <p className="rounded-xl bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-600 dark:text-red-400">
                    {errorMessage}
                </p>
            )}
        </div>
    );
}