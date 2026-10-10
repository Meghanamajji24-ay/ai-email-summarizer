from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow"
    )

    PROJECT_NAME: str = "AI Email Summarizer"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    
    # MongoDB Database Settings
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "ai_email_summarizer"
    
    # Security & JWT Auth
    JWT_SECRET_KEY: str = "ai-email-summarizer-super-secret-key-32-chars-min-change-prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    COOKIE_NAME: str = "access_token"
    
    # Encryption key for sensitive tokens (Fernet 32 url-safe base64-encoded bytes)
    ENCRYPTION_KEY: str = "9_X0gQn7kGz7u9K-5uKq_9V3M2p_L5a7G9Z1w2E4r6Y="
    
    # URLs & CORS
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    
    # Google OAuth 2.0 Credentials
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/gmail/callback"
    
    # LLM Settings (OpenAI, Gemini, Anthropic, Groq, etc.)
    LLM_PROVIDER: str = "openai" # "openai", "gemini", "groq", "anthropic", "demo"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_BASE_URL: str = ""
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

settings = Settings()
