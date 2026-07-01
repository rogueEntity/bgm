// web/src/components/mahjong/MahjongBadgeEquipForm.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMyMahjongEquippedBadges } from "@/app/actions/mahjong-achievement.action";
import MahjongBadgeChip from "@/components/mahjong/MahjongBadgeChip";
import type { MyMahjongBadgeItem } from "@/app/actions/mahjong-achievement.action";

type MahjongBadgeEquipFormProps = {
  badges: MyMahjongBadgeItem[];
};

export default function MahjongBadgeEquipForm({
  badges,
}: MahjongBadgeEquipFormProps) {
  const router = useRouter();

  const initialSelectedBadgeIds = useMemo(
    () =>
      badges
        .filter((badge) => badge.equippedSlot !== null)
        .sort((a, b) => (a.equippedSlot ?? 999) - (b.equippedSlot ?? 999))
        .map((badge) => badge.id),
    [badges],
  );

  const [selectedBadgeIds, setSelectedBadgeIds] = useState<string[]>(
    initialSelectedBadgeIds,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedBadgeIds(initialSelectedBadgeIds);
  }, [initialSelectedBadgeIds]);

  const selectedBadgeIdSet = new Set(selectedBadgeIds);

  function toggleBadge(badgeId: string) {
    setMessage(null);

    setSelectedBadgeIds((current) => {
      if (current.includes(badgeId)) {
        return current.filter((id) => id !== badgeId);
      }

      if (current.length >= 3) {
        setMessage("배지는 최대 3개까지 장착할 수 있습니다.");
        return current;
      }

      return [...current, badgeId];
    });
  }

  function moveBadge(badgeId: string, direction: "UP" | "DOWN") {
    setMessage(null);

    setSelectedBadgeIds((current) => {
      const index = current.indexOf(badgeId);

      if (index === -1) return current;

      const targetIndex = direction === "UP" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const temp = next[index];

      next[index] = next[targetIndex];
      next[targetIndex] = temp;

      return next;
    });
  }

  function handleSave() {
    setMessage(null);

    startTransition(async () => {
      try {
        await updateMyMahjongEquippedBadges(selectedBadgeIds);
        router.refresh();
        setMessage("장착 배지를 저장했습니다.");
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "배지 저장 중 오류가 발생했습니다.",
        );
      }
    });
  }

  const selectedBadges = selectedBadgeIds
    .map((badgeId) => badges.find((badge) => badge.id === badgeId))
    .filter((badge): badge is MyMahjongBadgeItem => badge !== undefined);

  return (
    <section className="rounded-2xl border border-foreground/10 bg-background p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-bold">배지 장착</h2>
          <p className="mt-1 text-sm text-foreground/60">
            닉네임 옆에 표시할 배지를 최대 3개까지 선택할 수 있습니다.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "저장"}
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4">
        <p className="text-sm font-semibold">현재 선택</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {selectedBadges.length > 0 ? (
            selectedBadges.map((badge, index) => (
              <div
                key={badge.id}
                className="flex items-center gap-2 rounded-xl border border-foreground/10 bg-background px-3 py-2"
              >
                <span className="text-xs text-foreground/50">
                  Slot {index + 1}
                </span>

                <MahjongBadgeChip
                  display={badge.display}
                  name={badge.name}
                  displayType={badge.displayType}
                  rarity={badge.rarity}
                />

                <span className="text-sm font-medium">{badge.name}</span>

                <div className="ml-1 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveBadge(badge.id, "UP")}
                    disabled={index === 0 || isPending}
                    className="rounded-md border border-foreground/10 px-1.5 py-0.5 text-xs disabled:opacity-30"
                    aria-label={`${badge.name} 배지 앞으로 이동`}
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    onClick={() => moveBadge(badge.id, "DOWN")}
                    disabled={index === selectedBadges.length - 1 || isPending}
                    className="rounded-md border border-foreground/10 px-1.5 py-0.5 text-xs disabled:opacity-30"
                    aria-label={`${badge.name} 배지 뒤로 이동`}
                  >
                    ↓
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleBadge(badge.id)}
                    disabled={isPending}
                    className="rounded-md border border-foreground/10 px-1.5 py-0.5 text-xs disabled:opacity-30"
                    aria-label={`${badge.name} 배지 선택 해제`}
                  >
                    해제
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-foreground/50">
              선택한 배지가 없습니다.
            </p>
          )}
        </div>
      </div>

      {/* 획득한 배지 */}
      <div className="mt-8 space-y-3 md:mt-10">
        <div>
          <h3 className="text-lg font-bold">획득한 배지</h3>
          <p className="mt-1 text-sm text-foreground/50">
            장착할 배지를 선택하세요. 최대 3개까지 닉네임 옆에 표시됩니다.
          </p>
        </div>

        {badges.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {badges.map((badge) => {
                const selected = selectedBadgeIdSet.has(badge.id);
                const selectedIndex = selectedBadgeIds.indexOf(badge.id);

                return (
                    <button
                        key={badge.id}
                        type="button"
                        onClick={() => toggleBadge(badge.id)}
                        disabled={isPending}
                        className={[
                          "group flex min-w-0 items-start gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
                          selected
                              ? "border-emerald-400/60 bg-emerald-400/[0.08] shadow-sm"
                              : "border-foreground/10 bg-foreground/[0.03] hover:border-foreground/20 hover:bg-foreground/[0.06]",
                        ].join(" ")}
                    >
                      <div className="shrink-0 pt-0.5">
                        <MahjongBadgeChip
                            display={badge.display}
                            displayType={badge.displayType}
                            rarity={badge.rarity}
                            size="md"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate font-bold">{badge.name}</p>

                          {selected ? (
                              <span className="shrink-0 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
                    Slot {selectedIndex + 1}
                  </span>
                          ) : null}
                        </div>

                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-foreground/55">
                          {badge.description}
                        </p>
                      </div>

                      <div
                          className={[
                            "ml-2 shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition",
                            selected
                                ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-600 dark:text-emerald-300"
                                : "border-foreground/10 text-foreground/45 group-hover:border-emerald-400/40 group-hover:text-emerald-500",
                          ].join(" ")}
                      >
                        {selected ? "선택됨" : "선택"}
                      </div>
                    </button>
                );
              })}
            </div>
        ) : (
            <div className="rounded-2xl border border-dashed border-foreground/15 px-4 py-10 text-center text-sm text-foreground/45">
              아직 획득한 배지가 없습니다.
            </div>
        )}
      </div>

      {message ? (
        <p className="mt-4 text-sm text-foreground/60">{message}</p>
      ) : null}
    </section>
  );
}