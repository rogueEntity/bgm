// web/src/components/mahjong/guide/ScoreGuideSection.tsx

"use client";

import { useMemo, useState } from "react";

import {
    FU_OPTIONS,
    HAN_OPTIONS,
    calculateMahjongGuideScore,
    isLimitHan,
    normalizeFuForHan,
    type MahjongWinMethod,
    type MahjongWinnerType,
} from "@/lib/mahjong-guide-score";

const WINNER_TYPE_OPTIONS: {
    value: MahjongWinnerType;
    label: string;
    description: string;
}[] = [
    { value: "child", label: "자", description: "자리가 화료" },
    { value: "dealer", label: "친", description: "동가가 화료" },
];

const WIN_METHOD_OPTIONS: {
    value: MahjongWinMethod;
    label: string;
    description: string;
}[] = [
    { value: "ron", label: "론", description: "방총자가 전액 지급" },
    { value: "tsumo", label: "쯔모", description: "나머지 3명이 나눠 지급" },
];

function SelectButton({
                          isActive,
                          label,
                          description,
                          onClick,
                      }: {
    isActive: boolean;
    label: string;
    description?: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-2xl border p-4 text-left transition ${
                isActive
                    ? "border-foreground bg-foreground text-background shadow-sm"
                    : "border-foreground/10 bg-background hover:border-foreground/30 hover:bg-foreground/5"
            }`}
        >
            <div className="font-black">{label}</div>
            {description && (
                <div
                    className={`mt-1 text-xs font-semibold ${
                        isActive ? "text-background/70" : "text-foreground/45"
                    }`}
                >
                    {description}
                </div>
            )}
        </button>
    );
}

function GuideBlock({
                        title,
                        children,
                    }: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-foreground/10 bg-background p-5 shadow-sm">
            <h3 className="mb-3 font-black">{title}</h3>
            <div className="space-y-2 text-sm font-medium leading-relaxed text-foreground/65">
                {children}
            </div>
        </section>
    );
}

function FuRow({
                   label,
                   value,
                   description,
               }: {
    label: string;
    value: string;
    description: string;
}) {
    return (
        <div className="grid grid-cols-[80px_70px_1fr] gap-2 rounded-xl bg-foreground/5 p-3 text-sm">
            <div className="font-black text-foreground/75">{label}</div>
            <div className="font-black text-blue-500">{value}</div>
            <div className="font-semibold text-foreground/55">{description}</div>
        </div>
    );
}

export default function ScoreGuideSection() {
    const [winnerType, setWinnerType] = useState<MahjongWinnerType>("child");
    const [winMethod, setWinMethod] = useState<MahjongWinMethod>("ron");
    const [han, setHan] = useState<number>(3);
    const [fu, setFu] = useState<number>(40);

    const normalizedFu = normalizeFuForHan(han, fu);

    const scoreResult = useMemo(() => {
        return calculateMahjongGuideScore({
            winnerType,
            winMethod,
            han,
            fu: normalizedFu,
        });
    }, [winnerType, winMethod, han, normalizedFu]);

    const limitHan = isLimitHan(han);

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-foreground/10 bg-foreground/5 p-5">
                <h3 className="font-black">간단 점수 계산기</h3>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground/55">
                    판수와 부수를 이미 알고 있을 때 최종 지급 점수를 빠르게 확인하는
                    계산기입니다. 본장, 리치봉, 더블론, 유국은 포함하지 않습니다.
                </p>

                <div className="mt-5 space-y-5">
                    <div>
                        <div className="mb-2 text-xs font-black text-foreground/45">
                            화료자
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {WINNER_TYPE_OPTIONS.map((option) => (
                                <SelectButton
                                    key={option.value}
                                    isActive={winnerType === option.value}
                                    label={option.label}
                                    description={option.description}
                                    onClick={() => setWinnerType(option.value)}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="mb-2 text-xs font-black text-foreground/45">
                            화료 방식
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {WIN_METHOD_OPTIONS.map((option) => (
                                <SelectButton
                                    key={option.value}
                                    isActive={winMethod === option.value}
                                    label={option.label}
                                    description={option.description}
                                    onClick={() => setWinMethod(option.value)}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="mb-2 text-xs font-black text-foreground/45">
                            판수
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                            {HAN_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setHan(option.value)}
                                    className={`rounded-xl border px-3 py-2 text-sm font-black transition ${
                                        han === option.value
                                            ? "border-blue-500 bg-blue-500 text-white"
                                            : "border-foreground/10 bg-background hover:border-foreground/30 hover:bg-foreground/5"
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="text-xs font-black text-foreground/45">부수</div>
                            {limitHan && (
                                <div className="text-xs font-bold text-foreground/40">
                                    만관 이상은 부수와 무관합니다.
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                            {FU_OPTIONS.map((option) => {
                                const isActive = normalizedFu === option;

                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => setFu(option)}
                                        disabled={limitHan}
                                        className={`rounded-xl border px-3 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-35 ${
                                            isActive
                                                ? "border-blue-500 bg-blue-500 text-white"
                                                : "border-foreground/10 bg-background hover:border-foreground/30 hover:bg-foreground/5"
                                        }`}
                                    >
                                        {option}부
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-2xl bg-foreground p-5 text-background">
                        <div className="text-sm font-bold text-background/65">
                            계산 결과
                        </div>
                        <div className="mt-1 text-2xl font-black">{scoreResult.label}</div>
                        <div className="mt-3 text-lg font-black">
                            {scoreResult.paymentText}
                        </div>

                        {winMethod === "tsumo" && (
                            <div className="mt-2 text-sm font-semibold text-background/70">
                                {winnerType === "dealer"
                                    ? "친 쯔모는 세 명이 같은 점수를 냅니다."
                                    : "자 쯔모는 친과 자의 지급 점수가 다릅니다."}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-foreground/10 bg-background p-5 shadow-sm">
                <h3 className="mb-3 font-black">부수 계산 순서</h3>

                <div className="space-y-2 text-sm font-medium leading-relaxed text-foreground/65">
                    <p>
                        부수는 <b>기본 부수 20부</b>에서 시작해서 화료 방식, 머리,
                        몸통, 대기 형태에 붙는 부수를 더한 뒤 계산합니다.
                    </p>
                    <p>
                        일반 손패는 최종 부수를 <b>10부 단위로 올림</b>합니다. 예를
                        들어 32부는 40부, 46부는 50부가 됩니다.
                    </p>
                    <p>
                        단, <b>치또이쯔는 25부 고정</b>이고, <b>핑후 쯔모는 20부</b>
                        로 계산합니다.
                    </p>
                </div>

                <div className="mt-4 space-y-2">
                    <FuRow
                        label="시작"
                        value="20부"
                        description="모든 화료는 기본 20부에서 시작합니다."
                    />
                    <FuRow
                        label="화료"
                        value="+0~10부"
                        description="멘젠 론, 쯔모 여부에 따라 추가 부수가 붙습니다."
                    />
                    <FuRow
                        label="머리"
                        value="+0~4부"
                        description="역패, 장풍패, 자풍패 머리에 부수가 붙습니다."
                    />
                    <FuRow
                        label="몸통"
                        value="+0~32부"
                        description="커쯔/깡쯔, 안커/밍커, 요구패 여부에 따라 달라집니다."
                    />
                    <FuRow
                        label="대기"
                        value="+0~2부"
                        description="간짱, 변짱, 단기 대기에 부수가 붙습니다."
                    />
                    <FuRow
                        label="올림"
                        value="10부 단위"
                        description="최종 부수를 10부 단위로 올림합니다."
                    />
                </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
                <GuideBlock title="화료 방식 부수">
                    <p>
                        <b>멘젠 론</b>: +10부
                    </p>
                    <p>
                        <b>쯔모</b>: +2부
                    </p>
                    <p>
                        <b>핑후 쯔모</b>: 쯔모 2부를 붙이지 않고 20부로 계산합니다.
                    </p>
                    <p>
                        <b>후로 론</b>: 별도 화료 부수는 없습니다. 다만 최종 20부가
                        나오면 30부로 올려 계산하는 경우가 많습니다.
                    </p>
                </GuideBlock>

                <GuideBlock title="머리 부수">
                    <p>
                        <b>삼원패 머리</b>: +2부
                    </p>
                    <p>
                        <b>자풍패 머리</b>: +2부
                    </p>
                    <p>
                        <b>장풍패 머리</b>: +2부
                    </p>
                    <p>
                        자풍과 장풍이 같은 패라면 둘 다 인정해 +4부로 계산하는 규칙을
                        쓰는 경우가 많습니다.
                    </p>
                    <p>
                        역패가 아닌 일반 수패나 객풍패 머리는 0부입니다.
                    </p>
                </GuideBlock>

                <GuideBlock title="몸통 부수: 슌쯔">
                    <p>
                        <b>슌쯔</b>: 0부
                    </p>
                    <p>123, 456, 789 같은 연속된 수패 몸통은 부수가 붙지 않습니다.</p>
                    <p>
                        핑후가 부수가 붙지 않는 형태라고 부르는 이유도 슌쯔 중심 손패이기
                        때문입니다.
                    </p>
                </GuideBlock>

                <GuideBlock title="몸통 부수: 커쯔">
                    <p>
                        <b>중장패 밍커</b>: +2부
                    </p>
                    <p>
                        <b>중장패 안커</b>: +4부
                    </p>
                    <p>
                        <b>요구패 밍커</b>: +4부
                    </p>
                    <p>
                        <b>요구패 안커</b>: +8부
                    </p>
                    <p className="text-xs font-semibold text-foreground/45">
                        중장패는 2~8 수패, 요구패는 1·9 수패와 자패입니다.
                    </p>
                </GuideBlock>

                <GuideBlock title="몸통 부수: 깡쯔">
                    <p>
                        <b>중장패 밍깡</b>: +8부
                    </p>
                    <p>
                        <b>중장패 안깡</b>: +16부
                    </p>
                    <p>
                        <b>요구패 밍깡</b>: +16부
                    </p>
                    <p>
                        <b>요구패 안깡</b>: +32부
                    </p>
                    <p>깡쯔는 커쯔보다 부수가 훨씬 크게 붙습니다.</p>
                </GuideBlock>

                <GuideBlock title="대기 부수">
                    <p>
                        <b>양면 대기</b>: 0부
                    </p>
                    <p>
                        <b>간짱 대기</b>: +2부
                    </p>
                    <p>
                        <b>변짱 대기</b>: +2부
                    </p>
                    <p>
                        <b>단기 대기</b>: +2부
                    </p>
                    <p className="text-xs font-semibold text-foreground/45">
                        간짱은 가운데를 기다리는 형태, 변짱은 12에서 3 또는 89에서 7을
                        기다리는 형태, 단기는 머리를 기다리는 형태입니다.
                    </p>
                </GuideBlock>

                <GuideBlock title="특수 부수">
                    <p>
                        <b>치또이쯔</b>: 25부 고정
                    </p>
                    <p>
                        <b>핑후 쯔모</b>: 20부
                    </p>
                    <p>
                        <b>멘젠 핑후 론</b>: 기본 20부 + 멘젠 론 10부 = 30부
                    </p>
                    <p>
                        <b>쿠이핑후 형태</b>: 후로 상태에서 부수가 전혀 붙지 않는 형태는
                        30부로 계산하는 경우가 많습니다.
                    </p>
                </GuideBlock>

                <GuideBlock title="만관 이상">
                    <p>5판 이상은 기본적으로 부수와 무관하게 한계 점수로 계산합니다.</p>
                    <p>3판 70부 이상, 4판 40부 이상도 만관으로 올립니다.</p>
                    <p>6~7판은 하네만, 8~10판은 배만, 11~12판은 삼배만입니다.</p>
                    <p>역만은 별도 점수 체계를 사용합니다.</p>
                </GuideBlock>
            </div>

            <section className="rounded-2xl border border-foreground/10 bg-background p-5 shadow-sm">
                <h3 className="mb-3 font-black">부수 계산 예시</h3>

                <div className="space-y-4 text-sm font-medium leading-relaxed text-foreground/65">
                    <div className="rounded-2xl bg-foreground/5 p-4">
                        <div className="mb-2 font-black text-foreground">
                            예시 1. 멘젠 핑후 론
                        </div>
                        <p>기본 20부 + 멘젠 론 10부 = 30부</p>
                        <p className="mt-1 text-xs font-semibold text-foreground/45">
                            핑후는 몸통, 머리, 대기에서 부수가 붙지 않는 형태입니다.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-foreground/5 p-4">
                        <div className="mb-2 font-black text-foreground">
                            예시 2. 자 리치 쯔모, 핑후 없음
                        </div>
                        <p>기본 20부 + 쯔모 2부 = 22부 → 30부</p>
                        <p className="mt-1 text-xs font-semibold text-foreground/45">
                            일반 손패는 10부 단위로 올림합니다.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-foreground/5 p-4">
                        <div className="mb-2 font-black text-foreground">
                            예시 3. 역패 커쯔가 있는 론
                        </div>
                        <p>기본 20부 + 역패 밍커 4부 = 24부 → 30부</p>
                        <p className="mt-1 text-xs font-semibold text-foreground/45">
                            역패 커쯔는 요구패 커쯔이므로 밍커 기준 4부입니다.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-foreground/5 p-4">
                        <div className="mb-2 font-black text-foreground">
                            예시 4. 치또이쯔
                        </div>
                        <p>치또이쯔는 다른 부수 계산을 하지 않고 25부 고정입니다.</p>
                    </div>
                </div>
            </section>
        </div>
    );
}