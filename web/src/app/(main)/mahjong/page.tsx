// web/src/app/(main)/mahjong/page.tsx
import Link from "next/link";

export default function MahjongDashboardPage() {
  // TODO: 실제 DB에서 진행 중인 대국 여부와 타임라인 데이터를 가져올 예정입니다.
  const hasActiveGame = true; // 임시: 진행 중인 대국이 있다고 가정

  return (
    <div className="max-w-3xl mx-auto w-full space-y-8">
      {/* 1. 헤더 영역 */}
      <header>
        <h2 className="text-3xl font-black mb-2">리치마작 대시보드</h2>
        <p className="text-foreground/60 font-semibold">
          오늘도 즐거운 마작 되세요!
        </p>
      </header>

      {/* 2. 핵심 액션 영역 (진행 중인 대국 & 새 대국) */}
      <div className="flex flex-col gap-3">
        {hasActiveGame && (
          <Link
            href="/mahjong/play/mock-id"
            className="w-full bg-blue-500 text-white p-5 rounded-2xl font-black text-lg flex items-center justify-between transition hover:bg-blue-600 shadow-md"
          >
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white/80 mb-1">진행 중인 대국이 있습니다</span>
              <span>동 2국 이어하기 ➡️</span>
            </div>
          </Link>
        )}

        <Link
          href="/mahjong/new"
          className="w-full bg-foreground text-background p-5 rounded-2xl font-black text-lg flex items-center justify-center transition hover:opacity-90 shadow-sm"
        >
          + 새 대국 시작하기
        </Link>
      </div>

      {/* 3. 타임라인 / 최신 소식 (커뮤니티 요소) */}
      <div className="bg-foreground/5 p-6 rounded-2xl border border-foreground/10 space-y-4">
        <h3 className="font-bold text-lg">🔥 최근 소식</h3>
        <ul className="space-y-3">
          <li className="text-sm font-medium flex gap-2">
            <span>🎉</span>
            <span>김현욱님이 방금 전 대국에서 <b>역만(국사무쌍)</b>을 화료했습니다!</span>
          </li>
          <li className="text-sm font-medium flex gap-2">
            <span>👑</span>
            <span>지인A님이 누적 10만 점을 돌파했습니다.</span>
          </li>
          <li className="text-sm font-medium flex gap-2">
            <span>📉</span>
            <span>지인B님의 최근 5경기 평균 순위가 3.8위로 하락했습니다.</span>
          </li>
        </ul>
      </div>

      {/* 4. 하위 메뉴 카드 영역 (그리드 레이아웃) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          href="/mahjong/ranking"
          className="bg-foreground/5 p-4 rounded-2xl border border-foreground/10 flex flex-col items-center justify-center gap-2 transition hover:bg-foreground/10 hover:border-foreground/30"
        >
          <span className="text-3xl">🏆</span>
          <span className="font-bold text-sm">랭킹</span>
        </Link>

        <Link
          href="/mahjong/player"
          className="bg-foreground/5 p-4 rounded-2xl border border-foreground/10 flex flex-col items-center justify-center gap-2 transition hover:bg-foreground/10 hover:border-foreground/30"
        >
          <span className="text-3xl">🀄</span>
          <span className="font-bold text-sm">작사 정보</span>
        </Link>

        <Link
          href="/mahjong/achievements"
          className="bg-foreground/5 p-4 rounded-2xl border border-foreground/10 flex flex-col items-center justify-center gap-2 transition hover:bg-foreground/10 hover:border-foreground/30"
        >
          <span className="text-3xl">🏅</span>
          <span className="font-bold text-sm">도전과제</span>
        </Link>

        <Link
          href="/mahjong/rival"
          className="bg-foreground/5 p-4 rounded-2xl border border-foreground/10 flex flex-col items-center justify-center gap-2 transition hover:bg-foreground/10 hover:border-foreground/30"
        >
          <span className="text-3xl">⚔️</span>
          <span className="font-bold text-sm">라이벌</span>
        </Link>
      </div>
    </div>
  );
}