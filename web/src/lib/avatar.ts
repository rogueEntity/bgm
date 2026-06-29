// web/src/lib/avatar.ts
export function normalizeAvatarImageKey(key: string) {
  return key.replace(/^\/+/, "");
}

export function getAvatarImageUrl(
  key?: string | null,
  updatedAt?: Date | string | null,
) {
  if (!key) return null;

  const baseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!baseUrl) return null;

  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const normalizedKey = normalizeAvatarImageKey(key);

  const url = `${normalizedBaseUrl}/${normalizedKey}`;

  if (!updatedAt) return url;

  const version =
    updatedAt instanceof Date
      ? updatedAt.getTime()
      : new Date(updatedAt).getTime();

  if (Number.isNaN(version)) return url;

  return `${url}?v=${version}`;
}