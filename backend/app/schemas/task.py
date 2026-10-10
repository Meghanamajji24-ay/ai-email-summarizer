from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    email_id: Optional[str] = None
    email_subject: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = Field(default="medium", description="high, medium, low")
    status: str = Field(default="pending", description="pending, in_progress, completed")

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None # pending, in_progress, completed

class TaskOut(BaseModel):
    id: str
    user_id: str
    email_id: Optional[str] = None
    email_subject: Optional[str] = None
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "medium"
    status: str = "pending"
    created_at: datetime
    updated_at: datetime

class TaskListResponse(BaseModel):
    tasks: List[TaskOut]
    total: int
    pending_count: int
    in_progress_count: int
    completed_count: int
