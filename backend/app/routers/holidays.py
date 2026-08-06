import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/holidays", tags=["holidays"])

# 内存缓存：全年节假日安排只拉一次，重启后失效亦无妨（数据固定）
_holiday_cache: dict[int, dict] = {}


@router.get("/{year}")
async def get_holidays(year: int):
    """代理 jiejiariapi 节假日安排接口，规避浏览器 CORS 限制。

    返回 { "YYYY-MM-DD": { name, isOffDay }, ... }：
    - isOffDay=true  法定节假日放假
    - isOffDay=false 调休补班（周末上班）
    """
    if year in _holiday_cache:
        return _holiday_cache[year]

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"https://api.jiejiariapi.com/v1/holidays/{year}")
            r.raise_for_status()
            data = r.json()
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"无法获取节假日数据: {exc}"
        ) from exc

    # 精简字段，减少传输体积
    result = {}
    for k, v in data.items():
        result[k] = {"name": v.get("name", ""), "isOffDay": bool(v.get("isOffDay"))}

    _holiday_cache[year] = result
    return result
