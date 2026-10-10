from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.api.auth import get_current_user
from app.db.mongodb import get_database
from app.schemas.settings import UserSettingsOut, UserSettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("", response_model=UserSettingsOut)
async def get_settings(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["id"]

    gmail_conn = await db.gmail_connections.find_one({"user_id": user_id})
    is_connected = bool(gmail_conn and gmail_conn.get("is_connected"))
    gmail_account = gmail_conn.get("google_account_email") if is_connected else None
    last_synced_at = gmail_conn.get("last_synced_at").isoformat() if is_connected and gmail_conn.get("last_synced_at") else None

    prefs = current_user.get("preferences", {})

    return UserSettingsOut(
        name=current_user.get("name", ""),
        email=current_user.get("email", ""),
        summary_length=prefs.get("summary_length", "standard"),
        auto_extract_tasks=prefs.get("auto_extract_tasks", True),
        default_priority_threshold=prefs.get("default_priority_threshold", "medium"),
        sync_frequency_minutes=prefs.get("sync_frequency_minutes", 15),
        sync_limit=prefs.get("sync_limit", 50),
        theme=prefs.get("theme", "light"),
        is_gmail_connected=is_connected,
        gmail_account=gmail_account,
        last_synced_at=last_synced_at
    )

@router.patch("", response_model=UserSettingsOut)
async def update_settings(update_data: UserSettingsUpdate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["id"]
    oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id

    current_prefs = current_user.get("preferences", {})
    update_doc = {"updated_at": datetime.now(timezone.utc)}

    if update_data.name is not None:
        update_doc["name"] = update_data.name.strip()

    # Update preferences dictionary
    for field in ["summary_length", "auto_extract_tasks", "default_priority_threshold", "sync_frequency_minutes", "sync_limit", "theme"]:
        val = getattr(update_data, field)
        if val is not None:
            current_prefs[field] = val

    update_doc["preferences"] = current_prefs

    await db.users.update_one({"_id": oid}, {"$set": update_doc})
    user = await db.users.find_one({"_id": oid})

    gmail_conn = await db.gmail_connections.find_one({"user_id": user_id})
    is_connected = bool(gmail_conn and gmail_conn.get("is_connected"))
    gmail_account = gmail_conn.get("google_account_email") if is_connected else None
    last_synced = gmail_conn.get("last_synced_at").isoformat() if is_connected and gmail_conn.get("last_synced_at") else None

    return UserSettingsOut(
        name=user.get("name", ""),
        email=user.get("email", ""),
        summary_length=current_prefs.get("summary_length", "standard"),
        auto_extract_tasks=current_prefs.get("auto_extract_tasks", True),
        default_priority_threshold=current_prefs.get("default_priority_threshold", "medium"),
        sync_frequency_minutes=current_prefs.get("sync_frequency_minutes", 15),
        sync_limit=current_prefs.get("sync_limit", 50),
        theme=current_prefs.get("theme", "light"),
        is_gmail_connected=is_connected,
        gmail_account=gmail_account,
        last_synced_at=last_synced
    )

@router.post("/export-data")
async def export_user_data(current_user: dict = Depends(get_current_user)):
    """Exports all user emails, summaries, and tasks as structured JSON."""
    db = get_database()
    user_id = current_user["id"]

    emails = await db.emails.find({"user_id": user_id}).to_list(1000)
    summaries = await db.summaries.find({"user_id": user_id}).to_list(1000)
    tasks = await db.tasks.find({"user_id": user_id}).to_list(1000)

    # Convert ObjectIds to strings
    for item in emails + summaries + tasks:
        if "_id" in item:
            item["_id"] = str(item["_id"])
        if "created_at" in item and isinstance(item["created_at"], datetime):
            item["created_at"] = item["created_at"].isoformat()
        if "updated_at" in item and isinstance(item["updated_at"], datetime):
            item["updated_at"] = item["updated_at"].isoformat()
        if "received_date" in item and isinstance(item["received_date"], datetime):
            item["received_date"] = item["received_date"].isoformat()

    export_payload = {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "user": {
            "name": current_user.get("name"),
            "email": current_user.get("email")
        },
        "emails_count": len(emails),
        "tasks_count": len(tasks),
        "emails": emails,
        "summaries": summaries,
        "tasks": tasks
    }

    return JSONResponse(
        content=export_payload,
        headers={"Content-Disposition": f"attachment; filename=ai_email_export_{user_id[:8]}.json"}
    )

@router.delete("/account")
async def delete_account(current_user: dict = Depends(get_current_user)):
    """Deletes the user's account and all associated emails, summaries, tasks, and connection tokens."""
    db = get_database()
    user_id = current_user["id"]
    oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id

    # Cascade delete all user records
    await db.emails.delete_many({"user_id": user_id})
    await db.summaries.delete_many({"user_id": user_id})
    await db.tasks.delete_many({"user_id": user_id})
    await db.gmail_connections.delete_many({"user_id": user_id})
    await db.users.delete_one({"_id": oid})

    return {"message": "Your account and all associated data have been permanently deleted."}
