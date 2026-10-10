import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Header, Cookie
from pydantic import EmailStr

from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token, generate_reset_token, hash_reset_token
from app.core.rate_limiter import rate_limit_auth
from app.db.mongodb import get_database
from app.schemas.auth import (
    UserRegister, UserLogin, UserResponse, AuthResponse,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest
)

logger = logging.getLogger("ai_email_summarizer.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])

async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    access_token: Optional[str] = Cookie(None)
) -> dict:
    """Dependency that verifies JWT token from Authorization header or HTTP-only cookie."""
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    elif access_token:
        token = access_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user_id = payload["sub"]
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user["id"] = str(user["_id"])
    return user

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, response: Response, request: Request, _=Depends(rate_limit_auth)):
    db = get_database()
    email_clean = user_data.email.lower().strip()

    existing = await db.users.find_one({"email": email_clean})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    now = datetime.now(timezone.utc)
    hashed_pwd = hash_password(user_data.password)

    user_doc = {
        "name": user_data.name.strip(),
        "email": email_clean,
        "password_hash": hashed_pwd,
        "created_at": now,
        "updated_at": now,
        "preferences": {
            "summary_length": "standard",
            "auto_extract_tasks": True,
            "theme": "light",
            "sync_frequency_minutes": 15
        },
        "is_gmail_connected": False,
        "gmail_account": None
    }

    insert_res = await db.users.insert_one(user_doc)
    user_id = str(insert_res.inserted_id)

    token = create_access_token({"sub": user_id, "email": email_clean})

    # Set secure HTTP-only cookie
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production"
    )

    user_response = UserResponse(
        id=user_id,
        name=user_doc["name"],
        email=email_clean,
        created_at=now,
        preferences=user_doc["preferences"],
        is_gmail_connected=False,
        gmail_account=None
    )

    return AuthResponse(user=user_response, token=token, message="Registration successful")

@router.post("/login", response_model=AuthResponse)
async def login(credentials: UserLogin, response: Response, request: Request, _=Depends(rate_limit_auth)):
    db = get_database()
    email_clean = credentials.email.lower().strip()

    user = await db.users.find_one({"email": email_clean})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    user_id = str(user["_id"])
    token = create_access_token({"sub": user_id, "email": email_clean})

    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production"
    )

    user_response = UserResponse(
        id=user_id,
        name=user["name"],
        email=email_clean,
        created_at=user.get("created_at", datetime.now(timezone.utc)),
        preferences=user.get("preferences"),
        is_gmail_connected=user.get("is_gmail_connected", False),
        gmail_account=user.get("gmail_account")
    )

    return AuthResponse(user=user_response, token=token, message="Login successful")

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(settings.COOKIE_NAME)
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        created_at=current_user.get("created_at", datetime.now(timezone.utc)),
        preferences=current_user.get("preferences"),
        is_gmail_connected=current_user.get("is_gmail_connected", False),
        gmail_account=current_user.get("gmail_account")
    )

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, request: Request, _=Depends(rate_limit_auth)):
    db = get_database()
    email_clean = req.email.lower().strip()
    user = await db.users.find_one({"email": email_clean})

    if user:
        raw_token = generate_reset_token()
        hashed_token = hash_reset_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"reset_token_hash": hashed_token, "reset_token_expires_at": expires_at}}
        )

        # In development / sandbox, return the reset token for effortless testing
        return {
            "message": "Password reset instructions have been generated.",
            "demo_reset_token": raw_token if settings.ENVIRONMENT != "production" else None
        }

    return {"message": "If an account with that email exists, password reset instructions have been sent."}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, request: Request, _=Depends(rate_limit_auth)):
    db = get_database()
    hashed_token = hash_reset_token(req.token)
    now = datetime.now(timezone.utc)

    user = await db.users.find_one({
        "reset_token_hash": hashed_token,
        "reset_token_expires_at": {"$gte": now}
    })

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )

    new_hash = hash_password(req.new_password)
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password_hash": new_hash, "updated_at": now},
            "$unset": {"reset_token_hash": "", "reset_token_expires_at": ""}
        }
    )

    return {"message": "Password has been successfully updated. You may now log in."}

@router.post("/change-password")
async def change_password(req: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(current_user["id"]) if ObjectId.is_valid(current_user["id"]) else current_user["id"]})

    if not user or not verify_password(req.current_password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    new_hash = hash_password(req.new_password)
    now = datetime.now(timezone.utc)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": new_hash, "updated_at": now}}
    )

    return {"message": "Password changed successfully."}
