// web/src/components/mahjong/NicknameWithBadges.tsx

import MahjongBadgeChip from "@/components/mahjong/MahjongBadgeChip";
import type { MahjongEquippedBadgeItem } from "@/app/actions/mahjong-achievement.action";

type NicknameWithBadgesProps = {
  nickname: string;
  badges?: MahjongEquippedBadgeItem[];
  badgeLimit?: number;
  badgeSize?: "sm" | "md";
  className?: string;
  nameClassName?: string;
};

export default function NicknameWithBadges({
  nickname,
  badges = [],
  badgeLimit = 3,
  badgeSize = "sm",
  className = "",
  nameClassName = "",
}: NicknameWithBadgesProps) {
  const visibleBadges = badges
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .slice(0, badgeLimit);

  return (
    <span
      className={[
        "inline-flex min-w-0 items-center gap-1.5 align-middle",
        className,
      ].join(" ")}
    >
      <span className={["min-w-0 truncate", nameClassName].join(" ")}>
        {nickname}
      </span>

      {visibleBadges.length > 0 ? (
        <span className="inline-flex shrink-0 items-center gap-1">
          {visibleBadges.map((badge) => (
            <MahjongBadgeChip
              key={`${badge.id}-${badge.slot}`}
              display={badge.display}
              name={badge.name}
              displayType={badge.displayType}
              rarity={badge.rarity}
              size={badgeSize}
            />
          ))}
        </span>
      ) : null}
    </span>
  );
}