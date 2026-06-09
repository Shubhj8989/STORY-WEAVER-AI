import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.database import get_db, Character, Location, Event, Relationship, Chapter, Story, UniverseRule
from models.schema import CharacterOut, LocationOut, EventOut, RelationshipOut, UniverseRuleOut

router = APIRouter(prefix="/api/bible", tags=["bible"])


@router.get("/{story_id}/characters", response_model=list[CharacterOut])
async def get_characters(story_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Character).where(Character.story_id == story_id))
    chars = result.scalars().all()
    
    out = []
    for c in chars:
        out.append(CharacterOut(
            id=c.id,
            story_id=c.story_id,
            name=c.name,
            aliases=json.loads(c.aliases or "[]"),
            age=c.age or "Unknown",
            gender=c.gender or "Unknown",
            physical_traits=json.loads(c.physical_traits or "{}"),
            personality=json.loads(c.personality or "[]"),
            goals=json.loads(c.goals or "[]"),
            backstory=c.backstory or "",
            first_appearance=c.first_appearance or "",
            chapters_appeared=json.loads(c.chapters_appeared or "[]"),
            status=c.status or "alive"
        ))
    return out


@router.get("/{story_id}/locations", response_model=list[LocationOut])
async def get_locations(story_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Location).where(Location.story_id == story_id))
    locs = result.scalars().all()
    return [
        LocationOut(
            id=l.id, story_id=l.story_id, name=l.name,
            description=l.description or "",
            significance=l.significance or "",
            first_mentioned=l.first_mentioned or ""
        )
        for l in locs
    ]


@router.get("/{story_id}/events", response_model=list[EventOut])
async def get_events(story_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.story_id == story_id))
    evts = result.scalars().all()
    return [
        EventOut(
            id=e.id, story_id=e.story_id, name=e.name,
            description=e.description or "",
            chapter=e.chapter or "",
            characters_involved=json.loads(e.characters_involved or "[]"),
            location=e.location or "",
            event_type=e.event_type or "general"
        )
        for e in evts
    ]


@router.get("/{story_id}/relationships", response_model=list[RelationshipOut])
async def get_relationships(story_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Relationship).where(Relationship.story_id == story_id))
    rels = result.scalars().all()
    return [
        RelationshipOut(
            id=r.id, story_id=r.story_id,
            entity_a=r.entity_a, entity_b=r.entity_b,
            relationship_type=r.relationship_type,
            description=r.description or "",
            established_in_chapter=r.established_in_chapter or ""
        )
        for r in rels
    ]


@router.get("/{story_id}/rules", response_model=list[UniverseRuleOut])
async def get_universe_rules(story_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UniverseRule).where(UniverseRule.story_id == story_id))
    rules = result.scalars().all()
    return [
        UniverseRuleOut(
            id=r.id,
            story_id=r.story_id,
            rule=r.rule,
            source_chapter=r.source_chapter or ""
        )
        for r in rules
    ]


@router.get("/{story_id}/chapters")
async def get_chapters(story_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Chapter).where(Chapter.story_id == story_id).order_by(Chapter.chapter_number)
    )
    chapters = result.scalars().all()
    return [
        {
            "id": c.id,
            "chapter_number": c.chapter_number,
            "title": c.title,
            "processed": c.processed,
            "preview": c.content[:200] + "..." if len(c.content) > 200 else c.content
        }
        for c in chapters
    ]


@router.get("/{story_id}/summary")
async def get_story_summary(story_id: str, db: AsyncSession = Depends(get_db)):
    """Get full story summary stats."""
    story_result = await db.execute(select(Story).where(Story.id == story_id))
    story = story_result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    char_count = await db.execute(select(Character).where(Character.story_id == story_id))
    loc_count = await db.execute(select(Location).where(Location.story_id == story_id))
    evt_count = await db.execute(select(Event).where(Event.story_id == story_id))
    rel_count = await db.execute(select(Relationship).where(Relationship.story_id == story_id))
    rule_count = await db.execute(select(UniverseRule).where(UniverseRule.story_id == story_id))
    
    return {
        "id": story.id,
        "title": story.title,
        "genre": story.genre,
        "total_chapters": story.total_chapters,
        "characters": len(char_count.scalars().all()),
        "locations": len(loc_count.scalars().all()),
        "events": len(evt_count.scalars().all()),
        "relationships": len(rel_count.scalars().all()),
        "universe_rules": len(rule_count.scalars().all()),
    }
