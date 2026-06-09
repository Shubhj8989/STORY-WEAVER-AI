import json
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.database import get_db, Story, Character, Event, UniverseRule
from models.schema import (
    CreativeGuidanceOut,
    SceneSuggestionRequest,
    StyleProfileOut,
    CharacterArcOut,
    CreativeInsight,
    UniverseRuleOut,
)
from services.bible_service import build_story_bible_text, get_recent_chapter_context
from services.extractor import generate_creative_guidance, generate_scene_suggestions

router = APIRouter(prefix="/api/creative", tags=["creative"])


@router.get("/{story_id}/guidance", response_model=CreativeGuidanceOut)
async def get_creative_guidance(story_id: str, db: AsyncSession = Depends(get_db)):
    story = await _get_story(story_id, db)
    story_bible = await build_story_bible_text(story.id, db)
    recent_context = await get_recent_chapter_context(story.id, db)

    fallback = await _build_fallback_guidance(story.id, db)
    ai_guidance = {}
    if os.getenv("STORYWEAVER_ENABLE_CREATIVE_AI", "").lower() == "true":
        ai_guidance = await generate_creative_guidance(story_bible, recent_context)

    style = ai_guidance.get("style_profile") if isinstance(ai_guidance, dict) else None
    return CreativeGuidanceOut(
        character_arcs=fallback["character_arcs"],
        style_profile=StyleProfileOut(**_merge_style(fallback["style_profile"], style)),
        scene_suggestions=_coerce_insights(
            ai_guidance.get("scene_suggestions") if isinstance(ai_guidance, dict) else None,
            fallback["scene_suggestions"],
        ),
        foreshadowing=_coerce_insights(
            ai_guidance.get("foreshadowing") if isinstance(ai_guidance, dict) else None,
            fallback["foreshadowing"],
        ),
        universe_rules=fallback["universe_rules"],
    )


@router.post("/scene-suggestions", response_model=list[CreativeInsight])
async def suggest_scenes(request: SceneSuggestionRequest, db: AsyncSession = Depends(get_db)):
    await _get_story(request.story_id, db)
    story_bible = await build_story_bible_text(request.story_id, db)
    fallback = (await _build_fallback_guidance(request.story_id, db))["scene_suggestions"]
    suggestions = []
    if os.getenv("STORYWEAVER_ENABLE_CREATIVE_AI", "").lower() == "true":
        suggestions = await generate_scene_suggestions(
            story_bible=story_bible,
            draft_context=request.draft_context,
            goal=request.goal,
        )
    return _coerce_insights(suggestions, fallback)


async def _get_story(story_id: str, db: AsyncSession) -> Story:
    result = await db.execute(select(Story).where(Story.id == story_id))
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


async def _build_fallback_guidance(story_id: str, db: AsyncSession) -> dict:
    chars = (await db.execute(select(Character).where(Character.story_id == story_id))).scalars().all()
    events = (await db.execute(select(Event).where(Event.story_id == story_id))).scalars().all()
    rules = (await db.execute(select(UniverseRule).where(UniverseRule.story_id == story_id))).scalars().all()

    character_arcs = []
    for char in chars[:8]:
        chapters = json.loads(char.chapters_appeared or "[]")
        goals = json.loads(char.goals or "[]")
        personality = json.loads(char.personality or "[]")
        character_arcs.append(CharacterArcOut(
            character=char.name,
            status=char.status or "unknown",
            chapters=chapters,
            emotional_state=", ".join(personality[:3]) or "Not enough emotional evidence yet",
            motivation=", ".join(goals[:2]) or "Motivation needs more story evidence",
            growth_opportunity=_growth_opportunity(char.name, goals, personality),
        ))

    style_profile = {
        "voice_summary": "The app has enough structure to preserve continuity; upload more prose to refine voice matching.",
        "tone_markers": _event_tone_markers(events),
        "pacing": _pacing_hint(events),
        "dialogue_style": "Track repeated character traits and relationship tension when drafting dialogue.",
        "keep_consistent": [
            "Preserve established physical traits, status changes, and chapter-specific events.",
            "Use the same naming and relationship labels that appear in the Story Bible.",
            "Check new scenes against universe rules before treating them as canon.",
        ],
    }

    scene_suggestions = [
        CreativeInsight(
            title="Escalate the most connected conflict",
            description="Write a scene where a central relationship is tested by a new decision, then run continuity check before saving it as canon.",
            evidence=[f"{len(events)} extracted events", f"{len(chars)} tracked characters"],
        ),
        CreativeInsight(
            title="Turn a rule into pressure",
            description="Pick one universe rule and put a protagonist in a situation where obeying it costs them something.",
            evidence=[rules[0].rule if rules else "No universe rules extracted yet"],
        ),
    ]

    foreshadowing = [
        CreativeInsight(
            title="Echo an earlier event",
            description="Bring back an object, location, or phrase from an earlier event so the next reveal feels earned.",
            evidence=[events[0].name if events else "No events extracted yet"],
        )
    ]

    return {
        "character_arcs": character_arcs,
        "style_profile": style_profile,
        "scene_suggestions": scene_suggestions,
        "foreshadowing": foreshadowing,
        "universe_rules": [
            UniverseRuleOut(
                id=r.id,
                story_id=r.story_id,
                rule=r.rule,
                source_chapter=r.source_chapter or "",
            )
            for r in rules
        ],
    }


def _coerce_insights(value, fallback: list[CreativeInsight]) -> list[CreativeInsight]:
    if not isinstance(value, list) or not value:
        return fallback

    insights = []
    for item in value[:6]:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "Scene guidance").strip()
        description = str(item.get("description") or "").strip()
        evidence = item.get("evidence") if isinstance(item.get("evidence"), list) else []
        if description:
            insights.append(CreativeInsight(title=title, description=description, evidence=[str(e) for e in evidence]))
    return insights or fallback


def _merge_style(fallback: dict, ai_style) -> dict:
    if not isinstance(ai_style, dict):
        return fallback
    merged = fallback.copy()
    for key in ["voice_summary", "pacing", "dialogue_style"]:
        if ai_style.get(key):
            merged[key] = str(ai_style[key])
    for key in ["tone_markers", "keep_consistent"]:
        if isinstance(ai_style.get(key), list) and ai_style[key]:
            merged[key] = [str(item) for item in ai_style[key]][:8]
    return merged


def _event_tone_markers(events: list[Event]) -> list[str]:
    event_types = {event.event_type for event in events if event.event_type}
    if not event_types:
        return ["emerging", "exploratory"]
    return sorted(event_types)[:6]


def _pacing_hint(events: list[Event]) -> str:
    if len(events) >= 12:
        return "Event-dense; balance major plot turns with reflective character beats."
    if len(events) >= 4:
        return "Moderate; continue alternating discoveries, decisions, and consequences."
    return "Early-stage; upload more chapters or add clearer event beats for stronger pacing analysis."


def _growth_opportunity(name: str, goals: list, personality: list) -> str:
    if goals:
        return f"Pressure {name}'s goal: {goals[0]}"
    if personality:
        return f"Challenge {name}'s established trait: {personality[0]}"
    return f"Give {name} a choice that reveals motivation, fear, or loyalty."
