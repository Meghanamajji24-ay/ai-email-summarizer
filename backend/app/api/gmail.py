import logging
import secrets
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse

from app.api.auth import get_current_user
from app.core.config import settings
from app.core.rate_limiter import rate_limit_sync
from app.db.mongodb import get_database
from app.services.gmail_service import gmail_service
from app.services.demo_data_service import seed_demo_emails_for_user

logger = logging.getLogger("ai_email_summarizer.gmail_api")
router = APIRouter(prefix="/gmail", tags=["Gmail Integration"])

# In-memory OAuth state registry with user mapping
oauth_states = {}

@router.get("/status")
async def get_gmail_status(current_user: dict = Depends(get_current_user)):
    db = get_database()
    connection = await db.gmail_connections.find_one({"user_id": current_user["id"]})

    if not connection or not connection.get("is_connected"):
        return {
            "is_connected": False,
            "google_account_email": None,
            "is_demo": False,
            "is_oauth_configured": gmail_service.is_configured(),
            "last_synced_at": None,
            "granted_scopes": []
        }

    return {
        "is_connected": True,
        "google_account_email": connection.get("google_account_email"),
        "is_demo": connection.get("is_demo", False),
        "is_oauth_configured": gmail_service.is_configured(),
        "last_synced_at": connection.get("last_synced_at"),
        "granted_scopes": connection.get("granted_scopes", [])
    }

@router.get("/connect")
async def connect_gmail(current_user: dict = Depends(get_current_user)):
    if not gmail_service.is_configured():
        return {
            "oauth_url": None,
            "is_configured": False,
            "message": "Google OAuth client ID is not configured. You can use 'Demo Mode' for testing or provide GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        }

    state = f"{current_user['id']}:{secrets.token_urlsafe(16)}"
    oauth_states[state] = current_user["id"]
    auth_url = gmail_service.get_auth_url(state)

    return {
        "oauth_url": auth_url,
        "is_configured": True,
        "message": "Redirect user to authorization URL"
    }

@router.get("/callback")
async def gmail_oauth_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None
):
    if error:
        return RedirectResponse(f"{settings.FRONTEND_URL}/settings?error={error}")

    if not code or not state:
        return RedirectResponse(f"{settings.FRONTEND_URL}/settings?error=missing_oauth_parameters")

    user_id = oauth_states.pop(state, None)
    if not user_id and ":" in state:
        user_id = state.split(":")[0]

    if not user_id:
        return RedirectResponse(f"{settings.FRONTEND_URL}/settings?error=invalid_oauth_state")

    try:
        tokens = await gmail_service.exchange_code_for_tokens(code)
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        granted_scopes = tokens.get("scope", "").split(" ")

        user_info = await gmail_service.get_google_user_profile(access_token)
        google_email = user_info.get("email", "connected@gmail.com")

        await gmail_service.save_connection(
            user_id=user_id,
            google_email=google_email,
            refresh_token=refresh_token or "",
            scopes=granted_scopes
        )

        # Trigger initial background sync
        try:
            await gmail_service.sync_emails(user_id=user_id, max_results=20)
        except Exception as sync_e:
            logger.warning(f"Initial sync warning: {sync_e}")

        return RedirectResponse(f"{settings.FRONTEND_URL}/inbox?status=gmail_connected")

    except Exception as exc:
        logger.error(f"OAuth callback handling failed: {exc}")
        return RedirectResponse(f"{settings.FRONTEND_URL}/settings?error=oauth_exchange_failed")

@router.post("/demo-connect")
async def connect_demo_account(current_user: dict = Depends(get_current_user)):
    """Connects a demo Gmail account and seeds realistic emails with automated AI summaries."""
    user_id = current_user["id"]
    count = await seed_demo_emails_for_user(user_id, auto_summarize=True)
    return {
        "success": True,
        "message": f"Demo Gmail account connected successfully. Loaded {count} emails with summaries & action items.",
        "is_demo": True
    }

@router.post("/sync")
async def sync_emails(request: Request, current_user: dict = Depends(get_current_user), _=Depends(rate_limit_sync)):
    """Triggers synchronization of authorized emails."""
    res = await gmail_service.sync_emails(user_id=current_user["id"], max_results=30)
    return res

@router.post("/disconnect")
async def disconnect_gmail(current_user: dict = Depends(get_current_user)):
    """Disconnects Gmail and clears stored OAuth credentials."""
    await gmail_service.disconnect(user_id=current_user["id"])
    return {
        "success": True,
        "message": "Gmail account disconnected successfully. Your existing synchronized emails remain saved in your application."
    }
