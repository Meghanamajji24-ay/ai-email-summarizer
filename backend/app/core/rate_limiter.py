import time
from collections import defaultdict
from fastapi import HTTPException, Request, status

class InMemoryRateLimiter:
    def __init__(self, requests_limit: int = 60, time_window_seconds: int = 60):
        self.limit = requests_limit
        self.window = time_window_seconds
        self.requests = defaultdict(list)

    def is_rate_limited(self, key: str) -> bool:
        now = time.time()
        # Filter timestamps outside the window
        timestamps = [t for t in self.requests[key] if now - t < self.window]
        self.requests[key] = timestamps

        if len(timestamps) >= self.limit:
            return True

        self.requests[key].append(now)
        return False

# Limiter instances for different sensitive operations
auth_limiter = InMemoryRateLimiter(requests_limit=15, time_window_seconds=60) # 15 attempts/min
ai_limiter = InMemoryRateLimiter(requests_limit=30, time_window_seconds=60) # 30 AI requests/min
sync_limiter = InMemoryRateLimiter(requests_limit=10, time_window_seconds=60) # 10 sync requests/min

def rate_limit_auth(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if auth_limiter.is_rate_limited(f"auth:{client_ip}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please wait a minute and try again."
        )

def rate_limit_ai(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if ai_limiter.is_rate_limited(f"ai:{client_ip}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI rate limit reached. Please wait a moment before submitting another request."
        )

def rate_limit_sync(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if sync_limiter.is_rate_limited(f"sync:{client_ip}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Email synchronization limit reached. Please wait before syncing again."
        )
