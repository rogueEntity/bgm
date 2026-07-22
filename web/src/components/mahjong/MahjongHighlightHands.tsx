// web/src/components/mahjong/MahjongHighlightHands.tsx

import Link from "next/link";

import MahjongTile from "@/components/mahjong/hand/MahjongTile";
import type { MahjongHighlightHand } from "@/features/games/mahjong/lib/profile";
import type {
    MahjongMeldSnapshot,
    MahjongTileCode,
} from "@/features/games/mahjong/lib/hand/types";

type MahjongHighlightHandsProps = {
    hands: MahjongHighlightHand[];
};

const ROUND_LABELS: Record<string, string> = {
    EAST_1: "동 1국",
    EAST_2: "동 2국",
    EAST_3: "동 3국",
    EAST_4: "동 4국",

    SOUTH_1: "남 1국",
    SOUTH_2: "남 2국",
    SOUTH_3: "남 3국",
    SOUTH_4: "남 4국",

    WEST_1: "서 1국",
    WEST_2: "서 2국",
    WEST_3: "서 3국",
    WEST_4: "서 4국",

    NORTH_1: "북 1국",
    NORTH_2: "북 2국",
    NORTH_3: "북 3국",
    NORTH_4: "북 4국",
};

const MELD_LABELS: Record<MahjongMeldSnapshot["type"], string> = {
    CHI: "치",
    PON: "퐁",
    MINKAN: "명깡",
    ANKAN: "암깡",
};

export default function MahjongHighlightHands({
                                                  hands,
                                              }: Readonly<MahjongHighlightHandsProps>) {
    return (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-black text-foreground">
                        하이라이트 패보
                    </h2>

                    <p className="mt-1 text-sm text-foreground/55">
                        저장된 패보 중 가장 높은 기록입니다.
                    </p>
                </div>

                {hands.length > 0 ? (
                    <span className="shrink-0 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
            TOP {hands.length}
          </span>
                ) : null}
            </div>

            {hands.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
                    <p className="text-sm font-semibold text-foreground/45">
                        아직 저장된 하이라이트 패보가 없습니다.
                    </p>

                    <p className="mt-1 text-xs text-foreground/35">
                        패 입력 방식으로 화료를 기록하면 이곳에 표시됩니다.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {hands.map((highlight, index) => (
                        <HighlightHandCard
                            key={`${highlight.matchId}-${highlight.logIndex}-${highlight.winIndex}`}
                            highlight={highlight}
                            rank={index + 1}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function HighlightHandCard({
                               highlight,
                               rank,
                           }: Readonly<{
    highlight: MahjongHighlightHand;
    rank: number;
}>) {
    const roundLabel =
        ROUND_LABELS[highlight.round] ??
        highlight.round.replaceAll("_", " ") ??
        "국 정보 없음";

    const scoreLabel = getScoreLabel(highlight);
    const dateLabel = formatPlayedAt(highlight.playedAt);

    return (
        <article className="overflow-hidden rounded-2xl border border-border bg-background/55">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-black text-white shadow-sm">
                        {rank}
                    </div>

                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h3 className="font-black text-foreground">
                                {roundLabel}
                                {highlight.honba > 0 ? ` · ${highlight.honba}본장` : ""}
                            </h3>

                            <span
                                className={[
                                    "rounded-full px-2 py-0.5 text-[11px] font-black",
                                    highlight.isTsumo
                                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                                ].join(" ")}
                            >
                {highlight.isTsumo ? "쯔모" : "론"}
              </span>
                        </div>

                        <p className="mt-0.5 text-xs text-foreground/40">{dateLabel}</p>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-base font-black text-foreground">
                        {scoreLabel}
                    </p>

                    <p className="mt-0.5 text-xs font-semibold text-foreground/45">
                        {highlight.baseScore.toLocaleString("ko-KR")}점
                    </p>
                </div>
            </div>

            <div className="space-y-5 p-4">
                <ReadonlyHand
                    concealedTiles={highlight.hand.concealed_tiles}
                    winningTile={highlight.hand.winning_tile}
                    melds={highlight.hand.melds}
                />

                {highlight.yakuLabels.length > 0 ? (
                    <div>
                        <p className="mb-2 text-xs font-bold text-foreground/45">
                            완성 역
                        </p>

                        <div className="flex flex-wrap gap-1.5">
                            {highlight.yakuLabels.map((label, index) => (
                                <span
                                    key={`${label}-${index}`}
                                    className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary"
                                >
                  {label}
                </span>
                            ))}

                            {highlight.doraTotal > 0 ? (
                                <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-600 dark:text-red-400">
                  도라 {highlight.doraTotal}
                </span>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                <IndicatorTiles
                    title="도라 표시패"
                    tiles={highlight.hand.dora_indicators}
                />

                <IndicatorTiles
                    title="뒷도라 표시패"
                    tiles={highlight.hand.ura_dora_indicators}
                />

                <div className="flex justify-end border-t border-border pt-3">
                    <Link
                        href={`/mahjong/detail/${highlight.matchId}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5"
                    >
                        대국 상세 보기
                    </Link>
                </div>
            </div>
        </article>
    );
}

function ReadonlyHand({
                          concealedTiles,
                          winningTile,
                          melds,
                      }: Readonly<{
    concealedTiles: MahjongTileCode[];
    winningTile: MahjongTileCode;
    melds: MahjongMeldSnapshot[];
}>) {
    return (
        <div>
            <p className="mb-2 text-xs font-bold text-foreground/45">화료 패보</p>

            <div className="-mx-1 overflow-x-auto px-1 pb-2">
                <div className="flex min-w-max items-end gap-3">
                    <div className="flex items-end gap-0.5">
                        {concealedTiles.map((tile, index) => (
                            <MahjongTile
                                key={`concealed-${tile}-${index}`}
                                tile={tile}
                                size="sm"
                            />
                        ))}

                        <div className="ml-2 flex flex-col items-center">
              <span className="mb-1 text-[10px] font-bold text-rose-500">
                화료
              </span>

                            <div className="rounded-md ring-2 ring-rose-500/70 ring-offset-2 ring-offset-background">
                                <MahjongTile tile={winningTile} size="sm" />
                            </div>
                        </div>
                    </div>

                    {melds.length > 0 ? (
                        <div className="flex items-end gap-2">
                            {melds.map((meld, index) => (
                                <ReadonlyMeld
                                    key={`${meld.type}-${index}`}
                                    meld={meld}
                                    index={index}
                                />
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function ReadonlyMeld({
                          meld,
                          index,
                      }: Readonly<{
    meld: MahjongMeldSnapshot;
    index: number;
}>) {
    return (
        <div className="flex flex-col items-center">
      <span className="mb-1 text-[10px] font-bold text-foreground/40">
        {MELD_LABELS[meld.type]}
      </span>

            <div className="flex items-end gap-0.5 rounded-lg bg-foreground/[0.04] p-1.5">
                {meld.tiles.map((tile, tileIndex) => {
                    const isCalledTile =
                        meld.type !== "ANKAN" &&
                        meld.called_tile === tile &&
                        meld.tiles.findIndex(
                            (candidate) => candidate === meld.called_tile,
                        ) === tileIndex;

                    const isHiddenAnkanTile =
                        meld.type === "ANKAN" &&
                        (tileIndex === 0 || tileIndex === meld.tiles.length - 1);

                    return (
                        <MahjongTile
                            key={`meld-${index}-${tile}-${tileIndex}`}
                            tile={tile}
                            size="sm"
                            sideways={isCalledTile}
                            hidden={isHiddenAnkanTile}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function IndicatorTiles({
                            title,
                            tiles,
                        }: Readonly<{
    title: string;
    tiles: MahjongTileCode[];
}>) {
    if (tiles.length === 0) {
        return null;
    }

    return (
        <div>
            <p className="mb-2 text-xs font-bold text-foreground/45">{title}</p>

            <div className="flex flex-wrap items-center gap-0.5">
                {tiles.map((tile, index) => (
                    <MahjongTile
                        key={`${title}-${tile}-${index}`}
                        tile={tile}
                        size="sm"
                    />
                ))}
            </div>
        </div>
    );
}

function getScoreLabel(highlight: MahjongHighlightHand) {
    if (highlight.yakumanCount > 0) {
        return highlight.yakumanCount === 1
            ? "역만"
            : `${highlight.yakumanCount}배 역만`;
    }

    const parts = [`${highlight.han}판`];

    if (highlight.fu !== null) {
        parts.push(`${highlight.fu}부`);
    }

    const limitLabel = getLimitLabel(highlight.han);

    if (limitLabel) {
        parts.push(limitLabel);
    }

    return parts.join(" · ");
}

function getLimitLabel(han: number) {
    if (han >= 13) return "헤아림 역만";
    if (han >= 11) return "삼배만";
    if (han >= 8) return "배만";
    if (han >= 6) return "하네만";
    if (han >= 5) return "만관";

    return null;
}

function formatPlayedAt(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(date);
}