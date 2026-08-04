from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from .config import DATABASE_URL

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with SessionLocal() as session:
        yield session


# 初始演示账号（仅在用户表为空时创建一次）
SEED_USERNAME = "demo"
SEED_PASSWORD = "reach2024"
SEED_CATEGORIES = [
    {"name": "工作", "color": "#3B82F6", "icon": "💼", "sort_order": 0},
    {"name": "健康", "color": "#10B981", "icon": "💪", "sort_order": 1},
    {"name": "学习", "color": "#8B5CF6", "icon": "📚", "sort_order": 2},
    {"name": "生活", "color": "#F59E0B", "icon": "🏠", "sort_order": 3},
]


async def seed_demo_account():
    """数据库无用户时，自动创建一个初始账号并预置四个维度。
    发布版（默认 SQLite）默认开启；PostgreSQL 版需 SEED_DEMO_ACCOUNT=1 才开启。"""
    from sqlalchemy import select

    from .config import DATABASE_URL, SEED_DEMO_ACCOUNT
    from .models import Category, User
    from .security import hash_password

    enabled = SEED_DEMO_ACCOUNT or DATABASE_URL.startswith("sqlite")
    if not enabled:
        return

    async with SessionLocal() as session:
        existing = await session.scalar(select(User).limit(1))
        if existing:
            return  # 已有用户，不再重复创建

        demo = User(
            username=SEED_USERNAME,
            hashed_password=hash_password(SEED_PASSWORD),
        )
        session.add(demo)
        await session.flush()
        for c in SEED_CATEGORIES:
            session.add(Category(user_id=demo.id, **c))
        await session.commit()


async def migrate():
    """幂等迁移：为已存在的表补充新列（兼容发布版旧的 SQLite / PostgreSQL）。
    仅新增列，不破坏已有数据；新建库由 create_all 直接建好。"""
    from sqlalchemy import inspect as sa_inspect, text

    # 需要补充的列（表名 -> [(列名, DDL)]）
    patches = {
        "tasks": [
            ("importance", "VARCHAR(20) NOT NULL DEFAULT 'normal'"),
            ("recurrence", "VARCHAR(20) NOT NULL DEFAULT 'none'"),
        ],
    }

    async with engine.begin() as conn:

        def _patch(sync_conn):
            inspector = sa_inspect(sync_conn)
            for table, cols in patches.items():
                existing = {c["name"] for c in inspector.get_columns(table)}
                for col, ddl in cols:
                    if col not in existing:
                        sync_conn.execute(
                            text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}")
                        )

        await conn.run_sync(_patch)


async def init_db():
    # 导入模型以确保注册到 Base.metadata
    from . import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await migrate()
    await seed_demo_account()
