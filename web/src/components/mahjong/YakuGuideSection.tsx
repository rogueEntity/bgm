// web/src/components/mahjong/guide/YakuGuideSection.tsx

"use client";

import { useMemo, useState } from "react";

import {
    YAKU_GUIDE_ITEMS,
    type YakuGuideCategory,
    type YakuGuideItem,
} from "@/constants/yaku-guide";

type YakuFilterType = "all" | "menzen" | "open";

const FILTER_OPTIONS: { value: YakuFilterType; label: string }[] = [
    { value: "all", label: "전체보기" },
    { value: "menzen", label: "멘젠" },
    { value: "open", label: "후로" },
];

const CATEGORY_LABEL: Record<YakuGuideCategory, string> = {
    NORMAL: "일반역",
    SITUATIONAL: "상황역",
};

const CATEGORY_DESCRIPTION: Record<YakuGuideCategory, string> = {
    NORMAL: "패 모양 자체로 성립하는 역입니다.",
    SITUATIONAL: "리치, 쯔모, 마지막 패 등 상황에 따라 붙는 역입니다.",
};

const TILE_IMAGE_SRC_BY_SYMBOL: Record<string, string> = {
    "🀇": "/mahjong/tiles/m1.svg",
    "🀈": "/mahjong/tiles/m2.svg",
    "🀉": "/mahjong/tiles/m3.svg",
    "🀊": "/mahjong/tiles/m4.svg",
    "🀋": "/mahjong/tiles/m5.svg",
    "🀌": "/mahjong/tiles/m6.svg",
    "🀍": "/mahjong/tiles/m7.svg",
    "🀎": "/mahjong/tiles/m8.svg",
    "🀏": "/mahjong/tiles/m9.svg",

    "🀙": "/mahjong/tiles/p1.svg",
    "🀚": "/mahjong/tiles/p2.svg",
    "🀛": "/mahjong/tiles/p3.svg",
    "🀜": "/mahjong/tiles/p4.svg",
    "🀝": "/mahjong/tiles/p5.svg",
    "🀞": "/mahjong/tiles/p6.svg",
    "🀟": "/mahjong/tiles/p7.svg",
    "🀠": "/mahjong/tiles/p8.svg",
    "🀡": "/mahjong/tiles/p9.svg",

    "🀐": "/mahjong/tiles/s1.svg",
    "🀑": "/mahjong/tiles/s2.svg",
    "🀒": "/mahjong/tiles/s3.svg",
    "🀓": "/mahjong/tiles/s4.svg",
    "🀔": "/mahjong/tiles/s5.svg",
    "🀕": "/mahjong/tiles/s6.svg",
    "🀖": "/mahjong/tiles/s7.svg",
    "🀗": "/mahjong/tiles/s8.svg",
    "🀘": "/mahjong/tiles/s9.svg",

    "🀀": "/mahjong/tiles/ton.svg",
    "🀁": "/mahjong/tiles/nan.svg",
    "🀂": "/mahjong/tiles/shaa.svg",
    "🀃": "/mahjong/tiles/pei.svg",
    "🀆": "/mahjong/tiles/haku.svg",
    "🀅": "/mahjong/tiles/hatsu.svg",
    "🀄": "/mahjong/tiles/chun.svg",
};

function getHanLabel(yaku: YakuGuideItem, filter: YakuFilterType) {
    if (yaku.isYakuman) {
        if ((yaku.yakumanMultiplier ?? 1) >= 2) {
            return "더블역만";
        }

        return yaku.openHan > 0 ? "역만" : "역만(멘젠 한정)";
    }

    if (filter === "open" && yaku.openHan > 0) {
        return `${yaku.openHan}판`;
    }

    if (yaku.openHan > 0 && yaku.openHan !== yaku.closedHan) {
        return `${yaku.closedHan}판(후로 ${yaku.openHan}판)`;
    }

    return `${yaku.closedHan}판`;
}

function getGroupLabel(yaku: YakuGuideItem, filter: YakuFilterType) {
    if (yaku.isYakuman) {
        return (yaku.yakumanMultiplier ?? 1) >= 2 ? "더블역만" : "역만";
    }

    if (filter === "open" && yaku.openHan > 0) {
        return `${yaku.openHan}판`;
    }

    return `${yaku.closedHan}판`;
}

function getGroupOrder(groupLabel: string) {
    if (groupLabel === "역만") return 1000;
    if (groupLabel === "더블역만") return 1001;

    return Number(groupLabel.replace("판", ""));
}

function isVisibleByFilter(yaku: YakuGuideItem, filter: YakuFilterType) {
    if (filter === "all") return true;
    if (filter === "menzen") return true;

    return yaku.openHan > 0;
}

function MahjongTileImage({
                              tile,
                              label,
                          }: {
    tile: string;
    label: string;
}) {
    const [hasImageError, setHasImageError] = useState(false);
    const src = TILE_IMAGE_SRC_BY_SYMBOL[tile];

    if (!src || hasImageError) {
        return (
            <span className="inline-flex h-9 w-7 items-center justify-center rounded-md bg-background text-2xl leading-none shadow-sm">
        {tile}
      </span>
        );
    }

    return (
        <span className="inline-flex h-9 w-7 items-center justify-center overflow-hidden rounded-md bg-background shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={label}
                className="h-full w-full object-contain"
                onError={() => setHasImageError(true)}
            />
    </span>
    );
}

function YakuCard({
                      yaku,
                      filter,
                  }: {
    yaku: YakuGuideItem;
    filter: YakuFilterType;
}) {
    return (
        <article className="rounded-2xl border border-foreground/10 bg-background p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <div className="mb-1 text-xs font-black text-blue-500">
                        {getHanLabel(yaku, filter)}
                    </div>

                    <h4 className="text-lg font-black">
                        {yaku.name}
                        <span className="ml-1 text-sm font-bold text-foreground/45">
              ({yaku.japaneseName})
            </span>
                    </h4>
                </div>

                <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
                        yaku.openHan > 0
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-foreground/5 text-foreground/50"
                    }`}
                >
          {yaku.openHan > 0 ? "후로 가능" : "멘젠 한정"}
        </span>
            </div>

            <p className="text-sm font-medium leading-relaxed text-foreground/70">
                {yaku.description}
            </p>

            <div className="mt-4 rounded-xl bg-foreground/5 p-3">
                <div className="mb-2 text-xs font-black text-foreground/45">
                    예시 패
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {yaku.exampleTiles.map((tile, index) => (
                        <MahjongTileImage
                            key={`${yaku.id}-${tile}-${index}`}
                            tile={tile}
                            label={`${yaku.name} 예시 패 ${index + 1}`}
                        />
                    ))}
                </div>
            </div>

            {yaku.notes && yaku.notes.length > 0 && (
                <ul className="mt-3 space-y-1">
                    {yaku.notes.map((note) => (
                        <li
                            key={note}
                            className="text-xs font-semibold leading-relaxed text-foreground/50"
                        >
                            ※ {note}
                        </li>
                    ))}
                </ul>
            )}
        </article>
    );
}

function YakuCategorySection({
                                 category,
                                 items,
                                 filter,
                             }: {
    category: YakuGuideCategory;
    items: YakuGuideItem[];
    filter: YakuFilterType;
}) {
    const groupedItems = useMemo(() => {
        return items.reduce<Record<string, YakuGuideItem[]>>((acc, item) => {
            const groupLabel = getGroupLabel(item, filter);

            if (!acc[groupLabel]) {
                acc[groupLabel] = [];
            }

            acc[groupLabel].push(item);

            return acc;
        }, {});
    }, [items, filter]);

    const groupLabels = Object.keys(groupedItems).sort((a, b) => {
        return getGroupOrder(a) - getGroupOrder(b);
    });

    if (items.length === 0) {
        return null;
    }

    return (
        <section className="space-y-5">
            <div>
                <h3 className="text-xl font-black">{CATEGORY_LABEL[category]}</h3>
                <p className="mt-1 text-sm font-semibold text-foreground/50">
                    {CATEGORY_DESCRIPTION[category]}
                </p>
            </div>

            {groupLabels.map((groupLabel) => (
                <div key={`${category}-${groupLabel}`} className="space-y-3">
                    <div className="flex items-center gap-3">
                        <h4 className="text-sm font-black text-foreground/55">
                            {groupLabel}
                        </h4>
                        <div className="h-px flex-1 bg-foreground/10" />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        {groupedItems[groupLabel].map((yaku) => (
                            <YakuCard key={yaku.id} yaku={yaku} filter={filter} />
                        ))}
                    </div>
                </div>
            ))}
        </section>
    );
}

export default function YakuGuideSection() {
    const [filter, setFilter] = useState<YakuFilterType>("all");

    const filteredItems = useMemo(() => {
        return YAKU_GUIDE_ITEMS.filter((yaku) => isVisibleByFilter(yaku, filter));
    }, [filter]);

    const normalItems = filteredItems.filter((yaku) => yaku.category === "NORMAL");
    const situationalItems = filteredItems.filter(
        (yaku) => yaku.category === "SITUATIONAL",
    );

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-4">
                <h3 className="font-black">역 족보</h3>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground/55">
                    전체보기, 멘젠, 후로 기준으로 역을 확인할 수 있습니다.
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-background p-1">
                    {FILTER_OPTIONS.map((option) => {
                        const isActive = filter === option.value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setFilter(option.value)}
                                className={`rounded-xl px-3 py-2 text-sm font-black transition ${
                                    isActive
                                        ? "bg-foreground text-background shadow-sm"
                                        : "text-foreground/50 hover:bg-foreground/5 hover:text-foreground"
                                }`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <YakuCategorySection
                category="NORMAL"
                items={normalItems}
                filter={filter}
            />

            <YakuCategorySection
                category="SITUATIONAL"
                items={situationalItems}
                filter={filter}
            />
        </div>
    );
}