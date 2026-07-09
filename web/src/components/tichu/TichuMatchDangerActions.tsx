// web/src/components/tichu/TichuMatchDangerActions.tsx
"use client";

import { useState } from "react";

import { deleteTichuMatch, undoTichuLastLog } from "@/app/actions/tichu.action";

type TichuMatchDangerActionsProps = {
    matchId: number;
    canManage: boolean;
    canUndo?: boolean;
    redirectAfterDelete?: string;
    showUndo?: boolean;
    showDelete?: boolean;
};

export default function TichuMatchDangerActions({
                                                    matchId,
                                                    canManage,
                                                    canUndo = true,
                                                    redirectAfterDelete = "/tichu/matches",
                                                    showUndo = true,
                                                    showDelete = true,
                                                }: Readonly<TichuMatchDangerActionsProps>) {
    const [isPending, setIsPending] = useState(false);

    if (!canManage || (!showUndo && !showDelete)) {
        return null;
    }

    const handleUndo = async () => {
        if (isPending || !canUndo) return;

        const ok = globalThis.confirm(
            "마지막 기록을 되돌릴까요?\n종료된 게임이면 진행 중 상태로 복구됩니다.",
        );

        if (!ok) return;

        setIsPending(true);

        try {
            await undoTichuLastLog(matchId);
            globalThis.location.href = `/tichu/play/${matchId}`;
        } catch (error) {
            console.error(error);
            globalThis.alert(
                error instanceof Error
                    ? error.message
                    : "UNDO 처리 중 오류가 발생했습니다.",
            );
        } finally {
            setIsPending(false);
        }
    };

    const handleDelete = async () => {
        if (isPending) return;

        const ok = globalThis.confirm(
            "이 티츄 게임 기록을 삭제할까요?\n삭제된 게임은 목록과 통계에서 제외됩니다.",
        );

        if (!ok) return;

        setIsPending(true);

        try {
            await deleteTichuMatch(matchId);
            globalThis.location.href = redirectAfterDelete;
        } catch (error) {
            console.error(error);
            globalThis.alert(
                error instanceof Error
                    ? error.message
                    : "게임 삭제 중 오류가 발생했습니다.",
            );
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="flex flex-wrap gap-2">
            {showUndo ? (
                <button
                    type="button"
                    onClick={handleUndo}
                    disabled={isPending || !canUndo}
                    className="rounded-xl border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-xs font-bold text-foreground/60 transition hover:border-orange-500/40 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    마지막 기록 되돌리기
                </button>
            ) : null}

            {showDelete ? (
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isPending}
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-500 transition hover:border-red-500/50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    게임 삭제
                </button>
            ) : null}
        </div>
    );
}