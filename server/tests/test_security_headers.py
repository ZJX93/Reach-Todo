"""T03 回归测试：安全响应头中间件对所有响应生效。"""
import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app  # noqa: E402

EXPECTED_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "X-XSS-Protection": "1; mode=block",
}


def test_health_has_security_headers():
    client = TestClient(app)
    r = client.get("/health")
    assert r.status_code == 200
    for key, value in EXPECTED_HEADERS.items():
        assert r.headers.get(key) == value


def test_unknown_path_also_has_security_headers():
    # 404 / SPA 回退路径同样应带安全头
    client = TestClient(app)
    r = client.get("/this-path-does-not-exist-xyz")
    for key in EXPECTED_HEADERS:
        assert key in r.headers


def test_static_catch_all_has_security_headers():
    # 即便命中 SPA 回退逻辑，安全头也不应缺失
    client = TestClient(app)
    r = client.get("/some/spa/route")
    for key in EXPECTED_HEADERS:
        assert key in r.headers
