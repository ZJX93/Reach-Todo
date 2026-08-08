from datetime import datetime, date
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field


# 枚举值集中定义，避免散落字符串导致脏数据入库
Priority = Literal["low", "normal", "high", "urgent"]      # 紧急度
Importance = Literal["low", "normal", "high"]              # 重要度
Recurrence = Literal["none", "daily", "weekly", "monthly"]
TaskStatus = Literal["todo", "done"]
RecordType = Literal["diary", "worklog", "note"]
TemplateType = Literal["diary", "worklog", "note", "all"]
GoalStatus = Literal["active", "done"]


# ---------------- 用户 / 认证 ----------------
class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_]+$")
    email: Optional[str] = Field(default=None, max_length=255)
    password: str = Field(min_length=6, max_length=128)


class UserUpdate(BaseModel):
    """更新当前用户的个人资料（仅邮箱可改；用户名作为主键语义不可改）。"""
    email: Optional[str] = Field(default=None, max_length=255)


class PasswordChange(BaseModel):
    """修改当前用户的密码：先校验旧密码，再写入新密码。"""
    old_password: str = Field(min_length=6, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)


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
    name: str = Field(min_length=1, max_length=50)
    color: str = Field(default="#3B82F6", max_length=20)
    icon: str = Field(default="📁", max_length=20)
    sort_order: int = Field(default=0, ge=0, le=9999)


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    color: Optional[str] = Field(default=None, max_length=20)
    icon: Optional[str] = Field(default=None, max_length=20)
    sort_order: Optional[int] = Field(default=None, ge=0, le=9999)


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


# ---------------- 任务 (Task) ----------------
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


# ---------------- 目标进度看板 (Goal Board) ----------------
class GoalBoardItem(BaseModel):
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


# ---------------- 专注记录 (Focus) ----------------
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


# ---------------- 记录 (Record) ----------------
class RecordCreate(BaseModel):
    type: RecordType = "diary"
    title: Optional[str] = Field(default=None, max_length=200)
    content: Optional[str] = None
    mood: Optional[str] = Field(default=None, max_length=20)
    tags: Optional[str] = Field(default=None, max_length=200)
    book_title: Optional[str] = Field(default=None, max_length=200)
    book_author: Optional[str] = Field(default=None, max_length=100)
    project: Optional[str] = Field(default=None, max_length=100)
    record_date: Optional[date] = None
    record_time: Optional[str] = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    template_id: Optional[int] = Field(default=None, ge=1)


class RecordUpdate(BaseModel):
    type: Optional[RecordType] = None
    title: Optional[str] = Field(default=None, max_length=200)
    content: Optional[str] = None
    mood: Optional[str] = Field(default=None, max_length=20)
    tags: Optional[str] = Field(default=None, max_length=200)
    book_title: Optional[str] = Field(default=None, max_length=200)
    book_author: Optional[str] = Field(default=None, max_length=100)
    project: Optional[str] = Field(default=None, max_length=100)
    record_date: Optional[date] = None
    record_time: Optional[str] = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")


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
    type: TemplateType = "diary"
    name: str = Field(min_length=1, max_length=100)
    icon: str = Field(default="📄", max_length=20)
    content: Optional[str] = None


class TemplateUpdate(BaseModel):
    type: Optional[TemplateType] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    icon: Optional[str] = Field(default=None, max_length=20)
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
