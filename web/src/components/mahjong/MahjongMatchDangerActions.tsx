// web/src/components/mahjong/MahjongMatchDangerActions.tsx
"use client";

import { useState } from "react";
import {
    deleteMahjongMatch,
    undoMahjongLastLog,
} from "@/app/actions/mahjong.action";

type MahjongMatchDangerActionsProps = {
    matchId: number;
    canManage: boolean;
    canUndo?: boolean;
    redirectAfterDelete?: string;
    showUndo?: boolean;
    showDelete?: boolean;
};

export default function MahjongMatchDangerActions({
                                                      matchId,
                                                      canManage,
                                                      canUndo = true,
                                                      redirectAfterDelete = "/mahjong",
                                                      showUndo = true,
                                                      showDelete = true,
                                                  }: Readonly<MahjongMatchDangerActionsProps>) {
    const [isPending, setIsPending] = useState(false);

    if (!canManage || (!showUndo && !showDelete)) {
        return null;
    }

    const handleUndo = async () => {
        if (isPending || !canUndo) return;

        const ok = globalThis.confirm(
            "마지막 기록을 되돌릴까요?\n종료된 대국이면 진행 중 상태로 복구되고, 통계와 배지도 현재 기록 기준으로 다시 계산됩니다.",
        );

        if (!ok) return;

        setIsPending(true);

        try {
            await undoMahjongLastLog(matchId);
            globalThis.location.href = `/mahjong/play/${matchId}`;
        } catch (error) {
            console.error(error);
            alert(
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
            "이 대국 기록을 삭제할까요?\n삭제된 대국은 목록, 통계, 도전과제, 배지 계산에서 제외됩니다.",
        );

        if (!ok) return;

        setIsPending(true);

        try {
            await deleteMahjongMatch(matchId);
            globalThis.location.href = redirectAfterDelete;
        } catch (error) {
            console.error(error);
            alert(
                error instanceof Error
                    ? error.message
                    : "대국 삭제 중 오류가 발생했습니다.",
            );
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="flex flex-wrap gap-2">
            {showUndo && (
                <button
                    type="button"
                    onClick={handleUndo}
                    disabled={isPending || !canUndo}
                    className="px-3 py-2 rounded-lg border border-foreground/10 text-sm font-bold hover:bg-foreground/5 disabled:opacity-40"
                >
                    마지막 기록 되돌리기
                </button>
            )}

            {showDelete && (
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isPending}
                    className="px-3 py-2 rounded-lg border border-red-500/30 text-sm font-bold text-red-500 hover:bg-red-500/10 disabled:opacity-40"
                >
                    대국 삭제
                </button>
            )}
        </div>
    );
}