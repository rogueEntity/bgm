// web/src/components/tichu/TichuRoundLogCards.tsx

type TichuTeamKey = "TEAM_A" | "TEAM_B";
type TichuCallResult = "SUCCESS" | "FAIL";

type TichuCallLog = {
    player_key?: string;
    result?: TichuCallResult | string;
    score_delta?: number;
};

type TichuRoundLog = {
    round?: number;
    first_out_player_key?: string;
    team_a_card_score?: number | null;
    team_b_card_score?: number | null;
    one_two_team_key?: TichuTeamKey | null;
    small_tichu_calls?: TichuCallLog[];
    large_tichu_calls?: TichuCallLog[];
    score_deltas?: Partial<Record<TichuTeamKey, number>>;
    total_scores?: Partial<Record<TichuTeamKey, number>>;
    created_at?: string;
};

type TichuPlayerState = {
    name?: string;
    team_key?: TichuTeamKey;
    seat_order?: number;
};

type TichuDetails = {
    teams?: {
        TEAM_A?: {
            name?: string;
            score?: number;
            player_keys?: string[];
        };
        TEAM_B?: {
            name?: string;
            score?: number;
            player_keys?: string[];
        };
    };
    players?: Record<string, TichuPlayerState>;
    logs?: unknown[];
};

type TichuRoundLogCardsProps = {
    details: TichuDetails;
};

const TEAM_LABEL_MAP: Record<TichuTeamKey, string> = {
    TEAM_A: "A팀",
    TEAM_B: "B팀",
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTichuCallLog(value: unknown): value is TichuCallLog {
    if (!isRecord(value)) return false;

    return (
        typeof value.player_key === "string" &&
        typeof value.score_delta === "number"
    );
}

function getTichuCallLogs(value: unknown): TichuCallLog[] {
    if (!Array.isArray(value)) return [];

    return value.filter(isTichuCallLog);
}

function getTichuRoundLog(value: unknown): TichuRoundLog | null {
    if (!isRecord(value)) return null;

    return {
        round: typeof value.round === "number" ? value.round : undefined,
        first_out_player_key:
            typeof value.first_out_player_key === "string"
                ? value.first_out_player_key
                : undefined,
        team_a_card_score:
            typeof value.team_a_card_score === "number" ||
            value.team_a_card_score === null
                ? value.team_a_card_score
                : undefined,
        team_b_card_score:
            typeof value.team_b_card_score === "number" ||
            value.team_b_card_score === null
                ? value.team_b_card_score
                : undefined,
        one_two_team_key:
            value.one_two_team_key === "TEAM_A" || value.one_two_team_key === "TEAM_B"
                ? value.one_two_team_key
                : null,
        small_tichu_calls: getTichuCallLogs(value.small_tichu_calls),
        large_tichu_calls: getTichuCallLogs(value.large_tichu_calls),
        score_deltas: isRecord(value.score_deltas)
            ? {
                TEAM_A:
                    typeof value.score_deltas.TEAM_A === "number"
                        ? value.score_deltas.TEAM_A
                        : undefined,
                TEAM_B:
                    typeof value.score_deltas.TEAM_B === "number"
                        ? value.score_deltas.TEAM_B
                        : undefined,
            }
            : undefined,
        total_scores: isRecord(value.total_scores)
            ? {
                TEAM_A:
                    typeof value.total_scores.TEAM_A === "number"
                        ? value.total_scores.TEAM_A
                        : undefined,
                TEAM_B:
                    typeof value.total_scores.TEAM_B === "number"
                        ? value.total_scores.TEAM_B
                        : undefined,
            }
            : undefined,
        created_at:
            typeof value.created_at === "string" ? value.created_at : undefined,
    };
}

function formatScore(value: number | null | undefined) {
    if (typeof value !== "number") return "-";

    return value > 0 ? `+${value.toLocaleString()}` : value.toLocaleString();
}

function formatPlainScore(value: number | null | undefined) {
    if (typeof value !== "number") return "-";

    return value.toLocaleString();
}

function getTeamName(details: TichuDetails, teamKey: TichuTeamKey) {
    return details.teams?.[teamKey]?.name ?? TEAM_LABEL_MAP[teamKey];
}

function getPlayerName(details: TichuDetails, playerKey: string | undefined) {
    if (!playerKey) return "알 수 없음";

    return details.players?.[playerKey]?.name ?? playerKey;
}

function getPlayerTeamName(details: TichuDetails, playerKey: string | undefined) {
    if (!playerKey) return null;

    const teamKey = details.players?.[playerKey]?.team_key;

    if (!teamKey) return null;

    return getTeamName(details, teamKey);
}

function getResultLabel(result: string | undefined) {
    if (result === "SUCCESS") return "성공";
    if (result === "FAIL") return "실패";

    return "알 수 없음";
}

function getResultClassName(result: string | undefined) {
    if (result === "SUCCESS") {
        return "border-green-500/20 bg-green-500/10 text-green-600";
    }

    if (result === "FAIL") {
        return "border-red-500/20 bg-red-500/10 text-red-500";
    }

    return "border-foreground/10 bg-foreground/5 text-foreground/50";
}

function formatCreatedAt(value: string | undefined) {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return null;

    return new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function TichuCallBadges({
                             title,
                             calls,
                             details,
                         }: {
    title: string;
    calls: TichuCallLog[];
    details: TichuDetails;
}) {
    if (calls.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            <p className="text-xs font-black text-foreground/45">{title}</p>

            <div className="flex flex-wrap gap-2">
                {calls.map((call) => {
                    const resultClassName = getResultClassName(call.result);
                    const playerName = getPlayerName(details, call.player_key);
                    const teamName = getPlayerTeamName(details, call.player_key);

                    return (
                        <span
                            key={`${title}-${call.player_key}-${call.result}`}
                            className={`rounded-full border px-3 py-1 text-xs font-black ${resultClassName}`}
                        >
              {playerName}
                            {teamName ? ` · ${teamName}` : ""} · {getResultLabel(call.result)}{" "}
                            {formatScore(call.score_delta)}
            </span>
                    );
                })}
            </div>
        </div>
    );
}

export default function TichuRoundLogCards({
                                               details,
                                           }: TichuRoundLogCardsProps) {
    const logs = (details.logs ?? [])
        .map(getTichuRoundLog)
        .filter((log): log is TichuRoundLog => log !== null)
        .sort((a, b) => {
            return (b.round ?? 0) - (a.round ?? 0);
        });

    if (logs.length === 0) {
        return (
            <section className="rounded-3xl border border-dashed border-foreground/15 bg-foreground/[0.02] p-6 text-center">
                <p className="font-black">아직 기록된 라운드가 없습니다.</p>
                <p className="mt-2 text-sm text-foreground/50">
                    라운드를 기록하면 이곳에 이전 라운드 기록이 표시됩니다.
                </p>
            </section>
        );
    }

    const teamAName = getTeamName(details, "TEAM_A");
    const teamBName = getTeamName(details, "TEAM_B");

    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-lg font-black">라운드 기록</h3>
                <p className="mt-1 text-sm text-foreground/50">
                    최근 라운드가 위쪽에 표시됩니다.
                </p>
            </div>

            <div className="space-y-3">
                {logs.map((log) => {
                    const createdAt = formatCreatedAt(log.created_at);
                    const firstOutPlayerName = getPlayerName(
                        details,
                        log.first_out_player_key,
                    );
                    const firstOutTeamName = getPlayerTeamName(
                        details,
                        log.first_out_player_key,
                    );
                    const oneTwoTeamName = log.one_two_team_key
                        ? getTeamName(details, log.one_two_team_key)
                        : null;

                    return (
                        <article
                            key={`${log.round}-${log.created_at ?? ""}`}
                            className="rounded-3xl border border-foreground/10 bg-background p-5 shadow-sm"
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="text-lg font-black">
                                            {log.round ?? "-"}라운드
                                        </h4>

                                        {oneTwoTeamName ? (
                                            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-500">
                        {oneTwoTeamName} 원투
                      </span>
                                        ) : null}
                                    </div>

                                    <p className="mt-1 text-sm font-bold text-foreground/45">
                                        1등 {firstOutPlayerName}
                                        {firstOutTeamName ? ` · ${firstOutTeamName}` : ""}
                                        {createdAt ? ` · ${createdAt}` : ""}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-right sm:min-w-56">
                                    <div className="rounded-2xl bg-foreground/[0.04] px-4 py-3">
                                        <p className="text-xs font-bold text-foreground/45">
                                            {teamAName}
                                        </p>
                                        <p className="mt-1 text-lg font-black">
                                            {formatScore(log.score_deltas?.TEAM_A)}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-foreground/40">
                                            누적 {formatPlainScore(log.total_scores?.TEAM_A)}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-foreground/[0.04] px-4 py-3">
                                        <p className="text-xs font-bold text-foreground/45">
                                            {teamBName}
                                        </p>
                                        <p className="mt-1 text-lg font-black">
                                            {formatScore(log.score_deltas?.TEAM_B)}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-foreground/40">
                                            누적 {formatPlainScore(log.total_scores?.TEAM_B)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
                                    <p className="text-xs font-black text-foreground/45">
                                        카드 점수
                                    </p>

                                    {oneTwoTeamName ? (
                                        <p className="mt-2 text-sm font-bold text-foreground/60">
                                            원투 처리로 카드 점수 없음
                                        </p>
                                    ) : (
                                        <div className="mt-2 flex items-center justify-between gap-3 text-sm font-bold">
                      <span>
                        {teamAName} {formatPlainScore(log.team_a_card_score)}
                      </span>
                                            <span>
                        {teamBName} {formatPlainScore(log.team_b_card_score)}
                      </span>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
                                    <p className="text-xs font-black text-foreground/45">
                                        선언 요약
                                    </p>
                                    <p className="mt-2 text-sm font-bold text-foreground/60">
                                        스몰 {log.small_tichu_calls?.length ?? 0}명 · 라지{" "}
                                        {log.large_tichu_calls?.length ?? 0}명
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 space-y-3">
                                <TichuCallBadges
                                    title="스몰 티츄"
                                    calls={log.small_tichu_calls ?? []}
                                    details={details}
                                />

                                <TichuCallBadges
                                    title="라지 티츄"
                                    calls={log.large_tichu_calls ?? []}
                                    details={details}
                                />
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}