import os
os.environ["ANONYMIZED_TELEMETRY"] = "False"
import posthog
posthog.capture = lambda *args, **kwargs: None
import chromadb
import json
from typing import List, Dict

# Initialize ChromaDB client (persistent)
CHROMA_PATH = os.getenv("STORYWEAVER_CHROMA_PATH", "./chroma_data")
chroma_client = chromadb.PersistentClient(
    path=CHROMA_PATH,
    settings=chromadb.Settings(anonymized_telemetry=False)
)


def get_collection(story_id: str):
    """Get or create a ChromaDB collection for a story."""
    collection_name = f"story_{story_id.replace('-', '_')}"
    try:
        return chroma_client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )
    except Exception as e:
        print(f"ChromaDB error: {e}")
        return None


def add_chapter_to_store(story_id: str, chapter_id: str, chapter_number: int, content: str, title: str = ""):
    """Add a chapter's content to the vector store."""
    collection = get_collection(story_id)
    if not collection:
        return
    
    # Split into chunks of ~500 words for better retrieval
    words = content.split()
    chunk_size = 500
    chunks = []
    
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    
    if not chunks:
        return
    
    ids = [f"{chapter_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "chapter_id": chapter_id,
            "chapter_number": chapter_number,
            "chapter_title": title or f"Chapter {chapter_number}",
            "chunk_index": i
        }
        for i in range(len(chunks))
    ]
    
    # Remove existing chunks for this chapter (if re-processing)
    try:
        existing = collection.get(where={"chapter_id": {"$eq": chapter_id}})
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
    except Exception:
        pass
    
    try:
        collection.add(documents=chunks, ids=ids, metadatas=metadatas)
    except Exception as e:
        print(f"Error adding to ChromaDB: {e}")


def query_story(story_id: str, query: str, n_results: int = 5) -> List[Dict]:
    """Query the vector store for relevant passages."""
    collection = get_collection(story_id)
    if not collection:
        return []
    
    try:
        count = collection.count()
        if count == 0:
            return []
        
        results = collection.query(
            query_texts=[query],
            n_results=min(n_results, count)
        )
        
        passages = []
        if results["documents"] and results["documents"][0]:
            for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
                passages.append({
                    "content": doc,
                    "chapter_number": meta.get("chapter_number", 0),
                    "chapter_title": meta.get("chapter_title", ""),
                })
        return passages
    except Exception as e:
        print(f"Query error: {e}")
        return []


def format_context(passages: List[Dict]) -> str:
    """Format retrieved passages into a context string."""
    if not passages:
        return "No relevant story content found."
    
    context_parts = []
    for p in passages:
        context_parts.append(
            f"[Chapter {p['chapter_number']}: {p['chapter_title']}]\n{p['content']}"
        )
    return "\n\n---\n\n".join(context_parts)
