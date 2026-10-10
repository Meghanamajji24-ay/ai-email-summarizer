import logging
from app.db.mongodb import get_database

logger = logging.getLogger("ai_email_summarizer.indexes")

async def init_indexes():
    """Initializes indexes across all MongoDB collections for performance & constraints."""
    db = get_database()
    try:
        # Users indexes
        await db.users.create_index("email", unique=True)
        await db.users.create_index("created_at")

        # Gmail connections indexes
        await db.gmail_connections.create_index("user_id", unique=True)
        await db.gmail_connections.create_index("google_account_email")

        # Emails indexes
        await db.emails.create_index([("user_id", 1), ("gmail_message_id", 1)], unique=True)
        await db.emails.create_index([("user_id", 1), ("received_date", -1)])
        await db.emails.create_index([("user_id", 1), ("is_read", 1)])
        await db.emails.create_index([("user_id", 1), ("priority", 1)])

        # Summaries indexes
        await db.summaries.create_index([("user_id", 1), ("email_id", 1)], unique=True)
        await db.summaries.create_index([("user_id", 1), ("created_at", -1)])

        # Tasks indexes
        await db.tasks.create_index([("user_id", 1), ("status", 1)])
        await db.tasks.create_index([("user_id", 1), ("due_date", 1)])
        await db.tasks.create_index([("user_id", 1), ("email_id", 1)])

        logger.info("Database indexes initialized successfully.")
    except Exception as e:
        logger.warning(f"Note on index creation: {e}")
