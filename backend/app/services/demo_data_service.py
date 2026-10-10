from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from bson import ObjectId
from app.db.mongodb import get_database
from app.services.ai_summarizer import ai_service

DEMO_EMAILS = [
    {
        "gmail_message_id": "demo_msg_001",
        "gmail_thread_id": "demo_thread_001",
        "sender_name": "Sarah Chen",
        "sender_email": "sarah.chen@techcorp.io",
        "subject": "Urgent: Final Architecture Review & Deployment Sign-off (Due Oct 18)",
        "snippet": "Hi Team, please make sure the architecture diagrams and security compliance checklists are completed before Friday 5:00 PM...",
        "body_text": """Hi Team,

I hope you're having a productive week.

We are entering the final sprint before our major Q4 release. Please make sure all architecture diagrams and security compliance checklists are submitted and signed off before Friday, October 18 at 5:00 PM EST.

Key items to resolve:
1. Finalize the OAuth 2.0 PKCE implementation and verify token refresh rotation.
2. Complete load testing on the email synchronization endpoints (target: 500 concurrent requests).
3. Confirm database backup schedules with the DevOps team.

We have scheduled a synchronization meeting on Thursday at 2:00 PM to review remaining blockers. Please attend with your status updates prepared.

Thank you for your hard work!

Best regards,
Sarah Chen
Director of Engineering | TechCorp""",
        "body_html": """<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
<p>Hi Team,</p>
<p>I hope you're having a productive week.</p>
<p>We are entering the final sprint before our major Q4 release. <strong>Please make sure all architecture diagrams and security compliance checklists are submitted and signed off before Friday, October 18 at 5:00 PM EST.</strong></p>
<p><strong>Key items to resolve:</strong></p>
<ol>
  <li>Finalize the OAuth 2.0 PKCE implementation and verify token refresh rotation.</li>
  <li>Complete load testing on the email synchronization endpoints (target: 500 concurrent requests).</li>
  <li>Confirm database backup schedules with the DevOps team.</li>
</ol>
<p>We have scheduled a synchronization meeting on <strong>Thursday at 2:00 PM</strong> to review remaining blockers. Please attend with your status updates prepared.</p>
<p>Thank you for your hard work!</p>
<p>Best regards,<br><strong>Sarah Chen</strong><br>Director of Engineering | TechCorp</p>
</div>""",
        "days_ago": 1,
        "is_read": False,
        "priority": "high"
    },
    {
        "gmail_message_id": "demo_msg_002",
        "gmail_thread_id": "demo_thread_002",
        "sender_name": "Talent Acquisition",
        "sender_email": "recruiting@innovateai.com",
        "subject": "Offer of Employment: Senior Full Stack AI Engineer",
        "snippet": "Congratulations! We are thrilled to offer you the position of Senior Full Stack AI Engineer at InnovateAI...",
        "body_text": """Dear Candidate,

On behalf of InnovateAI, I am delighted to formally extend an offer of employment for the role of Senior Full Stack AI Engineer.

Key highlights of the offer:
- Base Salary: $165,000 annually
- Equity Grant: 15,000 RSUs with a standard 4-year vesting schedule
- Sign-on Bonus: $15,000 payable upon your first payroll
- Start Date: November 15, 2026
- Comprehensive Health, Dental, Vision & 401(k) 5% Match

Please review the attached formal offer letter and benefits summary. To accept this offer, kindly sign and return the document by Monday, October 21.

Feel free to reach out directly if you have any questions regarding the compensation or onboarding schedule. We can't wait to welcome you to the team!

Warm regards,
David Miller
Head of Talent Acquisition | InnovateAI""",
        "body_html": """<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
<p>Dear Candidate,</p>
<p>On behalf of <strong>InnovateAI</strong>, I am delighted to formally extend an offer of employment for the role of <strong>Senior Full Stack AI Engineer</strong>.</p>
<p><strong>Key highlights of the offer:</strong></p>
<ul>
  <li>Base Salary: $165,000 annually</li>
  <li>Equity Grant: 15,000 RSUs with a standard 4-year vesting schedule</li>
  <li>Sign-on Bonus: $15,000 payable upon your first payroll</li>
  <li>Start Date: November 15, 2026</li>
  <li>Comprehensive Health, Dental, Vision & 401(k) 5% Match</li>
</ul>
<p>Please review the attached formal offer letter. To accept this offer, <strong>kindly sign and return the document by Monday, October 21</strong>.</p>
<p>Warm regards,<br><strong>David Miller</strong><br>Head of Talent Acquisition | InnovateAI</p>
</div>""",
        "days_ago": 2,
        "is_read": False,
        "priority": "high"
    },
    {
        "gmail_message_id": "demo_msg_003",
        "gmail_thread_id": "demo_thread_003",
        "sender_name": "Prof. Elena Martinez",
        "sender_email": "e.martinez@university.edu",
        "subject": "CS 480: Machine Learning Assignment 3 & Office Hours Reminder",
        "snippet": "Hello Class, Assignment 3 (Transformer Fine-Tuning & Attention Visualizations) has been posted to Canvas...",
        "body_text": """Hello Class,

Assignment 3 (Transformer Fine-Tuning & Attention Visualizations) has been published to Canvas.

Important deadlines & notes:
- Submission Deadline: Sunday, October 27 at 11:59 PM.
- Late submissions will receive a 10% penalty per day up to 3 days maximum.
- Extra credit is available for implementing custom FlashAttention kernels.

I will be holding extra office hours this Wednesday from 3:00 PM to 5:00 PM in Computer Science Hall Room 314 to assist with any PyTorch setup or GPU allocation questions.

Best of luck with your experiments,
Prof. Elena Martinez
Department of Computer Science""",
        "body_html": """<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
<p>Hello Class,</p>
<p><strong>Assignment 3 (Transformer Fine-Tuning & Attention Visualizations)</strong> has been published to Canvas.</p>
<p><strong>Important deadlines & notes:</strong></p>
<ul>
  <li>Submission Deadline: <strong>Sunday, October 27 at 11:59 PM</strong>.</li>
  <li>Late submissions will receive a 10% penalty per day up to 3 days maximum.</li>
  <li>Extra credit is available for implementing custom FlashAttention kernels.</li>
</ul>
<p>I will be holding extra office hours this <strong>Wednesday from 3:00 PM to 5:00 PM</strong> in CS Hall Room 314.</p>
<p>Best of luck,<br><strong>Prof. Elena Martinez</strong></p>
</div>""",
        "days_ago": 3,
        "is_read": True,
        "priority": "medium"
    },
    {
        "gmail_message_id": "demo_msg_004",
        "gmail_thread_id": "demo_thread_004",
        "sender_name": "CloudScale Billing",
        "sender_email": "invoices@cloudscale.net",
        "subject": "Invoice #INV-2026-8921: Monthly Cloud Infrastructure Services",
        "snippet": "Your monthly statement for period Sep 01 - Sep 30 is now available. Total amount due: $148.50...",
        "body_text": """Hello,

Your monthly invoice #INV-2026-8921 is now ready for review.

Statement Summary:
- Account ID: CS-99482
- Billing Period: Sep 01, 2026 - Sep 30, 2026
- Total Amount: $148.50 USD
- Auto-payment Date: October 25, 2026 via Visa ending in 4242

No action is required if your auto-billing information is up to date. You can download your PDF tax receipt from your account portal.

Thank you for choosing CloudScale.

Billing Department
CloudScale Infrastructure Inc.""",
        "body_html": """<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
<p>Hello,</p>
<p>Your monthly invoice <strong>#INV-2026-8921</strong> is now ready for review.</p>
<p><strong>Statement Summary:</strong></p>
<ul>
  <li>Account ID: CS-99482</li>
  <li>Billing Period: Sep 01, 2026 - Sep 30, 2026</li>
  <li>Total Amount: <strong>$148.50 USD</strong></li>
  <li>Auto-payment Date: <strong>October 25, 2026</strong> via Visa ending in 4242</li>
</ul>
<p>No action is required if your payment info is current.</p>
<p>Best,<br>CloudScale Billing</p>
</div>""",
        "days_ago": 4,
        "is_read": True,
        "priority": "low"
    },
    {
        "gmail_message_id": "demo_msg_005",
        "gmail_thread_id": "demo_thread_005",
        "sender_name": "Marcus Vance",
        "sender_email": "marcus.v@enterprisepm.com",
        "subject": "Q4 AI Email Summarizer Feature Roadmap & User Feedback Summary",
        "snippet": "Hi team, we gathered qualitative feedback from our 50 beta testers on the AI summary accuracy...",
        "body_text": """Hi Team,

We gathered qualitative feedback from our 50 beta testers on the AI Email Summarizer application.

Here are the key takeaways and proposed roadmap priorities:
1. 92% of testers praised the instant Action Items extraction for boosting their daily productivity.
2. Users requested quick filter toggles (High Priority vs Needs Action) in the inbox view.
3. Added support for custom tone selection (Friendly vs Direct) in AI draft reply generation.

Next steps:
- Marcus to schedule design polish sprint for next Monday.
- Frontend team to implement keyboard shortcuts (Cmd+K) for rapid triage.

Please review the attached spreadsheet and add any additional comments before our Wednesday standup.

Cheers,
Marcus Vance
Senior Product Manager""",
        "body_html": """<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
<p>Hi Team,</p>
<p>We gathered qualitative feedback from our 50 beta testers on the AI Email Summarizer application.</p>
<p><strong>Key takeaways & roadmap:</strong></p>
<ol>
  <li>92% of testers praised the instant Action Items extraction for boosting daily productivity.</li>
  <li>Users requested quick filter toggles (High Priority vs Needs Action) in the inbox.</li>
  <li>Added support for custom tone selection in AI draft reply generation.</li>
</ol>
<p>Please review the spreadsheet before our <strong>Wednesday standup</strong>.</p>
<p>Cheers,<br><strong>Marcus Vance</strong></p>
</div>""",
        "days_ago": 5,
        "is_read": True,
        "priority": "medium"
    }
]

async def seed_demo_emails_for_user(user_id: str, auto_summarize: bool = True) -> int:
    """Populates high-quality demo emails for a user and triggers summarization."""
    db = get_database()
    now = datetime.now(timezone.utc)

    # Set Gmail connection status to demo mode
    await db.gmail_connections.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "google_account_email": "demo.user@gmail.com",
            "is_connected": True,
            "is_demo": True,
            "granted_scopes": ["https://www.googleapis.com/auth/gmail.readonly"],
            "last_synced_at": now,
            "updated_at": now
        }},
        upsert=True
    )

    created_count = 0
    for item in DEMO_EMAILS:
        existing = await db.emails.find_one({"user_id": user_id, "gmail_message_id": item["gmail_message_id"]})
        if not existing:
            received_dt = now - timedelta(days=item["days_ago"], hours=3, minutes=15)
            email_doc = {
                "user_id": user_id,
                "gmail_message_id": item["gmail_message_id"],
                "gmail_thread_id": item["gmail_thread_id"],
                "sender_name": item["sender_name"],
                "sender_email": item["sender_email"],
                "subject": item["subject"],
                "snippet": item["snippet"],
                "body_text": item["body_text"],
                "body_html": item["body_html"],
                "recipients": [{"name": "Demo User", "email": "demo.user@gmail.com"}],
                "received_date": received_dt,
                "is_read": item["is_read"],
                "priority": item["priority"],
                "has_summary": False,
                "short_summary": None,
                "action_count": 0,
                "is_demo": True,
                "created_at": now,
                "updated_at": now
            }
            res = await db.emails.insert_one(email_doc)
            email_id = str(res.inserted_id)
            created_count += 1

            if auto_summarize:
                # Generate AI summary and tasks
                await ai_service.summarize_email(
                    email_id=email_id,
                    user_id=user_id,
                    subject=item["subject"],
                    sender=item["sender_name"],
                    body_text=item["body_text"],
                    received_date=received_dt,
                    summary_length="standard"
                )

    # Update user stats
    await db.users.update_one(
        {"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id},
        {"$set": {"is_gmail_connected": True, "gmail_account": "demo.user@gmail.com"}}
    )

    return created_count
