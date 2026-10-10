from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.summary import SummaryResponse

class EmailRecipient(BaseModel):
    name: Optional[str] = None
    email: str

class EmailOut(BaseModel):
    id: str
    gmail_message_id: Optional[str] = None
    gmail_thread_id: Optional[str] = None
    sender_name: str
    sender_email: str
    subject: str
    snippet: str
    received_date: datetime
    is_read: bool = False
    priority: str = "medium" # high, medium, low
    has_summary: bool = False
    short_summary: Optional[str] = None
    action_count: int = 0
    is_demo: bool = False

class EmailDetailOut(EmailOut):
    recipients: List[EmailRecipient] = []
    body_text: str = ""
    body_html: Optional[str] = None
    summary: Optional[SummaryResponse] = None
    gmail_link: Optional[str] = None

class EmailListResponse(BaseModel):
    emails: List[EmailOut]
    total: int
    page: int
    page_size: int
    total_pages: int
    unread_count: int
    high_priority_count: int

class SuggestReplyRequest(BaseModel):
    tone: str = "professional" # professional, friendly, concise, direct
    instructions: Optional[str] = None

class SuggestReplyResponse(BaseModel):
    suggested_reply: str
    tone: str
