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

      <div className="mt-5">
        <p className="text-sm font-semibold">획득한 배지</p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {badges.length > 0 ? (
            badges.map((badge) => {
              const selected = selectedBadgeIdSet.has(badge.id);

              return (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => toggleBadge(badge.id)}
                  disabled={isPending}
                  className={[
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    selected
                      ? "border-emerald-400/50 bg-emerald-400/[0.06]"
                      : "border-foreground/10 bg-foreground/[0.03] hover:bg-foreground/[0.06]",
                  ].join(" ")}
                >
                  <MahjongBadgeChip
                    display={badge.display}
                    name={badge.name}
                    displayType={badge.displayType}
                    rarity={badge.rarity}
                  />

                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {badge.name}
                    </span>
                    <span className="block truncate text-xs text-foreground/50">
                      {badge.description}
                    </span>
                  </span>

                  {selected ? (
                    <span className="ml-auto rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      선택
                    </span>
                  ) : null}
                </button>
              );
            })
          ) : (
            <p className="text-sm text-foreground/50">
              아직 획득한 배지가 없습니다.
            </p>
          )}
        </div>
      </div>

      {message ? (
        <p className="mt-4 text-sm text-foreground/60">{message}</p>
      ) : null}
    </section>
  );
}