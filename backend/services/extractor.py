import socket

# Force IPv4 only DNS resolution to resolve connection timeout issues on local network
orig_getaddrinfo = socket.getaddrinfo
def ipv4_only_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    return orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = ipv4_only_getaddrinfo

import json
import re
import os
import asyncio
from dotenv import load_dotenv

# Groq default configurations
GROQ_TIMEOUT_SECONDS = 60
GROQ_DEFAULT_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_PREFERRED_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "gemma2-9b-it"
]

EXTRACTION_PROMPT = """
You are a literary analyst AI. Analyze the following story chapter and extract structured information.

Return ONLY a valid JSON object (no markdown, no backticks) with exactly this structure:
{{
  "characters": [
    {{
      "name": "Character Name",
      "aliases": ["nickname1"],
      "age": "age or Unknown",
      "gender": "Male/Female/Unknown",
      "physical_traits": {{
        "hair": "description",
        "eyes": "description",
        "height": "description",
        "notable_features": ["feature1", "feature2"]
      }},
      "personality": ["trait1", "trait2"],
      "goals": ["goal1", "goal2"],
      "backstory": "brief backstory from this chapter",
      "status": "alive/dead/unknown",
      "actions_in_chapter": ["action1", "action2"]
    }}
  ],
  "locations": [
    {{
      "name": "Location Name",
      "description": "description",
      "significance": "why it matters"
    }}
  ],
  "events": [
    {{
      "name": "Event Name",
      "description": "what happened",
      "characters_involved": ["Character1", "Character2"],
      "location": "where it happened",
      "event_type": "battle/death/discovery/revelation/meeting/other"
    }}
  ],
  "relationships": [
    {{
      "entity_a": "Character1",
      "entity_b": "Character2",
      "relationship_type": "friend/enemy/lover/family/mentor/rival/ally",
      "description": "brief description"
    }}
  ],
  "universe_rules": ["rule1", "rule2"]
}}

Chapter {chapter_number}: {chapter_title}
---
{content}
"""

CONTINUITY_PROMPT = """
You are a story continuity checker AI. Your job is to find contradictions between a new chapter and established story facts.

STORY BIBLE (established facts):
{story_bible}

NEW CHAPTER {chapter_number}: {chapter_title}
---
{content}

Analyze the new chapter carefully and identify ANY contradictions with the Story Bible facts.
Return ONLY a valid JSON array (no markdown, no backticks) of errors found:
[
  {{
    "error_type": "physical_trait/character_status/location/timeline/relationship/universe_rule",
    "description": "Clear description of the contradiction",
    "conflicting_fact": "What the new chapter claims",
    "original_fact": "What was previously established in the Story Bible",
    "severity": "high/medium/low"
  }}
]

If NO contradictions found, return an empty array: []
Be thorough but only flag genuine contradictions, not creative developments.
"""

CHAT_PROMPT = """
You are Story-Weaver AI, an expert assistant who knows everything about the story "{story_title}".
You have access to the story's knowledge base. Answer questions accurately and cite which chapter information comes from.

STORY KNOWLEDGE BASE:
{context}

CONVERSATION HISTORY:
{history}

USER QUESTION: {question}

Answer concisely and accurately. If citing story facts, mention the chapter source.
If you don't know something, say so rather than guessing.
"""

CREATIVE_GUIDANCE_PROMPT = """
You are Story-Weaver AI, a senior fiction development editor.
Analyze this story bible and recent chapter context. Return ONLY valid JSON with this shape:
{{
  "style_profile": {{
    "voice_summary": "one sentence",
    "tone_markers": ["marker"],
    "pacing": "brief pacing assessment",
    "dialogue_style": "brief dialogue assessment",
    "keep_consistent": ["specific style habit to preserve"]
  }},
  "scene_suggestions": [
    {{"title": "suggestion", "description": "specific next-scene guidance", "evidence": ["story fact used"]}}
  ],
  "foreshadowing": [
    {{"title": "seed", "description": "how to plant or pay off the setup", "evidence": ["story fact used"]}}
  ]
}}

STORY BIBLE:
{story_bible}

RECENT CHAPTER CONTEXT:
{recent_context}
"""

SCENE_SUGGESTION_PROMPT = """
You are Story-Weaver AI. Suggest scenes that strengthen continuity, conflict escalation,
character growth, dialogue texture, and foreshadowing. Return ONLY valid JSON:
[
  {{"title": "scene idea", "description": "specific actionable suggestion", "evidence": ["relevant established fact"]}}
]

STORY BIBLE:
{story_bible}

WRITER GOAL:
{goal}

DRAFT CONTEXT:
{draft_context}
"""


async def _generate_text(prompt: str, timeout: int = GROQ_TIMEOUT_SECONDS) -> str:
    """Asynchronously generate text using Groq API with model fallback."""
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(backend_dir, ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path, override=True)
    else:
        load_dotenv(override=True)

    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key or groq_key.strip() == "" or groq_key == "your_groq_api_key_here":
        raise RuntimeError("GROQ_API_KEY is not configured in environment or .env file.")

    base_url = os.getenv("GROQ_BASE_URL", GROQ_DEFAULT_BASE_URL).rstrip("/")
    custom_model = os.getenv("GROQ_MODEL")
    
    preferred_models = []
    if custom_model:
        preferred_models.append(custom_model)
    preferred_models.extend(GROQ_PREFERRED_MODELS)
    
    # De-duplicate models while preserving order
    models = []
    for m in preferred_models:
        if m and m not in models:
            models.append(m)

    import httpx
    url = f"{base_url}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {groq_key}"
    }
    
    last_error = None
    for model in models:
        payload = {
            "model": model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2
        }
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    result = response.json()
                    return result["choices"][0]["message"]["content"].strip()
                else:
                    err_msg = f"HTTP {response.status_code}: {response.text}"
                    print(f"[Groq] Model {model} failed: {err_msg}. Trying next model...")
                    last_error = RuntimeError(err_msg)
        except Exception as e:
            print(f"[Groq] Model {model} raised exception: {e}. Trying next model...")
            last_error = e
            
    raise RuntimeError(f"All Groq models failed. Last error: {last_error}")


def _clean_json(text: str) -> str:
    """Strip markdown fences from model response."""
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return text.strip()


async def extract_entities(content: str, chapter_number: int, chapter_title: str) -> dict:
    """Use Groq to extract entities from a chapter."""
    prompt = EXTRACTION_PROMPT.format(
        chapter_number=chapter_number,
        chapter_title=chapter_title or f"Chapter {chapter_number}",
        content=content[:5000]
    )

    try:
        text = await _generate_text(prompt)
        text = _clean_json(text)
        data = json.loads(text)
        return data
    except json.JSONDecodeError:
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except Exception:
                pass
        return {"characters": [], "locations": [], "events": [], "relationships": [], "universe_rules": []}
    except Exception as e:
        print(f"Extraction error: {e}")
        return {"characters": [], "locations": [], "events": [], "relationships": [], "universe_rules": []}


async def check_continuity(
    content: str,
    chapter_number: int,
    chapter_title: str,
    story_bible: str
) -> list:
    """Use Groq to check continuity against the story bible."""
    prompt = CONTINUITY_PROMPT.format(
        story_bible=story_bible[:6000],
        chapter_number=chapter_number,
        chapter_title=chapter_title or f"Chapter {chapter_number}",
        content=content[:4000]
    )

    try:
        text = await _generate_text(prompt)
        text = _clean_json(text)
        data = json.loads(text)
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"Continuity check error: {e}")
        return []


async def chat_with_story(
    story_title: str,
    context: str,
    question: str,
    history: list
) -> str:
    """Use Groq to answer questions about the story."""
    history_text = "\n".join([
        f"User: {msg['user']}\nAssistant: {msg['assistant']}"
        for msg in history[-5:]
    ]) if history else "No previous conversation."

    prompt = CHAT_PROMPT.format(
        story_title=story_title,
        context=context[:5000],
        history=history_text,
        question=question
    )

    try:
        text = await _generate_text(prompt)
        return text
    except Exception as e:
        print(f"Chat error: {e}")
        return "I encountered an error processing your question. Please try again."


async def generate_creative_guidance(story_bible: str, recent_context: str) -> dict:
    prompt = CREATIVE_GUIDANCE_PROMPT.format(
        story_bible=story_bible[:7000],
        recent_context=recent_context[:3000] or "No recent chapter context available."
    )

    try:
        text = await _generate_text(prompt, timeout=12)
        text = _clean_json(text)
        data = json.loads(text)
        return data if isinstance(data, dict) else {}
    except Exception as e:
        print(f"Creative guidance error: {e}")
        return {}


async def generate_scene_suggestions(
    story_bible: str,
    draft_context: str = "",
    goal: str = ""
) -> list:
    prompt = SCENE_SUGGESTION_PROMPT.format(
        story_bible=story_bible[:7000],
        draft_context=draft_context[:3000] or "No draft context provided.",
        goal=goal[:1000] or "Suggest the strongest next scenes."
    )

    try:
        text = await _generate_text(prompt, timeout=12)
        text = _clean_json(text)
        data = json.loads(text)
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"Scene suggestion error: {e}")
        return []
