"""后台到期提醒调度器。

在 app.main 的 lifespan 中 start/stop。每分钟扫描一次：
  status=todo 且 due_date 非空 且 reminder_sent_at 为空
  且 now >= (due_datetime - lead_minutes)
→ 向该用户全部设备推送，并写入 reminder_sent_at 去重。

FCM 凭证未配置时 send_to_user 返回 0，本调度器不会写 reminder_sent_at，
待凭证就绪后下一个周期自然补发。
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, time, timedelta

from sqlalchemy import select

from .config import FCM_REMINDER_ENABLED, FCM_REMINDER_LEAD_MINUTES
from .database import SessionLocal
from .models import Task
from .push import send_to_user

logger = logging.getLogger("reach.scheduler")

_task: Optional[asyncio.Task] = None


def _due_datetime(task: Task):
    if not task.due_date:
        return None
    if task.due_time:
        try:
            hh, mm = task.due_time.split(":")
            t = time(int(hh), int(mm))
        except (ValueError, AttributeError):
            t = time(0, 0)
    else:
        t = time(0, 0)
    return datetime.combine(task.due_date, t)


def _body(task: Task) -> str:
    when = task.due_time or "今天"
    return f"「{task.title}」将于 {task.due_date} {when} 到期"


async def _tick() -> None:
    async with SessionLocal() as db:
        now = datetime.now()
        rows = (
            await db.execute(
                select(Task).where(
                    Task.status == "todo",
                    Task.due_date.isnot(None),
                    Task.reminder_sent_at.is_(None),
                )
            )
        ).scalars().all()

        due = []
        for t in rows:
            dd = _due_datetime(t)
            if dd is None:
                continue
            remind_at = dd - timedelta(minutes=FCM_REMINDER_LEAD_MINUTES)
            if now >= remind_at:
                due.append(t)

        for t in due:
            try:
                sent = await send_to_user(
                    t.user_id,
                    title=f"⏰ 任务提醒：{t.title}",
                    body=_body(t),
                    data={"taskId": str(t.id), "link": f"/tasks/{t.id}"},
                )
                if sent > 0:
                    t.reminder_sent_at = now
            except Exception:  # noqa: BLE001
                logger.exception("发送到期提醒失败 task=%s", t.id)
        await db.commit()


async def _loop() -> None:
    while True:
        try:
            await _tick()
        except Exception:  # noqa: BLE001
            logger.exception("提醒调度器 tick 异常")
        await asyncio.sleep(60)


def start() -> None:
    """启动后台调度器（幂等）。"""
    global _task
    if not FCM_REMINDER_ENABLED:
        logger.info("FCM 提醒调度器已关闭（FCM_REMINDER_ENABLED != 1）")
        return
    if _task is None or _task.done():
        _task = asyncio.create_task(_loop())
        logger.info("提醒调度器已启动")


def stop() -> None:
    """取消后台调度器任务。"""
    global _task
    if _task is not None:
        _task.cancel()
        _task = None
