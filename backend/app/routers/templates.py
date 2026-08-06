from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Template, User
from ..schemas import TemplateCreate, TemplateUpdate, TemplateOut
from ..deps import get_current_user

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("", response_model=list[TemplateOut])
async def list_templates(
    type: str | None = None,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """返回内置预设 + 当前用户的自定义模板；可按 type 过滤（all 包含全部）。"""
    qry = select(Template).where(
        (Template.user_id.is_(None)) | (Template.user_id == current.id)
    )
    if type and type != "all":
        qry = qry.where((Template.type == type) | (Template.type == "all"))
    qry = qry.order_by(Template.is_preset.desc(), Template.id.asc())
    res = await db.scalars(qry)
    return [TemplateOut.model_validate(t) for t in res]


@router.post("", response_model=TemplateOut, status_code=201)
async def create_template(
    payload: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    t = Template(user_id=current.id, is_preset=False, **payload.model_dump())
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return TemplateOut.model_validate(t)


@router.put("/{template_id}", response_model=TemplateOut)
async def update_template(
    template_id: int,
    payload: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    t = await db.get(Template, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="模板不存在")
    if t.is_preset:
        raise HTTPException(status_code=403, detail="内置模板不可修改")
    if t.user_id != current.id:
        raise HTTPException(status_code=404, detail="模板不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(t, k, v)
    await db.commit()
    await db.refresh(t)
    return TemplateOut.model_validate(t)


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    t = await db.get(Template, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="模板不存在")
    if t.is_preset:
        raise HTTPException(status_code=403, detail="内置模板不可删除")
    if t.user_id != current.id:
        raise HTTPException(status_code=404, detail="模板不存在")
    await db.delete(t)
    await db.commit()
