import time
from collections import defaultdict, deque
from typing import Dict
from app.utils.errors import APIError

class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: float):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.history: Dict[str, deque] = defaultdict(deque)

    def check(self, key: str):
        now = time.time()
        q = self.history[key]
        while q and q[0] <= now - self.window_seconds:
            q.popleft()
        if len(q) >= self.max_requests:
            raise APIError(
                status_code=429,
                code="rate_limited",
                message="Rate limit exceeded. Please slow down.",
                headers={"Retry-After": str(int(self.window_seconds))}
            )
        q.append(now)

frame_rate_limiter = RateLimiter(max_requests=15, window_seconds=1.0)
login_rate_limiter = RateLimiter(max_requests=10, window_seconds=60.0)

