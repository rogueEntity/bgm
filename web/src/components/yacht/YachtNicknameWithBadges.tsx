// web/src/components/yacht/YachtNicknameWithBadges.tsx

import type { YachtEquippedBadgeItem } from "@/app/actions/yacht-achievement.action";

type YachtNicknameWithBadgesProps = {
    nickname: string;
    badges: YachtEquippedBadgeItem[];
    badgeSize?: "sm" | "md";
    className?: string;
    nameClassName?: string;
};

const BADGE_SIZE_CLASS = {
    sm: "min-h-5 min-w-5 px-1.5 text-xs",
    md: "min-h-6 min-w-6 px-1.5 text-sm",
} as const;

export default function YachtNicknameWithBadges({
                                                    nickname,
                                                    badges,
                                                    badgeSize = "md",
                                                    className = "",
                                                    nameClassName = "",
                                                }: Readonly<YachtNicknameWithBadgesProps>) {
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