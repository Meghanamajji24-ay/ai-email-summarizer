from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings
from app.db.mongodb import db_manager

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    """System health check endpoint for uptime monitors and platform health checks."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": "mock_memory" if db_manager.is_mock else "mongodb_connected",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
