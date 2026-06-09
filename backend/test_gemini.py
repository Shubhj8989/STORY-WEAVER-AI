import asyncio, sys, os
sys.path.insert(0, '.')

from services.extractor import extract_entities, chat_with_story

async def test():
    print("=== TEST 1: Entity Extraction (Groq) ===")
    result = await extract_entities(
        "Aryan Sharma is a 22-year-old man with dark brown eyes, black hair, and an eye patch over his left eye. He lives in Varanasi. Maya Iyer is his ally with green eyes. Rustam Beg is a tall enemy with a scar.",
        1, "The Beginning"
    )
    chars = result.get("characters", [])
    print(f"Extracted {len(chars)} characters")
    for c in chars:
        name = c.get("name", "?")
        eyes = c.get("physical_traits", {}).get("eyes", "?")
        status = c.get("status", "?")
        print(f"  - {name}: eyes={eyes}, status={status}")
    print(f"Locations: {len(result.get('locations', []))}")
    print(f"Relationships: {len(result.get('relationships', []))}")

    print()
    print("=== TEST 2: Chat (Groq) ===")
    answer = await chat_with_story(
        "Chronicles of Aryan",
        "Aryan has brown eyes and wears an eye patch on his left eye. He is 22 years old.",
        "Who is Aryan and what happened to his eye?",
        []
    )
    print("Chat answer:", answer[:300])

asyncio.run(test())

