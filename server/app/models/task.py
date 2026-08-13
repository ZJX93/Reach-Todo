from datetime import datetime, date
from typing import Optional

from sqlalchemy import (
    String,
    Integer,
    DateTime,
    Date,
    ForeignKey,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Task(Base):
    """待办事项"""

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), index=True
    )
    goal_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("goals.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(300))
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(
        String(20), default="normal"
    )  # low | normal | high | urgent（紧急度）
    importance: Mapped[str] = mapped_column(
        String(20), default="normal"
    )  # low | normal | high（重要度，用于艾森豪威尔矩阵）
    recurrence: Mapped[str] = mapped_column(
        String(20), default="none"
    )  # none | daily | weekly | monthly
    status: Mapped[str] = mapped_column(String(20), default="todo")  # todo | done
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    due_time: Mapped[Optional[str]] = mapped_column(
        String(5), nullable=True
    )  # HH:MM，截止时间精确到分；为空表示仅日期
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # 最近一次到期提醒已推送的时间；为空表示尚未推送。调度器据此去重，
    # 重复任务顺延后（新任务 reminder_sent_at 默认空）会重新触发。
    reminder_sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    owner: Mapped["User"] = relationship(back_populates="tasks")
    category: Mapped["Category"] = relationship(back_populates="tasks")
    goal: Mapped[Optional["Goal"]] = relationship(back_populates="tasks")

    # 子任务：自引用的父子关系（parent_id 为 NULL 表示顶层任务）
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True, index=True
    )
    parent: Mapped[Optional["Task"]] = relationship(
        "Task", remote_side=[id], back_populates="children"
    )
    children: Mapped[list["Task"]] = relationship(
        "Task", back_populates="parent", cascade="all, delete-orphan"
    )
