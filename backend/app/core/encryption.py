import base64
import hashlib
from cryptography.fernet import Fernet
from app.core.config import settings

def _get_fernet() -> Fernet:
    key = settings.ENCRYPTION_KEY
    if not key or len(key) < 10:
        # Derive a 32-byte urlsafe base64 key from JWT_SECRET_KEY
        digest = hashlib.sha256(settings.JWT_SECRET_KEY.encode()).digest()
        key = base64.urlsafe_b64encode(digest).decode()
    else:
        # If key is provided as plain text, ensure it's 32-byte base64
        try:
            Fernet(key.encode() if isinstance(key, str) else key)
        except Exception:
            digest = hashlib.sha256(key.encode()).digest()
            key = base64.urlsafe_b64encode(digest).decode()
    return Fernet(key.encode() if isinstance(key, str) else key)

def encrypt_token(plain_text: str) -> str:
    """Encrypts a sensitive string (e.g., OAuth refresh token)"""
    if not plain_text:
        return ""
    fernet = _get_fernet()
    return fernet.encrypt(plain_text.encode("utf-8")).decode("utf-8")

def decrypt_token(encrypted_text: str) -> str:
    """Decrypts an encrypted string"""
    if not encrypted_text:
        return ""
    try:
        fernet = _get_fernet()
        return fernet.decrypt(encrypted_text.encode("utf-8")).decode("utf-8")
    except Exception:
        return ""
