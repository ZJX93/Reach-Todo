from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Record, User, Template, Task
from ..schemas import RecordCreate, RecordUpdate, RecordOut, CalendarDay
from ..deps import get_current_user
from ..sanitize import sanitize_html

router = APIRouter(prefix="/api/records", tags=["records"])


# 日期入参统一转为 date 对象：SQLite 容忍字符串，但 PostgreSQL（asyncpg）
# 会因类型不匹配直接报 DataError，转换后双方言安全。
#
# 必须定义在模块级别：list_records 的查询参数名为 date，会在函数作用域内遮蔽
# datetime.date。若把本函数嵌套在其内部，注解 `date | None` 与函数体里的
# `date.fromisoformat` 都会解析到那个被遮蔽的参数（默认 None），
# 导致每次请求都抛 TypeError: unsupported operand type(s) for |: 'NoneType'。
def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return date.fromisoformat(s)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="日期格式应为 YYYY-MM-DD") from exc


@router.get("", response_model=list[RecordOut])
async def list_records(
    type: str | None = None,
    q: str | None = None,
    date: str | None = None,  # YYYY-MM-DD
    from_date: str | None = None,
    to_date: str | None = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    qry = select(Record).where(Record.user_id == current.id)
    if type:
        qry = qry.where(Record.type == type)
    if date:
        qry = qry.where(Record.record_date == _parse_date(date))
    if from_date:
        qry = qry.where(Record.record_date >= _parse_date(from_date))
    if to_date:
        qry = qry.where(Record.record_date <= _parse_date(to_date))
    if q:
        like = f"%{q}%"
        qry = qry.where(
            (Record.title.ilike(like)) | (Record.content.ilike(like))
        )
    qry = qry.order_by(
        Record.record_date.desc(), Record.record_time.desc(), Record.created_at.desc()
    )
    qry = qry.limit(limit).offset(offset)
    res = await db.scalars(qry)
    return [RecordOut.model_validate(r) for r in res]


@router.get("/calendar", response_model=list[CalendarDay])
async def calendar(
    year: int,
    month: int,  # 1-12
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """返回指定年月的每日聚合：记录总数 / 各类型数 / 当日到期任务数。"""
    start = date(year, month, 1)
    if month == 12:
        nxt = date(year + 1, 1, 1)
    else:
        nxt = date(year, month + 1, 1)

    recs = (
        await db.scalars(
            select(Record).where(
                Record.user_id == current.id,
                Record.record_date >= start,
                Record.record_date < nxt,
            )
        )
    ).all()

    from collections import defaultdict

    days: dict[str, CalendarDay] = defaultdict(
        lambda: CalendarDay(date="")
    )
    for r in recs:
        d = r.record_date.isoformat()
        cell = days[d]
        cell.date = d
        cell.total += 1
        if r.type == "diary":
            cell.diary += 1
        elif r.type == "worklog":
            cell.worklog += 1
        elif r.type == "note":
            cell.note += 1

    # 当日到期任务
    tasks = (
        await db.scalars(
            select(Task).where(
                Task.user_id == current.id,
                Task.due_date >= start,
                Task.due_date < nxt,
            )
        )
    ).all()
    for t in tasks:
        if t.due_date:
            d = t.due_date.isoformat()
            if d not in days:
                days[d] = CalendarDay(date=d)
            days[d].tasks += 1

    return [days[k] for k in sorted(days.keys())]


@router.get("/{record_id}", response_model=RecordOut)
async def get_record(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    r = await db.get(Record, record_id)
    if not r or r.user_id != current.id:
        raise HTTPException(status_code=404, detail="记录不存在")
    return RecordOut.model_validate(r)


@router.post("", response_model=RecordOut, status_code=201)
async def create_record(
    payload: RecordCreate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    data = payload.model_dump(exclude={"template_id"})
    # 套用模板：若标题/正文为空，用模板预填
    if payload.template_id:
        tpl = await db.get(Template, payload.template_id)
        if tpl and (tpl.user_id is None or tpl.user_id == current.id):
            if not data.get("title") and tpl.name:
                data["title"] = tpl.name
            if not data.get("content") and tpl.content:
                data["content"] = tpl.content
            if data.get("type") in (None, "diary") and tpl.type not in (
                None,
                "all",
            ):
                data["type"] = tpl.type
    if not data.get("title"):
        data["title"] = "无标题记录"
    if not data.get("record_date"):
        data["record_date"] = date.today()
    # XSS 防护：服务端清洗富文本
    data["content"] = sanitize_html(data.get("content"))
    r = Record(user_id=current.id, **data)
    db.add(r)
    await db.commit()
    await db.refresh(r)
    return RecordOut.model_validate(r)


@router.put("/{record_id}", response_model=RecordOut)
async def update_record(
    record_id: int,
    payload: RecordUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    r = await db.get(Record, record_id)
    if not r or r.user_id != current.id:
        raise HTTPException(status_code=404, detail="记录不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        if k == "content":
            v = sanitize_html(v)
        setattr(r, k, v)
    await db.commit()
    await db.refresh(r)
    return RecordOut.model_validate(r)


@router.delete("/{record_id}", status_code=204)
async def delete_record(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    r = await db.get(Record, record_id)
    if not r or r.user_id != current.id:
        raise HTTPException(status_code=404, detail="记录不存在")
    await db.delete(r)
    await db.commit()

