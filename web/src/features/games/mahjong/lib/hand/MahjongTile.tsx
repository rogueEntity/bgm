// web/src/features/games/mahjong/lib/hand/MahjongTile.tsx

"use client";

import type { ButtonHTMLAttributes } from "react";

import { MAHJONG_TILE_LABELS } from "@/features/games/mahjong/lib/hand/tiles";
import {
    getTileNumber,
    getTileSuit,
    isRedDoraTile,
} from "@/features/games/mahjong/lib/hand/tile-utils";
import type { MahjongTileCode } from "@/features/games/mahjong/lib/hand/types";

type MahjongTileSize = "sm" | "md" | "lg";

type MahjongTileProps = {
    tile: MahjongTileCode;
    size?: MahjongTileSize;
    selected?: boolean;
    disabled?: boolean;
    sideways?: boolean;
    hidden?: boolean;
    removable?: boolean;
    showLabel?: boolean;
    onClick?: () => void;
    onRemove?: () => void;
    className?: string;
};

const SIZE_CLASS_MAP: Record<MahjongTileSize, string> = {
    sm: "h-10 w-7 rounded-md text-base",
    md: "h-12 w-8 rounded-md text-lg",
    lg: "h-14 w-10 rounded-lg text-xl",
};

function getTileDisplay(tile: MahjongTileCode) {
    const suit = getTileSuit(tile);
    const number = getTileNumber(tile);

    if (suit === "z") {
        const honorMap: Partial<Record<MahjongTileCode, string>> = {
            "1z": "東",
            "2z": "南",
            "3z": "西",
            "4z": "北",
            "5z": "白",
            "6z": "發",
            "7z": "中",
        };

        return {
            main: honorMap[tile] ?? "",
            sub: "",
        };
    }

    const suitLabel = {
        m: "萬",
        p: "筒",
        s: "索",
    }[suit];

    return {
        main: String(number),
        sub: suitLabel,
    };
}

function getTileTextClass(tile: MahjongTileCode) {
    if (isRedDoraTile(tile)) {
        return "text-red-600 dark:text-red-400";
    }

    if (tile === "5z") {
        return "text-foreground";
    }

    if (tile === "6z") {
        return "text-emerald-700 dark:text-emerald-400";
    }

    if (tile === "7z") {
        return "text-red-600 dark:text-red-400";
    }

    const suit = getTileSuit(tile);

    if (suit === "m") {
        return "text-red-700 dark:text-red-400";
    }

    if (suit === "p") {
        return "text-blue-700 dark:text-blue-400";
    }

    if (suit === "s") {
        return "text-emerald-700 dark:text-emerald-400";
    }

    return "text-foreground";
}

export default function MahjongTile({
                                        tile,
                                        size = "md",
                                        selected = false,
                                        disabled = false,
                                        sideways = false,
                                        hidden = false,
                                        removable = false,
                                        showLabel = false,
                                        onClick,
                                        onRemove,
                                        className = "",
                                    }: Readonly<MahjongTileProps>) {
    const display = getTileDisplay(tile);
    const label = MAHJONG_TILE_LABELS[tile];

    const content = hidden ? (
        <div
            aria-label="뒤집힌 패"
            className={`
        ${SIZE_CLASS_MAP[size]}
        border border-emerald-900/40
        bg-emerald-700
        shadow-sm
      `}
        >
            <div className="m-1 h-[calc(100%-0.5rem)] rounded-sm border border-white/20" />
        </div>
    ) : (
        <div
            className={`
        relative flex shrink-0 flex-col items-center justify-center
        border bg-[#fffdf4] shadow-sm
        dark:bg-[#f8f4e8]
        ${SIZE_CLASS_MAP[size]}
        ${
                selected
                    ? "border-blue-500 ring-2 ring-blue-500/30"
                    : "border-black/15"
            }
        ${disabled ? "opacity-35" : ""}
        ${sideways ? "rotate-90 mx-2" : ""}
        ${className}
      `}
        >
      <span
          className={`
          leading-none font-black
          ${getTileTextClass(tile)}
        `}
      >
        {display.main}
      </span>

            {display.sub && (
                <span
                    className={`
            mt-0.5 text-[9px] leading-none font-bold
            ${getTileTextClass(tile)}
          `}
                >
          {display.sub}
        </span>
            )}

            {isRedDoraTile(tile) && (
                <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            )}

            {removable && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black leading-none text-white shadow">
          ×
        </span>
            )}
        </div>
    );

    if (!onClick && !onRemove) {
        return (
            <div
                title={showLabel ? label : undefined}
                aria-label={label}
                className="shrink-0"
            >
                {content}
            </div>
        );
    }

    const handleClick: ButtonHTMLAttributes<HTMLButtonElement>["onClick"] = (
        event,
    ) => {
        event.preventDefault();

        if (disabled) {
            return;
        }

        if (onRemove) {
            onRemove();
            return;
        }

        onClick?.();
    };

    return (
        <button
            type="button"
            title={showLabel ? label : undefined}
            aria-label={
                removable
                    ? `${label} 제거`
                    : selected
                        ? `${label} 선택됨`
                        : `${label} 선택`
            }
            disabled={disabled}
            onClick={handleClick}
            className={`
        shrink-0 rounded-lg
        transition-transform
        enabled:hover:-translate-y-0.5
        enabled:active:translate-y-0
        disabled:cursor-not-allowed
        ${sideways ? "my-2" : ""}
      `}
        >
            {content}
        </button>
    );
}