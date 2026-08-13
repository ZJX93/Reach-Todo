from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


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
