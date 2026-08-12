"""安全响应头中间件。

为所有响应附加基础安全头，缩小 XSS / 点击劫持 / MIME 嗅探 / referrer 泄漏等攻击面。
注意：CSP（Content-Security-Policy）此处**有意不加**——本 SPA 含内联/模块脚本，
严格 CSP 会破坏前端。遵循「宁缺毋滥」，避免引入回归。
"""
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# 统一安全响应头（值保守、不影响应用行为）
SECURITY_HEADERS: dict[str, str] = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "X-XSS-Protection": "1; mode=block",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """为每个响应追加安全头；不修改响应体，不改变既有接口契约。"""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        for key, value in SECURITY_HEADERS.items():
            # 不覆盖上游已显式设置的同名头
            if key not in response.headers:
                response.headers[key] = value
        return response
