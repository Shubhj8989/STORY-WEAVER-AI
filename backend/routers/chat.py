from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.database import get_db, Story
from models.schema import ChatMessage, ChatResponse
from services.extractor import chat_with_story
from services.rag_service import query_story, format_context

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def story_chat(request: ChatMessage, db: AsyncSession = Depends(get_db)):
    """RAG-powered chat about the story using Gemini."""
    # Get story title
    story_result = await db.execute(select(Story).where(Story.id == request.story_id))
    story = story_result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Retrieve relevant passages from vector store
    passages = query_story(request.story_id, request.message, n_results=5)
    context = format_context(passages)
    
    # Get sources for citation
    sources = list(set([
        f"Chapter {p['chapter_number']}: {p['chapter_title']}"
        for p in passages
        if p.get("chapter_number")
    ]))
    
    # Generate answer with Gemini
    answer = await chat_with_story(
        story_title=story.title,
        context=context,
        question=request.message,
        history=request.history
    )
    
    return ChatResponse(answer=answer, sources=sources)
