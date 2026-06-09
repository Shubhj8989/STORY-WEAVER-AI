import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.database import Character, Location, Event, Relationship, UniverseRule, Chapter


async def build_story_bible_text(story_id: str, db: AsyncSession) -> str:
    """
    Build a comprehensive story bible text for continuity checking.
    This is what gets passed to Gemini for validation.
    """
    bible_parts = []

    # Characters
    chars_result = await db.execute(select(Character).where(Character.story_id == story_id))
    characters = chars_result.scalars().all()

    if characters:
        bible_parts.append("=== CHARACTERS ===")
        for char in characters:
            traits = json.loads(char.physical_traits) if char.physical_traits else {}
            personality = json.loads(char.personality) if char.personality else []
            goals = json.loads(char.goals) if char.goals else []
            chapters = json.loads(char.chapters_appeared) if char.chapters_appeared else []

            char_text = f"""
Character: {char.name}
- Status: {char.status}
- Age: {char.age}
- Gender: {char.gender}
- Physical Traits: {json.dumps(traits)}
- Personality: {', '.join(personality)}
- Goals: {', '.join(goals)}
- First Appeared: {char.first_appearance}
- Appeared In Chapters: {', '.join(chapters)}
- Backstory: {char.backstory[:300] if char.backstory else 'Unknown'}
"""
            bible_parts.append(char_text)

    # Locations
    locs_result = await db.execute(select(Location).where(Location.story_id == story_id))
    locations = locs_result.scalars().all()

    if locations:
        bible_parts.append("=== LOCATIONS ===")
        for loc in locations:
            bible_parts.append(f"Location: {loc.name}\n- Description: {loc.description}\n- Significance: {loc.significance}")

    # Events
    events_result = await db.execute(select(Event).where(Event.story_id == story_id))
    events = events_result.scalars().all()

    if events:
        bible_parts.append("=== KEY EVENTS ===")
        for evt in events:
            chars = json.loads(evt.characters_involved) if evt.characters_involved else []
            bible_parts.append(
                f"Event: {evt.name} (Chapter {evt.chapter})\n"
                f"- What: {evt.description}\n"
                f"- Characters: {', '.join(chars)}\n"
                f"- Location: {evt.location}"
            )

    # Relationships
    rels_result = await db.execute(select(Relationship).where(Relationship.story_id == story_id))
    relationships = rels_result.scalars().all()

    if relationships:
        bible_parts.append("=== RELATIONSHIPS ===")
        for rel in relationships:
            bible_parts.append(
                f"{rel.entity_a} ←[{rel.relationship_type}]→ {rel.entity_b}: {rel.description}"
            )

    rules_result = await db.execute(select(UniverseRule).where(UniverseRule.story_id == story_id))
    rules = rules_result.scalars().all()

    if rules:
        bible_parts.append("=== UNIVERSE RULES ===")
        for rule in rules:
            bible_parts.append(f"- {rule.rule} ({rule.source_chapter})")

    return "\n".join(bible_parts) if bible_parts else "Story bible is empty — no chapters processed yet."


async def get_character_summary(story_id: str, character_name: str, db: AsyncSession) -> dict:
    """Get a complete summary for a specific character."""
    result = await db.execute(
        select(Character).where(
            Character.story_id == story_id,
            Character.name.ilike(f"%{character_name}%")
        )
    )
    char = result.scalar_one_or_none()
    if not char:
        return {}
    
    return {
        "name": char.name,
        "age": char.age,
        "gender": char.gender,
        "status": char.status,
        "physical_traits": json.loads(char.physical_traits) if char.physical_traits else {},
        "personality": json.loads(char.personality) if char.personality else [],
        "goals": json.loads(char.goals) if char.goals else [],
        "backstory": char.backstory,
        "first_appearance": char.first_appearance,
        "chapters_appeared": json.loads(char.chapters_appeared) if char.chapters_appeared else [],
    }


async def get_recent_chapter_context(story_id: str, db: AsyncSession, limit: int = 3) -> str:
    """Return the latest chapter excerpts for style and scene guidance."""
    result = await db.execute(
        select(Chapter)
        .where(Chapter.story_id == story_id)
        .order_by(Chapter.chapter_number.desc())
        .limit(limit)
    )
    chapters = list(reversed(result.scalars().all()))
    return "\n\n".join(
        f"Chapter {chapter.chapter_number}: {chapter.title or 'Untitled'}\n{chapter.content[:1500]}"
        for chapter in chapters
    )
