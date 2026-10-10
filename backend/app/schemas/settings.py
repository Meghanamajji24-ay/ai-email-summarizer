from typing import Optional
from pydantic import BaseModel

class UserSettingsOut(BaseModel):
    name: str
    email: str
    summary_length: str = "standard" # concise, standard, detailed
    auto_extract_tasks: bool = True
    default_priority_threshold: str = "medium"
    sync_frequency_minutes: int = 15
    sync_limit: int = 50
    theme: str = "light" # light, dark, system
    is_gmail_connected: bool = False
    gmail_account: Optional[str] = None
    last_synced_at: Optional[str] = None

class UserSettingsUpdate(BaseModel):
    name: Optional[str] = None
    summary_length: Optional[str] = None
    auto_extract_tasks: Optional[bool] = None
    default_priority_threshold: Optional[str] = None
    sync_frequency_minutes: Optional[int] = None
    sync_limit: Optional[int] = None
    theme: Optional[str] = None
