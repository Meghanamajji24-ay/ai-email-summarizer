from datetime import datetime, timezone
from fastapi import APIRouter, Depends

from app.api.auth import get_current_user
from app.api.emails import doc_to_email_out
from app.api.actions import doc_to_task_out
from app.db.mongodb import get_database
from app.schemas.dashboard import DashboardStatsResponse, PriorityDistribution, ActivityItem

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["id"]

    # Email counts
    total_emails = await db.emails.count_documents({"user_id": user_id})
    unread_emails = await db.emails.count_documents({"user_id": user_id, "is_read": False})
    high_priority = await db.emails.count_documents({"user_id": user_id, "priority": "high"})
    medium_priority = await db.emails.count_documents({"user_id": user_id, "priority": "medium"})
    low_priority = await db.emails.count_documents({"user_id": user_id, "priority": "low"})

    # Pending tasks count
    pending_tasks_count = await db.tasks.count_documents({"user_id": user_id, "status": "pending"})

    # Recent emails (top 5)
    recent_emails_raw = await db.emails.find({"user_id": user_id}).sort("received_date", -1).limit(5).to_list(5)
    recent_emails = [doc_to_email_out(doc) for doc in recent_emails_raw]

    # Pending tasks (top 5)
    pending_tasks_raw = await db.tasks.find({"user_id": user_id, "status": "pending"}).sort("created_at", -1).limit(5).to_list(5)
    pending_tasks = [doc_to_task_out(doc) for doc in pending_tasks_raw]

    # Gmail connection
    gmail_conn = await db.gmail_connections.find_one({"user_id": user_id})
    is_connected = bool(gmail_conn and gmail_conn.get("is_connected"))
    connected_account = gmail_conn.get("google_account_email") if is_connected else None
    last_synced_at = gmail_conn.get("last_synced_at") if is_connected else None

    # Construct dynamic activity log
    activities = []
    # Add recent email summaries as activities
    for em in recent_emails[:3]:
        activities.append(ActivityItem(
            id=f"act_em_{em.id}",
            type="summary_created" if em.has_summary else "email_synced",
            title=f"Analyzed: {em.subject[:40]}...",
            description=f"Received from {em.sender_name} • Priority: {em.priority.upper()}",
            timestamp=em.received_date
        ))

    # Add recent tasks as activities
    for t in pending_tasks[:3]:
        activities.append(ActivityItem(
            id=f"act_task_{t.id}",
            type="task_created",
            title=f"Action item: {t.title[:40]}...",
            description=f"Deadline: {t.due_date or 'No deadline'} • Status: {t.status}",
            timestamp=t.created_at
        ))

    activities.sort(key=lambda x: x.timestamp, reverse=True)

    return DashboardStatsResponse(
        user_name=current_user.get("name", "User"),
        total_emails_processed=total_emails,
        unread_emails_count=unread_emails,
        high_priority_count=high_priority,
        pending_tasks_count=pending_tasks_count,
        priority_distribution=PriorityDistribution(
            high=high_priority,
            medium=medium_priority,
            low=low_priority
        ),
        recent_emails=recent_emails,
        pending_tasks=pending_tasks,
        recent_activities=activities[:6],
        is_gmail_connected=is_connected,
        connected_account=connected_account,
        last_synced_at=last_synced_at
    )
