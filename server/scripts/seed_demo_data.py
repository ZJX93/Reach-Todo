# -*- coding: utf-8 -*-
"""给 demo 账号灌一套覆盖全部功能的演示数据（容器原生版）。

与旧版 seed_demo.py 的区别：
- 复用应用自身的 SQLAlchemy 异步引擎与 ORM 模型，**不再依赖 psycopg2**
  （镜像里只装了 asyncpg，旧脚本在容器内根本 import 不进来）；
- 内置模板直接取 app.database.PRESET_TEMPLATES，**不再依赖外部 PRESETS_JSON 文件**；
- 数据库地址从 DATABASE_URL 读取，不再硬编码内网 IP。

用法：
    docker compose exec reach python scripts/seed_demo_data.py          # demo 无任务时才灌
    docker compose exec reach python scripts/seed_demo_data.py --force  # 清空 demo 数据后重建

只操作 demo 用户自己的数据 + 全局内置模板，不碰其他用户。
"""
import asyncio
import os
import random
import sys
from datetime import date, datetime, time, timedelta, timezone

# 允许以 `python scripts/seed_demo_data.py` 直接运行（sys.path[0] 是 scripts/，
# 需要把项目根 /app 补进去，否则 `import app` 失败）。
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import delete, func, select  # noqa: E402

from app.database import (  # noqa: E402
    SEED_CATEGORIES,
    SEED_PASSWORD,
    SEED_USERNAME,
    SessionLocal,
    seed_preset_templates,
)
from app.models import (  # noqa: E402
    Category,
    FocusSession,
    Goal,
    Record,
    Task,
    Template,
    User,
)
from app.security import hash_password  # noqa: E402

random.seed(20260807)

UTC = timezone.utc
TODAY = datetime.now(UTC).date()


def dt(day_offset, hh, mm=0):
    """相对今天的 UTC 时间戳（day_offset 为正表示过去）。"""
    d = TODAY - timedelta(days=day_offset)
    return datetime.combine(d, time(hh, mm), tzinfo=UTC)


def dd(day_offset):
    return TODAY - timedelta(days=day_offset)


async def ensure_demo_user(session):
    """确保 demo 用户与四个维度存在。

    注意：应用启动时的 seed_demo_account() 只在**整库零用户**时才建号，
    NAS 上库里已有其他用户，所以 demo 号可能压根没被创建过。这里补齐。
    """
    user = await session.scalar(select(User).where(User.username == SEED_USERNAME))
    if user is None:
        user = User(
            username=SEED_USERNAME,
            hashed_password=hash_password(SEED_PASSWORD),
        )
        session.add(user)
        await session.flush()
        print(f"created demo user id={user.id}")

    existing = {
        c.name: c
        for c in (
            await session.scalars(select(Category).where(Category.user_id == user.id))
        ).all()
    }
    for spec in SEED_CATEGORIES:
        if spec["name"] not in existing:
            cat = Category(user_id=user.id, **spec)
            session.add(cat)
            await session.flush()
            existing[spec["name"]] = cat
            print(f"created category {spec['name']}")
    await session.flush()
    return user, {name: c.id for name, c in existing.items()}


async def wipe(session, uid):
    removed = {}
    # 先删子任务再删父任务：tasks.parent_id 自引用，单条 DELETE 在部分
    # PostgreSQL 版本下会因约束检查顺序报错。
    r = await session.execute(
        delete(FocusSession).where(FocusSession.user_id == uid)
    )
    removed["focus_sessions"] = r.rowcount
    r = await session.execute(delete(Record).where(Record.user_id == uid))
    removed["records"] = r.rowcount
    r = await session.execute(
        delete(Task).where(Task.user_id == uid, Task.parent_id.isnot(None))
    )
    sub = r.rowcount
    r = await session.execute(delete(Task).where(Task.user_id == uid))
    removed["tasks"] = sub + r.rowcount
    r = await session.execute(delete(Goal).where(Goal.user_id == uid))
    removed["goals"] = r.rowcount
    r = await session.execute(delete(Template).where(Template.user_id == uid))
    removed["custom_templates"] = r.rowcount
    return removed


async def build(session, uid, cat):
    C_WORK, C_HEALTH, C_STUDY, C_LIFE = (
        cat["工作"], cat["健康"], cat["学习"], cat["生活"],
    )

    # ---------- 目标 ----------
    GOALS = [
        ("Reach v1.0 正式上线", "完成部署链路、补齐文档、跑通端到端验收。", dd(-21), "active", dt(40, 1)),
        ("年度阅读 24 本", "每月两本，重心放在工程实践与认知科学。", date(TODAY.year, 12, 31), "active", dt(60, 1)),
        ("季度跑量 300 公里", "每周至少 4 次，配速稳定在 6'00\" 以内。", dd(-45), "active", dt(50, 1)),
        ("家庭财务体系重构", "统一记账口径，建立年度预算与应急金。", dd(-60), "active", dt(35, 1)),
        ("NAS 家庭服务器搭建", "完成硬件选型、系统安装与容器化服务编排。", dd(10), "done", dt(90, 1)),
    ]
    goal_ids = {}
    for title, desc, dl, st, created in GOALS:
        g = Goal(user_id=uid, title=title, description=desc, deadline=dl,
                 status=st, created_at=created)
        session.add(g)
        await session.flush()
        goal_ids[title] = g.id

    G_LAUNCH = goal_ids["Reach v1.0 正式上线"]
    G_READ = goal_ids["年度阅读 24 本"]
    G_RUN = goal_ids["季度跑量 300 公里"]
    G_MONEY = goal_ids["家庭财务体系重构"]
    G_NAS = goal_ids["NAS 家庭服务器搭建"]

    # ---------- 已完成任务：连续 14 天，制造 streak ----------
    DONE_POOL = [
        ("晨跑 5 公里", C_HEALTH, G_RUN, "normal", "high", "daily"),
        ("核对当日预算流水", C_LIFE, G_MONEY, "low", "normal", "daily"),
        ("阅读 30 页", C_STUDY, G_READ, "low", "high", "daily"),
        ("回复待处理邮件", C_WORK, None, "high", "low", "daily"),
        ("修复线上告警", C_WORK, G_LAUNCH, "urgent", "high", "none"),
        ("整理接口文档", C_WORK, G_LAUNCH, "normal", "high", "none"),
        ("力量训练 40 分钟", C_HEALTH, G_RUN, "normal", "normal", "none"),
        ("复盘本周投入产出", C_LIFE, None, "low", "normal", "weekly"),
        ("代码评审两个 PR", C_WORK, G_LAUNCH, "high", "high", "none"),
        ("整理读书笔记", C_STUDY, G_READ, "low", "normal", "none"),
        ("清理容器镜像缓存", C_WORK, G_NAS, "low", "low", "monthly"),
        ("采购一周食材", C_LIFE, None, "normal", "low", "weekly"),
    ]

    rows = []
    sort_i = 0
    for off in range(14):
        n = 3 if off % 3 else 2
        for k in range(n):
            title, cid, gid, pri, imp, rec = DONE_POOL[(off * 3 + k) % len(DONE_POOL)]
            rows.append(dict(
                title=title, category_id=cid, goal_id=gid, note=None,
                priority=pri, importance=imp, recurrence=rec, status="done",
                due_date=dd(off), due_time=None, sort_order=sort_i,
                created_at=dt(off + 1, 22), completed_at=dt(off, 9 + k * 3, 20),
                parent_key=None, key=f"done-{off}-{k}",
            ))
            sort_i += 1

    # ---------- 待办：覆盖四象限 / 逾期 / 今日 / 未来 / 重复 ----------
    TODO_SPEC = [
        ("补交上季度报销单", C_WORK, None, "urgent", "low", "none", 3, None, "财务系统本周关账，逾期需走特批。"),
        ("联系体检中心改期", C_HEALTH, None, "urgent", "normal", "none", 1, None, None),
        ("发布新版本到 NAS", C_WORK, G_LAUNCH, "urgent", "high", "none", 0, "21:30", "拉取新镜像后确认预置模板补齐。"),
        ("写周报并同步进度", C_WORK, G_LAUNCH, "high", "normal", "weekly", 0, "18:00", None),
        ("晚间拉伸 15 分钟", C_HEALTH, G_RUN, "low", "normal", "daily", 0, "22:00", None),
        ("整理 Q4 预算草案", C_LIFE, G_MONEY, "normal", "high", "none", 2, None, "先拉去年同期数据做基线。"),
        ("读完《数据密集型应用系统设计》第 6 章", C_STUDY, G_READ, "low", "high", "none", 3, None, None),
        ("给父母打电话", C_LIFE, None, "normal", "high", "weekly", 1, "20:00", None),
        ("研究 Alembic 分支合并策略", C_STUDY, G_LAUNCH, "low", "high", "none", 5, None, "为后续多人协作做准备。"),
        ("更换净水器滤芯", C_LIFE, None, "low", "low", "monthly", 7, None, None),
        ("规划半马训练周期", C_HEALTH, G_RUN, "low", "high", "none", 14, None, None),
        ("整理年度照片归档", C_LIFE, G_NAS, "low", "low", "none", None, None, "按年份分目录，传到 NAS 相册。"),
        ("调研前端埋点方案", C_WORK, None, "normal", "normal", "none", None, None, None),
    ]
    for i, (title, cid, gid, pri, imp, rec, doff, dtime, note) in enumerate(TODO_SPEC):
        rows.append(dict(
            title=title, category_id=cid, goal_id=gid, note=note,
            priority=pri, importance=imp, recurrence=rec, status="todo",
            due_date=(dd(doff) if doff is not None else None), due_time=dtime,
            sort_order=sort_i, created_at=dt(min(i + 2, 12), 8), completed_at=None,
            parent_key=None, key=f"todo-{i}",
        ))
        sort_i += 1

    # ---------- 父子任务 ----------
    PARENT_KEY = "parent-launch"
    rows.append(dict(
        title="Reach v1.0 上线检查清单", category_id=C_WORK, goal_id=G_LAUNCH,
        note="上线前逐项确认，全部勾掉才允许切流量。",
        priority="high", importance="high", recurrence="none", status="todo",
        due_date=dd(-2), due_time="12:00", sort_order=sort_i,
        created_at=dt(6, 9), completed_at=None, parent_key=None, key=PARENT_KEY,
    ))
    sort_i += 1

    SUBTASKS = [
        ("确认 alembic 迁移可重复执行", "done", 4),
        ("校验预置模板播种结果", "done", 3),
        ("压测登录与统计接口", "todo", None),
        ("准备回滚镜像与操作手册", "todo", None),
        ("通知家庭成员迁移账号", "todo", None),
    ]
    for i, (title, st, done_off) in enumerate(SUBTASKS):
        rows.append(dict(
            title=title, category_id=C_WORK, goal_id=G_LAUNCH, note=None,
            priority="normal", importance="high", recurrence="none", status=st,
            due_date=dd(-2), due_time=None, sort_order=sort_i,
            created_at=dt(6, 10),
            completed_at=(dt(done_off, 15) if done_off is not None else None),
            parent_key=PARENT_KEY, key=f"sub-{i}",
        ))
        sort_i += 1

    # 两轮写入：先父后子，保证 parent_id 有值可引用
    key_to_id = {}
    for r in [x for x in rows if x["parent_key"] is None]:
        t = Task(user_id=uid, parent_id=None,
                 **{k: v for k, v in r.items() if k not in ("parent_key", "key")})
        session.add(t)
        await session.flush()
        key_to_id[r["key"]] = t.id
    for r in [x for x in rows if x["parent_key"] is not None]:
        t = Task(user_id=uid, parent_id=key_to_id[r["parent_key"]],
                 **{k: v for k, v in r.items() if k not in ("parent_key", "key")})
        session.add(t)
        await session.flush()
        key_to_id[r["key"]] = t.id

    # ---------- 专注记录（番茄钟） ----------
    focus_keys = [k for k in key_to_id if k.startswith("done-")] + [
        "todo-2", "todo-5", "todo-6", "sub-2",
    ]
    focus_n = 0
    for off in range(21):
        for k in range(random.choice([1, 1, 2, 2, 3])):
            tid = key_to_id.get(random.choice(focus_keys))
            if random.random() < 0.15:
                tid = None  # 未关联任务的自由专注
            session.add(FocusSession(
                user_id=uid, task_id=tid,
                minutes=random.choice([15, 25, 25, 25, 45, 50]),
                started_at=dt(off, 8 + k * 4, random.choice([0, 15, 30])),
            ))
            focus_n += 1

    # ---------- 记录：日记 / 工作日志 / 读书笔记 ----------
    RECORDS = [
        (0, "diary", "上线前夜", "【✅ 今天顺利的事】\n- 定位到 lifespan 没挂载的根因，困扰几天的建表问题终于闭环\n- 预置模板补齐方案确认可行\n\n【❌ 今天不太顺的】\n- 在镜像代理上浪费了两个多小时\n\n【🔄 明天换个做法】\n- 遇到「拉不到镜像」先验证 registry 侧 manifest 完整性，别先怀疑网络\n", "闪亮", "复盘,部署", None, None, None, "23:10"),
        (1, "diary", "耐心是一种技能", "反复排查同一个问题时，最容易犯的错是把前面已验证的结论推翻重来。\n今天提醒自己：现象没变不等于修复无效，可能只是下面还压着另一层。\n", "思考", "心态", None, None, None, "22:20"),
        (3, "diary", "久违的长跑", "沿着河堤跑了 12 公里，最后两公里配速还能提起来。\n身体状态比上个月明显好转。\n", "开心", "跑步,健康", None, None, None, "19:40"),
        (5, "diary", "有点累", "连着几天高强度排查，注意力开始涣散。\n晚上早睡，明天换个节奏。\n", "疲惫", "状态", None, None, None, "21:05"),
        (8, "diary", "感恩日记", "【今天值得感谢的三件事】\n1. 家人把晚饭准备好了，省下一小时\n2. 同事主动帮忙复现了那个偶发 bug\n3. 天气很好，午休时晒到了太阳\n", "喜爱", "感恩", None, None, None, "22:00"),
        (12, "diary", "重新开始", "把停了三周的晨跑捡回来了，只跑了 3 公里但心理门槛过了。\n", "加油", "跑步", None, None, None, "07:30"),
        (16, "diary", "低气压的一天", "项目卡在环境问题上，进展为零。\n记录下来是为了提醒自己：这种日子是常态，不是例外。\n", "低落", "工作", None, None, None, "23:30"),
        (19, "diary", "整理书桌", "花了一个下午彻底清理桌面和硬盘。\n环境清爽之后，心里也松了一截。\n", "平静", "生活", None, None, None, "17:20"),
        (0, "worklog", "每日工作日报 · 部署链路收敛", "【今日完成】\n- 定位并修复 FastAPI lifespan 未挂载导致 init_db 从不执行的问题\n- 发布新版本，验证空库自动建表 + 模板播种\n\n【明日计划】\n- NAS 侧升级并确认预置模板\n\n【风险与阻塞】\n- NAS 镜像代理仍不稳定，必要时走离线包\n", None, "部署,复盘", None, None, "Reach", "20:30"),
        (1, "worklog", "每日工作日报 · 镜像仓库修复", "【今日完成】\n- 诊断出 ghcr index 引用的子 manifest 缺失\n- 重建 tag 触发 CI，产物校验通过\n\n【明日计划】\n- 继续排查容器启动不建表\n", None, "CI,镜像", None, None, "Reach", "19:50"),
        (4, "worklog", "周报 · 第 32 周", "【本周进展】\n- 完成后端迁移链路改造\n- 前端记录模块联调通过\n\n【下周计划】\n- 上线验收与文档补齐\n\n【需要支持】\n- 需要一台稳定的构建机\n", None, "周报", None, None, "Reach", "18:00"),
        (7, "worklog", "会议纪要 · 部署方案评审", "【与会】本人、家庭 IT 支援组\n【结论】\n1. 数据库统一用宿主机 PostgreSQL，容器保持无状态\n2. 镜像走 ghcr，NAS 侧 pin 具体版本号而非 latest\n【待办】\n- 输出回滚手册\n", None, "会议,部署", None, None, "Reach", "15:00"),
        (11, "worklog", "每日工作日报 · 数据模型梳理", "【今日完成】\n- 梳理 7 张业务表关系，确认子任务自引用设计\n- 补充统计接口的聚合口径说明\n", None, "设计", None, None, "Reach", "20:10"),
        (15, "worklog", "每日工作日报 · 环境搭建", "【今日完成】\n- NAS 上完成 PostgreSQL 初始化与端口映射\n【阻塞】\n- 容器能起但库里没表，原因待查\n", None, "环境", None, None, "Reach", "21:15"),
        (2, "note", "读书卡片 · 可演进的数据系统", "【原文】\n数据系统的可靠性不是没有故障，而是在故障发生时仍能提供可接受的服务。\n\n【我的理解】\n对应到这次部署：容器能起来但库是空的，属于「看起来正常」的故障，比直接崩溃更危险。\n\n【可以怎么用】\n健康检查不能只看进程存活，要探到数据层。\n", None, "架构,可靠性", "数据密集型应用系统设计", "Martin Kleppmann", None, "22:40"),
        (6, "note", "金句摘抄 · 关于调试", "「调试的本质是缩小可能性空间。」\n\n—— 每次排查前先问：这个假设能被什么实验证伪？\n", None, "调试,方法论", "程序员修炼之道", "Andrew Hunt", None, "23:00"),
        (9, "note", "读书卡片 · 事务与隔离级别", "【原文】\n弱隔离级别下的竞态条件，往往只在高并发时才暴露。\n\n【我的理解】\n单机测试跑通不代表没问题，要构造并发场景。\n\n【可以怎么用】\n给统计接口补一组并发读写用例。\n", None, "数据库,事务", "数据密集型应用系统设计", "Martin Kleppmann", None, "21:30"),
        (13, "note", "读后感 · 《原子习惯》", "【核心观点】\n身份认同先于行为改变：先成为「每天跑步的人」，跑步才会持续。\n\n【触动我的地方】\n之前把晨跑当任务，完成率很低；换成「我是会跑步的人」之后，反而不纠结单日里程了。\n\n【打算怎么做】\n把目标从「跑 300 公里」改写成「每周出门 4 次」。\n", None, "习惯,认知", "原子习惯", "James Clear", None, "20:00"),
        (18, "note", "金句摘抄 · 关于复杂度", "「复杂度守恒：你没有消除它，只是把它挪到了别处。」\n\n—— 用框架屏蔽掉的复杂度，出问题时会加倍还回来。\n", None, "架构", "简约至上", "Giles Colborne", None, "22:15"),
    ]
    for off, rtype, title, content, mood, tags, book, author, project, rtime in RECORDS:
        session.add(Record(
            user_id=uid, type=rtype, title=title, content=content, mood=mood,
            tags=tags, book_title=book, book_author=author, project=project,
            record_date=dd(off), record_time=rtime,
            created_at=dt(off, 21), updated_at=dt(off, 21),
        ))

    # ---------- 用户自定义模板 ----------
    CUSTOM = [
        ("worklog", "部署变更单", "🚀",
         "【变更内容】\n- \n\n【影响范围】\n- \n\n【回滚方案】\n- \n\n【验证清单】\n- [ ] 迁移可重复执行\n- [ ] 关键接口冒烟\n- [ ] 监控无新增告警\n"),
        ("note", "故障复盘（5 Why）", "🔍",
         "【现象】\n\n【时间线】\n- \n\n【5 Why】\n1. 为什么？\n2. 为什么？\n3. 为什么？\n4. 为什么？\n5. 为什么？\n\n【根因】\n\n【改进项】\n- [ ] \n"),
    ]
    for ttype, name, icon, content in CUSTOM:
        session.add(Template(user_id=uid, is_preset=False, type=ttype, name=name,
                             icon=icon, content=content, created_at=dt(10, 9)))

    return len(rows), focus_n, len(RECORDS)


async def summarize(session, uid):
    out = {}
    for name, model in (("goals", Goal), ("tasks", Task),
                        ("records", Record), ("focus_sessions", FocusSession)):
        out[name] = await session.scalar(
            select(func.count()).select_from(model).where(model.user_id == uid)
        )
    out["preset_templates"] = await session.scalar(
        select(func.count()).select_from(Template).where(Template.is_preset.is_(True))
    )
    out["custom_templates"] = await session.scalar(
        select(func.count()).select_from(Template).where(Template.user_id == uid)
    )
    out["focus_minutes"] = await session.scalar(
        select(func.coalesce(func.sum(FocusSession.minutes), 0))
        .where(FocusSession.user_id == uid)
    ) or 0
    return out


async def seed(force=False):
    """返回 True 表示实际写入了数据。"""
    await seed_preset_templates()  # 内置模板幂等补齐（全局）

    async with SessionLocal() as session:
        user, cat = await ensure_demo_user(session)
        await session.commit()

        n_tasks = await session.scalar(
            select(func.count()).select_from(Task).where(Task.user_id == user.id)
        )
        if n_tasks and not force:
            print(f"demo 已有 {n_tasks} 条任务，跳过播种（需重建请加 --force）")
            return False

        if n_tasks:
            removed = await wipe(session, user.id)
            print("清理旧数据:", removed)

        await build(session, user.id, cat)
        await session.commit()

        stats = await summarize(session, user.id)
        print(f"demo user_id = {user.id}")
        for k, v in stats.items():
            print(f"  {k:18s} = {v}")
        print("SEED_OK")
        return True


if __name__ == "__main__":
    asyncio.run(seed(force="--force" in sys.argv))
