// web/src/app/(main)/mahjong/guide/page.tsx

import Link from "next/link";

import ScoreGuideSection from "@/components/mahjong/ScoreGuideSection";
import YakuGuideSection from "@/components/mahjong/YakuGuideSection";
import { MAHJONG_GAME_KEY } from "@/features/games/mahjong/constants";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";

type MahjongGuidePageProps = {
    searchParams: Promise<{
        tab?: string;
    }>;
};

type GuideTab = "yaku" | "score";

function normalizeGuideTab(tab?: string): GuideTab {
    if (tab === "score") return "score";
    return "yaku";
}

function getTabClass(isActive: boolean) {
    return `flex-1 rounded-xl px-4 py-3 text-center text-sm font-black transition ${
        isActive
            ? "bg-foreground text-background shadow-sm"
            : "text-foreground/50 hover:bg-foreground/5 hover:text-foreground"
    }`;
}

export default async function MahjongGuidePage({
  searchParams,
}: Readonly<MahjongGuidePageProps>) {
    assertGameEnabled(MAHJONG_GAME_KEY);
    const resolvedSearchParams = await searchParams;
    const activeTab = normalizeGuideTab(resolvedSearchParams.tab);

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6">
            <div>
                <Link
                    href="/mahjong"
                    className="mb-4 inline-flex text-sm font-bold text-foreground/50 transition hover:text-foreground"
                >
                    ← 리치마작 대시보드
                </Link>

                <h2 className="text-3xl font-black">역·점수 안내</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-foreground/55">
                    리치마작 역 족보와 부수·점수 계산을 확인할 수 있습니다.
                </p>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-background p-1 shadow-sm">
                <div className="grid grid-cols-2 gap-1">
                    <Link href="/mahjong/guide?tab=yaku" className={getTabClass(activeTab === "yaku")}>
                        역 족보
                    </Link>

                    <Link href="/mahjong/guide?tab=score" className={getTabClass(activeTab === "score")}>
                        부수·점수 계산
                    </Link>
                </div>
            </div>

            {activeTab === "yaku" ? <YakuGuideSection /> : <ScoreGuideSection />}
        </div>
    );
}