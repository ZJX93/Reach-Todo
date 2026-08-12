"""T01 回归测试：SPA 静态托管不发生路径穿越。

两种验证方式互补：
1) 直接对核心安全函数 `_static_candidate_is_safe` 做单测（确定、不依赖 URL 归一化）；
2) 通过 FastAPI TestClient 走真实路由，验证正常静态文件可访问、且含 `..` 的请求
   不会泄漏 PUBLIC_DIR 之外的文件内容。
"""
import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# 确保 backend/ 在导入路径中（与 conftest 一致）
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app, _static_candidate_is_safe  # noqa: E402


@pytest.fixture()
def spa_env(tmp_path, monkeypatch):
    """建一个临时 public 目录并把它挂到 app.main 的 PUBLIC_DIR。"""
    public = tmp_path / "public"
    public.mkdir()
    (public / "index.html").write_text("<html><body>SPA</body></html>", encoding="utf-8")
    assets = public / "assets"
    assets.mkdir()
    (assets / "app.js").write_text("console.log('hi');", encoding="utf-8")

    # 在 public 之外放一个机密文件，验证无法被穿越读取
    secret = (tmp_path / "secret.txt")
    secret.write_text("TOP_SECRET_LEAKED", encoding="utf-8")

    monkeypatch.setattr("app.main.PUBLIC_DIR", str(public))
    monkeypatch.setattr("app.main.PUBLIC_DIR_ABS", os.path.abspath(str(public)))
    return {"public": public, "secret": secret}


# ---------------------------------------------------------------------------
# 1) 核心安全函数单测（确定、可靠）
# ---------------------------------------------------------------------------
def test_safe_normal_path(spa_env):
    res = _static_candidate_is_safe("assets/app.js")
    assert res is not None
    assert res.endswith(os.path.join("assets", "app.js"))


def test_safe_root_returns_dir(spa_env):
    # 根路径解析到 PUBLIC_DIR 本身（非文件），后续走 SPA 回退，不应越界
    assert _static_candidate_is_safe("") == os.path.abspath(str(spa_env["public"]))


def test_traversal_parent_blocked(spa_env):
    assert _static_candidate_is_safe("../secret.txt") is None
    assert _static_candidate_is_safe("../../etc/passwd") is None
    # 嵌套多层穿越同样拦截
    assert _static_candidate_is_safe("assets/../../secret.txt") is None


# ---------------------------------------------------------------------------
# 2) 走真实路由的端到端验证
# ---------------------------------------------------------------------------
def test_normal_static_file_served(spa_env):
    client = TestClient(app)
    r = client.get("/assets/app.js")
    assert r.status_code == 200
    assert "console.log" in r.text


def test_missing_static_falls_back_to_index(spa_env):
    client = TestClient(app)
    r = client.get("/assets/missing.js")
    assert r.status_code == 200
    assert "SPA" in r.text  # 回退到 index.html


def test_traversal_does_not_leak_secret(spa_env):
    secret = spa_env["secret"]
    # 构造一个指向 public 之外机密文件的相对穿越路径
    rel = os.path.relpath(secret, spa_env["public"]).replace(os.sep, "/")
    url = "/" + rel
    client = TestClient(app)
    r = client.get(url)
    # 绝不允许把机密文件内容返回（无论回退 index 还是 404）
    assert "TOP_SECRET_LEAKED" not in r.text
    assert r.status_code in (200, 404)
    if r.status_code == 200:
        # 命中 SPA 回退，返回的是 index.html 内容
        assert "SPA" in r.text
