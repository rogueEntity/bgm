// web/src/features/games/mahjong/lib/action-helpers.ts

import { db } from "@/lib/prisma";
import { getCurrentUserWithAdmin } from "@/lib/admin";

import type {
    MahjongDetails,
    MahjongExpectedStateInput,
} from "../types";
import { toPrismaJson } from "./details";

const STALE_MAHJONG_STATE_ERROR =
    "STALE_MAHJONG_STATE: 대국 상태가 최신이 아닙니다. 새로고침 후 다시 기록해주세요.";

export type MahjongActionResult =
    | {
    ok: true;
}
    | {
    ok: false;
    code: "STALE_MAHJONG_STATE";
    message: string;
};

export function isStaleMahjongStateError(error: unknown) {
    return (
        error instanceof Error &&
        error.message.includes("STALE_MAHJONG_STATE")
    );
}

export function createStaleMahjongStateResult(): MahjongActionResult {
    return {
        ok: false,
        code: "STALE_MAHJONG_STATE",
        message:
            "이미 다른 화면에서 대국이 기록되었습니다. 최신 상태를 확인하기 위해 새로고침합니다.",
    };
}

export async function runMahjongAction(
    action: () => Promise<void>,
): Promise<MahjongActionResult> {
    try {
        await action();

        return {
            ok: true,
        };
    } catch (error) {
        if (isStaleMahjongStateError(error)) {
            return createStaleMahjongStateResult();
        }

        throw error;
    }
}

export function assertLatestMahjongState({
                                             details,
                                             currentVersion,
                                             expected,
                                         }: {
    details: MahjongDetails;
    currentVersion: number;
    expected: MahjongExpectedStateInput;
}) {
    const currentLogCount = Array.isArray(details.logs) ? details.logs.length : 0;

    if (
        details.current_round !== expected.expected_round ||
        (details.honba ?? 0) !== expected.expected_honba ||
        currentLogCount !== expected.expected_log_count ||
        currentVersion !== expected.expected_version
    ) {
        throw new Error(STALE_MAHJONG_STATE_ERROR);
    }
}

export async function updateMatchDetailsWithVersionGuard({
                                                             matchId,
                                                             expectedVersion,
                                                             details,
                                                         }: {
    matchId: number;
    expectedVersion: number;
    details: MahjongDetails;
}) {
    const updateResult = await db.match_details.updateMany({
        where: {
            match_id: matchId,
            version: expectedVersion,
        },
        data: {
            details: toPrismaJson(details),
            version: {
                increment: 1,
            },
        },
    });

    if (updateResult.count !== 1) {
        throw new Error(STALE_MAHJONG_STATE_ERROR);
    }
}

export async function getCurrentMahjongManager() {
    const currentUser = await getCurrentUserWithAdmin();

    if (!currentUser) {
        throw new Error("로그인이 필요합니다.");
    }

    return currentUser;
}

export function assertCanManageMahjongMatch({
                                                currentUser,
                                                createdBy,
                                            }: {
    currentUser: Awaited<ReturnType<typeof getCurrentMahjongManager>>;
    createdBy: string | null;
}) {
    if (currentUser.isAdmin) return;
    if (createdBy && currentUser.id === createdBy) return;

    throw new Error("대국 생성자 또는 관리자만 처리할 수 있습니다.");
}