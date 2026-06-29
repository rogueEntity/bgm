// web/src/lib/r2.ts
import "server-only";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

function assertR2Env() {
  if (!R2_ACCOUNT_ID) {
    throw new Error("R2_ACCOUNT_ID is not set");
  }

  if (!R2_ACCESS_KEY_ID) {
    throw new Error("R2_ACCESS_KEY_ID is not set");
  }

  if (!R2_SECRET_ACCESS_KEY) {
    throw new Error("R2_SECRET_ACCESS_KEY is not set");
  }

  if (!R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME is not set");
  }
}

export function getR2Client() {
  assertR2Env();

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
}

type UploadR2ObjectParams = {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
};

export async function uploadR2Object({
  key,
  body,
  contentType,
  cacheControl = "public, max-age=31536000, immutable",
}: UploadR2ObjectParams) {
  assertR2Env();

  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: normalizeR2Key(key),
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );
}

export async function deleteR2Object(key: string) {
  assertR2Env();

  const client = getR2Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: normalizeR2Key(key),
    }),
  );
}

export function normalizeR2Key(key: string) {
  return key.replace(/^\/+/, "");
}

export function getAvatarImageKey(userId: string) {
  return `avatars/${userId}.webp`;
}