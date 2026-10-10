from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.schemas.email import EmailOut
from app.schemas.task import TaskOut

class PriorityDistribution(BaseModel):
    high: int = 0
    medium: int = 0
    low: int = 0

class ActivityItem(BaseModel):
    id: str
    type: str # "summary_created", "task_completed", "email_synced", "task_created"
    title: str
    description: str
    timestamp: datetime

class DashboardStatsResponse(BaseModel):
    user_name: str
    total_emails_processed: int
    unread_emails_count: int
    high_priority_count: int
    pending_tasks_count: int
    priority_distribution: PriorityDistribution
    recent_emails: List[EmailOut]
    pending_tasks: List[TaskOut]
    recent_activities: List[ActivityItem]
    is_gmail_connected: bool
    connected_account: Optional[str] = None
    last_synced_at: Optional[datetime] = None
