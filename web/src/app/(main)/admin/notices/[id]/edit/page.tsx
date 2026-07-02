// web/src/app/(main)/admin/notices/[id]/edit/page.tsx
import NoticeForm from "@/components/notices/NoticeForm";
import { requireAdminUser } from "@/lib/admin";
import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { MAHJONG_GAME_KEY } from "@/features/games/mahjong/constants";
import { assertGameEnabled } from "@/features/games/shared/enabled-games";

export default async function NoticeEditPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  assertGameEnabled(MAHJONG_GAME_KEY);
  await requireAdminUser();

  const resolvedParams = await params;
  const noticeId = Number(resolvedParams.id);

  if (!Number.isInteger(noticeId) || noticeId <= 0) {
    notFound();
  }

  const notice = await db.home_notices.findUnique({
    where: {
      id: noticeId,
    },
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      category: true,
      is_pinned: true,
      is_published: true,
    },
  });

  if (!notice) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl md:text-3xl font-bold">공지 수정</h1>
        <p className="mt-2 text-sm text-foreground/60">
          공지 제목, 내용, 공개 여부, 고정 여부를 수정합니다.
        </p>
      </section>

      <NoticeForm mode="edit" notice={notice} />
    </div>
  );
}