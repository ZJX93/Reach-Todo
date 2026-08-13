from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from .common import Priority, Importance, Recurrence, TaskStatus


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    category_id: int = Field(ge=1)
    goal_id: Optional[int] = Field(default=None, ge=1)
    parent_id: Optional[int] = Field(default=None, ge=1)
    note: Optional[str] = None
    priority: Priority = "normal"
    importance: Importance = "normal"
    recurrence: Recurrence = "none"
    due_date: Optional[date] = None
    due_time: Optional[str] = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=300)
    category_id: Optional[int] = Field(default=None, ge=1)
    goal_id: Optional[int] = Field(default=None, ge=1)
    parent_id: Optional[int] = Field(default=None, ge=1)
    note: Optional[str] = None
    priority: Optional[Priority] = None
    importance: Optional[Importance] = None
    recurrence: Optional[Recurrence] = None
    status: Optional[TaskStatus] = None  # todo | done
    due_date: Optional[date] = None
    due_time: Optional[str] = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    category_id: int
    goal_id: Optional[int]
    parent_id: Optional[int] = None
    title: str
    note: Optional[str]
    priority: str
    importance: str
    recurrence: str
    status: str
    due_date: Optional[date]
    due_time: Optional[str] = None
    sort_order: int
    created_at: datetime
    completed_at: Optional[datetime]

    # 关联信息（供前端展示蓝色目标文字、维度色块）
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_icon: Optional[str] = None
    goal_title: Optional[str] = None
