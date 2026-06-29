-- CreateTable
CREATE TABLE "mahjong_user_achievements" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "achievement_id" VARCHAR(100) NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mahjong_user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mahjong_user_badges" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "badge_id" VARCHAR(100) NOT NULL,
    "earned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mahjong_user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mahjong_user_equipped_badges" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "badge_id" VARCHAR(100) NOT NULL,
    "slot" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mahjong_user_equipped_badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mahjong_user_achievements_user_id_idx" ON "mahjong_user_achievements"("user_id");

-- CreateIndex
CREATE INDEX "mahjong_user_achievements_achievement_id_idx" ON "mahjong_user_achievements"("achievement_id");

-- CreateIndex
CREATE UNIQUE INDEX "mahjong_user_achievements_user_id_achievement_id_key" ON "mahjong_user_achievements"("user_id", "achievement_id");

-- CreateIndex
CREATE INDEX "mahjong_user_badges_user_id_idx" ON "mahjong_user_badges"("user_id");

-- CreateIndex
CREATE INDEX "mahjong_user_badges_badge_id_idx" ON "mahjong_user_badges"("badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "mahjong_user_badges_user_id_badge_id_key" ON "mahjong_user_badges"("user_id", "badge_id");

-- CreateIndex
CREATE INDEX "mahjong_user_equipped_badges_user_id_idx" ON "mahjong_user_equipped_badges"("user_id");

-- CreateIndex
CREATE INDEX "mahjong_user_equipped_badges_badge_id_idx" ON "mahjong_user_equipped_badges"("badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "mahjong_user_equipped_badges_user_id_slot_key" ON "mahjong_user_equipped_badges"("user_id", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "mahjong_user_equipped_badges_user_id_badge_id_key" ON "mahjong_user_equipped_badges"("user_id", "badge_id");

-- AddForeignKey
ALTER TABLE "mahjong_user_achievements" ADD CONSTRAINT "mahjong_user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mahjong_user_badges" ADD CONSTRAINT "mahjong_user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mahjong_user_equipped_badges" ADD CONSTRAINT "mahjong_user_equipped_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
