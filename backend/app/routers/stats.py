from datetime import datetime, timezone, date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Task, Category, Goal, FocusSession, User
from ..deps import get_current_user

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _naive(dt):
    """SQLite 返回 naive、PostgreSQL 返回 aware，统一转 naive 以便比较。"""
    return dt.replace(tzinfo=None) if dt and dt.tzinfo else dt


@router.get("/summary")
async def summary(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """周回顾 / 数据看板：本周完成、连续天数、专注时长、各维度与目标进展。"""
    now = datetime.now()
    week_ago = now - timedelta(days=7)
    today = date.today()

    # 全部任务
    tasks = (
        await db.scalars(select(Task).where(Task.user_id == current.id))
    ).all()

    total_todo = sum(1 for t in tasks if t.status == "todo")
    total_done = sum(1 for t in tasks if t.status == "done")
    week_completed = sum(
        1
        for t in tasks
        if t.status == "done"
        and t.completed_at
        and _naive(t.completed_at) >= week_ago
    )

    # 连续完成天数（streak）：从今天往前数
    done_dates = {
        t.completed_at.date()
        for t in tasks
        if t.status == "done" and t.completed_at
    }
    streak = 0
    cur = today
    while cur in done_dates:
        streak += 1
        cur -= timedelta(days=1)

    # 各维度统计
    cats = (
        await db.scalars(
            select(Category)
            .where(Category.user_id == current.id)
            .order_by(Category.sort_order)
        )
    ).all()
    per_category = []
    for c in cats:
        ct = [t for t in tasks if t.category_id == c.id]
        per_category.append(
            {
                "name": c.name,
                "color": c.color,
                "icon": c.icon,
                "todo": sum(1 for t in ct if t.status == "todo"),
                "done": sum(1 for t in ct if t.status == "done"),
            }
        )

    # 目标进展
    goals = (
        await db.scalars(select(Goal).where(Goal.user_id == current.id))
    ).all()
    goals_progress = []
    for g in goals:
        gt = [t for t in tasks if t.goal_id == g.id]
        total = len(gt)
        done = sum(1 for t in gt if t.status == "done")
        goals_progress.append(
            {
                "id": g.id,
                "title": g.title,
                "total": total,
                "done": done,
                "progress": round(done / total * 100) if total else 0,
            }
        )

    # 专注时长
    sessions = (
        await db.scalars(
            select(FocusSession).where(FocusSession.user_id == current.id)
        )
    ).all()
    focus_minutes_today = sum(
        s.minutes
        for s in sessions
        if s.started_at and s.started_at.date() == today
    )
    focus_minutes_week = sum(
        s.minutes
        for s in sessions
        if s.started_at and _naive(s.started_at) >= week_ago
    )

    return {
        "total_todo": total_todo,
        "total_done": total_done,
        "week_completed": week_completed,
        "streak": streak,
        "per_category": per_category,
        "goals_progress": goals_progress,
        "focus_minutes_today": focus_minutes_today,
        "focus_minutes_week": focus_minutes_week,
    }
