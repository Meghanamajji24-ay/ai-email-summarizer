from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class ActionItemSchema(BaseModel):
    title: str = Field(..., description="Actionable title of the task")
    description: Optional[str] = None
    due_date: Optional[str] = None # ISO format or detected string (e.g. 2026-10-15) or null
    priority: str = Field(default="medium", description="high, medium, or low")

class SummaryResponse(BaseModel):
    id: Optional[str] = None
    email_id: str
    summary: str
    key_points: List[str] = []
    action_items: List[ActionItemSchema] = []
    decisions: List[str] = []
    important_dates: List[str] = []
    priority: str = "medium"
    sentiment: str = "neutral"
    suggested_reply: Optional[str] = None
    model_name: Optional[str] = None
    created_at: Optional[datetime] = None

class RegenerateSummaryRequest(BaseModel):
    summary_length: Optional[str] = "standard" # concise, standard, detailed
    focus: Optional[str] = "general" # general, action_items, deadlines
