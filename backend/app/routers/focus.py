from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import FocusSession, Task, User
from ..schemas import FocusSessionCreate, FocusSessionOut
from ..deps import get_current_user

router = APIRouter(prefix="/api/focus", tags=["focus"])


@router.post("", response_model=FocusSessionOut, status_code=201)
async def log_focus(
    payload: FocusSessionCreate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if payload.task_id is not None:
        t = await db.get(Task, payload.task_id)
        if not t or t.user_id != current.id:
            raise HTTPException(status_code=400, detail="任务不存在")
    fs = FocusSession(
        user_id=current.id,
        task_id=payload.task_id,
        minutes=payload.minutes,
    )
    db.add(fs)
    await db.commit()
    await db.refresh(fs)
    return FocusSessionOut.model_validate(fs)


@router.get("", response_model=list[FocusSessionOut])
async def list_focus(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    res = await db.scalars(
        select(FocusSession)
        .where(FocusSession.user_id == current.id)
        .order_by(desc(FocusSession.started_at))
        .limit(20)
    )
    return [FocusSessionOut.model_validate(s) for s in res.all()]
