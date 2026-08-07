import re

import httpx
from fastapi import APIRouter, HTTPException

from ..config import APIHZ_ID, APIHZ_KEY

router = APIRouter(prefix="/api/lunar", tags=["lunar"])

# 内存缓存：同一天的农历/黄历数据只拉一次
_lunar_cache: dict[str, dict] = {}

_ymd_re = re.compile(r"^\d{4}-\d{2}-\d{2}$")


@router.get("/{date_str}")
async def get_lunar(date_str: str):
    """代理 apihz.cn 万年历接口，规避浏览器 CORS 并把第三方账号密钥留在后端。

    date_str 格式 YYYY-MM-DD，返回 apihz 的原始黄历字段（nyue/nri/jieqi/宜忌/神位等）。
    """
    if not _ymd_re.match(date_str):
        raise HTTPException(status_code=400, detail="日期格式应为 YYYY-MM-DD")

    if date_str in _lunar_cache:
        return _lunar_cache[date_str]

    y, m, d = date_str.split("-")
    url = (
        "https://cn.apihz.cn/api/time/getzdday.php"
        f"?id={APIHZ_ID}&key={APIHZ_KEY}&nian={y}&yue={m}&ri={d}"
    )
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"无法获取万年历数据: {exc}") from exc

    if not isinstance(data, dict) or data.get("code") != 200:
        raise HTTPException(status_code=502, detail="万年历接口返回异常")

    _lunar_cache[date_str] = data
    return data
