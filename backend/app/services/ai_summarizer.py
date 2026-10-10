import json
import logging
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import httpx
from bson import ObjectId

from app.core.config import settings
from app.db.mongodb import get_database
from app.schemas.summary import SummaryResponse, ActionItemSchema
from app.utils.html_cleaner import html_to_plain_text, truncate_text
from app.utils.prompt_templates import (
    SUMMARIZATION_SYSTEM_PROMPT,
    REPLY_GENERATION_SYSTEM_PROMPT,
    build_summarization_prompt,
)

logger = logging.getLogger("ai_email_summarizer.ai")

class AISummarizationService:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER.lower()
        self.api_key = settings.LLM_API_KEY
        self.model = settings.LLM_MODEL
        self.base_url = settings.LLM_BASE_URL

    async def summarize_email(
        self,
        email_id: str,
        user_id: str,
        subject: str,
        sender: str,
        body_text: str,
        received_date: datetime,
        summary_length: str = "standard",
        force_regenerate: bool = False
    ) -> SummaryResponse:
        """Summarizes an email and extracts structured action items with caching."""
        db = get_database()

        # Check cache first if not force regenerating
        if not force_regenerate:
            cached = await db.summaries.find_one({"email_id": email_id, "user_id": user_id})
            if cached:
                cached_id = str(cached.get("_id")) if "_id" in cached else None
                return SummaryResponse(
                    id=cached_id,
                    email_id=cached["email_id"],
                    summary=cached["summary"],
                    key_points=cached.get("key_points", []),
                    action_items=[ActionItemSchema(**item) for item in cached.get("action_items", [])],
                    decisions=cached.get("decisions", []),
                    important_dates=cached.get("important_dates", []),
                    priority=cached.get("priority", "medium"),
                    sentiment=cached.get("sentiment", "neutral"),
                    suggested_reply=cached.get("suggested_reply"),
                    model_name=cached.get("model_name", "cached"),
                    created_at=cached.get("created_at")
                )

        clean_text = truncate_text(body_text, max_chars=10000)
        date_str = received_date.strftime("%Y-%m-%d %H:%M UTC") if received_date else "Unknown Date"
        
        parsed_data = None

        # If LLM API Key is configured, attempt real LLM API call
        if self.api_key and self.provider != "demo":
            try:
                parsed_data = await self._call_llm_summarizer(subject, sender, date_str, clean_text, summary_length)
            except Exception as exc:
                logger.warning(f"LLM API call failed: {exc}. Falling back to Smart NLP Engine.")
                parsed_data = None

        # Fallback to smart heuristic NLP engine if LLM was not configured or call failed
        if not parsed_data:
            parsed_data = self._smart_nlp_summarize(subject, sender, clean_text, summary_length)

        # Store in database
        now = datetime.now(timezone.utc)
        summary_doc = {
            "user_id": user_id,
            "email_id": email_id,
            "summary": parsed_data.get("summary", ""),
            "key_points": parsed_data.get("key_points", []),
            "action_items": parsed_data.get("action_items", []),
            "decisions": parsed_data.get("decisions", []),
            "important_dates": parsed_data.get("important_dates", []),
            "priority": parsed_data.get("priority", "medium"),
            "sentiment": parsed_data.get("sentiment", "neutral"),
            "suggested_reply": parsed_data.get("suggested_reply", ""),
            "model_name": self.model if (self.api_key and self.provider != "demo") else "nlp-engine-v1",
            "created_at": now,
            "updated_at": now
        }

        # Upsert in summaries collection
        await db.summaries.update_one(
            {"email_id": email_id, "user_id": user_id},
            {"$set": summary_doc},
            upsert=True
        )

        # Update email record priority and short summary
        await db.emails.update_one(
            {"_id": ObjectId(email_id) if ObjectId.is_valid(email_id) else email_id, "user_id": user_id},
            {"$set": {
                "priority": parsed_data.get("priority", "medium"),
                "short_summary": parsed_data.get("summary", "")[:250],
                "has_summary": True,
                "action_count": len(parsed_data.get("action_items", []))
            }}
        )

        # Automatically extract tasks into tasks collection if they do not exist
        if parsed_data.get("action_items"):
            for item in parsed_data["action_items"]:
                task_title = item.get("title", "").strip()
                if not task_title:
                    continue
                # Check if task already exists for this email
                existing_task = await db.tasks.find_one({"email_id": email_id, "user_id": user_id, "title": task_title})
                if not existing_task:
                    await db.tasks.insert_one({
                        "user_id": user_id,
                        "email_id": email_id,
                        "email_subject": subject,
                        "title": task_title,
                        "description": item.get("description"),
                        "due_date": item.get("due_date"),
                        "priority": item.get("priority", "medium"),
                        "status": "pending",
                        "created_at": now,
                        "updated_at": now
                    })

        return SummaryResponse(
            email_id=email_id,
            summary=parsed_data.get("summary", ""),
            key_points=parsed_data.get("key_points", []),
            action_items=[ActionItemSchema(**item) for item in parsed_data.get("action_items", [])],
            decisions=parsed_data.get("decisions", []),
            important_dates=parsed_data.get("important_dates", []),
            priority=parsed_data.get("priority", "medium"),
            sentiment=parsed_data.get("sentiment", "neutral"),
            suggested_reply=parsed_data.get("suggested_reply"),
            model_name=summary_doc["model_name"],
            created_at=now
        )

    async def _call_llm_summarizer(self, subject: str, sender: str, date_str: str, body_text: str, summary_length: str) -> Dict[str, Any]:
        """Performs HTTP request to LLM API (OpenAI / Groq / Gemini / Anthropic)"""
        user_prompt = build_summarization_prompt(subject, sender, date_str, body_text, summary_length)

        if self.provider == "gemini":
            # Gemini REST API
            endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
            payload = {
                "contents": [
                    {"role": "user", "parts": [{"text": SUMMARIZATION_SYSTEM_PROMPT + "\n\n" + user_prompt}]}
                ],
                "generationConfig": {"temperature": 0.2, "response_mime_type": "application/json"}
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(endpoint, json=payload)
                resp.raise_for_status()
                data = resp.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        elif self.provider == "anthropic":
            # Anthropic Messages API
            endpoint = "https://api.anthropic.com/v1/messages"
            headers = {
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            payload = {
                "model": self.model or "claude-3-haiku-20240307",
                "max_tokens": 1500,
                "system": SUMMARIZATION_SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": user_prompt}]
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(endpoint, headers=headers, json=payload)
                resp.raise_for_status()
                raw_text = resp.json()["content"][0]["text"]
        else:
            # Standard OpenAI / Groq / OpenRouter compatible API
            base = self.base_url.rstrip("/") if self.base_url else "https://api.openai.com/v1"
            endpoint = f"{base}/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": self.model or "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": SUMMARIZATION_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(endpoint, headers=headers, json=payload)
                resp.raise_for_status()
                raw_text = resp.json()["choices"][0]["message"]["content"]

        return self._extract_json_payload(raw_text)

    def _extract_json_payload(self, text: str) -> Dict[str, Any]:
        """Safely parses JSON output from LLM responses, stripping codeblocks if present."""
        text = text.strip()
        if text.startswith("```"):
            lines = text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        # Find first { and last }
        start_idx = text.find("{")
        end_idx = text.rfind("}")
        if start_idx != -1 and end_idx != -1:
            text = text[start_idx:end_idx+1]

        data = json.loads(text)
        # Ensure mandatory keys exist with sensible defaults
        data.setdefault("summary", "Email processed successfully.")
        data.setdefault("key_points", [])
        data.setdefault("action_items", [])
        data.setdefault("decisions", [])
        data.setdefault("important_dates", [])
        data.setdefault("priority", "medium")
        data.setdefault("sentiment", "neutral")
        data.setdefault("suggested_reply", "")
        return data

    def _smart_nlp_summarize(self, subject: str, sender: str, text: str, summary_length: str = "standard") -> Dict[str, Any]:
        """
        Advanced heuristic intelligence engine that accurately extracts facts,
        deadlines, tasks, and priority when no external LLM API key is provided.
        """
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

        # Sentence tokenizer
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences = [s.strip().replace("\n", " ") for s in sentences if len(s.strip()) > 15]

        # 1. Determine Priority
        urgency_score = 0
        text_lower = (subject + " " + text).lower()
        high_keywords = ["urgent", "asap", "immediate", "deadline", "critical", "action required", "time-sensitive", "expedite", "escalat", "overdue"]
        medium_keywords = ["please review", "follow up", "confirm", "next steps", "update", "reminder", "schedule", "feedback"]
        
        for kw in high_keywords:
            if kw in text_lower:
                urgency_score += 2
        for kw in medium_keywords:
            if kw in text_lower:
                urgency_score += 1

        if urgency_score >= 2 or any(k in subject.lower() for k in ["urgent", "action required", "deadline", "offer", "invoice"]):
            priority = "high"
        elif urgency_score >= 1:
            priority = "medium"
        else:
            priority = "low"

        # 2. Extract Important Dates / Deadlines
        date_patterns = [
            r'(?:by|before|on|due|until)\s+([A-Z][a-z]+(?:\s+\d{1,2}(?:st|nd|rd|th)?|\s+\d{4})?(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)?)',
            r'(?:by|on|due)\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:\s+(?:morning|afternoon|evening|EOD|COB|at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?',
            r'(\d{4}-\d{2}-\d{2})',
            r'(\d{1,2}/\d{1,2}/\d{2,4})'
        ]
        detected_dates = []
        for pattern in date_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for m in matches:
                matched_str = m.group(0).strip()
                if len(matched_str) > 4 and matched_str not in detected_dates:
                    detected_dates.append(matched_str)

        # 3. Action Items Extraction
        action_patterns = [
            (r'(?:please|kindly)\s+([a-zA-Z\s,]{8,70}\b)', "medium"),
            (r'(?:need you to|could you|make sure to|action required:?)\s+([a-zA-Z\s,]{8,70}\b)', "high"),
            (r'(?:submit|send|review|approve|confirm|sign|complete|schedule)\s+([a-zA-Z0-9\s,]{6,70}\b)', "medium"),
            (r'(?:don\'t forget to|remember to)\s+([a-zA-Z\s,]{8,70}\b)', "high"),
        ]
        action_items = []
        seen_titles = set()

        for pat, def_prio in action_patterns:
            for m in re.finditer(pat, text, re.IGNORECASE):
                raw_action = m.group(0).strip()
                cleaned_title = re.sub(r'^(please|kindly|could you|don\'t forget to|remember to|action required:?)\s*', '', raw_action, flags=re.IGNORECASE)
                cleaned_title = cleaned_title.strip().capitalize()
                if len(cleaned_title) > 6 and cleaned_title.lower() not in seen_titles:
                    seen_titles.add(cleaned_title.lower())
                    # Associate detected date if present
                    associated_date = detected_dates[0] if detected_dates else None
                    action_items.append({
                        "title": cleaned_title[:80],
                        "description": f"Extracted from email regarding '{subject}'",
                        "due_date": associated_date,
                        "priority": "high" if priority == "high" else def_prio
                    })
                if len(action_items) >= 4:
                    break

        # If no explicit action pattern matched, synthesize one if needed
        if not action_items and priority in ["high", "medium"]:
            action_items.append({
                "title": f"Review and reply to message from {sender}",
                "description": f"Regarding: {subject}",
                "due_date": detected_dates[0] if detected_dates else None,
                "priority": priority
            })

        # 4. Key Points Extraction
        key_points = []
        for s in sentences[:5]:
            if any(term in s.lower() for term in ["we ", "i am", "the project", "attached", "meeting", "confirmed", "scheduled", "status", "deadline", "offer", "invoice", "update"]):
                if s not in key_points and len(s) > 20:
                    key_points.append(s[:150])
            if len(key_points) >= 3:
                break
        if not key_points and sentences:
            key_points = [s[:150] for s in sentences[:3]]

        # 5. Executive Summary
        if len(sentences) >= 3:
            if summary_length == "concise":
                summary = f"{sentences[0]} {sentences[1]}"
            elif summary_length == "detailed":
                summary = " ".join(sentences[:4])
            else:
                summary = " ".join(sentences[:3])
        elif sentences:
            summary = " ".join(sentences)
        else:
            summary = f"Email from {sender} regarding {subject}."

        # 6. Decisions and Commitments
        decisions = []
        for s in sentences:
            if any(term in s.lower() for term in ["agreed to", "confirmed that", "we decided", "approved", "finalized", "accepted"]):
                decisions.append(s[:120])
                if len(decisions) >= 2:
                    break

        # 7. Suggested Reply
        first_name = sender.split("<")[0].strip().split()[0] if sender else "there"
        suggested_reply = f"Hi {first_name},\n\nThank you for reaching out regarding {subject}. I have received your email and will review the details and follow up shortly.\n\nBest regards,"

        return {
            "summary": summary,
            "key_points": key_points,
            "action_items": action_items,
            "decisions": decisions,
            "important_dates": detected_dates[:3],
            "priority": priority,
            "sentiment": "urgent" if priority == "high" else "neutral",
            "suggested_reply": suggested_reply
        }

    async def generate_reply(self, subject: str, sender: str, body_text: str, tone: str = "professional", instructions: Optional[str] = None) -> str:
        """Generates custom reply options based on tone (Professional, Friendly, Concise, Direct)"""
        first_name = sender.split("<")[0].strip().split()[0] if sender else "there"
        
        if self.api_key and self.provider != "demo":
            try:
                system_prompt = REPLY_GENERATION_SYSTEM_PROMPT.format(tone=tone)
                user_prompt = f"Subject: {subject}\nSender: {sender}\nEmail Body:\n{body_text}\n"
                if instructions:
                    user_prompt += f"\nSpecial User Instructions: {instructions}"

                base = self.base_url.rstrip("/") if self.base_url else "https://api.openai.com/v1"
                async with httpx.AsyncClient(timeout=20.0) as client:
                    resp = await client.post(
                        f"{base}/chat/completions",
                        headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                        json={
                            "model": self.model or "gpt-4o-mini",
                            "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                            "temperature": 0.3
                        }
                    )
                    resp.raise_for_status()
                    return resp.json()["choices"][0]["message"]["content"].strip()
            except Exception as e:
                logger.warning(f"Reply LLM call failed: {e}. Generating rule-based response.")

        # Heuristic tone-based templates
        if tone == "friendly":
            return f"Hi {first_name}!\n\nThanks so much for the update on {subject}. Everything looks good on my end. Let me know if you need anything else from me in the meantime!\n\nCheers,"
        elif tone == "concise":
            return f"Hi {first_name},\n\nReceived with thanks. I will review and follow up by end of day.\n\nBest,"
        elif tone == "direct":
            return f"Hi {first_name},\n\nAcknowledged. I am working on the next steps for {subject} and will share an update shortly.\n\nRegards,"
        else: # professional
            return f"Dear {first_name},\n\nThank you for your email regarding {subject}.\n\nI have reviewed the details provided and will proceed with the requested actions accordingly. Please feel free to reach out if any additional context is required.\n\nBest regards,"

ai_service = AISummarizationService()
