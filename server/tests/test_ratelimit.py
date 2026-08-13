"""RateLimitMiddleware 回归测试：滑动窗口触发 429，未覆盖路径不受影响。"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.testclient import TestClient

from app.ratelimit import RateLimitMiddleware


async def _dummy_app(scope, receive, send):
    response = JSONResponse({"ok": True})
    await response(scope, receive, send)


def _make_client(limit=3, paths=("/x",)):
    return TestClient(
        RateLimitMiddleware(_dummy_app, limit=limit, window=60, paths=paths)
    )


def test_covered_path_is_limited():
    client = _make_client(limit=3, paths={"/x"})
    # 前 3 次正常
    for _ in range(3):
        assert client.get("/x").status_code == 200
    # 第 4 次触发 429
    assert client.get("/x").status_code == 429


def test_uncovered_path_not_limited():
    client = _make_client(limit=1, paths={"/limited"})
    # /other 不在限速集合内，连续请求均放行
    for _ in range(5):
        assert client.get("/other").status_code == 200


def test_default_paths_include_change_password():
    # 默认受保护路径应覆盖登录、注册、改密
    from app.ratelimit import DEFAULT_PATHS

    assert "/api/auth/login" in DEFAULT_PATHS
    assert "/api/auth/register" in DEFAULT_PATHS
    assert "/api/auth/me/password" in DEFAULT_PATHS
