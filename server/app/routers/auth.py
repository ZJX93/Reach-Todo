from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import SEED_CATEGORIES, get_db
from ..models import User, Category
from ..schemas import UserCreate, UserOut, UserUpdate, PasswordChange, TokenOut
from ..security import hash_password, verify_password, create_access_token
from ..deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

# 新用户注册时自动预置的四个维度（与 demo 播种共用同一份定义，避免双份维护）
DEFAULT_CATEGORIES = SEED_CATEGORIES


@router.post("/register", response_model=TokenOut)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(select(User).where(User.username == payload.username))
    if existing:
        raise HTTPException(status_code=400, detail="用户名已存在")

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    await db.flush()  # 拿到 user.id 以便预置维度

    for c in DEFAULT_CATEGORIES:
        db.add(Category(user_id=user.id, **c))

    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
async def login(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.username == payload.username))
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = create_access_token(user.id)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(current: User = Depends(get_current_user)):
    return current


@router.patch("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新当前用户的个人资料（目前只允许改邮箱）。"""
    # 空字符串视作「清空邮箱」，None 表示不改
    if payload.email is not None:
        current.email = payload.email.strip() or None
    await db.commit()
    await db.refresh(current)
    return current


@router.post("/me/password")
async def change_password(
    payload: PasswordChange,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """修改密码：必须先校验旧密码，避免被挟持会话后无声改密。"""
    if not verify_password(payload.old_password, current.hashed_password):
        raise HTTPException(status_code=400, detail="当前密码不正确")
    if payload.new_password == payload.old_password:
        raise HTTPException(status_code=400, detail="新密码不能与当前密码相同")
    current.hashed_password = hash_password(payload.new_password)
    await db.commit()
    return {"ok": True}
