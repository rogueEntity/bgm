// web/src/actions/user.action.ts
"use server";

import { auth } from "@/auth";
import { db } from "@/lib/prisma";
import {
  deleteR2Object,
  getAvatarImageKey,
  uploadR2Object,
} from "@/lib/r2";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";

const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

type AvatarActionResult = {
  success: boolean;
  message: string;
  avatar_image_key?: string | null;
};

const NICKNAME_MIN_LENGTH = 1;
const NICKNAME_MAX_LENGTH = 6;

function validateNickname(nickname: string) {
  if (nickname.length < NICKNAME_MIN_LENGTH) {
    throw new Error(`닉네임은 ${NICKNAME_MIN_LENGTH}자 이상 입력해 주세요.`);
  }

  if (nickname.length > NICKNAME_MAX_LENGTH) {
    throw new Error(`닉네임은 ${NICKNAME_MAX_LENGTH}자 이하로 입력해 주세요.`);
  }
}

function normalizeNickname(nickname: FormDataEntryValue | string | null) {
  return String(nickname ?? "").trim();
}

function normalizeAvatarEmoji(avatarEmoji: FormDataEntryValue | string | null) {
  return String(avatarEmoji ?? "").trim();
}

async function getCurrentSessionUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("인증되지 않은 사용자입니다.");
  }

  // auth.config.ts에서 session.user.id는 providerAccountId로 세팅되어 있음
  const providerId = session.user.id;

  // @ts-ignore
  const provider = session.user.provider as string | undefined;

  if (!provider) {
    throw new Error("로그인 제공자 정보를 찾을 수 없습니다.");
  }

  return {
    provider,
    providerId,
  };
}

async function getCurrentDbUser() {
  const { provider, providerId } = await getCurrentSessionUser();

  const currentUser = await db.users.findUnique({
    where: {
      provider_provider_id: {
        provider,
        provider_id: providerId,
      },
    },
    select: {
      id: true,
      avatar_image_key: true,
      avatar_image_updated_at: true,
    },
  });

  if (!currentUser) {
    throw new Error("사용자 정보를 찾을 수 없습니다.");
  }

  return currentUser;
}

export async function saveOnboardingProfile(formData: FormData) {
  const { provider, providerId } = await getCurrentSessionUser();

  const nickname = normalizeNickname(formData.get("nickname"));
  const avatarEmoji = normalizeAvatarEmoji(formData.get("avatarEmoji"));

  if (!nickname || !avatarEmoji) {
    throw new Error("모든 필드를 입력해 주세요.");
  }

  validateNickname(nickname);

  const duplicatedUser = await db.users.findFirst({
    where: {
      nickname,
      NOT: {
        provider,
        provider_id: providerId,
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicatedUser) {
    throw new Error("이미 사용 중인 닉네임입니다.");
  }

  const existingUser = await db.users.findUnique({
    where: {
      provider_provider_id: {
        provider,
        provider_id: providerId,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    await db.users.update({
      where: {
        id: existingUser.id,
      },
      data: {
        nickname,
        avatar_emoji: avatarEmoji,
      },
    });
  } else {
    await db.users.create({
      data: {
        provider,
        provider_id: providerId,
        nickname,
        avatar_emoji: avatarEmoji,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/onboarding");

  redirect("/");
}

export async function updateMyProfile(formData: FormData) {
  const { provider, providerId } = await getCurrentSessionUser();

  const nickname = normalizeNickname(formData.get("nickname"));
  const avatarEmoji = normalizeAvatarEmoji(formData.get("avatarEmoji"));

  if (!nickname || !avatarEmoji) {
    throw new Error("모든 필드를 입력해 주세요.");
  }

  validateNickname(nickname);

  const currentUser = await db.users.findUnique({
    where: {
      provider_provider_id: {
        provider,
        provider_id: providerId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!currentUser) {
    throw new Error("사용자 정보를 찾을 수 없습니다.");
  }

  const duplicatedUser = await db.users.findFirst({
    where: {
      nickname,
      id: {
        not: currentUser.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicatedUser) {
    throw new Error("이미 사용 중인 닉네임입니다.");
  }

  await db.users.update({
    where: {
      id: currentUser.id,
    },
    data: {
      nickname,
      avatar_emoji: avatarEmoji,
    },
  });

  revalidatePath("/");
  revalidatePath("/me");

  redirect("/me");
}

export async function uploadMyAvatar(
  formData: FormData,
): Promise<AvatarActionResult> {
  let currentUser: Awaited<ReturnType<typeof getCurrentDbUser>>;

  try {
    currentUser = await getCurrentDbUser();
  } catch (error) {
    console.error("uploadMyAvatar auth error:", error);

    return {
      success: false,
      message: "로그인이 필요합니다.",
    };
  }

  const file = formData.get("avatar");

  if (!(file instanceof File)) {
    return {
      success: false,
      message: "업로드할 이미지를 선택해 주세요.",
    };
  }

  if (file.size <= 0) {
    return {
      success: false,
      message: "비어 있는 파일은 업로드할 수 없습니다.",
    };
  }

  if (file.size > MAX_AVATAR_FILE_SIZE) {
    return {
      success: false,
      message: "프로필 이미지는 5MB 이하만 업로드할 수 있습니다.",
    };
  }

  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return {
      success: false,
      message: "jpg, png, webp 이미지만 업로드할 수 있습니다.",
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const webpBuffer = await sharp(inputBuffer)
      .rotate()
      .resize(512, 512, {
        fit: "cover",
        position: "center",
      })
      .webp({
        quality: 85,
      })
      .toBuffer();

    const avatarImageKey = getAvatarImageKey(currentUser.id);

    await uploadR2Object({
      key: avatarImageKey,
      body: webpBuffer,
      contentType: "image/webp",

      // avatars/{userId}.webp처럼 같은 key에 덮어쓰는 구조라서
      // immutable 캐시는 피하는 게 안전함.
      cacheControl: "public, max-age=300",
    });

    await db.users.update({
      where: {
        id: currentUser.id,
      },
      data: {
        avatar_image_key: avatarImageKey,
        avatar_image_updated_at: new Date(),
      },
    });

    revalidatePath("/");
    revalidatePath("/me");
    revalidatePath("/mahjong");
    revalidatePath("/onboarding");

    return {
      success: true,
      message: "프로필 이미지가 변경되었습니다.",
      avatar_image_key: avatarImageKey,
    };
  } catch (error) {
    console.error("uploadMyAvatar error:", error);

    return {
      success: false,
      message: "프로필 이미지 업로드 중 오류가 발생했습니다.",
    };
  }
}

export async function deleteMyAvatar(): Promise<AvatarActionResult> {
  let currentUser: Awaited<ReturnType<typeof getCurrentDbUser>>;

  try {
    currentUser = await getCurrentDbUser();
  } catch (error) {
    console.error("deleteMyAvatar auth error:", error);

    return {
      success: false,
      message: "로그인이 필요합니다.",
    };
  }

  try {
    if (currentUser.avatar_image_key) {
      await deleteR2Object(currentUser.avatar_image_key);
    }

    await db.users.update({
      where: {
        id: currentUser.id,
      },
      data: {
        avatar_image_key: null,
        avatar_image_updated_at: null,
      },
    });

    revalidatePath("/");
    revalidatePath("/me");
    revalidatePath("/mahjong");
    revalidatePath("/onboarding");

    return {
      success: true,
      message: "프로필 이미지가 삭제되었습니다.",
      avatar_image_key: null,
    };
  } catch (error) {
    console.error("deleteMyAvatar error:", error);

    return {
      success: false,
      message: "프로필 이미지 삭제 중 오류가 발생했습니다.",
    };
  }
}

export async function checkNicknameDuplication(nickname: string) {
  const normalizedNickname = nickname.trim();

  if (
      normalizedNickname.length < NICKNAME_MIN_LENGTH ||
      normalizedNickname.length > NICKNAME_MAX_LENGTH
  ) {
    return false;
  }

  const existingUser = await db.users.findFirst({
    where: {
      nickname: normalizedNickname,
    },
    select: {
      id: true,
    },
  });

  return existingUser === null;
}

export async function checkMyNicknameDuplication(nickname: string) {
  const normalizedNickname = nickname.trim();

  if (
      normalizedNickname.length < NICKNAME_MIN_LENGTH ||
      normalizedNickname.length > NICKNAME_MAX_LENGTH
  ) {
    return false;
  }

  if (!normalizedNickname) return false;

  const { provider, providerId } = await getCurrentSessionUser();

  const currentUser = await db.users.findUnique({
    where: {
      provider_provider_id: {
        provider,
        provider_id: providerId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!currentUser) return false;

  const existingUser = await db.users.findFirst({
    where: {
      nickname: normalizedNickname,
    },
    select: {
      id: true,
    },
  });

  if (!existingUser) return true;

  return existingUser.id === currentUser.id;
}

export async function checkNicknameExists(nickname: string) {
  const normalizedNickname = nickname.trim();

  if (
      normalizedNickname.length < NICKNAME_MIN_LENGTH ||
      normalizedNickname.length > NICKNAME_MAX_LENGTH
  ) {
    return false;
  }

  const user = await db.users.findFirst({
    where: {
      nickname: normalizedNickname,
    },
    select: {
      id: true,
    },
  });

  return !!user;
}