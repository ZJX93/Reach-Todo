"""T05 回归测试：CSV 导出对公式注入做了中和。

验证两件事：
1) 核心函数 `sanitize_csv_cell` 对危险开头字符（= + - @）加单引号前缀；
2) 走真实导出接口时，含 `=cmd` / `@SUM` 等危险值的单元格在导出 CSV 中被中和，
   且正常内容与数值不受影响。
"""
import asyncio
import csv
import io
import httpx
import uuid

from app.main import app
from app.database import init_db
from app.sanitize import sanitize_csv_cell


# ---------------------------------------------------------------------------
# 1) 核心函数单测
# ---------------------------------------------------------------------------
def test_dangerous_prefix_neutralized():
    assert sanitize_csv_cell("=cmd|'/c calc'!A1") == "'=cmd|'/c calc'!A1"
    assert sanitize_csv_cell("+1") == "'+1"
    assert sanitize_csv_cell("-5") == "'-5"
    assert sanitize_csv_cell("@SUM(A1:A10)") == "'@SUM(A1:A10)"


def test_safe_values_unchanged():
    assert sanitize_csv_cell("普通任务") == "普通任务"
    assert sanitize_csv_cell("5") == "5"
    assert sanitize_csv_cell("已完成 100%") == "已完成 100%"
    assert sanitize_csv_cell(None) == ""
    assert sanitize_csv_cell(42) == "42"
    assert sanitize_csv_cell("=not at start? no, it is") == "'=not at start? no, it is"


# ---------------------------------------------------------------------------
# 2) 真实导出接口验证
# ---------------------------------------------------------------------------
def test_export_csv_neutralizes_formula_injection():
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

        r = await c.post("/api/categories", json={"name": "work"}, headers=h)
        assert r.status_code == 201
        cat_id = r.json()["id"]

        danger_title = "=cmd|'/c calc'!A1"
        danger_note = "@SUM(A1:A10)"
        r = await c.post(
            "/api/tasks",
            json={
                "title": danger_title,
                "note": danger_note,
                "category_id": cat_id,
            },
            headers=h,
        )
        assert r.status_code == 201

        r = await c.get("/api/export?fmt=csv", headers=h)
        assert r.status_code == 200
        text = r.content.decode("utf-8")
        assert text.startswith("\ufeff")

        # 去掉 BOM 后用 csv.reader 解析，定位任务行
        reader = csv.reader(io.StringIO(text.lstrip("\ufeff")))
        rows = list(reader)
        header = rows[0]
        assert "title" in header and "note" in header
        title_idx = header.index("title")
        note_idx = header.index("note")

        data_rows = rows[1:]
        assert data_rows, "CSV 应至少包含刚导出的任务行"
        target = next(
            row for row in data_rows if row[title_idx].endswith(danger_title)
        )
        # 危险单元格被单引号中和，且原始内容保留（去掉前缀后一致）
        assert target[title_idx] == "'" + danger_title
        assert target[note_idx] == "'" + danger_note

        # 正常值不被破坏：标题单元格去掉前缀后等于原始输入
        assert target[title_idx].lstrip("'") == danger_title
