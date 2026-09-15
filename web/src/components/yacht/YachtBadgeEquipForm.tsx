// web/src/components/yacht/YachtBadgeEquipForm.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateMyYachtEquippedBadges } from "@/app/actions/yacht-achievement.action";
import type {
    YachtAchievementViewItem,
    YachtEquippedBadgeItem,
} from "@/app/actions/yacht-achievement.action";

const MAX_EQUIPPED_YACHT_BADGES = 3;

type YachtBadgeEquipFormProps = {
    achievements: YachtAchievementViewItem[];
    equippedBadges: YachtEquippedBadgeItem[];
};

export default function YachtBadgeEquipForm({
                                                achievements,
                                                equippedBadges,
                                            }: Readonly<YachtBadgeEquipFormProps>) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const initialEquippedBadgeIds = useMemo(
        () =>
            equippedBadges
                .slice()
                .sort((a, b) => a.slot - b.slot)
                .map((badge) => badge.id),
        [equippedBadges],
    );

    const [selectedBadgeIds, setSelectedBadgeIds] = useState<string[]>(
        initialEquippedBadgeIds,
    );

    const earnedBadges = useMemo(() => {
        const badgeMap = new Map<string, NonNullable<YachtAchievementViewItem["badge"]>>();

        for (const achievement of achievements) {
            if (!achievement.completed || !achievement.badge) {
                continue;
            }

            badgeMap.set(achievement.badge.id, achievement.badge);
        }

        return [...badgeMap.values()];
    }, [achievements]);

    const selectedBadgeIdSet = useMemo(
        () => new Set(selectedBadgeIds),
        [selectedBadgeIds],
    );

    function toggleBadge(badgeId: string) {
        setSelectedBadgeIds((prev) => {
            if (prev.includes(badgeId)) {
                return prev.filter((id) => id !== badgeId);
            }

            if (prev.length >= MAX_EQUIPPED_YACHT_BADGES) {
                return prev;
            }

            return [...prev, badgeId];
        });
    }

    function saveEquippedBadges() {
        startTransition(async () => {
            setError(null);
            try {
                await updateMyYachtEquippedBadges(selectedBadgeIds);
                router.refresh();
            } catch (error) {
                setError(error instanceof Error ? error.message : "배지 저장에 실패했습니다.");
            }
        });
    }

    if (earnedBadges.length === 0) {
        return (
            <section className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-5">
                <div>
                    <h2 className="text-lg font-black">장착 배지</h2>
                    <p className="mt-2 text-sm text-foreground/60">
                        아직 획득한 야찌 배지가 없습니다. 야찌 게임을 완료하면 배지를 얻을 수 있어요.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-lg font-black">장착 배지</h2>
                    <p className="mt-1 text-sm text-foreground/60">
                        닉네임 옆에 표시할 야찌 배지를 최대 {MAX_EQUIPPED_YACHT_BADGES}개까지 고를 수 있어요.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={saveEquippedBadges}
                    disabled={isPending}
                    className="rounded-2xl bg-foreground px-4 py-2 text-sm font-bold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isPending ? "저장 중..." : "저장"}
                </button>
            </div>

            {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
                {earnedBadges.map((badge) => {
                    const selected = selectedBadgeIdSet.has(badge.id);

                    return (
                        <button
                            key={badge.id}
                            type="button"
                            onClick={() => toggleBadge(badge.id)}
                            disabled={isPending}
                            aria-pressed={selected}
                            className={`inline-flex items-center gap-1 rounded-2xl border px-3 py-2 text-sm font-black transition ${
                                selected
                                    ? "border-foreground bg-foreground text-background"
                                    : "border-foreground/10 bg-background hover:border-foreground/30 hover:bg-foreground/5"
                            }`}
                            title={badge.description}
                        >
                            <span>{badge.display}</span>
                            <span>{badge.name}</span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-foreground/45">
        <span>
          선택됨 {selectedBadgeIds.length}/{MAX_EQUIPPED_YACHT_BADGES}
        </span>

                {selectedBadgeIds.length >= MAX_EQUIPPED_YACHT_BADGES && (
                    <span>다른 배지를 고르려면 선택된 배지를 먼저 해제하세요.</span>
                )}
            </div>
        </section>
    );
}