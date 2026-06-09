import uuid
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.database import get_db, Story, Chapter, Character, Location, Event, Relationship, UniverseRule
from models.schema import StoryCreate, StoryOut, ChapterCreate, ChapterOut
from services.extractor import extract_entities
from services.graph_engine import (
    add_character_node, add_location_node, add_event_node, add_relationship_edge
)
from services.rag_service import add_chapter_to_store
import PyPDF2
import io

router = APIRouter(prefix="/api/upload", tags=["upload"])

# Track processing status per chapter
processing_status: dict[str, dict] = {}


@router.post("/story", response_model=StoryOut)
async def create_story(story: StoryCreate, db: AsyncSession = Depends(get_db)):
    """Create a new story project."""
    story_id = str(uuid.uuid4())
    db_story = Story(id=story_id, title=story.title, genre=story.genre)
    db.add(db_story)
    await db.commit()
    await db.refresh(db_story)
    return db_story


@router.get("/stories", response_model=list[StoryOut])
async def get_stories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Story).order_by(Story.created_at.desc()))
    return result.scalars().all()


async def process_chapter_background(
    chapter_id: str,
    story_id: str,
    chapter_number: int,
    chapter_title: str,
    content: str,
):
    """Background task: extract entities and update DB + graph."""
    from db.database import AsyncSessionLocal

    processing_status[chapter_id] = {"status": "processing", "progress": "Sending to Gemini..."}

    try:
        # Extract entities with Gemini (truncated to 4000 chars for speed)
        extracted = await extract_entities(content[:4000], chapter_number, chapter_title)
        chapter_num_str = f"Chapter {chapter_number}"

        processing_status[chapter_id]["progress"] = "Saving entities..."

        async with AsyncSessionLocal() as db:
            # Fetch story
            story_result = await db.execute(select(Story).where(Story.id == story_id))
            story = story_result.scalar_one_or_none()

            # ── Characters ──────────────────────────────────────────────────
            for char_data in extracted.get("characters", []):
                name = char_data.get("name", "").strip()
                if not name:
                    continue
                existing = await db.execute(
                    select(Character).where(Character.story_id == story_id, Character.name == name)
                )
                existing_char = existing.scalar_one_or_none()

                if existing_char:
                    chapters = json.loads(existing_char.chapters_appeared or "[]")
                    if chapter_num_str not in chapters:
                        chapters.append(chapter_num_str)
                    existing_char.chapters_appeared = json.dumps(chapters)
                    if char_data.get("physical_traits"):
                        existing_char.physical_traits = json.dumps(char_data["physical_traits"])
                    if char_data.get("personality"):
                        existing_char.personality = json.dumps(char_data["personality"])
                    if char_data.get("goals"):
                        existing_char.goals = json.dumps(char_data["goals"])
                    if char_data.get("status") and char_data["status"] != "unknown":
                        existing_char.status = char_data["status"]
                else:
                    db.add(Character(
                        id=str(uuid.uuid4()),
                        story_id=story_id,
                        name=name,
                        aliases=json.dumps(char_data.get("aliases", [])),
                        age=str(char_data.get("age", "Unknown")),
                        gender=char_data.get("gender", "Unknown"),
                        physical_traits=json.dumps(char_data.get("physical_traits", {})),
                        personality=json.dumps(char_data.get("personality", [])),
                        goals=json.dumps(char_data.get("goals", [])),
                        backstory=char_data.get("backstory", ""),
                        first_appearance=chapter_num_str,
                        chapters_appeared=json.dumps([chapter_num_str]),
                        status=char_data.get("status", "alive")
                    ))

                add_character_node(story_id, {
                    "name": name,
                    "age": str(char_data.get("age", "Unknown")),
                    "gender": char_data.get("gender", "Unknown"),
                    "status": char_data.get("status", "alive"),
                    "goals": char_data.get("goals", []),
                    "personality": char_data.get("personality", [])
                })

            # ── Locations ───────────────────────────────────────────────────
            for loc_data in extracted.get("locations", []):
                name = loc_data.get("name", "").strip()
                if not name:
                    continue
                existing_loc = await db.execute(
                    select(Location).where(Location.story_id == story_id, Location.name == name)
                )
                if not existing_loc.scalar_one_or_none():
                    db.add(Location(
                        id=str(uuid.uuid4()),
                        story_id=story_id,
                        name=name,
                        description=loc_data.get("description", ""),
                        significance=loc_data.get("significance", ""),
                        first_mentioned=chapter_num_str
                    ))
                    add_location_node(story_id, loc_data)

            # ── Events ──────────────────────────────────────────────────────
            for evt_data in extracted.get("events", []):
                name = evt_data.get("name", "").strip()
                if not name:
                    continue
                db.add(Event(
                    id=str(uuid.uuid4()),
                    story_id=story_id,
                    name=name,
                    description=evt_data.get("description", ""),
                    chapter=chapter_num_str,
                    characters_involved=json.dumps(evt_data.get("characters_involved", [])),
                    location=evt_data.get("location", ""),
                    event_type=evt_data.get("event_type", "general")
                ))
                add_event_node(story_id, evt_data, chapter_num_str)

            # ── Relationships ───────────────────────────────────────────────
            for rel_data in extracted.get("relationships", []):
                entity_a = rel_data.get("entity_a", "").strip()
                entity_b = rel_data.get("entity_b", "").strip()
                rel_type = rel_data.get("relationship_type", "related")
                if not entity_a or not entity_b:
                    continue
                existing_rel = await db.execute(
                    select(Relationship).where(
                        Relationship.story_id == story_id,
                        Relationship.entity_a == entity_a,
                        Relationship.entity_b == entity_b
                    )
                )
                if not existing_rel.scalar_one_or_none():
                    db.add(Relationship(
                        id=str(uuid.uuid4()),
                        story_id=story_id,
                        entity_a=entity_a,
                        entity_b=entity_b,
                        relationship_type=rel_type,
                        description=rel_data.get("description", ""),
                        established_in_chapter=chapter_num_str
                    ))
                    add_relationship_edge(story_id, entity_a, entity_b, rel_type, rel_data.get("description", ""))

            # ── Universe rules ──────────────────────────────────────────────
            for rule_text in extracted.get("universe_rules", []):
                if not isinstance(rule_text, str) or not rule_text.strip():
                    continue
                rule = rule_text.strip()
                existing_rule = await db.execute(
                    select(UniverseRule).where(
                        UniverseRule.story_id == story_id,
                        UniverseRule.rule == rule
                    )
                )
                if not existing_rule.scalar_one_or_none():
                    db.add(UniverseRule(
                        id=str(uuid.uuid4()),
                        story_id=story_id,
                        rule=rule,
                        source_chapter=chapter_num_str
                    ))

            # ── Update chapter + story ──────────────────────────────────────
            chapter_result = await db.execute(select(Chapter).where(Chapter.id == chapter_id))
            chapter = chapter_result.scalar_one_or_none()
            if chapter:
                chapter.processed = True
            if story:
                story.total_chapters = max(story.total_chapters, chapter_number)

            await db.commit()

        # Add to vector store (sync call — runs fine in background)
        add_chapter_to_store(story_id, chapter_id, chapter_number, content, chapter_title)

        processing_status[chapter_id] = {
            "status": "done",
            "extracted": {
                "characters": len(extracted.get("characters", [])),
                "locations": len(extracted.get("locations", [])),
                "events": len(extracted.get("events", [])),
                "relationships": len(extracted.get("relationships", []))
            }
        }

    except Exception as e:
        print(f"Background processing error: {e}")
        processing_status[chapter_id] = {"status": "error", "error": str(e)}


@router.post("/chapter")
async def upload_chapter(
    background_tasks: BackgroundTasks,
    story_id: str = Form(...),
    chapter_number: int = Form(...),
    chapter_title: str = Form(default=""),
    content: str = Form(default=""),
    file: UploadFile = File(default=None),
    db: AsyncSession = Depends(get_db)
):
    """Upload a chapter — saves instantly, processes in background."""
    # Read content from file if provided
    if file and file.filename:
        file_bytes = await file.read()
        if file.filename.endswith(".pdf"):
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            content = " ".join(page.extract_text() for page in pdf_reader.pages)
        else:
            content = file_bytes.decode("utf-8", errors="ignore")

    if not content.strip():
        raise HTTPException(status_code=400, detail="No content provided")

    # Verify story exists
    story_result = await db.execute(select(Story).where(Story.id == story_id))
    story = story_result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    # Save chapter to DB immediately
    chapter_id = str(uuid.uuid4())
    db_chapter = Chapter(
        id=chapter_id,
        story_id=story_id,
        chapter_number=chapter_number,
        title=chapter_title,
        content=content,
        processed=False
    )
    db.add(db_chapter)
    story.total_chapters = max(story.total_chapters, chapter_number)
    await db.commit()

    # Schedule Gemini extraction in background
    background_tasks.add_task(
        process_chapter_background,
        chapter_id, story_id, chapter_number, chapter_title, content
    )

    processing_status[chapter_id] = {"status": "queued"}

    return {
        "success": True,
        "chapter_id": chapter_id,
        "chapter_number": chapter_number,
        "status": "processing",
        "message": "Chapter saved! AI is extracting entities in the background."
    }


@router.get("/chapter/{chapter_id}/status")
async def get_chapter_status(chapter_id: str):
    """Poll the background processing status for a chapter."""
    status = processing_status.get(chapter_id, {"status": "unknown"})
    return status
