// web/src/app/(main)/notices/page.tsx

import { db } from "@/lib/prisma";
import Link from "next/link";

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
    const notices = await db.home_notices.findMany({
        where: {
            is_published: true,
        },
        orderBy: [
            { is_pinned: "desc" },
            { created_at: "desc" },
        ],
    });

    return (
        <div className="space-y-6">
            <section className="bg-background border border-foreground/10 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">공지사항</h1>
                        <p className="text-sm text-foreground/60 mt-1">
                            동호회 공지, 업데이트, 이벤트, 시스템 안내를 확인합니다.
                        </p>
                    </div>

                    <Link
                        href="/"
                        className="shrink-0 text-sm font-semibold text-foreground/60 hover:text-foreground transition-colors"
                    >
                        홈으로
                    </Link>
                </div>
            </section>

            <section className="bg-background border border-foreground/10 rounded-2xl p-5 shadow-sm">
                {notices.length === 0 ? (
                    <p className="text-sm text-foreground/50">
                        등록된 공지사항이 없습니다.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {notices.map((notice) => (
                            <Link
                                key={notice.id}
                                href={`/notices/${notice.id}`}
                                className="block rounded-xl border border-foreground/10 p-4 hover:bg-foreground/[0.03] transition-colors"
                            >
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full border ${getCategoryClassName(
                          notice.category,
                      )}`}
                  >
                    {getCategoryLabel(notice.category)}
                  </span>

                                    {notice.is_pinned && (
                                        <span className="text-xs font-semibold px-2 py-1 rounded-full border border-yellow-500/20 bg-yellow-500/10 text-yellow-600">
                      고정
                    </span>
                                    )}
                                </div>

                                <h2 className="font-bold">{notice.title}</h2>

                                {(notice.summary || notice.content) && (
                                    <p className="text-sm text-foreground/60 mt-1 line-clamp-2 whitespace-pre-line">
                                        {notice.summary ?? notice.content}
                                    </p>
                                )}

                                <p className="text-xs text-foreground/40 mt-3">
                                    {formatDateTime(notice.created_at)}
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}