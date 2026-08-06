import os

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from .config import CORS_ORIGINS
from .database import init_db
from .ratelimit import RateLimitMiddleware
from .routers import auth, categories, goals, tasks, stats, focus, records, templates, holidays

# backend/ 目录；发布版前端构建产物放在 backend/static
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup：建库 / 迁移 / seed
    await init_db()
    yield
    # shutdown：无持久连接需要显式释放，连接池由 engine 自动回收


app = FastAPI(title="抵达 Reach API", version="1.1.0")

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


@app.get("/health")
async def health():
    return JSONResponse({"status": "ok"})


# 发布模式：后端同端口托管前端静态文件。
# StaticFiles 仅负责 /assets 下的带 hash 静态资源；未知的非 /api 路径统一回退到
# index.html，支持 SPA 客户端路由（直接访问 /login、刷新 /dashboard 等不会 404）。
# 不使用手写路径拼接，从根本上杜绝目录穿越风险。
if os.path.isdir(STATIC_DIR):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static-assets")

    index_file = os.path.join(STATIC_DIR, "index.html")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Not Found")
