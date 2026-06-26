// web/src/app/actions/notice.action.ts
"use server";

import { requireAdminUser } from "@/lib/admin";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const NOTICE_CATEGORIES = ["NOTICE", "UPDATE", "EVENT", "SYSTEM"] as const;

function normalizeString(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function normalizeNullableString(value: FormDataEntryValue | null) {
  const normalizedValue = normalizeString(value);
  return normalizedValue ? normalizedValue : null;
}

function normalizeNoticeCategory(value: FormDataEntryValue | null) {
  const category = normalizeString(value).toUpperCase();

  if (NOTICE_CATEGORIES.includes(category as (typeof NOTICE_CATEGORIES)[number])) {
    return category;
  }

  return "NOTICE";
}

function normalizeNoticeId(value: FormDataEntryValue | null) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("올바르지 않은 공지 ID입니다.");
  }

  return id;
}

export async function createHomeNotice(formData: FormData) {
  const currentUser = await requireAdminUser();

  const title = normalizeString(formData.get("title"));
  const summary = normalizeNullableString(formData.get("summary"));
  const content = normalizeNullableString(formData.get("content"));
  const category = normalizeNoticeCategory(formData.get("category"));
  const isPinned = formData.get("isPinned") === "on";
  const isPublished = formData.get("isPublished") === "on";

  if (!title) {
    throw new Error("제목을 입력해 주세요.");
  }

  await db.home_notices.create({
    data: {
      title,
      summary,
      content,
      category,
      is_pinned: isPinned,
      is_published: isPublished,
      created_by: currentUser.id,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/notices");

  redirect("/admin/notices");
}

export async function updateHomeNotice(formData: FormData) {
  await requireAdminUser();

  const id = normalizeNoticeId(formData.get("id"));
  const title = normalizeString(formData.get("title"));
  const summary = normalizeNullableString(formData.get("summary"));
  const content = normalizeNullableString(formData.get("content"));
  const category = normalizeNoticeCategory(formData.get("category"));
  const isPinned = formData.get("isPinned") === "on";
  const isPublished = formData.get("isPublished") === "on";

  if (!title) {
    throw new Error("제목을 입력해 주세요.");
  }

  await db.home_notices.update({
    where: {
      id,
    },
    data: {
      title,
      summary,
      content,
      category,
      is_pinned: isPinned,
      is_published: isPublished,
    },
  });

  revalidatePath("/");
  revalidatePath(`/notices/${id}`);
  revalidatePath("/admin/notices");
  revalidatePath(`/admin/notices/${id}/edit`);

  redirect("/admin/notices");
}

export async function deleteHomeNotice(formData: FormData) {
  await requireAdminUser();

  const id = normalizeNoticeId(formData.get("id"));

  await db.home_notices.delete({
    where: {
      id,
    },
  });

  revalidatePath("/");
  revalidatePath(`/notices/${id}`);
  revalidatePath("/admin/notices");

  redirect("/admin/notices");
}