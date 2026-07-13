// web/src/components/tichu/TichuNicknameWithBadges.tsx

import type { TichuEquippedBadgeItem } from "@/app/actions/tichu-achievement.action";

type TichuNicknameWithBadgesProps = {
    nickname: string;
    badges?: TichuEquippedBadgeItem[];
    className?: string;
};

export default function TichuNicknameWithBadges({
                                                    nickname,
                                                    badges = [],
                                                    className = "",
                                                }: Readonly<TichuNicknameWithBadgesProps>) {
    return (
        <span className={`inline-flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="truncate">{nickname}</span>

            {badges.length > 0 && (
                <span className="flex flex-wrap gap-1">
          {badges.map((badge) => (
              <span
                  key={`${badge.id}-${badge.slot}`}
                  title={`${badge.name} - ${badge.description}`}
                  className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-foreground/10 bg-foreground/5 px-1.5 py-0.5 text-[10px] font-black leading-none text-foreground/75"
              >
              <span className="shrink-0">{badge.display}</span>
              <span className="truncate">{badge.name}</span>
            </span>
          ))}
        </span>
            )}
    </span>
    );
}