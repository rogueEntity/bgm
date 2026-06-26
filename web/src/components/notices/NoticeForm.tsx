// web/src/components/notices/NoticeForm.tsx
import {
  createHomeNotice,
  updateHomeNotice,
} from "@/app/actions/notice.action";
import Link from "next/link";

type NoticeFormNotice = {
  id: number;
  title: string;
  summary: string | null;
  content: string | null;
  category: string;
  is_pinned: boolean;
  is_published: boolean;
};

type NoticeFormProps = {
  mode: "create" | "edit";
  notice?: NoticeFormNotice;
};

const CATEGORY_OPTIONS = [
  { value: "NOTICE", label: "공지" },
  { value: "UPDATE", label: "업데이트" },
  { value: "EVENT", label: "이벤트" },
  { value: "SYSTEM", label: "시스템" },
];

export default function NoticeForm({ mode, notice }: NoticeFormProps) {
  const isEditMode = mode === "edit";

  return (
    <form
      action={isEditMode ? updateHomeNotice : createHomeNotice}
      className="space-y-5 rounded-2xl border border-foreground/10 p-5"
    >
      {isEditMode && notice && (
        <input type="hidden" name="id" value={notice.id} />
      )}

      <div className="space-y-2">
        <label className="block text-sm font-semibold">카테고리</label>
        <select
          name="category"
          defaultValue={notice?.category ?? "NOTICE"}
          className="w-full rounded-xl border border-foreground/10 bg-background px-3 py-2 text-sm"
        >
          {CATEGORY_OPTIONS.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold">제목</label>
        <input
          name="title"
          defaultValue={notice?.title ?? ""}
          required
          maxLength={200}
          placeholder="공지 제목을 입력하세요"
          className="w-full rounded-xl border border-foreground/10 bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold">요약</label>
        <textarea
          name="summary"
          defaultValue={notice?.summary ?? ""}
          maxLength={500}
          rows={3}
          placeholder="홈 화면에 표시할 짧은 요약을 입력하세요"
          className="w-full resize-none rounded-xl border border-foreground/10 bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold">본문</label>
        <textarea
          name="content"
          defaultValue={notice?.content ?? ""}
          rows={8}
          placeholder="공지 상세 내용을 입력하세요"
          className="w-full resize-y rounded-xl border border-foreground/10 bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isPinned"
            defaultChecked={notice?.is_pinned ?? false}
            className="h-4 w-4"
          />
          홈 상단 고정
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={notice?.is_published ?? true}
            className="h-4 w-4"
          />
          공개
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Link
          href="/admin/notices"
          className="rounded-xl border border-foreground/10 px-4 py-2 text-center text-sm font-semibold hover:bg-foreground/5 transition"
        >
          취소
        </Link>

        <button
          type="submit"
          className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 transition"
        >
          {isEditMode ? "공지 수정" : "공지 등록"}
        </button>
      </div>
    </form>
  );
}