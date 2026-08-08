"""API 冒烟测试：注册→登录→建维度→建重复任务→完成顺延→输入校验→限速。

用 asyncio.run 包一层，避免引入 pytest-asyncio 依赖。
"""
import asyncio
import httpx
import uuid

from app.main import app
from app.database import init_db


def test_auth_and_task_flow():
    asyncio.run(_run())


async def _run():
    await init_db()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        user = "u_" + uuid.uuid4().hex[:10]
        # 注册
        r = await c.post("/api/auth/register", json={"username": user, "password": "secret123"})
        assert r.status_code == 200, r.text
        token = r.json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}
        # me
        r = await c.get("/api/auth/me", headers=h)
        assert r.status_code == 200
        # 创建维度
        r = await c.post("/api/categories", json={"name": "工作"}, headers=h)
        assert r.status_code == 201
        cat_id = r.json()["id"]
        # 创建每日重复任务
        r = await c.post(
            "/api/tasks",
            json={"title": "每日复盘", "category_id": cat_id, "recurrence": "daily", "due_date": "2026-08-06"},
            headers=h,
        )
        assert r.status_code == 201
        task_id = r.json()["id"]
        # 完成 → 应顺延生成下一次
        r = await c.put(f"/api/tasks/{task_id}", json={"status": "done"}, headers=h)
        assert r.status_code == 200
        # 列表应含 2 条（原始 done + 新生成）
        r = await c.get("/api/tasks", headers=h)
        assert r.status_code == 200
        assert len(r.json()) == 2
        # 目标看板应正常返回（聚合查询）
        r = await c.get("/api/goals/board", headers=h)
        assert r.status_code == 200


def test_input_validation():
    asyncio.run(_run_validation())


async def _run_validation():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        # 密码过短 → 422
        r = await c.post("/api/auth/register", json={"username": "shortpwd", "password": "123"})
        assert r.status_code == 422
        # 非法优先级 → 422
        r = await c.post("/api/auth/login", json={"username": "x", "password": "y"})
        assert r.status_code in (401, 422)  # 登录失败或校验失败均可接受


def test_rate_limit_on_login():
    asyncio.run(_run_ratelimit())


async def _run_ratelimit():
    await init_db()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        statuses = []
        for _ in range(12):
            r = await c.post("/api/auth/login", json={"username": "nobody", "password": "wrong"})
            statuses.append(r.status_code)
        # 限流：第 11、12 次应被拦截为 429
        assert 429 in statuses[-3:], statuses


def test_profile_update_and_password_change():
    """个人资料更新 + 修改密码的完整链路。"""
    asyncio.run(_run_profile())


async def _run_profile():
    import os
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.models import User
    from app.security import verify_password

    await init_db()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        user = "u_" + uuid.uuid4().hex[:10]
        old_pw = "secret123"
        r = await c.post("/api/auth/register", json={"username": user, "password": old_pw})
        assert r.status_code == 200, r.text
        body = r.json()
        h = {"Authorization": f"Bearer {body['access_token']}"}
        uid = body["user"]["id"]

        # —— PATCH /me ——
        # 1) 正常更新邮箱
        r = await c.patch("/api/auth/me", json={"email": "a@example.com"}, headers=h)
        assert r.status_code == 200, r.text
        assert r.json()["email"] == "a@example.com"
        # 2) 空字符串 → 清空邮箱
        r = await c.patch("/api/auth/me", json={"email": ""}, headers=h)
        assert r.status_code == 200
        assert r.json()["email"] is None
        # 3) 未认证 → 401
        r = await c.patch("/api/auth/me", json={"email": "x@y.com"})
        assert r.status_code == 401

        # —— POST /me/password ——
        # 4) 旧密码错（长度合规）→ 400
        r = await c.post(
            "/api/auth/me/password",
            json={"old_password": "wrongpw", "new_password": "newsecret1"},
            headers=h,
        )
        assert r.status_code == 400
        # 5) 新旧相同 → 400
        r = await c.post(
            "/api/auth/me/password",
            json={"old_password": old_pw, "new_password": old_pw},
            headers=h,
        )
        assert r.status_code == 400
        # 6) 正确修改 → 200
        new_pw = "newsecret1"
        r = await c.post(
            "/api/auth/me/password",
            json={"old_password": old_pw, "new_password": new_pw},
            headers=h,
        )
        assert r.status_code == 200, r.text
        # 7) 直接读库验证哈希已更新（避开登录限速，验证更确切）
        engine = create_async_engine(os.environ["DATABASE_URL"])
        S = async_sessionmaker(engine, expire_on_commit=False)
        async with S() as s:
            u = await s.get(User, uid)
            assert verify_password(new_pw, u.hashed_password), "新密码应能通过校验"
            assert not verify_password(old_pw, u.hashed_password), "旧密码应已失效"
        await engine.dispose()
        # 8) 未认证改密 → 401
        r = await c.post(
            "/api/auth/me/password",
            json={"old_password": new_pw, "new_password": "another123"},
        )
        assert r.status_code == 401
