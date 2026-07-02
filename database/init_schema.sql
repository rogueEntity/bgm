-- web/prisma/sql/init.sql
-- BGM 초기 데이터베이스 세팅 스크립트
-- 기준: web/prisma/schema.prisma
-- 주의: 빈 DB에 처음 세팅할 때 사용하는 용도

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- 1. games
-- =========================================================

CREATE TABLE games (
                       id SERIAL PRIMARY KEY,
                       key VARCHAR(50) NOT NULL,
                       name VARCHAR(100) NOT NULL,
                       name_en VARCHAR(100),
                       min_players INTEGER NOT NULL DEFAULT 1,
                       max_players INTEGER NOT NULL,
                       is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX games_key_key
    ON games (key);

CREATE INDEX games_is_active_idx
    ON games (is_active);


-- =========================================================
-- 2. users
-- =========================================================

CREATE TABLE users (
                       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                       provider VARCHAR(50) NOT NULL,
                       provider_id VARCHAR(255) NOT NULL,
                       nickname VARCHAR(100) NOT NULL,
                       avatar_emoji VARCHAR(1) NOT NULL,
                       avatar_image_key TEXT,
                       avatar_image_updated_at TIMESTAMPTZ(6),
                       created_at TIMESTAMPTZ(6) DEFAULT now()
);

CREATE UNIQUE INDEX users_provider_provider_id_key
    ON users (provider, provider_id);


-- =========================================================
-- 3. admin_users
-- =========================================================

CREATE TABLE admin_users (
                             id SERIAL PRIMARY KEY,
                             user_id UUID NOT NULL UNIQUE,
                             created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

                             CONSTRAINT admin_users_user_id_fkey
                                 FOREIGN KEY (user_id)
                                     REFERENCES users(id)
                                     ON DELETE CASCADE
                                     ON UPDATE NO ACTION
);


-- =========================================================
-- 4. matches
-- =========================================================

CREATE TABLE matches (
                         id SERIAL PRIMARY KEY,
                         game_id INTEGER NOT NULL,
                         created_by UUID,
                         play_date TIMESTAMPTZ(6) DEFAULT now(),
                         deleted_at TIMESTAMPTZ(6),
                         deleted_by UUID,

                         CONSTRAINT matches_game_id_fkey
                             FOREIGN KEY (game_id)
                                 REFERENCES games(id)
                                 ON DELETE NO ACTION
                                 ON UPDATE NO ACTION,

                         CONSTRAINT matches_created_by_fkey
                             FOREIGN KEY (created_by)
                                 REFERENCES users(id)
                                 ON DELETE NO ACTION
                                 ON UPDATE NO ACTION,

                         CONSTRAINT matches_deleted_by_fkey
                             FOREIGN KEY (deleted_by)
                                 REFERENCES users(id)
                                 ON DELETE NO ACTION
                                 ON UPDATE NO ACTION
);

CREATE INDEX matches_game_id_deleted_at_play_date_idx
    ON matches (game_id, deleted_at, play_date);


-- =========================================================
-- 5. match_details
-- =========================================================

CREATE TABLE match_details (
                               match_id INTEGER PRIMARY KEY,
                               details JSONB NOT NULL,
                               version INTEGER NOT NULL DEFAULT 0,

                               CONSTRAINT match_details_match_id_fkey
                                   FOREIGN KEY (match_id)
                                       REFERENCES matches(id)
                                       ON DELETE CASCADE
                                       ON UPDATE NO ACTION
);


-- =========================================================
-- 6. match_players
-- =========================================================

CREATE TABLE match_players (
                               id SERIAL PRIMARY KEY,
                               match_id INTEGER NOT NULL,
                               user_id UUID,
                               guest_name VARCHAR(100),
                               final_score INTEGER,
                               rank INTEGER,

                               CONSTRAINT match_players_match_id_fkey
                                   FOREIGN KEY (match_id)
                                       REFERENCES matches(id)
                                       ON DELETE CASCADE
                                       ON UPDATE NO ACTION,

                               CONSTRAINT match_players_user_id_fkey
                                   FOREIGN KEY (user_id)
                                       REFERENCES users(id)
                                       ON DELETE CASCADE
                                       ON UPDATE NO ACTION
);


-- =========================================================
-- 7. user_game_stats
-- =========================================================

CREATE TABLE user_game_stats (
                                 id SERIAL PRIMARY KEY,
                                 user_id UUID NOT NULL,
                                 game_id INTEGER NOT NULL,
                                 play_count INTEGER NOT NULL DEFAULT 0,
                                 accumulated_score INTEGER NOT NULL DEFAULT 0,
                                 average_rank DOUBLE PRECISION,
                                 mmr INTEGER NOT NULL DEFAULT 1500,
                                 specific_stats JSONB,

                                 CONSTRAINT user_game_stats_user_id_fkey
                                     FOREIGN KEY (user_id)
                                         REFERENCES users(id)
                                         ON DELETE CASCADE
                                         ON UPDATE NO ACTION,

                                 CONSTRAINT user_game_stats_game_id_fkey
                                     FOREIGN KEY (game_id)
                                         REFERENCES games(id)
                                         ON DELETE CASCADE
                                         ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX user_game_stats_user_id_game_id_key
    ON user_game_stats (user_id, game_id);


-- =========================================================
-- 8. home_notices
-- =========================================================

CREATE TABLE home_notices (
                              id SERIAL PRIMARY KEY,
                              title VARCHAR(200) NOT NULL,
                              summary VARCHAR(500),
                              content TEXT,
                              category VARCHAR(30) NOT NULL DEFAULT 'NOTICE',
                              is_pinned BOOLEAN NOT NULL DEFAULT false,
                              is_published BOOLEAN NOT NULL DEFAULT true,
                              created_by UUID,
                              created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
                              updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

                              CONSTRAINT home_notices_created_by_fkey
                                  FOREIGN KEY (created_by)
                                      REFERENCES users(id)
                                      ON DELETE SET NULL
                                      ON UPDATE NO ACTION
);

CREATE INDEX home_notices_is_published_is_pinned_created_at_idx
    ON home_notices (is_published, is_pinned, created_at);

CREATE INDEX home_notices_category_idx
    ON home_notices (category);


-- =========================================================
-- 9. mahjong_user_achievements
-- =========================================================

CREATE TABLE mahjong_user_achievements (
                                           id SERIAL PRIMARY KEY,
                                           user_id UUID NOT NULL,
                                           achievement_id VARCHAR(100) NOT NULL,
                                           progress INTEGER NOT NULL DEFAULT 0,
                                           completed BOOLEAN NOT NULL DEFAULT false,
                                           completed_at TIMESTAMPTZ(6),
                                           created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
                                           updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

                                           CONSTRAINT mahjong_user_achievements_user_id_fkey
                                               FOREIGN KEY (user_id)
                                                   REFERENCES users(id)
                                                   ON DELETE CASCADE
                                                   ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX mahjong_user_achievements_user_id_achievement_id_key
    ON mahjong_user_achievements (user_id, achievement_id);

CREATE INDEX mahjong_user_achievements_user_id_idx
    ON mahjong_user_achievements (user_id);

CREATE INDEX mahjong_user_achievements_achievement_id_idx
    ON mahjong_user_achievements (achievement_id);


-- =========================================================
-- 10. mahjong_user_badges
-- =========================================================

CREATE TABLE mahjong_user_badges (
                                     id SERIAL PRIMARY KEY,
                                     user_id UUID NOT NULL,
                                     badge_id VARCHAR(100) NOT NULL,
                                     earned_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

                                     CONSTRAINT mahjong_user_badges_user_id_fkey
                                         FOREIGN KEY (user_id)
                                             REFERENCES users(id)
                                             ON DELETE CASCADE
                                             ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX mahjong_user_badges_user_id_badge_id_key
    ON mahjong_user_badges (user_id, badge_id);

CREATE INDEX mahjong_user_badges_user_id_idx
    ON mahjong_user_badges (user_id);

CREATE INDEX mahjong_user_badges_badge_id_idx
    ON mahjong_user_badges (badge_id);


-- =========================================================
-- 11. mahjong_user_equipped_badges
-- =========================================================

CREATE TABLE mahjong_user_equipped_badges (
                                              id SERIAL PRIMARY KEY,
                                              user_id UUID NOT NULL,
                                              badge_id VARCHAR(100) NOT NULL,
                                              slot INTEGER NOT NULL,
                                              created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
                                              updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

                                              CONSTRAINT mahjong_user_equipped_badges_user_id_fkey
                                                  FOREIGN KEY (user_id)
                                                      REFERENCES users(id)
                                                      ON DELETE CASCADE
                                                      ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX mahjong_user_equipped_badges_user_id_slot_key
    ON mahjong_user_equipped_badges (user_id, slot);

CREATE UNIQUE INDEX mahjong_user_equipped_badges_user_id_badge_id_key
    ON mahjong_user_equipped_badges (user_id, badge_id);

CREATE INDEX mahjong_user_equipped_badges_user_id_idx
    ON mahjong_user_equipped_badges (user_id);

CREATE INDEX mahjong_user_equipped_badges_badge_id_idx
    ON mahjong_user_equipped_badges (badge_id);


-- =========================================================
-- 12. mahjong_news_events
-- =========================================================

CREATE TABLE mahjong_news_events (
                                     id SERIAL PRIMARY KEY,
                                     event_key VARCHAR(200) NOT NULL,
                                     event_type VARCHAR(30) NOT NULL,
                                     user_id UUID NOT NULL,
                                     match_id INTEGER,
                                     achievement_id VARCHAR(100),
                                     yaku_id VARCHAR(100),
                                     title VARCHAR(200) NOT NULL,
                                     message VARCHAR(500) NOT NULL,
                                     metadata JSONB,
                                     occurred_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
                                     created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

                                     CONSTRAINT mahjong_news_events_user_id_fkey
                                         FOREIGN KEY (user_id)
                                             REFERENCES users(id)
                                             ON DELETE CASCADE
                                             ON UPDATE NO ACTION,

                                     CONSTRAINT mahjong_news_events_match_id_fkey
                                         FOREIGN KEY (match_id)
                                             REFERENCES matches(id)
                                             ON DELETE CASCADE
                                             ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX mahjong_news_events_event_key_key
    ON mahjong_news_events (event_key);

CREATE INDEX mahjong_news_events_event_type_occurred_at_idx
    ON mahjong_news_events (event_type, occurred_at);

CREATE INDEX mahjong_news_events_user_id_occurred_at_idx
    ON mahjong_news_events (user_id, occurred_at);

CREATE INDEX mahjong_news_events_match_id_idx
    ON mahjong_news_events (match_id);

CREATE INDEX mahjong_news_events_achievement_id_idx
    ON mahjong_news_events (achievement_id);


-- =========================================================
-- 13. 기본 데이터
-- =========================================================

INSERT INTO games (
    key,
    name,
    name_en,
    min_players,
    max_players,
    is_active
)
VALUES
    (
        'mahjong',
        '리치마작',
        'Mahjong',
        4,
        4,
        true
    );