// web/src/app/(main)/mahjong/matches/page.tsx

import Link from "next/link";

import { getMahjongMatches } from "@/app/actions/mahjong.action";
import { getMahjongEquippedBadgesByUserIds } from "@/app/actions/mahjong-achievement.action";
import NicknameWithBadges from "@/components/mahjong/NicknameWithBadges";
import { getUserIdFromPlayerKey } from "@/lib/mahjong-achievements";

type MahjongMatchesPageProps = {
  searchParams: Promise<{
    status?: string;
    game_mode?: string;
    keyword?: string;
    only_mine?: string;
  }>;
};

const STATUS_OPTIONS = [
  { value: "ALL", label: "전체" },
  { value: "PLAYING", label: "진행 중" },
  { value: "FINISHED", label: "종료" },
] as const;

const GAME_MODE_OPTIONS = [
  { value: "ALL", label: "전체" },
  { value: "동풍전", label: "동풍전" },
  { value: "반장전", label: "반장전" },
  { value: "전장전", label: "전장전" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  PLAYING: "진행 중",
  FINISHED: "종료",
};

const WIND_LABEL: Record<string, string> = {
  EAST: "동",
  SOUTH: "남",
  WEST: "서",
  NORTH: "북",
};

const ROUND_NAME_MAP: Record<string, string> = {
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

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusClassName(status: string) {
  if (status === "PLAYING") {
    return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  }

  return "bg-foreground/10 text-foreground/70 border-foreground/10";
}

export default async function MahjongMatchesPage({
  searchParams,
}: MahjongMatchesPageProps) {
  const resolvedSearchParams = await searchParams;

  const status =
    resolvedSearchParams.status === "PLAYING" ||
    resolvedSearchParams.status === "FINISHED"
      ? resolvedSearchParams.status
      : "ALL";

  const gameMode =
    resolvedSearchParams.game_mode === "동풍전" ||
    resolvedSearchParams.game_mode === "반장전" ||
    resolvedSearchParams.game_mode === "전장전"
      ? resolvedSearchParams.game_mode
      : "ALL";

  const keyword = resolvedSearchParams.keyword ?? "";
  const onlyMine = resolvedSearchParams.only_mine === "on";

  const formKey = `${status}-${gameMode}-${keyword}-${onlyMine}`;

  const matches = await getMahjongMatches({
    status,
    game_mode: gameMode,
    keyword,
    only_mine: onlyMine,
  });

  const userIds = Array.from(
    new Set(
      matches
        .flatMap((match) => match.players)
        .map((player) => getUserIdFromPlayerKey(player.key))
        .filter((userId): userId is string => userId !== null),
    ),
  );

  const equippedBadgeMap = await getMahjongEquippedBadgesByUserIds(userIds);

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      <header className="space-y-2">
        <Link
          href="/mahjong"
          className="text-sm font-bold text-foreground/60 hover:text-foreground"
        >
          ← 리치마작 대시보드
        </Link>

        <div>
          <h2 className="text-3xl font-black mb-2">대국 기록</h2>
          <p className="text-foreground/60 font-semibold">
            전체 대국 기록을 확인하고 조건별로 필터링합니다.
          </p>
        </div>
      </header>

      <form
        key={formKey}
        className="bg-foreground/5 p-4 rounded-2xl border border-foreground/10 space-y-3"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-bold text-foreground/60">상태</span>
            <select
              name="status"
              defaultValue={status}
              className="w-full bg-background border border-foreground/10 rounded-xl px-3 py-2 text-sm font-semibold"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-bold text-foreground/60">
              대국 방식
            </span>
            <select
              name="game_mode"
              defaultValue={gameMode}
              className="w-full bg-background border border-foreground/10 rounded-xl px-3 py-2 text-sm font-semibold"
            >
              {GAME_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-bold text-foreground/60">
              검색어
            </span>
            <input
              name="keyword"
              defaultValue={keyword}
              placeholder="대국 ID / 작사명"
              className="w-full bg-background border border-foreground/10 rounded-xl px-3 py-2 text-sm font-semibold"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm font-bold text-foreground/70">
          <input
            type="checkbox"
            name="only_mine"
            defaultChecked={onlyMine}
            className="size-4 accent-foreground"
          />
          내 기록만 보기
        </label>

        <div className="flex gap-2 justify-end">
          <Link
            href="/mahjong/matches"
            className="px-4 py-2 rounded-xl border border-foreground/10 text-sm font-bold hover:bg-foreground/10 transition"
          >
            초기화
          </Link>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-foreground text-background text-sm font-bold hover:opacity-90 transition"
          >
            필터 적용
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg">대국 리스트</h3>
          <span className="text-sm font-bold text-foreground/50">
            {matches.length}건
          </span>
        </div>

        {matches.length === 0 ? (
          <div className="bg-foreground/5 p-6 rounded-2xl border border-foreground/10 text-center text-sm font-bold text-foreground/50">
            조회된 대국 기록이 없습니다.
          </div>
        ) : (
          <ul className="space-y-3">
            {matches.map((match) => {
              const sortedPlayers = [...match.players].sort((a, b) => {
                if (a.rank && b.rank) {
                  return a.rank - b.rank;
                }

                return (b.score ?? 0) - (a.score ?? 0);
              });

              return (
                <li key={match.id}>
                  <Link
                    href={
                      match.status === "PLAYING"
                        ? `/mahjong/play/${match.id}`
                        : `/mahjong/detail/${match.id}`
                    }
                    className="block bg-foreground/5 p-4 rounded-2xl border border-foreground/10 hover:bg-foreground/10 hover:border-foreground/30 transition"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-black">#{match.id}</span>
                          <span
                            className={`text-xs font-black px-2 py-1 rounded-full border ${getStatusClassName(
                              match.status,
                            )}`}
                          >
                            {STATUS_LABEL[match.status] ?? match.status}
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-foreground/60">
                          {formatDate(match.play_date)}
                        </p>
                      </div>

                      <div className="text-right text-sm font-bold text-foreground/60">
                        <div>{match.game_mode}</div>
                        <div>
                          {ROUND_NAME_MAP[match.current_round] ??
                            match.current_round}{" "}
                          / {match.honba}본장
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {sortedPlayers.map((player) => {
                        const userId = getUserIdFromPlayerKey(player.key);
                        const badges = userId
                          ? equippedBadgeMap[userId] ?? []
                          : [];

                        return (
                          <div
                            key={player.key}
                            className="bg-background/60 rounded-xl p-3 border border-foreground/5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 font-bold text-sm">
                                <NicknameWithBadges
                                  nickname={`${player.wind ? `${WIND_LABEL[player.wind]} ` : ""}${player.name}`}
                                  badges={badges}
                                  badgeSize="sm"
                                  className="max-w-full"
                                  nameClassName="max-w-[6.5rem] sm:max-w-[9rem]"
                                />
                              </span>

                              {player.rank && (
                                <span className="shrink-0 text-xs font-black text-foreground/50">
                                  {player.rank}위
                                </span>
                              )}
                            </div>

                            <div className="font-black mt-1">
                              {player.score?.toLocaleString() ?? "-"}점
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}