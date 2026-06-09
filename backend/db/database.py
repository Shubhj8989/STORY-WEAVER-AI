from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, Float
import datetime

import os
DATABASE_PATH = os.getenv("STORYWEAVER_DB_PATH", "./storyweaver.db")
DATABASE_URL = f"sqlite+aiosqlite:///{DATABASE_PATH}"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


class Story(Base):
    __tablename__ = "stories"
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    genre = Column(String, default="Fantasy")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    total_chapters = Column(Integer, default=0)


class Character(Base):
    __tablename__ = "characters"
    id = Column(String, primary_key=True)
    story_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    aliases = Column(Text, default="[]")          # JSON array
    age = Column(String, default="Unknown")
    gender = Column(String, default="Unknown")
    physical_traits = Column(Text, default="{}")  # JSON object
    personality = Column(Text, default="[]")      # JSON array
    goals = Column(Text, default="[]")            # JSON array
    backstory = Column(Text, default="")
    first_appearance = Column(String, default="")
    chapters_appeared = Column(Text, default="[]")# JSON array
    status = Column(String, default="alive")      # alive/dead/unknown
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Location(Base):
    __tablename__ = "locations"
    id = Column(String, primary_key=True)
    story_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    significance = Column(Text, default="")
    first_mentioned = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Event(Base):
    __tablename__ = "events"
    id = Column(String, primary_key=True)
    story_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    chapter = Column(String, default="")
    characters_involved = Column(Text, default="[]")  # JSON array
    location = Column(String, default="")
    event_type = Column(String, default="general")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Relationship(Base):
    __tablename__ = "relationships"
    id = Column(String, primary_key=True)
    story_id = Column(String, nullable=False, index=True)
    entity_a = Column(String, nullable=False)
    entity_b = Column(String, nullable=False)
    relationship_type = Column(String, nullable=False)
    description = Column(Text, default="")
    established_in_chapter = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class UniverseRule(Base):
    __tablename__ = "universe_rules"
    id = Column(String, primary_key=True)
    story_id = Column(String, nullable=False, index=True)
    rule = Column(Text, nullable=False)
    source_chapter = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ContinuityError(Base):
    __tablename__ = "continuity_errors"
    id = Column(String, primary_key=True)
    story_id = Column(String, nullable=False, index=True)
    chapter = Column(String, default="")
    error_type = Column(String, default="contradiction")
    description = Column(Text, default="")
    conflicting_fact = Column(Text, default="")
    original_fact = Column(Text, default="")
    severity = Column(String, default="medium")   # high/medium/low
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Chapter(Base):
    __tablename__ = "chapters"
    id = Column(String, primary_key=True)
    story_id = Column(String, nullable=False, index=True)
    chapter_number = Column(Integer, nullable=False)
    title = Column(String, default="")
    content = Column(Text, nullable=False)
    processed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
