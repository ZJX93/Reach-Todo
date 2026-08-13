"""登录 / 注册 / 改密接口限速中间件（防爆破）。

默认按「路径 + 客户端 IP」在滑动时间窗内计数，超过阈值返回 429。

- 默认仅内存存储，零额外依赖，适合单实例部署（当前 fnOS 单镜像场景）。
- 若设置环境变量 ``RATE_LIMIT_REDIS_URL``，则改用 Redis 共享存储，
  适合多实例 / 多副本部署；``redis`` 包未安装或连接失败时自动回落内存版，
  不会因此导致服务启动失败。
- 受保护路径可通过 ``RATE_LIMIT_PATHS`` 覆盖（逗号分隔）。
"""

from __future__ import annotations

import os
import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

DEFAULT_PATHS = (
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/me/password",  # 修改密码同样计入防爆破
)


def _resolve_paths() -> set[str]:
    raw = os.getenv("RATE_LIMIT_PATHS")
    if raw:
        return {p.strip() for p in raw.split(",") if p.strip()}
    return set(DEFAULT_PATHS)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        limit: int = 10,
        window: int = 60,
        paths=None,
        redis_url: str | None = None,
    ):
        super().__init__(app)
        self.limit = limit
        self.window = window
        self.paths = paths if paths is not None else _resolve_paths()
        self.redis_url = (
            redis_url if redis_url is not None else os.getenv("RATE_LIMIT_REDIS_URL")
        )
        self._redis = None
        # path -> ip -> deque[wall-clock timestamps]
        self._hits: dict[str, dict[str, deque]] = defaultdict(
            lambda: defaultdict(deque)
        )
        if self.redis_url:
            self._init_redis()

    def _init_redis(self) -> None:
        """惰性接入 Redis；任何异常都回落内存版，绝不阻断启动。"""
        try:
            import redis.asyncio as aioredis

            self._redis = aioredis.from_url(self.redis_url, decode_responses=True)
        except Exception:
            self._redis = None

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path not in self.paths:
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        now = time.time()

        if self._redis is not None:
            if not await self._redis_check(path, ip, now):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "请求过于频繁，请稍后再试"},
                )
            return await call_next(request)

        # 内存版：滑动窗口
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

    async def _redis_check(self, path: str, ip: str, now: float) -> bool:
        """Redis 滑动窗口（sorted set）。异常时放行，避免误伤正常用户。"""
        key = f"ratelimit:{path}:{ip}"
        try:
            async with self._redis.pipeline() as pipe:
                pipe.zremrangebyscore(key, 0, now - self.window)
                pipe.zcard(key)
                pipe.zadd(key, {str(now): now})
                pipe.expire(key, self.window)
                results = await pipe.execute()
            count = results[1]
            return count < self.limit
        except Exception:
            return True
