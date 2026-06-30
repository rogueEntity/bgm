// web/src/app/(main)/notices/[id]/page.tsx
import { db } from "@/lib/prisma";
import { isCurrentUserAdmin } from "@/lib/admin";
import Link from "next/link";
import { notFound } from "next/navigation";

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

export default async function NoticeDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const resolvedParams = await params;
  const noticeId = Number(resolvedParams.id);

  if (!Number.isInteger(noticeId) || noticeId <= 0) {
    notFound();
  }

  const isAdmin = await isCurrentUserAdmin();

  const notice = await db.home_notices.findUnique({
    where: {
      id: noticeId,
    },
    include: {
      users: {
        select: {
          nickname: true,
          avatar_emoji: true,
        },
      },
    },
  });

  if (!notice) {
    notFound();
  }

  if (!notice.is_published && !isAdmin) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-foreground/10 p-6 md:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
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

          {!notice.is_published && (
            <span className="inline-flex items-center rounded-full border border-foreground/10 bg-foreground/5 px-2.5 py-1 text-xs font-semibold text-foreground/50">
              비공개
            </span>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold">{notice.title}</h1>

        {notice.summary && (
          <p className="mt-3 text-sm md:text-base text-foreground/60">
            {notice.summary}
          </p>
        )}

        <div className="mt-4 text-xs text-foreground/40">
          작성자:{" "}
          {notice.users
            ? `${notice.users.avatar_emoji} ${notice.users.nickname}`
            : "알 수 없음"}{" "}
          · 작성일: {formatDateTime(notice.created_at)} · 수정일:{" "}
          {formatDateTime(notice.updated_at)}
        </div>
      </section>

      <section className="rounded-2xl border border-foreground/10 p-6 md:p-8">
        {notice.content ? (
          <div className="whitespace-pre-wrap text-sm md:text-base leading-7 text-foreground/80">
            {notice.content}
          </div>
        ) : (
          <p className="text-sm text-foreground/60">
            상세 내용이 등록되지 않았습니다.
          </p>
        )}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex gap-2">
          <Link href="/notices">목록으로</Link>
          <Link href="/">홈으로</Link>
          {isAdmin && <Link href={`/admin/notices/${notice.id}/edit`}>공지 수정</Link>}
        </div>

        {isAdmin && (
          <Link
            href={`/admin/notices/${notice.id}/edit`}
            className="rounded-xl bg-foreground px-4 py-2 text-center text-sm font-semibold text-background hover:opacity-90 transition"
          >
            공지 수정
          </Link>
        )}
      </div>
    </div>
  );
}