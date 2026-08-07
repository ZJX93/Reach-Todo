"""Subtask tests: create with parent_id, ownership validation, inheritance."""
import asyncio
import httpx
import uuid

from app.main import app
from app.database import init_db


def test_subtasks():
    asyncio.run(_run())


async def _run():
    await init_db()
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        user = "u_" + uuid.uuid4().hex[:10]
        r = await c.post("/api/auth/register", json={"username": user, "password": "secret123"})
        assert r.status_code == 200, r.text
        token = r.json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}

        r = await c.post("/api/categories", json={"name": "work"}, headers=h)
        cat_id = r.json()["id"]

        # parent task
        r = await c.post("/api/tasks", json={"title": "Parent", "category_id": cat_id}, headers=h)
        assert r.status_code == 201
        parent_id = r.json()["id"]

        # subtask referencing parent
        r = await c.post(
            "/api/tasks",
            json={"title": "Sub A", "category_id": cat_id, "parent_id": parent_id},
            headers=h,
        )
        assert r.status_code == 201
        sub = r.json()
        assert sub["parent_id"] == parent_id
        assert sub["category_id"] == cat_id  # inherited from parent

        # subtask with non-existent parent -> 400
        r = await c.post(
            "/api/tasks",
            json={"title": "X", "category_id": cat_id, "parent_id": 999999},
            headers=h,
        )
        assert r.status_code == 400

        # second user cannot attach subtask to first user's task
        user2 = "u_" + uuid.uuid4().hex[:10]
        r2 = await c.post("/api/auth/register", json={"username": user2, "password": "secret123"})
        h2 = {"Authorization": f"Bearer {r2.json()['access_token']}"}
        r = await c.post(
            "/api/tasks",
            json={"title": "Y", "category_id": cat_id, "parent_id": parent_id},
            headers=h2,
        )
        assert r.status_code == 400

        # list contains both; subtask is distinguishable by parent_id
        r = await c.get("/api/tasks", headers=h)
        assert r.status_code == 200
        tasks = r.json()
        assert any(t["id"] == parent_id and t["parent_id"] is None for t in tasks)
        assert any(t["id"] == sub["id"] and t["parent_id"] == parent_id for t in tasks)

        # toggle subtask to done
        r = await c.put(f"/api/tasks/{sub['id']}", json={"status": "done"}, headers=h)
        assert r.status_code == 200
        assert r.json()["status"] == "done"
