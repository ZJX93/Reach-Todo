from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from .common import GoalStatus


class GoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    deadline: Optional[date] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    deadline: Optional[date] = None
    status: Optional[GoalStatus] = None  # active | done


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    description: Optional[str]
    deadline: Optional[date]
    status: str
    created_at: datetime


class GoalBoardItem(BaseModel):
    """目标进度看板条目（含聚合统计）。"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    deadline: Optional[date]
    status: str
    created_at: datetime
    # 聚合统计
    total: int = 0
    done: int = 0
    overdue: int = 0
    progress: int = 0  # 完成百分比 0-100
