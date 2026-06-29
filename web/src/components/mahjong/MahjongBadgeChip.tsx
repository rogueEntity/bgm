// web/src/components/mahjong/MahjongBadgeChip.tsx

import type {
  BadgeDisplayType,
  BadgeRarity,
} from "@/constants/mahjong-achievements";

type MahjongBadgeChipProps = {
  display: string;
  name?: string;
  displayType: BadgeDisplayType;
  rarity: BadgeRarity;
  size?: "sm" | "md";
  muted?: boolean;
  className?: string;
};

const RARITY_CLASS_MAP: Record<BadgeRarity, string> = {
  COMMON: "border-foreground/15 bg-foreground/[0.04] text-foreground/75",
  RARE: "border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-300",
  EPIC: "border-violet-400/40 bg-violet-400/10 text-violet-700 dark:text-violet-300",
  LEGENDARY:
    "border-amber-400/60 bg-amber-400/15 text-amber-700 dark:text-amber-300",
  SPECIAL: "border-rose-400/50 bg-rose-400/10 text-rose-700 dark:text-rose-300",
};

const SIZE_CLASS_MAP: Record<NonNullable<MahjongBadgeChipProps["size"]>, string> =
  {
    sm: "h-6 min-w-6 px-1.5 text-[10px]",
    md: "h-7 min-w-7 px-2 text-xs",
  };

export default function MahjongBadgeChip({
  display,
  name,
  displayType,
  rarity,
  size = "md",
  muted = false,
  className = "",
}: MahjongBadgeChipProps) {
  return (
    <span
      title={name}
      aria-label={name ?? display}
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-md border font-semibold leading-none shadow-sm",
        "transition-colors",
        SIZE_CLASS_MAP[size],
        RARITY_CLASS_MAP[rarity],
        displayType === "EMOJI" ? "font-normal" : "tracking-tight",
        muted ? "grayscale opacity-40" : "",
        className,
      ].join(" ")}
    >
      {display}
    </span>
  );
}