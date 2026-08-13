import logging
import os

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from .config import CORS_ORIGINS, SEED_DEMO_DATA
from .database import init_db
from .ratelimit import RateLimitMiddleware
from .security_headers import SecurityHeadersMiddleware
from .routers import (
    auth,
    categories,
    goals,
    tasks,
    stats,
    focus,
    records,
    templates,
    holidays,
    lunar,
    export,
    devices,
)
from .scheduler import start as scheduler_start, stop as scheduler_stop

# 单体部署：前端(React)构建产物放在 server/public，由 FastAPI 静态托管。
# 参照 XIN-Wallet 思路（后端直接托管前端静态资源，单端口单镜像），
# 但保留 Python(FastAPI) + React 技术栈。


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup：建库 / 迁移 / seed
    await init_db()
    await _maybe_seed_demo_data()
    scheduler_start()  # 启动后台到期提醒调度器（FCM 凭证未配置时自动 no-op）
    yield
    scheduler_stop()  # shutdown：取消调度器任务
    # 无持久连接需要显式释放，连接池由 engine 自动回收


async def _maybe_seed_demo_data():
    """按 SEED_DEMO_DATA 开关给 demo 账号灌演示数据。

    播种失败绝不能拖垮启动——演示数据只是锦上添花，
    真出问题时应用仍要能正常提供服务，日志里留痕即可。
    """
    if SEED_DEMO_DATA not in ("1", "true", "yes", "on", "force"):
        return
    try:
        from scripts.seed_demo_data import seed

        await seed(force=(SEED_DEMO_DATA == "force"))
    except Exception:  # noqa: BLE001
        logging.getLogger(__name__).exception("演示数据播种失败，已跳过")


app = FastAPI(title="抵达 Reach API", version="0.2.2", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
# 登录/注册/改密接口限速（防爆破）；多实例可设 RATE_LIMIT_REDIS_URL 改用 Redis 共享存储
app.add_middleware(RateLimitMiddleware, limit=10, window=60)
# 安全响应头中间件：为所有响应（含 SPA 静态文件）补充防护头，放在路由注册之前
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(goals.router)
app.include_router(tasks.router)
app.include_router(stats.router)
app.include_router(focus.router)
app.include_router(records.router)
app.include_router(templates.router)
app.include_router(holidays.router)
app.include_router(lunar.router)
app.include_router(export.router)
app.include_router(devices.router)


@app.get("/health")
async def health():
    return JSONResponse({"status": "ok"})


# ---------------------------------------------------------------------------
# 单体前端托管（生产镜像由 Dockerfile 把 web/dist 拷入 server/public）。
# 无论 server/public 是否存在都注册 catch-all：
#   - 存在时托管静态资源 + SPA history 回退；
#   - 不存在时未知路径返回 404（与「未注册该路由」行为一致）。
# 关键安全点：必须防止 `..` 路径穿越读取 PUBLIC_DIR 之外的文件（见 _spa_catch_all）。
# ---------------------------------------------------------------------------
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")
PUBLIC_DIR_ABS = os.path.abspath(PUBLIC_DIR)


def _static_candidate_is_safe(full_path: str) -> str | None:
    """把请求路径解析为 PUBLIC_DIR 内的真实文件绝对路径。

    返回安全路径（绝对路径字符串）；若归一化后越出 PUBLIC_DIR（路径穿越）则返回 None。
    用 abspath 归一化 `..` 后再做前缀判定，杜绝读取根目录 / 其他目录下的文件。
    """
    candidate = os.path.abspath(os.path.join(PUBLIC_DIR, full_path))
    # 归一化后必须严格位于 PUBLIC_DIR 之内（或等于 PUBLIC_DIR 本身）
    if candidate == PUBLIC_DIR_ABS or candidate.startswith(PUBLIC_DIR_ABS + os.sep):
        return candidate
    return None


@app.get("/{full_path:path}")
async def _spa_catch_all(full_path: str):
    index = os.path.join(PUBLIC_DIR_ABS, "index.html")
    candidate = _static_candidate_is_safe(full_path)
    if candidate is not None and os.path.isfile(candidate):
        # 1) 命中真实静态文件（JS/CSS/图片等）直接返回
        return FileResponse(candidate)
    # 2) SPA history 路由回退到 index.html（/goals/123 等前端路由）。
    #    越界路径（路径穿越）一律不返回越界文件，统一走此回退或 404。
    if os.path.exists(index):
        return FileResponse(index)
    raise HTTPException(status_code=404, detail="Not found")
