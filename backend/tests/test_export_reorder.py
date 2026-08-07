"""Export and drag-reorder endpoint tests: JSON/CSV export structure + reorder persistence."""
import asyncio
import httpx
import uuid

from app.main import app
from app.database import init_db


def test_export_and_reorder():
    asyncio.run(_run())


async def _run():
    await init_db()
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        user = "u_" + uuid.uuid4().hex[:10]
        r = await c.post(
            "/api/auth/register",
            json={"username": user, "password": "secret123"},
        )
        assert r.status_code == 200, r.text
        token = r.json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}

        # create category + two tasks
        r = await c.post("/api/categories", json={"name": "work"}, headers=h)
        assert r.status_code == 201
        cat_id = r.json()["id"]
        t1 = (await c.post("/api/tasks", json={"title": "A", "category_id": cat_id}, headers=h)).json()["id"]
        t2 = (await c.post("/api/tasks", json={"title": "B", "category_id": cat_id}, headers=h)).json()["id"]

        # JSON export
        r = await c.get("/api/export?fmt=json", headers=h)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["app"] == "Reach-Todo"
        assert "categories" in body and "goals" in body and "tasks" in body and "records" in body
        assert any(t["id"] == t1 for t in body["tasks"])
        assert r.headers["content-disposition"].endswith("reach-backup.json")

        # CSV export: has BOM and key columns
        r = await c.get("/api/export?fmt=csv", headers=h)
        assert r.status_code == 200
        text = r.content.decode("utf-8")
        assert text.startswith("\ufeff")
        assert "title" in text and "due_date" in text and "completed_at" in text
        assert "A" in text and "B" in text

        # invalid fmt -> 422
        r = await c.get("/api/export?fmt=xml", headers=h)
        assert r.status_code == 422

        # reorder: assign distinct non-zero sort_order so both tasks change
        r = await c.put(
            "/api/tasks/reorder",
            json={"items": [{"id": t1, "sort_order": 5}, {"id": t2, "sort_order": 2}]},
            headers=h,
        )
        assert r.status_code == 200
        assert r.json()["updated"] == 2

        # after reorder, B (sort_order 0) should precede A
        r = await c.get("/api/tasks", headers=h)
        assert r.status_code == 200
        ids = [t["id"] for t in r.json()]
        assert ids.index(t2) < ids.index(t1)

        # tasks belonging to another user must not be reorderable
        user2 = "u_" + uuid.uuid4().hex[:10]
        r2 = await c.post("/api/auth/register", json={"username": user2, "password": "secret123"})
        token2 = r2.json()["access_token"]
        h2 = {"Authorization": f"Bearer {token2}"}
        r = await c.put(
            "/api/tasks/reorder",
            json={"items": [{"id": t1, "sort_order": 99}]},
            headers=h2,
        )
        assert r.status_code == 200
        assert r.json()["updated"] == 0
