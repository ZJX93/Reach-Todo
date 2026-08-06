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
    {"name": "学习", "color": "#06B6D4", "icon": "📚", "sort_order": 2},
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


# 内置记录模板（全局，user_id 为 NULL，用户不可改不可删）
PRESET_TEMPLATES = [
    # 个人日记 —— 借鉴「三问法 / 感恩练习 / 晨页」等成熟反思框架
    {"type": "diary", "name": "每日心情日记", "icon": "🌤️", "content":
        "【✅ 今天顺利的事】\n- \n- \n\n【❌ 今天不太顺的】\n- \n\n【🔄 明天换个做法】\n- \n"},
    {"type": "diary", "name": "感恩日记", "icon": "🙏", "content":
        "今天值得感恩的三件事：\n1. \n2. \n3. \n\n为什么感恩：\n💡 今天的一件小确幸：\n"},
    {"type": "diary", "name": "自由书写", "icon": "✍️", "content":
        "此时此刻，脑海里浮现的是……\n\n（不评判、不修改、不停笔，想到什么写什么，写满就好。）"},
    # 工作日志 —— 借鉴日报最佳实践：成果 / 计划 / 问题 / 复盘
    {"type": "worklog", "name": "每日工作日报", "icon": "💼", "content":
        "【✅ 今日完成】\n- \n- \n\n【🔄 进行中】\n- \n\n【⚠️ 阻塞 / 风险】\n- \n\n【➡️ 明日计划】\n- \n\n【💡 今日收获 / 复盘】\n- \n"},
    {"type": "worklog", "name": "周报", "icon": "📈", "content":
        "【📌 本周成果】\n- \n- \n\n【🎯 下周重点】\n- \n\n【⚠️ 风险 / 需协调】\n- \n\n【🔍 本周复盘】\n- \n"},
    {"type": "worklog", "name": "会议纪要", "icon": "🗒️", "content":
        "【会议主题】\n【时间 / 地点】\n【参会人】\n\n【✅ 核心决议】\n- \n\n【📋 行动项（事项 / 负责人 / 截止）】\n- 事项：\n  负责人：\n  截止：\n\n【👀 待跟进】\n- \n"},
    # 读书笔记 —— 借鉴康奈尔笔记（笔记 / 线索 / 总结）+ 卡片法「连接与应用」
    {"type": "note", "name": "读书卡片", "icon": "📚", "content":
        "【📒 书中内容 / 笔记】\n（核心论点、案例、数据，用自己的话记）\n\n【❓ 我的提问 / 关键词】\n- \n\n【💡 我的思考 / 关联】\n（它让我想到……、和已有知识有何联系）\n\n【🧩 可以如何应用】\n（在生活 / 工作里怎么用）"},
    {"type": "note", "name": "金句摘抄", "icon": "💡", "content":
        "【原文】\n（逐字摘录，保留标点）\n\n【出处】（书名 · 章节 · 页码）\n【背景】（这句话出现的情境）\n\n【💭 我的感悟】\n【🔗 可迁移到】（哪类问题能用上这句话）"},
    {"type": "note", "name": "读后感", "icon": "📝", "content":
        "【一句话总结】\n【内容概览】（核心脉络 / 主线）\n\n【🌟 最大收获 / 颠覆认知的点】\n【❤️ 喜欢的角色 / 观点】\n【🙋 推荐给谁 & 理由】\n【🚀 我的行动】（读完后打算做的一件事）"},
]


async def seed_preset_templates():
    """内置模板：按 name 幂等更新（已存在则更新内容/图标，不存在则插入）。

    这样修改 PRESET_TEMPLATES 后，老用户重新启动时也会同步到新版模板。"""
    from sqlalchemy import select

    from .models import Template

    async with SessionLocal() as session:
        for t in PRESET_TEMPLATES:
            existing = await session.scalar(
                select(Template).where(
                    Template.is_preset == True,  # noqa: E712
                    Template.name == t["name"],
                )
            )
            if existing:
                existing.type = t["type"]
                existing.icon = t["icon"]
                existing.content = t["content"]
            else:
                session.add(
                    Template(
                        user_id=None,
                        is_preset=True,
                        type=t["type"],
                        name=t["name"],
                        icon=t["icon"],
                        content=t["content"],
                    )
                )
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
            ("due_time", "VARCHAR(5)"),
        ],
        "records": [
            ("record_time", "VARCHAR(5)"),
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
    await seed_preset_templates()
