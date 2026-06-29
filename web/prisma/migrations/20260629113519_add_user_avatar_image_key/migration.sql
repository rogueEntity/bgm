/*
  Warnings:

  - You are about to drop the column `avatarImageUrl` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "avatarImageUrl",
ADD COLUMN     "avatar_image_key" TEXT;
