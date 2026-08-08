import os

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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

# backend/ 目录；发布版前端构建产物放在 backend/static


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
