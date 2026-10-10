import math
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.api.auth import get_current_user
from app.core.rate_limiter import rate_limit_ai
from app.db.mongodb import get_database
from app.schemas.email import EmailOut, EmailDetailOut, EmailListResponse, SuggestReplyRequest, SuggestReplyResponse
from app.schemas.summary import SummaryResponse, RegenerateSummaryRequest, ActionItemSchema
from app.services.ai_summarizer import ai_service
from app.utils.html_cleaner import clean_html_for_preview

router = APIRouter(prefix="/emails", tags=["Emails"])

def doc_to_email_out(doc: dict) -> EmailOut:
    return EmailOut(
        id=str(doc["_id"]),
        gmail_message_id=doc.get("gmail_message_id"),
        gmail_thread_id=doc.get("gmail_thread_id"),
        sender_name=doc.get("sender_name", "Unknown"),
        sender_email=doc.get("sender_email", ""),
        subject=doc.get("subject", "(No Subject)"),
        snippet=doc.get("snippet", ""),
        received_date=doc.get("received_date", datetime.now(timezone.utc)),
        is_read=doc.get("is_read", False),
        priority=doc.get("priority", "medium"),
        has_summary=doc.get("has_summary", False),
        short_summary=doc.get("short_summary"),
        action_count=doc.get("action_count", 0),
        is_demo=doc.get("is_demo", False)
    )

@router.get("", response_model=EmailListResponse)
async def get_emails(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    search: Optional[str] = Query(None),
    filter_by: Optional[str] = Query("all", pattern="^(all|unread|high_priority|needs_action)$"),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["id"]
    query = {"user_id": user_id}

    if filter_by == "unread":
        query["is_read"] = False
    elif filter_by == "high_priority":
        query["priority"] = "high"
    elif filter_by == "needs_action":
        query["action_count"] = {"$gt": 0}

    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"subject": search_regex},
            {"sender_name": search_regex},
            {"sender_email": search_regex},
            {"snippet": search_regex}
        ]

    total = await db.emails.count_documents(query)
    skip = (page - 1) * page_size

    cursor = db.emails.find(query).sort("received_date", -1).skip(skip).limit(page_size)
    emails_raw = await cursor.to_list(length=page_size)
    emails = [doc_to_email_out(doc) for doc in emails_raw]

    unread_count = await db.emails.count_documents({"user_id": user_id, "is_read": False})
    high_priority_count = await db.emails.count_documents({"user_id": user_id, "priority": "high"})
    total_pages = max(1, math.ceil(total / page_size)) if total > 0 else 1

    return EmailListResponse(
        emails=emails,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        unread_count=unread_count,
        high_priority_count=high_priority_count
    )

@router.get("/{email_id}", response_model=EmailDetailOut)
async def get_email_detail(email_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["id"]

    filter_dict = {
        "user_id": user_id,
        "_id": ObjectId(email_id) if ObjectId.is_valid(email_id) else email_id
    }
    doc = await db.emails.find_one(filter_dict)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found.")

    # Mark as read
    if not doc.get("is_read", False):
        await db.emails.update_one(
            {"_id": doc["_id"], "user_id": user_id},
            {"$set": {"is_read": True, "updated_at": datetime.now(timezone.utc)}}
        )
        doc["is_read"] = True

    # Fetch summary if exists, or auto-generate
    summary_doc = await db.summaries.find_one({"email_id": email_id, "user_id": user_id})
    summary_response = None
    if summary_doc:
        summary_response = SummaryResponse(
            id=str(summary_doc.get("_id", "")),
            email_id=email_id,
            summary=summary_doc.get("summary", ""),
            key_points=summary_doc.get("key_points", []),
            action_items=[ActionItemSchema(**item) for item in summary_doc.get("action_items", [])],
            decisions=summary_doc.get("decisions", []),
            important_dates=summary_doc.get("important_dates", []),
            priority=summary_doc.get("priority", "medium"),
            sentiment=summary_doc.get("sentiment", "neutral"),
            suggested_reply=summary_doc.get("suggested_reply"),
            model_name=summary_doc.get("model_name"),
            created_at=summary_doc.get("created_at")
        )
    else:
        # Generate summary on the fly
        summary_response = await ai_service.summarize_email(
            email_id=email_id,
            user_id=user_id,
            subject=doc.get("subject", ""),
            sender=doc.get("sender_name", ""),
            body_text=doc.get("body_text", ""),
            received_date=doc.get("received_date")
        )

    gmail_link = None
    if doc.get("gmail_message_id") and not doc.get("is_demo"):
        gmail_link = f"https://mail.google.com/mail/u/0/#inbox/{doc['gmail_message_id']}"

    return EmailDetailOut(
        id=str(doc["_id"]),
        gmail_message_id=doc.get("gmail_message_id"),
        gmail_thread_id=doc.get("gmail_thread_id"),
        sender_name=doc.get("sender_name", "Unknown"),
        sender_email=doc.get("sender_email", ""),
        subject=doc.get("subject", "(No Subject)"),
        snippet=doc.get("snippet", ""),
        received_date=doc.get("received_date", datetime.now(timezone.utc)),
        is_read=doc.get("is_read", True),
        priority=doc.get("priority", "medium"),
        has_summary=True,
        short_summary=summary_response.summary[:250] if summary_response else None,
        action_count=len(summary_response.action_items) if summary_response else 0,
        is_demo=doc.get("is_demo", False),
        recipients=doc.get("recipients", []),
        body_text=doc.get("body_text", ""),
        body_html=clean_html_for_preview(doc.get("body_html", "")),
        summary=summary_response,
        gmail_link=gmail_link
    )

@router.post("/{email_id}/summarize", response_model=SummaryResponse)
async def summarize_email_endpoint(
    email_id: str,
    req: Optional[RegenerateSummaryRequest] = None,
    current_user: dict = Depends(get_current_user),
    _ = Depends(rate_limit_ai)
):
    db = get_database()
    user_id = current_user["id"]

    filter_dict = {
        "user_id": user_id,
        "_id": ObjectId(email_id) if ObjectId.is_valid(email_id) else email_id
    }
    email_doc = await db.emails.find_one(filter_dict)
    if not email_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found.")

    length_pref = req.summary_length if req and req.summary_length else "standard"
    summary = await ai_service.summarize_email(
        email_id=email_id,
        user_id=user_id,
        subject=email_doc.get("subject", ""),
        sender=email_doc.get("sender_name", ""),
        body_text=email_doc.get("body_text", ""),
        received_date=email_doc.get("received_date"),
        summary_length=length_pref,
        force_regenerate=True
    )
    return summary

@router.post("/{email_id}/suggest-reply", response_model=SuggestReplyResponse)
async def suggest_reply_endpoint(
    email_id: str,
    req: SuggestReplyRequest,
    current_user: dict = Depends(get_current_user),
    _ = Depends(rate_limit_ai)
):
    db = get_database()
    user_id = current_user["id"]

    filter_dict = {
        "user_id": user_id,
        "_id": ObjectId(email_id) if ObjectId.is_valid(email_id) else email_id
    }
    email_doc = await db.emails.find_one(filter_dict)
    if not email_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found.")

    reply_text = await ai_service.generate_reply(
        subject=email_doc.get("subject", ""),
        sender=email_doc.get("sender_name", ""),
        body_text=email_doc.get("body_text", ""),
        tone=req.tone,
        instructions=req.instructions
    )

    return SuggestReplyResponse(suggested_reply=reply_text, tone=req.tone)

@router.patch("/{email_id}/read-status")
async def toggle_read_status(email_id: str, is_read: bool = Query(...), current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["id"]
    res = await db.emails.update_one(
        {"_id": ObjectId(email_id) if ObjectId.is_valid(email_id) else email_id, "user_id": user_id},
        {"$set": {"is_read": is_read, "updated_at": datetime.now(timezone.utc)}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found.")
    return {"success": True, "is_read": is_read}

@router.delete("/{email_id}")
async def delete_email(email_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["id"]
    oid = ObjectId(email_id) if ObjectId.is_valid(email_id) else email_id

    res = await db.emails.delete_one({"_id": oid, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found.")

    # Cleanup associated summaries and tasks
    await db.summaries.delete_many({"email_id": email_id, "user_id": user_id})
    await db.tasks.delete_many({"email_id": email_id, "user_id": user_id})

    return {"message": "Email and related data deleted successfully."}
