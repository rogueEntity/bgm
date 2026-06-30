/*
  Warnings:

  - The `deleted_by` column on the `matches` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "matches" ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMPTZ(6),
DROP COLUMN "deleted_by",
ADD COLUMN     "deleted_by" UUID;

-- CreateIndex
CREATE INDEX "matches_game_id_deleted_at_play_date_idx" ON "matches"("game_id", "deleted_at", "play_date");
