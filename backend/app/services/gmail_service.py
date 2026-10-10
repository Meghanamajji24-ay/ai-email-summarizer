import base64
import email
from email.utils import parsedate_to_datetime
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import httpx
from bson import ObjectId

from app.core.config import settings
from app.core.encryption import encrypt_token, decrypt_token
from app.db.mongodb import get_database
from app.services.ai_summarizer import ai_service
from app.services.demo_data_service import seed_demo_emails_for_user
from app.utils.html_cleaner import clean_html_for_preview, html_to_plain_text

logger = logging.getLogger("ai_email_summarizer.gmail")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
GMAIL_MESSAGES_LIST_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
GMAIL_MESSAGE_GET_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}"

GMAIL_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.readonly"
]

class GmailService:
    def is_configured(self) -> bool:
        """Returns True if real Google OAuth client ID & secret are provided in environment."""
        return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)

    def get_auth_url(self, state: str) -> str:
        """Constructs Google OAuth 2.0 authorization URL."""
        if not self.is_configured():
            return ""
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": " ".join(GMAIL_SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state
        }
        query_string = "&".join(f"{k}={httpx.URL('', params={k: v}).query.decode('utf-8')}" for k, v in params.items())
        return f"{GOOGLE_AUTH_URL}?{query_string}"

    async def exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """Exchanges OAuth authorization code for access and refresh tokens."""
        data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code"
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(GOOGLE_TOKEN_URL, data=data)
            resp.raise_for_status()
            return resp.json()

    async def get_google_user_profile(self, access_token: str) -> Dict[str, Any]:
        """Fetches Google user info (email, name, picture)."""
        headers = {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(GOOGLE_USERINFO_URL, headers=headers)
            resp.raise_for_status()
            return resp.json()

    async def refresh_access_token(self, encrypted_refresh_token: str) -> Optional[str]:
        """Uses stored encrypted refresh token to obtain a fresh access token."""
        refresh_token = decrypt_token(encrypted_refresh_token)
        if not refresh_token:
            return None

        data = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(GOOGLE_TOKEN_URL, data=data)
                resp.raise_for_status()
                token_data = resp.json()
                return token_data.get("access_token")
        except Exception as exc:
            logger.error(f"Failed to refresh Google access token: {exc}")
            return None

    async def save_connection(self, user_id: str, google_email: str, refresh_token: str, scopes: List[str]):
        """Persists encrypted credentials in database."""
        db = get_database()
        now = datetime.now(timezone.utc)
        encrypted_rt = encrypt_token(refresh_token) if refresh_token else ""

        doc = {
            "user_id": user_id,
            "google_account_email": google_email,
            "encrypted_refresh_token": encrypted_rt,
            "granted_scopes": scopes,
            "is_connected": True,
            "is_demo": False,
            "last_synced_at": now,
            "updated_at": now
        }
        await db.gmail_connections.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)
        await db.users.update_one(
            {"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id},
            {"$set": {"is_gmail_connected": True, "gmail_account": google_email}}
        )

    async def disconnect(self, user_id: str) -> bool:
        """Revokes Google token and removes connection record."""
        db = get_database()
        connection = await db.gmail_connections.find_one({"user_id": user_id})
        if connection:
            enc_token = connection.get("encrypted_refresh_token")
            if enc_token and not connection.get("is_demo"):
                token = decrypt_token(enc_token)
                if token:
                    try:
                        async with httpx.AsyncClient(timeout=10.0) as client:
                            await client.post(GOOGLE_REVOKE_URL, params={"token": token})
                    except Exception as e:
                        logger.warning(f"Error revoking Google token: {e}")

            await db.gmail_connections.delete_one({"user_id": user_id})

        await db.users.update_one(
            {"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id},
            {"$set": {"is_gmail_connected": False, "gmail_account": None}}
        )
        return True

    async def sync_emails(self, user_id: str, max_results: int = 25) -> Dict[str, Any]:
        """Synchronizes inbox messages from Gmail or falls back to demo mode when configured as demo."""
        db = get_database()
        connection = await db.gmail_connections.find_one({"user_id": user_id})

        if not connection or not connection.get("is_connected"):
            # Auto-enable demo mode if not connected
            count = await seed_demo_emails_for_user(user_id, auto_summarize=True)
            return {"synced_count": count, "message": f"Demo inbox loaded with {count} sample messages.", "is_demo": True}

        if connection.get("is_demo") or not self.is_configured():
            count = await seed_demo_emails_for_user(user_id, auto_summarize=True)
            return {"synced_count": count, "message": f"Demo messages refreshed ({count} messages).", "is_demo": True}

        # Real Gmail API Sync
        access_token = await self.refresh_access_token(connection.get("encrypted_refresh_token", ""))
        if not access_token:
            return {"synced_count": 0, "message": "Failed to authenticate with Gmail. Please reconnect.", "error": "auth_failed"}

        headers = {"Authorization": f"Bearer {access_token}"}
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                list_resp = await client.get(
                    GMAIL_MESSAGES_LIST_URL,
                    headers=headers,
                    params={"maxResults": max_results, "q": "in:inbox"}
                )
                list_resp.raise_for_status()
                messages_data = list_resp.json().get("messages", [])

                synced_count = 0
                now = datetime.now(timezone.utc)

                for msg_summary in messages_data:
                    msg_id = msg_summary["id"]
                    # Check if already saved
                    existing = await db.emails.find_one({"user_id": user_id, "gmail_message_id": msg_id})
                    if existing:
                        continue

                    # Fetch full message
                    get_resp = await client.get(GMAIL_MESSAGE_GET_URL.format(id=msg_id), headers=headers)
                    if get_resp.status_code != 200:
                        continue
                    full_msg = get_resp.json()

                    # Parse message
                    parsed = self._parse_gmail_message(full_msg)
                    email_doc = {
                        "user_id": user_id,
                        "gmail_message_id": msg_id,
                        "gmail_thread_id": full_msg.get("threadId"),
                        "sender_name": parsed["sender_name"],
                        "sender_email": parsed["sender_email"],
                        "subject": parsed["subject"],
                        "snippet": full_msg.get("snippet", ""),
                        "body_text": parsed["body_text"],
                        "body_html": parsed["body_html"],
                        "recipients": parsed["recipients"],
                        "received_date": parsed["received_date"],
                        "is_read": "UNREAD" not in full_msg.get("labelIds", []),
                        "priority": "medium",
                        "has_summary": False,
                        "short_summary": None,
                        "action_count": 0,
                        "is_demo": False,
                        "created_at": now,
                        "updated_at": now
                    }

                    insert_res = await db.emails.insert_one(email_doc)
                    email_id = str(insert_res.inserted_id)
                    synced_count += 1

                    # Trigger initial summarization
                    try:
                        await ai_service.summarize_email(
                            email_id=email_id,
                            user_id=user_id,
                            subject=parsed["subject"],
                            sender=parsed["sender_name"],
                            body_text=parsed["body_text"],
                            received_date=parsed["received_date"]
                        )
                    except Exception as ai_err:
                        logger.warning(f"Auto-summary failed for email {msg_id}: {ai_err}")

                # Update last sync time
                await db.gmail_connections.update_one({"user_id": user_id}, {"$set": {"last_synced_at": now}})
                return {"synced_count": synced_count, "message": f"Successfully synchronized {synced_count} new messages.", "is_demo": False}

        except Exception as exc:
            logger.error(f"Error during Gmail sync: {exc}")
            return {"synced_count": 0, "message": f"Sync encountered an error: {str(exc)}", "error": str(exc)}

    def _parse_gmail_message(self, msg: Dict[str, Any]) -> Dict[str, Any]:
        """Parses payload headers and mime parts from a Gmail API message representation."""
        headers = msg.get("payload", {}).get("headers", [])
        header_map = {h["name"].lower(): h["value"] for h in headers}

        subject = header_map.get("subject", "(No Subject)")
        from_raw = header_map.get("from", "Unknown Sender")
        to_raw = header_map.get("to", "")
        date_raw = header_map.get("date", "")

        # Parse Sender Name & Email
        sender_name = from_raw
        sender_email = from_raw
        if "<" in from_raw and ">" in from_raw:
            sender_name = from_raw.split("<")[0].strip().strip('"')
            sender_email = from_raw.split("<")[1].split(">")[0].strip()

        # Parse Date
        received_date = datetime.now(timezone.utc)
        if date_raw:
            try:
                received_date = parsedate_to_datetime(date_raw)
            except Exception:
                pass

        # Parse Body Text & HTML from MIME payload
        body_text = ""
        body_html = ""

        def extract_parts(part):
            nonlocal body_text, body_html
            mime_type = part.get("mimeType", "")
            data_b64 = part.get("body", {}).get("data", "")
            if data_b64:
                try:
                    # Gmail uses URL-safe base64
                    decoded = base64.urlsafe_b64decode(data_b64.encode("ASCII")).decode("utf-8", errors="replace")
                    if mime_type == "text/plain" and not body_text:
                        body_text = decoded
                    elif mime_type == "text/html" and not body_html:
                        body_html = clean_html_for_preview(decoded)
                except Exception:
                    pass

            for subpart in part.get("parts", []):
                extract_parts(subpart)

        extract_parts(msg.get("payload", {}))

        if not body_text and body_html:
            body_text = html_to_plain_text(body_html)
        if not body_text:
            body_text = msg.get("snippet", "")

        recipients = [{"email": to_raw, "name": to_raw.split("<")[0].strip() if "<" in to_raw else to_raw}]

        return {
            "subject": subject,
            "sender_name": sender_name or sender_email,
            "sender_email": sender_email,
            "received_date": received_date,
            "body_text": body_text,
            "body_html": body_html,
            "recipients": recipients
        }

gmail_service = GmailService()
