/*
  Warnings:

  - A unique constraint covering the columns `[key]` on the table `games` will be added. If there are existing duplicate values, this will fail.

*/

-- DropIndex
ALTER TABLE "games" DROP CONSTRAINT "games_name_key";

-- AlterTable
ALTER TABLE "games"
    ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "key" VARCHAR(50),
    ADD COLUMN "name_en" VARCHAR(100);

-- Backfill existing game rows
UPDATE "games"
SET
    "key" = 'mahjong',
    "name_en" = 'Mahjong'
WHERE "name" = '리치마작';

-- Safety check
DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM "games" WHERE "key" IS NULL) THEN
            RAISE EXCEPTION 'games.key backfill failed: some rows still have NULL key';
        END IF;
    END $$;

-- CreateIndex
CREATE UNIQUE INDEX "games_key_key" ON "games"("key");

-- CreateIndex
CREATE INDEX "games_is_active_idx" ON "games"("is_active");