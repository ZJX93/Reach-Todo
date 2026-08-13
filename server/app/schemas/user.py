from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


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
