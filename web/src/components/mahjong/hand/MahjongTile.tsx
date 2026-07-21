// web/src/components/mahjong/hand/MahjongTile.tsx

"use client";

import type {
    ButtonHTMLAttributes,
    CSSProperties,
} from "react";
import { useState } from "react";

import { MAHJONG_TILE_LABELS } from "@/features/games/mahjong/lib/hand/tiles";
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

const SIZE_CLASS_MAP: Record<
    MahjongTileSize,
    string
> = {
    sm: "h-10 w-7",
    md: "h-12 w-8",
    lg: "h-14 w-10",
};

const TILE_IMAGE_SRC_MAP: Record<
    MahjongTileCode,
    string
> = {
    "1m": "/mahjong/tiles/m1.svg",
    "2m": "/mahjong/tiles/m2.svg",
    "3m": "/mahjong/tiles/m3.svg",
    "4m": "/mahjong/tiles/m4.svg",
    "5m": "/mahjong/tiles/m5.svg",
    "0m": "/mahjong/tiles/red_m5.svg",
    "6m": "/mahjong/tiles/m6.svg",
    "7m": "/mahjong/tiles/m7.svg",
    "8m": "/mahjong/tiles/m8.svg",
    "9m": "/mahjong/tiles/m9.svg",

    "1p": "/mahjong/tiles/p1.svg",
    "2p": "/mahjong/tiles/p2.svg",
    "3p": "/mahjong/tiles/p3.svg",
    "4p": "/mahjong/tiles/p4.svg",
    "5p": "/mahjong/tiles/p5.svg",
    "0p": "/mahjong/tiles/red_p5.svg",
    "6p": "/mahjong/tiles/p6.svg",
    "7p": "/mahjong/tiles/p7.svg",
    "8p": "/mahjong/tiles/p8.svg",
    "9p": "/mahjong/tiles/p9.svg",

    "1s": "/mahjong/tiles/s1.svg",
    "2s": "/mahjong/tiles/s2.svg",
    "3s": "/mahjong/tiles/s3.svg",
    "4s": "/mahjong/tiles/s4.svg",
    "5s": "/mahjong/tiles/s5.svg",
    "0s": "/mahjong/tiles/red_s5.svg",
    "6s": "/mahjong/tiles/s6.svg",
    "7s": "/mahjong/tiles/s7.svg",
    "8s": "/mahjong/tiles/s8.svg",
    "9s": "/mahjong/tiles/s9.svg",

    "1z": "/mahjong/tiles/ton.svg",
    "2z": "/mahjong/tiles/nan.svg",
    "3z": "/mahjong/tiles/shaa.svg",
    "4z": "/mahjong/tiles/pei.svg",
    "5z": "/mahjong/tiles/haku.svg",
    "6z": "/mahjong/tiles/hatsu.svg",
    "7z": "/mahjong/tiles/chun.svg",
};

const TILE_BACK_SRC =
    "/mahjong/tiles/back.svg";

function getImageStyle({
                           sideways,
                       }: {
    sideways: boolean;
}): CSSProperties {
    if (!sideways) {
        return {};
    }

    return {
        transform: "rotate(90deg)",
    };
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
    const [hasImageError, setHasImageError] =
        useState(false);

    const label =
        MAHJONG_TILE_LABELS[tile];

    const imageSrc = hidden
        ? TILE_BACK_SRC
        : TILE_IMAGE_SRC_MAP[tile];

    const isInteractive =
        Boolean(onClick || onRemove);

    const imageContainerClassName = `
    relative shrink-0
    ${SIZE_CLASS_MAP[size]}
    ${sideways ? "mx-2" : ""}
    ${className}
  `;

    const imageClassName = `
    block h-full w-full
    select-none object-contain
    transition-all
    ${
        selected
            ? "drop-shadow-[0_0_5px_rgba(37,99,235,0.7)]"
            : "drop-shadow-sm"
    }
    ${disabled ? "opacity-35" : ""}
  `;

    const image = hasImageError ? (
        <div
            className={`
        flex h-full w-full items-center justify-center
        rounded-md border border-foreground/15
        bg-[#fffdf4]
        text-xs font-black text-foreground
      `}
        >
            {tile}
        </div>
    ) : (
        // SVG 타일 자산은 public 경로에서 직접 사용한다.
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={imageSrc}
            alt={hidden ? "뒤집힌 패" : label}
            draggable={false}
            className={imageClassName}
            style={getImageStyle({
                sideways,
            })}
            onError={() =>
                setHasImageError(true)
            }
        />
    );

    const content = (
        <div className={imageContainerClassName}>
            {image}

            {selected && (
                <span
                    aria-hidden="true"
                    className="
            pointer-events-none absolute inset-0
            rounded-md ring-2 ring-blue-500
            ring-offset-1 ring-offset-background
          "
                />
            )}

            {removable && (
                <span
                    aria-hidden="true"
                    className="
            absolute -right-1.5 -top-1.5
            z-10 flex h-4 w-4
            items-center justify-center
            rounded-full bg-red-500
            text-[10px] font-black
            leading-none text-white shadow
          "
                >
          ×
        </span>
            )}
        </div>
    );

    if (!isInteractive) {
        return (
            <div
                title={
                    showLabel
                        ? label
                        : undefined
                }
                aria-label={
                    hidden
                        ? "뒤집힌 패"
                        : label
                }
                className="shrink-0"
            >
                {content}
            </div>
        );
    }

    const handleClick: ButtonHTMLAttributes<HTMLButtonElement>["onClick"] =
        (event) => {
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
            title={
                showLabel
                    ? label
                    : undefined
            }
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