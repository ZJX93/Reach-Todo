"""轻量内存限速中间件（防登录/注册爆破）。

不引入额外依赖：按「路径 + 客户端 IP」在滑动时间窗内计数，超过阈值返回 429。
生产高并发多实例部署时应替换为 Redis 等共享存储版。
"""
from __future__ import annotations

import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        limit: int = 10,
        window: int = 60,
        paths=("/api/auth/login", "/api/auth/register"),
    ):
        super().__init__(app)
        self.limit = limit
        self.window = window
        self.paths = set(paths)
        # path -> ip -> deque[monotonic timestamps]
        self._hits: dict[str, dict[str, deque]] = defaultdict(
            lambda: defaultdict(deque)
        )

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path in self.paths:
            ip = request.client.host if request.client else "unknown"
            now = time.monotonic()
            dq = self._hits[path][ip]
            while dq and now - dq[0] > self.window:
                dq.popleft()
            if len(dq) >= self.limit:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "请求过于频繁，请稍后再试"},
                )
            dq.append(now)
        return await call_next(request)
