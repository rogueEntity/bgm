// web/src/app/(main)/admin/notices/page.tsx
import { auth } from "@/auth";
import { deleteHomeNotice } from "@/app/actions/notice.action";
import NoticeForm from "@/components/notices/NoticeForm";
import { db } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

const CATEGORY_LABEL: Record<string, string> = {
  NOTICE: "공지",
  UPDATE: "업데이트",
  EVENT: "이벤트",
  SYSTEM: "시스템",
};

function formatDateTime(value?: Date | string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getCategoryLabel(category: string) {
  return CATEGORY_LABEL[category] ?? category;
}

function getCategoryClassName(category: string) {
  if (category === "NOTICE") {
    return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  }

  if (category === "UPDATE") {
    return "bg-green-500/10 text-green-500 border-green-500/20";
  }

  if (category === "EVENT") {
    return "bg-purple-500/10 text-purple-500 border-purple-500/20";
  }

  return "bg-foreground/10 text-foreground/70 border-foreground/10";
}

export default async function NoticesPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const notices = await db.home_notices.findMany({
    include: {
      users: {
        select: {
          nickname: true,
          avatar_emoji: true,
        },
      },
    },
    orderBy: [
      {
        is_pinned: "desc",
      },
      {
        created_at: "desc",
      },
    ],
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl md:text-3xl font-bold">공지사항 관리</h1>
        <p className="mt-2 text-sm text-foreground/60">
          메인 홈에 노출할 새 소식, 업데이트, 이벤트, 시스템 안내를 관리합니다.
        </p>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">공지 등록</h2>
          <p className="mt-1 text-sm text-foreground/60">
            공개 상태인 공지는 메인 홈 새 소식 영역에 표시됩니다.
          </p>
        </div>

        <NoticeForm mode="create" />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">공지 목록</h2>
          <p className="mt-1 text-sm text-foreground/60">
            고정 공지가 먼저 표시되고, 이후 최신순으로 정렬됩니다.
          </p>
        </div>

        <div className="rounded-2xl border border-foreground/10 overflow-hidden">
          {notices.length === 0 ? (
            <div className="p-6 text-sm text-foreground/60">
              등록된 공지가 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-foreground/10">
              {notices.map((notice) => (
                <article key={notice.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getCategoryClassName(
                            notice.category
                          )}`}
                        >
                          {getCategoryLabel(notice.category)}
                        </span>

                        {notice.is_pinned && (
                          <span className="inline-flex items-center rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-1 text-xs font-semibold text-yellow-600">
                            고정
                          </span>
                        )}

                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            notice.is_published
                              ? "border-green-500/20 bg-green-500/10 text-green-500"
                              : "border-foreground/10 bg-foreground/5 text-foreground/50"
                          }`}
                        >
                          {notice.is_published ? "공개" : "비공개"}
                        </span>
                      </div>

                      <h3 className="font-semibold">{notice.title}</h3>

                      {notice.summary && (
                        <p className="mt-1 text-sm text-foreground/60">
                          {notice.summary}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-foreground/40">
                        작성자:{" "}
                        {notice.users
                          ? `${notice.users.avatar_emoji} ${notice.users.nickname}`
                          : "알 수 없음"}{" "}
                        · 작성일: {formatDateTime(notice.created_at)} · 수정일:{" "}
                        {formatDateTime(notice.updated_at)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                      <Link
                        href={`/admin/notices/${notice.id}/edit`}
                        className="rounded-xl border border-foreground/10 px-4 py-2 text-center text-sm font-semibold hover:bg-foreground/5 transition"
                      >
                        수정
                      </Link>

                      <form action={deleteHomeNotice}>
                        <input type="hidden" name="id" value={notice.id} />
                        <button
                          type="submit"
                          className="w-full rounded-xl border border-red-500/20 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/10 transition"
                        >
                          삭제
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}