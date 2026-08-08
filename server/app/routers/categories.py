from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Category, User
from ..schemas import CategoryCreate, CategoryUpdate, CategoryOut
from ..deps import get_current_user

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    res = await db.scalars(
        select(Category)
        .where(Category.user_id == current.id)
        .order_by(Category.sort_order)
    )
    return [CategoryOut.model_validate(c) for c in res]


@router.post("", response_model=CategoryOut, status_code=201)
async def create_category(
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    c = Category(user_id=current.id, **payload.model_dump())
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return CategoryOut.model_validate(c)


@router.put("/{cat_id}", response_model=CategoryOut)
async def update_category(
    cat_id: int,
    payload: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    c = await db.get(Category, cat_id)
    if not c or c.user_id != current.id:
        raise HTTPException(status_code=404, detail="维度不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    await db.commit()
    await db.refresh(c)
    return CategoryOut.model_validate(c)


@router.delete("/{cat_id}", status_code=204)
async def delete_category(
    cat_id: int,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    c = await db.get(Category, cat_id)
    if not c or c.user_id != current.id:
        raise HTTPException(status_code=404, detail="维度不存在")
    await db.delete(c)
    await db.commit()
