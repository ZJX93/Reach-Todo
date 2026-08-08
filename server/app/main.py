import os

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from .config import CORS_ORIGINS
from .database import init_db
from .ratelimit import RateLimitMiddleware
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
)

# 单体部署：前端(React)构建产物放在 server/public，由 FastAPI 静态托管。
# 参照 XIN-Wallet 思路（后端直接托管前端静态资源，单端口单镜像），
# 但保留 Python(FastAPI) + React 技术栈。


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup：建库 / 迁移 / seed
    await init_db()
    yield
    # shutdown：无持久连接需要显式释放，连接池由 engine 自动回收


app = FastAPI(title="抵达 Reach API", version="1.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
# 登录/注册接口限速（防爆破）
app.add_middleware(RateLimitMiddleware, limit=10, window=60)

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


@app.get("/health")
async def health():
    return JSONResponse({"status": "ok"})


# ---------------------------------------------------------------------------
# 单体前端托管（仅当 server/public 目录存在时启用）
# 生产镜像由 Dockerfile 把 web/dist 拷入 server/public；本地只跑 API 时该目录
# 不存在，则跳过，不影响接口调试。
# ---------------------------------------------------------------------------
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")

if os.path.isdir(PUBLIC_DIR):

    @app.get("/{full_path:path}")
    async def _spa_catch_all(full_path: str):
        # 1) 命中真实静态文件（JS/CSS/图片等）直接返回
        candidate = os.path.join(PUBLIC_DIR, full_path)
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        # 2) SPA history 路由回退到 index.html（/goals/123 等前端路由）
        index = os.path.join(PUBLIC_DIR, "index.html")
        if os.path.exists(index):
            return FileResponse(index)
        raise HTTPException(status_code=404, detail="Not found")
