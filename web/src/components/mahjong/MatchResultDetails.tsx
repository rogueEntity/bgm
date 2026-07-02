// web/src/components/mahjong/MatchResultDetails.tsx

import React from "react";
import NicknameWithBadges from "@/components/mahjong/NicknameWithBadges";
import UserAvatar from "@/components/common/UserAvatar";

interface MatchResultDetailsProps {
  details: any;
}

export default function MatchResultDetails({
  details,
}: MatchResultDetailsProps) {
  // 💡 우마는 MMR 산정용 지표로만 사용 (점수 합산 X)
  const UMA = [30, 10, -10, -30];

  const rankedPlayers = Object.entries(details.players)
    .map(([key, player]: [string, any]) => ({
      stateKey: key,
      ...player,
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="bg-background border border-foreground/10 rounded-2xl p-6 shadow-lg">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-blue-600 dark:text-blue-400">
            대국 종료
          </h2>
          <p className="text-sm font-bold opacity-60 mt-1">
            기록 점수 기반 순위 정산
          </p>
        </div>

        <div className="space-y-3">
          {rankedPlayers.map((player: any, index: number) => {
            const isFirst = index === 0;
            const umaValue = UMA[index];

            return (
              <div
                key={player.stateKey}
                className={`p-4 rounded-xl border transition-all ${
                  isFirst
                    ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20"
                    : "bg-foreground/5 border-foreground/5"
                }`}
              >
                <div className="flex items-center justify-between mb-2 gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex shrink-0 items-center justify-center font-black text-sm ${
                        isFirst
                          ? "bg-yellow-400 text-white"
                          : "bg-foreground/10"
                      }`}
                    >
                      {index + 1}
                    </div>

                    <UserAvatar
                      imageUrl={player.avatar_image_url}
                      emoji={player.avatar_emoji}
                      name={player.name}
                      size="sm"
                      className="h-8 w-8 text-sm"
                    />

                    <span className="min-w-0 font-extrabold text-lg">
                      <NicknameWithBadges
                          nickname={player.name ?? "이름 없음"}
                          badges={player.equipped_badges ?? []}
                          badgeSize="sm"
                          className="max-w-full flex-col items-start gap-1 md:flex-row md:items-center md:gap-1.5"
                          nameClassName="max-w-[7rem] md:max-w-[12rem]"
                      />
                    </span>
                  </div>

                  {/* 💡 순수 기록 점수만 표시 */}
                  <span className="shrink-0 text-2xl font-black">
                    {player.score.toLocaleString()}
                  </span>
                </div>

                {/* 💡 우마는 합산하지 않고 별도 표기 */}
                <div className="flex justify-end gap-4 text-xs font-bold opacity-60">
                  <span
                    className={umaValue >= 0 ? "text-blue-600" : "text-red-600"}
                  >
                    {umaValue > 0 ? "+" : ""}
                    {umaValue}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}