from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------------- 用户 / 认证 ----------------
class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: Optional[str]
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------- 维度 (Category) ----------------
class CategoryCreate(BaseModel):
    name: str
    color: str = "#3B82F6"
    icon: str = "📁"
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    color: str
    icon: str
    sort_order: int


# ---------------- 目标 (Goal) ----------------
class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[date] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[date] = None
    status: Optional[str] = None  # active | done


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    description: Optional[str]
    deadline: Optional[date]
    status: str
    created_at: datetime


# ---------------- 任务 (Task) ----------------
class TaskCreate(BaseModel):
    title: str
    category_id: int
    goal_id: Optional[int] = None
    note: Optional[str] = None
    priority: str = "normal"  # low | normal | high | urgent（紧急度）
    importance: str = "normal"  # low | normal | high（重要度）
    recurrence: str = "none"  # none | daily | weekly | monthly
    due_date: Optional[date] = None
    due_time: Optional[str] = None  # HH:MM，截止时间精确到分


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    category_id: Optional[int] = None
    goal_id: Optional[int] = None
    note: Optional[str] = None
    priority: Optional[str] = None
    importance: Optional[str] = None
    recurrence: Optional[str] = None
    status: Optional[str] = None  # todo | done
    due_date: Optional[date] = None
    due_time: Optional[str] = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    category_id: int
    goal_id: Optional[int]
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


# ---------------- 目标进度看板 (Goal Board) ----------------
class GoalBoardItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    deadline: Optional[date] = None
    status: str
    created_at: datetime
    # 聚合统计
    total: int = 0
    done: int = 0
    overdue: int = 0
    progress: int = 0  # 完成百分比 0-100


# ---------------- 专注记录 (Focus) ----------------
class FocusSessionCreate(BaseModel):
    task_id: Optional[int] = None
    minutes: int = 25


class FocusSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    task_id: Optional[int]
    minutes: int
    started_at: datetime


# ---------------- 记录 (Record) ----------------
class RecordCreate(BaseModel):
    type: str = "diary"  # diary | worklog | note
    title: Optional[str] = None
    content: Optional[str] = None
    mood: Optional[str] = None
    tags: Optional[str] = None
    book_title: Optional[str] = None
    book_author: Optional[str] = None
    project: Optional[str] = None
    record_date: Optional[date] = None
    record_time: Optional[str] = None  # HH:MM，精确到分
    template_id: Optional[int] = None  # 套用模板时用于预填


class RecordUpdate(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    mood: Optional[str] = None
    tags: Optional[str] = None
    book_title: Optional[str] = None
    book_author: Optional[str] = None
    project: Optional[str] = None
    record_date: Optional[date] = None
    record_time: Optional[str] = None


class RecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    type: str
    title: str
    content: Optional[str]
    mood: Optional[str]
    tags: Optional[str]
    book_title: Optional[str]
    book_author: Optional[str]
    project: Optional[str]
    record_date: date
    record_time: Optional[str]
    created_at: datetime
    updated_at: datetime


class CalendarDay(BaseModel):
    date: str
    total: int = 0
    diary: int = 0
    worklog: int = 0
    note: int = 0
    tasks: int = 0  # 当日到期任务数


# ---------------- 模板 (Template) ----------------
class TemplateCreate(BaseModel):
    type: str = "diary"  # diary | worklog | note | all
    name: str
    icon: str = "📄"
    content: Optional[str] = None


class TemplateUpdate(BaseModel):
    type: Optional[str] = None
    name: Optional[str] = None
    icon: Optional[str] = None
    content: Optional[str] = None


class TemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int]
    type: str
    name: str
    icon: str
    content: Optional[str]
    is_preset: bool
