-- UUID 자동 생성을 위한 확장 모듈 추가 (최초 1회 실행 필요)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 유저 (Users) 테이블
-- 소셜 로그인 정보를 담으며, provider와 provider_id의 조합으로 중복 가입을 방지합니다.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    nickname VARCHAR(100) NOT NULL,
    avatar_emoji VARCHAR(1) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_id)
);

-- 2. 게임 메타데이터 (Games) 테이블
-- 마작, 티츄 등 지원하는 보드게임의 종류와 기본 룰(인원수)을 정의합니다.
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    min_players INTEGER NOT NULL DEFAULT 1,
    max_players INTEGER NOT NULL
);

-- 3. 경기 기본 정보 (Matches) 테이블
-- 언제, 어떤 게임을 했는지, 그리고 점수를 최초로 기록한 사람이 누구인지 저장합니다.
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    play_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 경기 참여자 요약 (Match_Players) 테이블
-- 특정 경기에 참여한 유저들의 최종 점수와 등수를 매핑합니다. (비가입 지인 포함)
CREATE TABLE match_players (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- 가입 유저용
    guest_name VARCHAR(100),                             -- 비가입 지인용
    final_score INTEGER,                                 -- 진행 중일 땐 NULL 허용
    rank INTEGER                                         -- 진행 중일 땐 NULL 허용
);

-- 5. 경기 세부 기록 (Match_Details) 테이블
-- 게임마다 천차만별인 세부 스코어 로그를 JSONB 형태로 통째로 저장하는 핵심 테이블입니다.
CREATE TABLE match_details (
    match_id INTEGER PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
    details JSONB NOT NULL
);

-- 6. 유저 게임 통계 (User_Game_Stats) 테이블
-- 특정 게임에 대한 유저의 누적 전적 및 세부 통계를 저장합니다.
CREATE TABLE user_game_stats (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    play_count INTEGER NOT NULL DEFAULT 0,
    accumulated_score INTEGER NOT NULL DEFAULT 0,
    average_rank DOUBLE PRECISION,
    mmr INTEGER NOT NULL DEFAULT 1500,
    specific_stats JSONB,
    UNIQUE(user_id, game_id)
);

-- 초기 테스트용 게임 데이터 삽입
INSERT INTO games (name, min_players, max_players) VALUES
('리치마작', 4, 4);