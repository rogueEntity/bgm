// web/src/components/mahjong/hand/MahjongHandResult.tsx

"use client";

import type {
    MahjongHandScoreResult,
} from "@/features/games/mahjong/lib/hand/types";

type MahjongHandResultProps = {
    result: MahjongHandScoreResult | null;
};

export default function MahjongHandResult({
                                              result,
                                          }: Readonly<MahjongHandResultProps>) {
    if (!result) {
        return (
            <div className="rounded-xl border border-dashed border-foreground/15 px-4 py-4 text-center text-xs text-foreground/45">
                손패와 화료패를 모두 입력하면 자동 계산 결과가 표시됩니다.
            </div>
        );
    }

    if (!result.ok) {
        return (
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
                <p className="text-sm font-bold text-red-600 dark:text-red-400">
                    계산할 수 없습니다
                </p>

                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-foreground/60">
                    {result.message}
                </p>
            </div>
        );
    }

    const { best } = result;

    return (
        <div className="space-y-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <p className="text-xs font-bold text-foreground/50">
                        자동 계산 결과
                    </p>

                    <p className="mt-1 text-xl font-black text-emerald-700 dark:text-emerald-400">
                        {best.score.display}
                    </p>
                </div>

                <div className="text-right">
                    {best.yakuman_count > 0 ? (
                        <p className="text-sm font-black text-red-600 dark:text-red-400">
                            {best.yakuman_count === 1
                                ? "역만"
                                : `${best.yakuman_count}배 역만`}
                        </p>
                    ) : (
                        <>
                            <p className="text-sm font-black">
                                {best.total_han}판{" "}
                                {best.fu.fu}부
                            </p>

                            <p className="text-[11px] text-foreground/45">
                                역 {best.yaku_han}판 · 도라{" "}
                                {best.dora_count +
                                    best.ura_dora_count +
                                    best.red_dora_count}
                                판
                            </p>
                        </>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {best.yaku.map((yaku) => (
                    <span
                        key={yaku.id}
                        className={`
              rounded-full border px-2.5 py-1
              text-xs font-bold
              ${
                            yaku.is_yakuman
                                ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        }
            `}
                    >
            {yaku.name}
                        {!yaku.is_yakuman &&
                            ` ${yaku.han}판`}
          </span>
                ))}

                {best.dora_count > 0 && (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
            도라 {best.dora_count}
          </span>
                )}

                {best.ura_dora_count > 0 && (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
            뒷도라 {best.ura_dora_count}
          </span>
                )}

                {best.red_dora_count > 0 && (
                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-600 dark:text-red-400">
            적도라 {best.red_dora_count}
          </span>
                )}
            </div>

            {best.fu.items.length > 0 &&
                best.yakuman_count === 0 && (
                    <details className="rounded-lg border border-foreground/10 bg-background/60">
                        <summary className="cursor-pointer px-3 py-2 text-xs font-bold">
                            부수 상세
                        </summary>

                        <div className="space-y-1 border-t border-foreground/10 px-3 py-2">
                            {best.fu.items.map(
                                (item, index) => (
                                    <div
                                        key={`${item.reason}-${index}`}
                                        className="flex items-center justify-between text-xs"
                                    >
                    <span className="text-foreground/60">
                      {item.label}
                    </span>

                                        <span className="font-bold">
                      +{item.fu}부
                    </span>
                                    </div>
                                ),
                            )}

                            <div className="mt-2 flex items-center justify-between border-t border-foreground/10 pt-2 text-xs font-black">
                                <span>최종 부수</span>
                                <span>{best.fu.fu}부</span>
                            </div>
                        </div>
                    </details>
                )}

            {result.candidates.length > 1 && (
                <p className="text-[11px] text-foreground/45">
                    가능한 분해 {result.candidates.length}개 중 가장 높은 점수를 선택했습니다.
                </p>
            )}
        </div>
    );
}