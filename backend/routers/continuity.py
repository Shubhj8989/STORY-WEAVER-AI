import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.database import get_db, ContinuityError, Story
from models.schema import ContinuityCheckRequest, ContinuityErrorOut
from services.extractor import check_continuity
from services.bible_service import build_story_bible_text

router = APIRouter(prefix="/api/continuity", tags=["continuity"])


@router.post("/check")
async def check_chapter_continuity(
    request: ContinuityCheckRequest,
    db: AsyncSession = Depends(get_db)
):
    """Check a chapter for continuity errors against the story bible."""
    story_result = await db.execute(select(Story).where(Story.id == request.story_id))
    story = story_result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Build the story bible from DB
    story_bible = await build_story_bible_text(request.story_id, db)
    
    if "empty" in story_bible.lower():
        return {"errors": [], "message": "No story bible yet — upload chapters first."}
    
    # Run Gemini continuity check
    errors = await check_continuity(
        content=request.content,
        chapter_number=request.chapter_number,
        chapter_title=request.chapter_title,
        story_bible=story_bible
    )
    
    # Save errors to DB
    saved_errors = []
    for err in errors:
        err_id = str(uuid.uuid4())
        db_err = ContinuityError(
            id=err_id,
            story_id=request.story_id,
            chapter=f"Chapter {request.chapter_number}",
            error_type=err.get("error_type", "contradiction"),
            description=err.get("description", ""),
            conflicting_fact=err.get("conflicting_fact", ""),
            original_fact=err.get("original_fact", ""),
            severity=err.get("severity", "medium"),
            resolved=False
        )
        db.add(db_err)
        saved_errors.append({
            "id": err_id,
            **err
        })
    
    await db.commit()
    
    return {
        "chapter": f"Chapter {request.chapter_number}",
        "errors_found": len(errors),
        "errors": saved_errors
    }


@router.get("/{story_id}/errors", response_model=list[ContinuityErrorOut])
async def get_all_errors(story_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ContinuityError)
        .where(ContinuityError.story_id == story_id)
        .order_by(ContinuityError.created_at.desc())
    )
    errors = result.scalars().all()
    return [
        ContinuityErrorOut(
            id=e.id,
            story_id=e.story_id,
            chapter=e.chapter,
            error_type=e.error_type,
            description=e.description,
            conflicting_fact=e.conflicting_fact,
            original_fact=e.original_fact,
            severity=e.severity,
            resolved=e.resolved
        )
        for e in errors
    ]


@router.patch("/errors/{error_id}/resolve")
async def resolve_error(error_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ContinuityError).where(ContinuityError.id == error_id))
    error = result.scalar_one_or_none()
    if not error:
        raise HTTPException(status_code=404, detail="Error not found")
    
    error.resolved = True
    await db.commit()
    return {"success": True, "message": "Error marked as resolved"}
