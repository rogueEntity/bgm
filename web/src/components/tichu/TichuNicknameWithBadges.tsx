// web/src/components/tichu/TichuNicknameWithBadges.tsx

import type { TichuEquippedBadgeItem } from "@/app/actions/tichu-achievement.action";

type TichuNicknameWithBadgesProps = {
    nickname: string;
    badges: TichuEquippedBadgeItem[];
    badgeSize?: "sm" | "md";
    className?: string;
    nameClassName?: string;
};

const BADGE_SIZE_CLASS = {
    sm: "h-5 w-5 text-xs",
    md: "h-6 w-6 text-sm",
} as const;

export default function TichuNicknameWithBadges({
                                                    nickname,
                                                    badges,
                                                    badgeSize = "md",
                                                    className = "",
                                                    nameClassName = "",
                                                }: Readonly<TichuNicknameWithBadgesProps>) {
    return (
        <div
            className={`flex min-w-0 items-center gap-1.5 ${className}`}
        >
            <span
                className={`min-w-0 ${nameClassName}`}
                title={nickname}
            >
                {nickname}
            </span>

            {badges.length > 0 ? (
                <span className="flex shrink-0 items-center gap-1">
                    {badges.map((badge) => (
                        <span
                            key={badge.id}
                            title={badge.name}
                            className={`flex shrink-0 items-center justify-center rounded-full bg-foreground/10 ${BADGE_SIZE_CLASS[badgeSize]}`}
                        >
                            {badge.display}
                        </span>
                    ))}
                </span>
            ) : null}
        </div>
    );
}