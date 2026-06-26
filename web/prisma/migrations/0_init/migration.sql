CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "games" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "min_players" INTEGER NOT NULL DEFAULT 1,
    "max_players" INTEGER NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "provider" VARCHAR(50) NOT NULL,
    "provider_id" VARCHAR(255) NOT NULL,
    "nickname" VARCHAR(100) NOT NULL,
    "avatar_emoji" VARCHAR(1) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_game_stats" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "game_id" INTEGER NOT NULL,
    "play_count" INTEGER NOT NULL DEFAULT 0,
    "accumulated_score" INTEGER NOT NULL DEFAULT 0,
    "average_rank" DOUBLE PRECISION,
    "mmr" INTEGER NOT NULL DEFAULT 1500,
    "specific_stats" JSONB,

    CONSTRAINT "user_game_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" SERIAL NOT NULL,
    "game_id" INTEGER NOT NULL,
    "created_by" UUID,
    "play_date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_details" (
    "match_id" INTEGER NOT NULL,
    "details" JSONB NOT NULL,

    CONSTRAINT "match_details_pkey" PRIMARY KEY ("match_id")
);

-- CreateTable
CREATE TABLE "match_players" (
    "id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "user_id" UUID,
    "guest_name" VARCHAR(100),
    "final_score" INTEGER,
    "rank" INTEGER,

    CONSTRAINT "match_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_notices" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "summary" VARCHAR(500),
    "content" TEXT,
    "category" VARCHAR(30) NOT NULL DEFAULT 'NOTICE',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "home_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "games_name_key" ON "games"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_provider_provider_id_key" ON "users"("provider", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_game_stats_user_id_game_id_key" ON "user_game_stats"("user_id", "game_id");

-- CreateIndex
CREATE INDEX "home_notices_is_published_is_pinned_created_at_idx" ON "home_notices"("is_published", "is_pinned", "created_at");

-- CreateIndex
CREATE INDEX "home_notices_category_idx" ON "home_notices"("category");

-- AddForeignKey
ALTER TABLE "user_game_stats" ADD CONSTRAINT "user_game_stats_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_game_stats" ADD CONSTRAINT "user_game_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "match_details" ADD CONSTRAINT "match_details_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "home_notices" ADD CONSTRAINT "home_notices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

