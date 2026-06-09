from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import hashlib
from db.database import get_db, User

router = APIRouter(prefix="/api/auth", tags=["auth"])

class UserCredentials(BaseModel):
    username: str
    password: str

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@router.post("/signup")
async def signup(credentials: UserCredentials, db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    username = credentials.username.strip().lower()
    password = credentials.password
    
    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required"
        )
        
    # Check if user already exists
    existing = await db.execute(select(User).where(User.username == username))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
        
    new_user = User(username=username, password=hash_password(password))
    db.add(new_user)
    await db.commit()
    return {"success": True, "username": username}

@router.post("/login")
async def login(credentials: UserCredentials, db: AsyncSession = Depends(get_db)):
    """Authenticate a user."""
    username = credentials.username.strip().lower()
    password = credentials.password
    
    user_result = await db.execute(select(User).where(User.username == username))
    user = user_result.scalar_one_or_none()
    
    if not user or user.password != hash_password(password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
        
    return {"success": True, "username": username}
