from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


# ── Story ──────────────────────────────────────────────────────────────────
class StoryCreate(BaseModel):
    title: str
    genre: str = "Fantasy"


class StoryOut(BaseModel):
    id: str
    title: str
    genre: str
    created_at: datetime
    total_chapters: int


# ── Chapter ────────────────────────────────────────────────────────────────
class ChapterCreate(BaseModel):
    story_id: str
    chapter_number: int
    title: str = ""
    content: str


class ChapterOut(BaseModel):
    id: str
    story_id: str
    chapter_number: int
    title: str
    content: str
    processed: bool
    created_at: datetime


# ── Character ──────────────────────────────────────────────────────────────
class CharacterOut(BaseModel):
    id: str
    story_id: str
    name: str
    aliases: List[str] = []
    age: str = "Unknown"
    gender: str = "Unknown"
    physical_traits: Dict[str, Any] = {}
    personality: List[str] = []
    goals: List[str] = []
    backstory: str = ""
    first_appearance: str = ""
    chapters_appeared: List[str] = []
    status: str = "alive"


# ── Location ───────────────────────────────────────────────────────────────
class LocationOut(BaseModel):
    id: str
    story_id: str
    name: str
    description: str = ""
    significance: str = ""
    first_mentioned: str = ""


# ── Event ──────────────────────────────────────────────────────────────────
class EventOut(BaseModel):
    id: str
    story_id: str
    name: str
    description: str = ""
    chapter: str = ""
    characters_involved: List[str] = []
    location: str = ""
    event_type: str = "general"


# ── Relationship ───────────────────────────────────────────────────────────
class RelationshipOut(BaseModel):
    id: str
    story_id: str
    entity_a: str
    entity_b: str
    relationship_type: str
    description: str = ""
    established_in_chapter: str = ""


class UniverseRuleOut(BaseModel):
    id: str
    story_id: str
    rule: str
    source_chapter: str = ""


class CreativeInsight(BaseModel):
    title: str
    description: str
    evidence: List[str] = []


class CharacterArcOut(BaseModel):
    character: str
    status: str
    chapters: List[str] = []
    emotional_state: str
    motivation: str
    growth_opportunity: str


class StyleProfileOut(BaseModel):
    voice_summary: str
    tone_markers: List[str] = []
    pacing: str
    dialogue_style: str
    keep_consistent: List[str] = []


class CreativeGuidanceOut(BaseModel):
    character_arcs: List[CharacterArcOut] = []
    style_profile: StyleProfileOut
    scene_suggestions: List[CreativeInsight] = []
    foreshadowing: List[CreativeInsight] = []
    universe_rules: List[UniverseRuleOut] = []


class SceneSuggestionRequest(BaseModel):
    story_id: str
    draft_context: str = ""
    goal: str = ""


# ── Continuity Error ───────────────────────────────────────────────────────
class ContinuityErrorOut(BaseModel):
    id: str
    story_id: str
    chapter: str
    error_type: str
    description: str
    conflicting_fact: str
    original_fact: str
    severity: str
    resolved: bool


# ── Graph ──────────────────────────────────────────────────────────────────
class GraphNode(BaseModel):
    id: str
    label: str
    node_type: str   # character / location / event
    data: Dict[str, Any] = {}


class GraphEdge(BaseModel):
    source: str
    target: str
    label: str


class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


# ── Chat ───────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    story_id: str
    message: str
    history: List[Dict[str, str]] = []


class ChatResponse(BaseModel):
    answer: str
    sources: List[str] = []


# ── Continuity Check ───────────────────────────────────────────────────────
class ContinuityCheckRequest(BaseModel):
    story_id: str
    chapter_number: int
    chapter_title: str = ""
    content: str


class ExtractionResult(BaseModel):
    characters: List[Dict[str, Any]] = []
    locations: List[Dict[str, Any]] = []
    events: List[Dict[str, Any]] = []
    relationships: List[Dict[str, Any]] = []
    universe_rules: List[str] = []
