from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class FocusSessionCreate(BaseModel):
    task_id: Optional[int] = Field(default=None, ge=1)
    minutes: int = Field(default=25, ge=1, le=720)  # 1 分钟 ~ 12 小时，防脏数据污染统计


class FocusSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    task_id: Optional[int]
    minutes: int
    started_at: datetime
