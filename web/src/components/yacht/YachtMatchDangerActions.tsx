"use client";

import { useState } from "react";

import { deleteYachtMatch } from "@/app/actions/yacht.action";

type YachtMatchDangerActionsProps = {
  matchId: number;
  canManage: boolean;
  redirectAfterDelete?: string;
};

export default function YachtMatchDangerActions({
  matchId,
  canManage,
  redirectAfterDelete = "/yacht",
}: Readonly<YachtMatchDangerActionsProps>) {
  const [isPending, setIsPending] = useState(false);

  if (!canManage) return null;

  const handleDelete = async () => {
    if (isPending) return;

    const confirmed = globalThis.confirm(
      "이 야찌 다이스 게임 기록을 삭제할까요?\n삭제된 게임은 홈과 대시보드에서 제외됩니다.",
    );
    if (!confirmed) return;

    setIsPending(true);
    try {
      await deleteYachtMatch(matchId);
      globalThis.location.href = redirectAfterDelete;
    } catch (error) {
      console.error(error);
      globalThis.alert(
        error instanceof Error
          ? error.message
          : "게임 삭제 중 오류가 발생했습니다.",
      );
      setIsPending(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-500 transition hover:border-red-500/50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "삭제 중..." : "게임 삭제"}
      </button>
    </div>
  );
}
