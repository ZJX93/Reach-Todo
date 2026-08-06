# 抵达 · Reach · 清单分类 + 关联目标 + 农历日历

[![CI](https://github.com/ZJX93/reach-todo/actions/workflows/ci.yml/badge.svg)](https://github.com/ZJX93/reach-todo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/ZJX93/reach-todo)](./LICENSE)
![Python](https://img.shields.io/badge/python-3.11+-blue)
![Node](https://img.shields.io/badge/node-18%2B-green)

## 🎯 项目核心

**抵达 · Reach**（项目代号 **GoalFlow**）是一款围绕「**分块 + 优先级 + 关联目标**」构建的效率工具。它把杂乱的待办拆解为清晰可控的三层结构，让你每天一眼看清：在忙什么、为什么忙、忙得值不值。

- **① 维度分块**：待办按「**工作 / 健康 / 学习 / 生活**」等维度归位，告别大杂烩清单——每个维度各归其位、互不干扰，注意力不再被杂事切碎。
- **② 优先级标注**：每件事都标上优先级，配合紧急度自然形成轻重缓急，先做什么、后做什么一目了然。
- **③ 关联目标**：每件事都可挂到某个长期目标，以 **蓝色文字** 标注——做这件小事时，永远看得见它通向的那个更大的目标。

> 收件箱再大也只是一堆任务；当任务被分块、被排序、被关联到目标，清单才真正变成"你的方向"。

---

## ✨ 功能特性

- **维度分类**：任务按「工作 / 健康 / 学习 / 生活」分块，避免大杂烩列表。
- **优先级 + 重要度**：组合成 **艾森豪威尔四象限**（紧急 / 重要）。
- **关联目标**：任务可挂到某个目标，看板以蓝色文字显示；目标页展示 **完成进度条 / 逾期数**。
- **重复任务**：每天 / 每周 / 每月，完成后自动顺延下一次（月度已修复跨年 bug）。
- **番茄钟专注**：专注计时并自动记录专注时长。
- **周回顾 / 数据看板**：本周完成、连续天数（streak）、专注时长、各维度与目标进展。
- **📅 日历视图**：
  - 公历 + **农历**（初一显示月份，其余显示日）、**节气**、**节日**。
  - **法定节假日 / 调休补班** 标注（休 / 班角标，单元格浅红 / 浅蓝底）。
  - 点击日期查看 **黄历详情**：干支生肖年、星座、宜 / 忌、月相、物候、喜神 / 贵神 / 福神 / 财神方位、当日记录与待办。
  - 农历 / 黄历数据 localStorage 持久化缓存，减少第三方请求；节假日经后端代理按年缓存。

---

## 🧱 技术栈

| 层 | 技术 |
| --- | --- |
| 后端 | FastAPI · SQLAlchemy(async) · SQLite（发布版）/ PostgreSQL（Docker 版） |
| 前端 | React 18 · Vite 5 · Tailwind CSS 4 |
| 认证 | JWT（HS256，多用户数据隔离） |
| 日历数据 | 第三方万年历接口（apihz.cn）+ 节假日接口（jiejiariapi.com，后端代理） |
| 测试 / CI | pytest（17 用例）· GitHub Actions |

---

## 🚀 快速开始

### 方式一：Docker + PostgreSQL（推荐本地开发）

```bash
# 首次会拉镜像 + 构建，稍等
docker compose up -d --build

# 前端：http://localhost:5173
# 后端 API 文档：http://localhost:8000/docs
```

注册即自动预置「工作 / 健康 / 学习 / 生活」四个维度。

### 方式二：发布版（单端口 SQLite，零外部依赖）

```bash
# 后端（单端口 8000 同时托管前端）
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env        # 可选：按需修改
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 前端构建产物已输出到 backend/static（如需自行构建）
cd frontend
npm install
npm run build                  # 产物写入 ../backend/static
```

打开 **http://localhost:8000** 即可（SPA 由后端单端口托管）。

---

## 📄 页面导航

| 页面 | 路由 | 说明 |
| --- | --- | --- |
| 全部待办（按维度） | `/` | 工作 / 健康 / 学习 / 生活 分块列表 |
| 艾森豪威尔四象限 | `/matrix` | 紧急 × 重要 矩阵 |
| 我的目标 | `/goals` | 进度看板、逾期统计 |
| 周回顾 / 数据 | `/stats` | 本周完成、streak、专注时长 |
| 专注 / 番茄钟 | `/focus` | 专注计时 |
| 📅 日历 | `/calendar` | 农历 / 节气 / 节假日 / 黄历详情 |

---

## 🔧 环境变量

复制 `.env.example` 为 `.env` 并按需修改：

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `DATABASE_URL` | 数据库连接；留空用 SQLite（`backend/goalflow.db`） | SQLite |
| `JWT_SECRET` | **生产务必显式设置强随机值**；留空时启动自动生成并持久化到 `.jwt_secret` | 自动生成 |
| `JWT_ALGORITHM` | JWT 算法 | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | token 有效期 | `1440` |
| `CORS_ORIGINS` | 允许的前端源，逗号分隔 | `http://localhost:5173` |
| `SEED_DEMO_ACCOUNT` | 是否播种演示账号 `demo/reach2024` | `1` |

> ⚠️ 未设置 `JWT_SECRET` 时虽会自动生成，但 **任何人拿到该值都可伪造 token**，生产环境请务必显式配置。

---

## 📡 API 概览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/register` · `/api/auth/login` | 注册 / 登录（返回 JWT） |
| GET | `/api/tasks` · `/api/tasks/summary` | 任务列表 / 概览 |
| GET | `/api/goals/board` | 目标看板（单查询聚合） |
| GET | `/api/records/calendar?year&month` | 某月每日记录聚合 |
| GET | `/api/holidays/{year}` | 当年法定节假日 / 调休（后端代理，绕 CORS） |
| GET | `/health` | 健康检查 |

完整接口见后端启动后的 **/docs**（Swagger）或 **/redoc**。

---

## 🛡️ 安全与工程化

针对原仓库的薄弱项做了加固（详见提交历史）：

- **SPA 路径穿越**：改用 `StaticFiles` + catch-all 回退，杜绝 `../` 越权读取。
- **JWT 密钥可伪造**：默认值已移除，未配置时自动生成随机密钥并持久化到 `.jwt_secret`。
- **富文本 XSS**：新增 `nh3` 服务端清洗（`backend/app/sanitize.py`），不再依赖前端过滤。
- **登录 / 注册限流**：内存限速中间件，防暴力破解。
- **输入校验**：枚举 / 长度 / 范围校验（`schemas.py`）。
- **列表分页**：`/api/tasks`、`/api/records` 支持 `limit/offset`。
- **时区统一**：统计全链路使用 UTC，修复 streak 跨凌晨断签。
- **测试 + CI**：17 个 pytest 用例，GitHub Actions 自动运行。

---

## 🗂️ 项目结构

```
backend/        FastAPI 应用（发布版在此单端口托管 frontend/static）
  app/
    main.py        应用入口、SPA 托管、限流中间件
    config.py      配置（含 JWT 自动密钥）
    sanitize.py    服务端 HTML 清洗
    ratelimit.py   登录/注册限速
    routers/       认证、任务、目标、记录、统计、节假日
    schemas.py     请求/响应模型与校验
  static/         前端构建产物（由 frontend 构建生成）
  tests/           pytest 用例
frontend/       React 应用（构建产物输出到 backend/static）
  src/pages/    各页面（含 Calendar.jsx 日历）
  src/api.js     API 客户端（401 自动跳转登录）
.github/        GitHub Actions CI
docker-compose.yml
```

---

## 🧪 开发与测试

```bash
cd backend
pytest                 # 运行 17 个用例

# 或本地起服务（开发）
uvicorn app.main:app --reload --port 8000
```

CI 工作流 `.github/workflows/ci.yml` 在每次 push / PR 自动安装依赖并运行测试。

---

## 📦 部署

- **Docker**：`docker compose up -d --build`，PostgreSQL 数据持久化在卷中。
- **发布版**：按「方式二」构建前端并启动单端口后端，适合轻量自托管 / 演示。

日历农历数据依赖第三方免费接口（apihz.cn），`frontend/src/pages/Calendar.jsx` 顶部 `APIHZ_ID` / `APIHZ_KEY` 默认使用公共测试账号，量大会限频，**生产请替换为自己的账号**（注册 https://www.apihz.cn）。

---

## 📄 许可证

[MIT](./LICENSE) © 2026 ZJX93
