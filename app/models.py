# app/models.py
import uuid
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, text, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = Column(String(50), nullable=False)
    provider_id = Column(String(255), nullable=False)
    nickname = Column(String(100), nullable=False)
    avatar_emoji = Column(String(1), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'))


class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    min_players = Column(Integer, nullable=False, default=1)
    max_players = Column(Integer, nullable=False)


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="RESTRICT"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    play_date = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'))


class MatchPlayer(Base):
    __tablename__ = "match_players"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    guest_name = Column(String(100), nullable=True)
    final_score = Column(Integer, nullable=True)
    rank = Column(Integer, nullable=True)


class MatchDetail(Base):
    __tablename__ = "match_details"

    match_id = Column(Integer, ForeignKey("matches.id", ondelete="CASCADE"), primary_key=True)
    details = Column(JSONB, nullable=False)


class UserGameStat(Base):
    __tablename__ = "user_game_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    play_count = Column(Integer, nullable=False, default=0)
    accumulated_score = Column(Integer, nullable=False, default=0)
    average_rank = Column(Float, nullable=True)
    mmr = Column(Integer, nullable=False, default=1500)
    specific_stats = Column(JSONB, nullable=True)