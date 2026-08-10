from datetime import datetime, timezone, date, timedelta
import calendar

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Task, Category, Goal, User
from ..schemas import TaskCreate, TaskUpdate, TaskOut
from ..deps import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def next_occurrence(d: date | None, recurrence: str) -> date:
    """根据重复规则计算下一次到期日（以当天或原到期日为基准）。"""
    base = d or date.today()
    if recurrence == "daily":
        return base + timedelta(days=1)
    if recurrence == "weekly":
        return base + timedelta(days=7)
    if recurrence == "monthly":
        # 钳制到目标月份的最后一天，正确处理 1/31→2/28、3/31→4/30、12/31→次年1/31 等
        y, m = (base.year + 1, 1) if base.month == 12 else (base.year, base.month + 1)
        last_day = calendar.monthrange(y, m)[1]
        return date(y, m, min(base.day, last_day))
    return base


def _to_out(task: Task) -> TaskOut:
    out = TaskOut.model_validate(task)
    out.category_name = task.category.name if task.category else None
    out.category_color = task.category.color if task.category else None
    out.category_icon = task.category.icon if task.category else None
    out.goal_title = task.goal.title if task.goal else None
    return out


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    category_id: int | None = None,
    goal_id: int | None = None,
    status: str | None = None,
    priority: str | None = None,
    importance: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    q = (
        select(Task)
        .where(Task.user_id == current.id)
        .join(Category, Task.category_id == Category.id, isouter=True)
        .join(Goal, Task.goal_id == Goal.id, isouter=True)
        .options(selectinload(Task.category), selectinload(Task.goal))
    )
    if category_id is not None:
        q = q.where(Task.category_id == category_id)
    if goal_id is not None:
        q = q.where(Task.goal_id == goal_id)
    if status:
        q = q.where(Task.status == status)
    if priority:
        q = q.where(Task.priority == priority)
    if importance:
        q = q.where(Task.importance == importance)
    q = q.order_by(Category.sort_order, Task.sort_order, Task.created_at)
    q = q.limit(limit).offset(offset)
    res = await db.scalars(q)
    return [_to_out(t) for t in res]


@router.get("/summary")
async def summary(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """看板统计：每个维度的待办/已完成数量 + 总览"""
    rows = await db.execute(
        select(
            Category.id,
            Category.name,
            Category.color,
            Category.icon,
            Category.sort_order,
            func.count(Task.id).filter(Task.status == "todo").label("todo"),
            func.count(Task.id).filter(Task.status == "done").label("done"),
        )
        .where(Category.user_id == current.id)
        .join(Task, Task.category_id == Category.id, isouter=True)
        .group_by(Category.id)
        .order_by(Category.sort_order)
    )
    categories = [
        {
            "category_id": r.id,
            "name": r.name,
            "color": r.color,
            "icon": r.icon,
            "todo": r.todo,
            "done": r.done,
        }
        for r in rows.all()
    ]
    total_todo = await db.scalar(
        select(func.count(Task.id)).where(
            Task.user_id == current.id, Task.status == "todo"
        )
    )
    total_done = await db.scalar(
        select(func.count(Task.id)).where(
            Task.user_id == current.id, Task.status == "done"
        )
    )
    # 今日待办：未完成的、且未排期或到期日为今天及以后（不含逾期）
    today = date.today()
    today_todo = await db.scalar(
        select(func.count(Task.id)).where(
            Task.user_id == current.id,
            Task.status == "todo",
            or_(Task.due_date.is_(None), Task.due_date >= today),
        )
    )
    return {
        "categories": categories,
        "total_todo": total_todo or 0,
        "today_todo": today_todo or 0,
        "total_done": total_done or 0,
    }


@router.post("", response_model=TaskOut, status_code=201)
async def create_task(
    payload: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    cat = await db.get(Category, payload.category_id)
    if not cat or cat.user_id != current.id:
        raise HTTPException(status_code=400, detail="维度不存在")
    if payload.goal_id is not None:
        g = await db.get(Goal, payload.goal_id)
        if not g or g.user_id != current.id:
            raise HTTPException(status_code=400, detail="目标不存在")

    data = payload.model_dump()
    # 子任务：校验父任务归属，并将其归入父任务同维度
    if data.get("parent_id") is not None:
        p = await db.get(Task, data["parent_id"])
        if not p or p.user_id != current.id:
            raise HTTPException(status_code=400, detail="父任务不存在")
        data["category_id"] = p.category_id

    data["user_id"] = current.id
    t = Task(**data)
    db.add(t)
    await db.commit()
    await db.refresh(t, attribute_names=["category", "goal"])
    return _to_out(t)


class ReorderItem(BaseModel):
    id: int
    sort_order: int


class ReorderPayload(BaseModel):
    items: list[ReorderItem]


@router.put("/reorder", status_code=200)
async def reorder_tasks(
    payload: ReorderPayload,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """批量更新任务排序（拖拽后调用）。仅接受属于当前用户且存在的任务。"""
    ids = [it.id for it in payload.items]
    if not ids:
        return {"updated": 0}
    tasks = (
        await db.scalars(select(Task).where(Task.id.in_(ids), Task.user_id == current.id))
    ).all()
    by_id = {t.id: t for t in tasks}
    updated = 0
    for it in payload.items:
        t = by_id.get(it.id)
        if t is None:
            continue
        if t.sort_order != it.sort_order:
            t.sort_order = it.sort_order
            updated += 1
    if updated:
        await db.commit()
    return {"updated": updated}


@router.put("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    t = await db.get(Task, task_id)
    if not t or t.user_id != current.id:
        raise HTTPException(status_code=404, detail="任务不存在")

    for k, v in payload.model_dump(exclude_unset=True).items():
        if k == "status":
            if v == "done" and t.status != "done":
                # 重复任务：本次标记完成，并顺延生成下一次（保持原任务为 done 计入统计）
                if t.recurrence and t.recurrence != "none":
                    t.status = "done"
                    t.completed_at = datetime.now(timezone.utc)
                    nxt = Task(
                        user_id=t.user_id,
                        category_id=t.category_id,
                        goal_id=t.goal_id,
                        title=t.title,
                        note=t.note,
                        priority=t.priority,
                        importance=t.importance,
                        recurrence=t.recurrence,
                        due_date=next_occurrence(t.due_date, t.recurrence),
                        due_time=t.due_time,
                        sort_order=t.sort_order,
                    )
                    db.add(nxt)
                    await db.commit()
                    await db.refresh(t, attribute_names=["category", "goal"])
                    return _to_out(t)
                t.completed_at = datetime.now(timezone.utc)
            elif v == "todo":
                t.completed_at = None
        setattr(t, k, v)

    # 到期时间 / 重复规则变更：重置提醒标记，允许重新提醒
    changed_schedule = any(
        k in payload.model_dump(exclude_unset=True)
        for k in ("due_date", "due_time", "recurrence")
    )
    if changed_schedule:
        t.reminder_sent_at = None

    await db.commit()
    await db.refresh(t, attribute_names=["category", "goal"])
    return _to_out(t)


# 艾森豪威尔四象限：按 重要度 × 紧急度 对未完成任务分组
QUADRANTS = [
    {"key": "q1", "title": "重要且紧急", "sub": "立即做", "importance": "high", "urgent": True},
    {"key": "q2", "title": "重要不紧急", "sub": "计划做", "importance": "high", "urgent": False},
    {"key": "q3", "title": "紧急不重要", "sub": "授权/尽快", "importance": "low", "urgent": True},
    {"key": "q4", "title": "不紧急不重要", "sub": "少做/删除", "importance": "low", "urgent": False},
]


@router.get("/matrix")
async def matrix(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """返回四个象限的任务列表（仅未完成）。"""
    urgent_vals = ["high", "urgent"]
    res = await db.scalars(
        select(Task)
        .where(Task.user_id == current.id, Task.status == "todo")
        .join(Category, Task.category_id == Category.id, isouter=True)
        .options(selectinload(Task.category), selectinload(Task.goal))
        .order_by(Category.sort_order, Task.sort_order)
    )
    tasks = res.all()
    out = []
    for q in QUADRANTS:
        items = [
            _to_out(t)
            for t in tasks
            if t.importance == q["importance"]
            and (t.priority in urgent_vals) == q["urgent"]
        ]
        out.append(
            {"key": q["key"], "title": q["title"], "sub": q["sub"], "tasks": items}
        )
    return out


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    t = await db.get(Task, task_id)
    if not t or t.user_id != current.id:
        raise HTTPException(status_code=404, detail="任务不存在")
    await db.delete(t)
    await db.commit()
