import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .config import CORS_ORIGINS
from .database import init_db
from .routers import auth, categories, goals, tasks, stats, focus, records, templates

# backend/ 目录；发布版前端构建产物放在 backend/static
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = FastAPI(title="抵达 Reach API", version="1.0.0")


@app.on_event("startup")
async def on_startup():
    await init_db()


app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(goals.router)
app.include_router(tasks.router)
app.include_router(stats.router)
app.include_router(focus.router)
app.include_router(records.router)
app.include_router(templates.router)


@app.get("/")
async def root():
    if os.path.isdir(STATIC_DIR):
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
    return {"msg": "抵达 Reach API", "docs": "/docs"}


# 发布模式：后端同端口托管前端静态文件（SPA fallback）
if os.path.isdir(STATIC_DIR):

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        candidate = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
