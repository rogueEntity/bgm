-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "games" (
                         "id" SERIAL NOT NULL,
                         "key" VARCHAR(50) NOT NULL,
                         "name" VARCHAR(100) NOT NULL,
                         "name_en" VARCHAR(100),
                         "min_players" INTEGER NOT NULL DEFAULT 1,
                         "max_players" INTEGER NOT NULL,
                         "is_active" BOOLEAN NOT NULL DEFAULT true,

                         CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
                         "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                         "provider" VARCHAR(50) NOT NULL,
                         "provider_id" VARCHAR(255) NOT NULL,
                         "nickname" VARCHAR(100) NOT NULL,
                         "avatar_emoji" VARCHAR(1) NOT NULL,
                         "avatar_image_key" TEXT,
                         "avatar_image_updated_at" TIMESTAMPTZ(6),
                         "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

                         CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
                               "id" SERIAL NOT NULL,
                               "user_id" UUID NOT NULL,
                               "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                               CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id"),
                               CONSTRAINT "admin_users_user_id_fkey"
                                   FOREIGN KEY ("user_id") REFERENCES "users"("id")
                                       ON DELETE CASCADE ON UPDATE NO ACTION
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

                                   CONSTRAINT "user_game_stats_pkey" PRIMARY KEY ("id"),
                                   CONSTRAINT "user_game_stats_user_id_fkey"
                                       FOREIGN KEY ("user_id") REFERENCES "users"("id")
                                           ON DELETE CASCADE ON UPDATE NO ACTION,
                                   CONSTRAINT "user_game_stats_game_id_fkey"
                                       FOREIGN KEY ("game_id") REFERENCES "games"("id")
                                           ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "matches" (
                           "id" SERIAL NOT NULL,
                           "game_id" INTEGER NOT NULL,
                           "created_by" UUID,
                           "play_date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
                           "deleted_at" TIMESTAMPTZ(6),
                           "deleted_by" UUID,

                           CONSTRAINT "matches_pkey" PRIMARY KEY ("id"),
                           CONSTRAINT "matches_game_id_fkey"
                               FOREIGN KEY ("game_id") REFERENCES "games"("id")
                                   ON DELETE RESTRICT ON UPDATE NO ACTION,
                           CONSTRAINT "matches_created_by_fkey"
                               FOREIGN KEY ("created_by") REFERENCES "users"("id")
                                   ON DELETE SET NULL ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "match_details" (
                                 "match_id" INTEGER NOT NULL,
                                 "details" JSONB NOT NULL,
                                 "version" INTEGER NOT NULL DEFAULT 0,

                                 CONSTRAINT "match_details_pkey" PRIMARY KEY ("match_id"),
                                 CONSTRAINT "match_details_match_id_fkey"
                                     FOREIGN KEY ("match_id") REFERENCES "matches"("id")
                                         ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "match_players" (
                                 "id" SERIAL NOT NULL,
                                 "match_id" INTEGER NOT NULL,
                                 "user_id" UUID,
                                 "guest_name" VARCHAR(100),
                                 "final_score" INTEGER,
                                 "rank" INTEGER,

                                 CONSTRAINT "match_players_pkey" PRIMARY KEY ("id"),
                                 CONSTRAINT "match_players_match_id_fkey"
                                     FOREIGN KEY ("match_id") REFERENCES "matches"("id")
                                         ON DELETE CASCADE ON UPDATE NO ACTION,
                                 CONSTRAINT "match_players_user_id_fkey"
                                     FOREIGN KEY ("user_id") REFERENCES "users"("id")
                                         ON DELETE CASCADE ON UPDATE NO ACTION
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

                                CONSTRAINT "home_notices_pkey" PRIMARY KEY ("id"),
                                CONSTRAINT "home_notices_created_by_fkey"
                                    FOREIGN KEY ("created_by") REFERENCES "users"("id")
                                        ON DELETE SET NULL ON UPDATE NO ACTION
);

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

                                             CONSTRAINT "mahjong_user_achievements_pkey" PRIMARY KEY ("id"),
                                             CONSTRAINT "mahjong_user_achievements_user_id_fkey"
                                                 FOREIGN KEY ("user_id") REFERENCES "users"("id")
                                                     ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "mahjong_user_badges" (
                                       "id" SERIAL NOT NULL,
                                       "user_id" UUID NOT NULL,
                                       "badge_id" VARCHAR(100) NOT NULL,
                                       "earned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                       CONSTRAINT "mahjong_user_badges_pkey" PRIMARY KEY ("id"),
                                       CONSTRAINT "mahjong_user_badges_user_id_fkey"
                                           FOREIGN KEY ("user_id") REFERENCES "users"("id")
                                               ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "mahjong_user_equipped_badges" (
                                                "id" SERIAL NOT NULL,
                                                "user_id" UUID NOT NULL,
                                                "badge_id" VARCHAR(100) NOT NULL,
                                                "slot" INTEGER NOT NULL,
                                                "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                                "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                                CONSTRAINT "mahjong_user_equipped_badges_pkey" PRIMARY KEY ("id"),
                                                CONSTRAINT "mahjong_user_equipped_badges_user_id_fkey"
                                                    FOREIGN KEY ("user_id") REFERENCES "users"("id")
                                                        ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "mahjong_news_events" (
                                       "id" SERIAL NOT NULL,
                                       "event_key" VARCHAR(200) NOT NULL,
                                       "event_type" VARCHAR(30) NOT NULL,
                                       "user_id" UUID NOT NULL,
                                       "match_id" INTEGER,
                                       "achievement_id" VARCHAR(100),
                                       "yaku_id" VARCHAR(100),
                                       "title" VARCHAR(200) NOT NULL,
                                       "message" VARCHAR(500) NOT NULL,
                                       "metadata" JSONB,
                                       "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                       "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                       CONSTRAINT "mahjong_news_events_pkey" PRIMARY KEY ("id"),
                                       CONSTRAINT "mahjong_news_events_user_id_fkey"
                                           FOREIGN KEY ("user_id") REFERENCES "users"("id")
                                               ON DELETE CASCADE ON UPDATE NO ACTION,
                                       CONSTRAINT "mahjong_news_events_match_id_fkey"
                                           FOREIGN KEY ("match_id") REFERENCES "matches"("id")
                                               ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateIndex
CREATE UNIQUE INDEX "games_key_key" ON "games"("key");

-- CreateIndex
CREATE INDEX "games_is_active_idx" ON "games"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_provider_provider_id_key" ON "users"("provider", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_user_id_key" ON "admin_users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_game_stats_user_id_game_id_key" ON "user_game_stats"("user_id", "game_id");

-- CreateIndex
CREATE INDEX "matches_game_id_deleted_at_play_date_idx" ON "matches"("game_id", "deleted_at", "play_date");

-- CreateIndex
CREATE INDEX "home_notices_is_published_is_pinned_created_at_idx" ON "home_notices"("is_published", "is_pinned", "created_at");

-- CreateIndex
CREATE INDEX "home_notices_category_idx" ON "home_notices"("category");

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

-- CreateIndex
CREATE UNIQUE INDEX "mahjong_news_events_event_key_key" ON "mahjong_news_events"("event_key");

-- CreateIndex
CREATE INDEX "mahjong_news_events_event_type_occurred_at_idx" ON "mahjong_news_events"("event_type", "occurred_at");

-- CreateIndex
CREATE INDEX "mahjong_news_events_user_id_occurred_at_idx" ON "mahjong_news_events"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "mahjong_news_events_match_id_idx" ON "mahjong_news_events"("match_id");

-- CreateIndex
CREATE INDEX "mahjong_news_events_achievement_id_idx" ON "mahjong_news_events"("achievement_id");