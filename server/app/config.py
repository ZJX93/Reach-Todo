import os
import secrets
import logging
from pathlib import Path

logger = logging.getLogger("reach.config")

# backend/ 目录（config.py 位于 backend/app/）
BACKEND_DIR = Path(__file__).resolve().parent.parent
# 默认使用 SQLite（发布版/本地无需外部数据库）。
# Docker 版由 docker-compose.yml 注入 PostgreSQL 的 DATABASE_URL 进行覆盖。
# 注意：Windows 下必须用正斜杠绝对路径（as_posix），否则 SQLAlchemy 会把
# `C:\...` 反斜杠路径解析到错误位置，导致库文件建在别处、表从未创建。
_DB_PATH = BACKEND_DIR / "goalflow.db"
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite+aiosqlite:///{_DB_PATH.as_posix()}",
)


def _resolve_jwt_secret() -> str:
    """解析 JWT 签名密钥。

    安全修复（原默认 'change-me-in-prod' 可被任何人伪造 token）：
    - 显式设置 JWT_SECRET 环境变量时优先使用；
    - 否则在 BACKEND_DIR/.jwt_secret 持久化一个随机密钥，保证重启后 token 仍有效，
      且不再使用可猜测的硬编码值。
    """
    env = os.getenv("JWT_SECRET")
    if env and env.strip() and env != "change-me-in-prod":
        return env.strip()

    secret_file = BACKEND_DIR / ".jwt_secret"
    if secret_file.exists():
        try:
            return secret_file.read_text(encoding="utf-8").strip()
        except OSError:
            pass

    token = secrets.token_urlsafe(48)
    try:
        secret_file.write_text(token, encoding="utf-8")
        secret_file.chmod(0o600)
        logger.warning(
            "未设置 JWT_SECRET，已自动生成随机密钥并保存到 %s（生产环境请改用环境变量）",
            secret_file,
        )
    except OSError:
        logger.warning("无法持久化 JWT 密钥，本次启动使用临时随机密钥（重启将失效）")
    return token


JWT_SECRET = _resolve_jwt_secret()
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

# 是否给 demo 账号灌整套演示数据（目标 / 任务 / 子任务 / 番茄钟 / 日记 / 模板）。
# 与 SEED_DEMO_ACCOUNT 的区别很关键：后者只建账号 + 四个维度，而且仅在**整库零用户**
# 时才生效——库里一旦有别的用户，demo 号根本不会被创建，自然一条数据都没有。
#   未设置 / 0     → 不灌
#   1|true|yes|on → demo 没有任务时才灌（幂等，重启不会重复写）
#   force         → 每次启动都清空 demo 自己的数据后重建
SEED_DEMO_DATA = os.getenv("SEED_DEMO_DATA", "").strip().lower()

# 万年历（apihz.cn）接口账号：默认沿用公共测试账号，
# 生产环境请申请自己的免费账号后通过环境变量覆盖，避免限频与暴露。
APIHZ_ID = os.getenv("APIHZ_ID", "88888888")
APIHZ_KEY = os.getenv("APIHZ_KEY", "88888888")
