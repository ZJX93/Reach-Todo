import os
from pathlib import Path

# backend/ 目录（config.py 位于 backend/app/）
BACKEND_DIR = Path(__file__).resolve().parent.parent
# 默认使用 SQLite（发布版/本地无需外部数据库）。
# Docker 版由 docker-compose.yml 注入 PostgreSQL 的 DATABASE_URL 进行覆盖。
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite+aiosqlite:///{BACKEND_DIR / 'goalflow.db'}",
)
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-prod")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]

# 是否强制播种初始演示账号 demo / reach2024。
# 不设置时：默认 SQLite（发布版）会自动播种；PostgreSQL（Docker 版）默认不播种，
# 如需本地也生成初始账号，设置 SEED_DEMO_ACCOUNT=1。
SEED_DEMO_ACCOUNT = os.getenv("SEED_DEMO_ACCOUNT", "").strip().lower() in (
    "1",
    "true",
    "yes",
    "on",
)
