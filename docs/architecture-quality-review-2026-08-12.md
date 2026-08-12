# 抵达 Reach（ReachTodo）架构与代码质量评审报告

- **评审人**：架构师 Bob（高见远）
- **评审日期**：2026-08-12
- **评审范围**：`server/`（FastAPI，Python）、`web/`（React + JSX）、`android/`（Kotlin MVVM）三端 monorepo
- **评审目标**：在不修改业务源码、不改变现有行为的前提下，识别架构/质量/安全/性能问题，并产出"低风险、最小改动"的本批可实施任务 + 高风险的优先级 backlog（供主理人决策）
- **分支**：`refactor/code-quality-20260812`（未切换、未 push）

---

## 一、总体结论

代码整体工程质量**高于同类个人项目平均水平**，尤其在以下方面做得扎实：

- 鉴权链路完整：所有数据接口均经 `get_current_user` 依赖注入，且每个资源操作都做了**归属校验**（`t.user_id != current.id` 直接 404），不存在越权读写的横向越权漏洞。
- 密码与令牌安全：bcrypt 哈希、JWT 密钥已修复硬编码问题（`config._resolve_jwt_secret` 自动落盘随机密钥，重启仍有效）。
- 富文本 XSS：记录正文 `content` 在服务端 `sanitize_html` 入库前清洗 + 前端 `sanitizeHtml` 展示前二次清洗，双层防护。
- 性能意识到位：列表/统计接口统一用 SQL 聚合（`GROUP BY` / `COUNT`）与分页（`limit/offset` 且上限 500），`list_tasks` 用 `selectinload` 避免 N+1。
- 输入校验规范：Pydantic schema 集中定义枚举与长度/格式约束（如 `due_time` 正则、`username` 正则）。

主要风险集中在**三处安全加固缺口**（静态资源路径穿越、Android 明文流量 + 硬编码内网 IP、缺失安全响应头）以及**跨端重复逻辑**（农历/节假日计算、日期小工具）。前者构成本批任务，后者进 backlog。

---

## 二、问题清单（按维度/严重度）

严重度说明：**P0**=生产可直接被利用的高危；**P1**=需关注、应本批修复的安全/健壮性问题；**P2**=质量/健壮性/可维护性改进；**P3**=可选优化。

### 2.1 安全 / 健壮性

| # | 维度 | 位置 | 严重度 | 问题描述 | 建议 |
|---|------|------|--------|----------|------|
| S1 | 安全 | `server/app/main.py:102-112`（`_spa_catch_all`） | **P1** | 静态托管用 `os.path.join(PUBLIC_DIR, full_path)` 拼接，**未对 `../` 做越界校验**。Starlette 的 `:path` 转换器保留 `..` 段，攻击者可请求 `/../../../etc/passwd` 等读取 `PUBLIC_DIR` 之外任意可读文件（仅在生产 `server/public` 存在时启用，dev 不触发，但 Docker 镜像会触发）。 | 用 `os.path.realpath` 归一化后判断是否在 `PUBLIC_DIR` 内；不在则 `404`。见本批 **T01**。 |
| S2 | 安全 | `android/.../AndroidManifest.xml:18`（`usesCleartextTraffic="true"`）+ `data/remote/RetrofitClient.kt:55`（默认 `http://192.168.9.3:8000`） | **P1** | 应用全局允许明文 HTTP，且默认服务器地址硬编码为开发者**内网 IP**（`192.168.9.3:8000`）。若用户部署到该地址，Bearer 令牌经明文 HTTP 传输，可被中间人截获。 | 用 `network_security_config.xml` 将明文限定到 debug/指定域；release 禁明文；默认地址改为 `https://` 占位并从配置读取。见本批 **T02**。 |
| S3 | 安全 | `server/app/main.py:64-70`（CORS）+ 全站 | **P2** | 缺少安全响应头：`Content-Security-Policy`、`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Referrer-Policy`。单体托管 SPA 时存在点击劫持/ MIME 嗅探风险；CORS `allow_credentials=True`，生产若误配 `CORS_ORIGINS=*`（通配 + 凭据非法且危险）需避免。 | 新增 `SecurityHeadersMiddleware` 统一注入响应头；文档化生产必须显式设置 `CORS_ORIGINS`（不可为 `*`）。见本批 **T03**。 |
| S4 | 安全 | `server/app/routers/export.py:47-97`（CSV 导出） | **P2** | CSV 注入：任务 `title`/`note` 等单元格若以 `= + - @` 开头，Excel 会当作公式执行（如 `=cmd|...`）。 | 对首字符为 `= + - @` 的单元格前置 `\t` 或 `'` 转义。见本批 **T05**。 |
| S5 | 安全 | `server/app/routers/lunar.py:16-45`、`holidays.py:10-37` | **P2** | 两个代理接口**无鉴权、无按 IP 限频**，且 lunar 使用默认公共测试账号（`APIHZ_ID/KEY=88888888`，`config.py:82-83`）代理外部 API；`holidays` 的 `year` 参数无范围校验（可传 `0`/`99999` 触发外部请求）。依赖第三方公共账号存在限频/暴露风险。 | 给 `year` 加 `Query(ge=1900, le=2100)`；考虑生产自建节假日数据、申请独立万年历账号；必要时加最小限频（见 backlog B4）。 |
| S6 | 健壮性 | `server/app/deps.py:29`（`int(user_id)`） | **P2** | `payload.get("sub")` 若非数字（理论上不会发生，因 `create_access_token` 恒传 int），`int()` 抛 `ValueError` 未被 `JWTError` 捕获，会返回 500 而非 401。 | 用 `try/except (JWTError, ValueError)` 统一为 401；或显式校验 `sub` 为整数。 |
| S7 | 健壮性 | `server/app/routers/holidays.py:26-29`、`lunar.py:38-39` | **P2** | 异常信息直接拼入 `HTTPException(detail=...)` 回传给客户端（如 `无法获取万年历数据: <exc>`），可能泄露内部细节。 | 对外仅返回通用错误，详细异常仅 `logger.exception` 落日志。 |
| S8 | 安全 | `android/util/AppUpdater.kt:196-243` | **P2** | 应用内更新从 GitHub Release 下载 APK 后**未校验文件哈希/签名**即安装。虽为自有仓库，但若仓库或 CDN 被篡改可植入恶意 APK（供应链风险）。 | 下载后比对 Release asset 的 `browser_download_url` 对应的 SHA256（GitHub API 不返回，可在自有清单中提供）；至少校验文件大小与最小版本。 |

### 2.2 性能

| # | 维度 | 位置 | 严重度 | 问题描述 | 建议 |
|---|------|------|--------|----------|------|
| P1 | 性能 | `server/app/scheduler.py:48-59`（`_tick`） | **P2** | 每分钟全表扫描 `status=todo` 且 `due_date` 非空且 `reminder_sent_at` 为空的**全部任务**（无索引提示）。数据量大时每次 tick 全表扫。 | 为 `(status, due_date, reminder_sent_at)` 建复合索引；或仅取 `due_date` 在窗口内的行。属索引优化，低风险，可进 backlog。 |
| P2 | 性能 | `server/app/routers/stats.py:53-67`（streak） | **P3** | 连续天数用 Python 逐日回溯 `done_dates` 集合，最坏逐天回退。数据量级小，当前可接受；若历史记录极多可改 SQL 窗口函数。 | 保持现状，仅记录观察。 |

> 总体性能良好：列表接口均有 `limit/offset` 分页（上限 500），统计走聚合 SQL，未发现有 N+1 或全量加载问题（除上面 tick 全表扫外）。

### 2.3 结构 / 可读 / DRY

| # | 维度 | 位置 | 严重度 | 问题描述 | 建议 |
|---|------|------|--------|----------|------|
| D1 | 跨端 DRY | `android/.../util/LunarUtils.kt`（约 376 行离线算法）、`web/src/services/lunar.js`、`server/app/routers/lunar.py` | **P2（高工作量）** | 农历/节气/黄历/节假日逻辑**三端各实现一套**：Android 完整离线计算；web/后端依赖外部 API（apihz/vvhan）。节日表、生肖映射、`dayOfYear`/`weekOfYear` 在 `web/src/utils/date.js` 与 `LunarUtils.kt` 中**重复且注释自认"与 web 一致"**（`LunarUtils.kt:319,325`）。算法口径不一致会导致三端展示细微差异。 | 见 backlog **B1**（跨语言 DRY，高工作量，建议/待确认）。 |
| D2 | DRY | `web/src/pages/recordMeta.js:25-52`（`sanitizeHtml`）vs `server/app/sanitize.py` | **P2** | 富文本清洗规则（允许标签/属性）在前后端**各维护一份**，规则不同步就会一边放行一边拦截。 | 前端改写为仅做"展示前兜底"，以服务端 `sanitize.py` 的 `ALLOWED_TAGS/ATTRIBUTES` 为唯一真相源（可考虑后端把规则随配置下发）。进 backlog B2。 |
| D3 | 结构 | `server/app/models.py`（235 行，单文件）、`server/app/schemas.py`（271 行） | **P3** | 单文件偏大但尚可维护；若后续模型增长可拆分。 | 进 backlog B3，**本批不做**。 |
| D4 | 一致性 | `server/app/scheduler.py:50`（`datetime.now()` 朴素）vs 其他处 `datetime.now(timezone.utc)` | **P2** | 调度器用朴素 `now`，而 `reminder_sent_at` 在 `tasks.py:219` 用 tz-aware；两者混存。当前因 `due_date` 为纯 date 且 SQLite 以字符串存储，实际未出问题，但存在时区隐患。 | 统一使用 `datetime.now(timezone.utc)`；属健壮性，可与 B1 一并处理。 |
| D5 | 代码质量 | `web/eslint.config.js`：`no-unused-vars` 设为 `warn` | **P2** | 存在未使用变量/导入仅告警未阻断，长期积累影响整洁。 | 本批 **T04**：跑 `npm run lint` 清零 error 级（含 rules-of-hooks），逐步收敛 unused 为 error。 |

### 2.4 配置 / 密钥管理

| # | 维度 | 位置 | 严重度 | 问题描述 | 建议 |
|---|------|------|--------|----------|------|
| C1 | 配置 | `server/app/config.py` | **P2（已较好）** | JWT 密钥已修复（自动落盘随机值）；FCM/万年历凭证均走环境变量；`.env.example` 完整。**遗留**：万年历默认公共测试账号、未强制生产设置 `JWT_SECRET`。 | 文档化：生产必须设 `JWT_SECRET` + 独立万年历账号；可用 CI 检查缺失即失败。 |
| C2 | 配置 | `android/.../data/remote/RetrofitClient.kt:55` | **P2** | 默认后端地址硬编码内网 IP。 | 见 T02。 |

---

## 三、优先级 Backlog（高风险 / 大改动，**建议 / 待确认**，不纳入本批）

> 以下项工作量或风险较高，**不强制本批实施**，供主理人评审后排期。

- **B1（最高优先 · 跨端 DRY）**：统一农历 / 节假日计算逻辑。
  方案 A（推荐，降外部依赖）：将 Android `LunarUtils.kt` 的离线算法抽为**独立可复用库 / 后端标准接口**（`/api/lunar` 改为本地计算而非代理 apihz），前端与 Android 统一消费后端结果，彻底去掉对第三方公共账号的依赖与三端算法分歧。
  方案 B：保留各端离线实现，但将"节日表 / 生肖映射 / `dayOfYear` / `weekOfYear`"等小工具抽为**共享常量 + 各端单测对照表**，用同一份测试向量保证口径一致。
  风险：改动面大（3 端 + 测试），需回归日历/黄历展示。**待确认**。

- **B2**：富文本清洗规则单一真相源（前后端规则同步）。**待确认**。

- **B3**：`models.py` / `schemas.py` 按领域拆分（user/task/record/...）。**待确认**，非紧急。

- **B4**：限速中间件升级为 Redis 等共享存储，并覆盖 `change_password` 等接口；lunar/holidays 代理加鉴权或限频。**待确认**（多实例部署才必需）。

- **B5**：web 端 **JSX → TypeScript** 迁移（约 5.1k 行，去类型隐患）。**待确认**，大改动，本批不做。

- **B6**：`scheduler` 全表扫改为索引/窗口查询（见 P1）。**待确认**。

---

## 四、本批可实施优化任务（≤5，低风险、最小改动、保留现有行为）

> 约束：仅做安全加固 / 输入校验 / 配置收敛 / lint 清零，**不拆分 models、不做跨语言 DRY、不做 JS→TS**。每项均附回归测试或明确的"行为不变"说明。

### T01 — 修复 SPA 静态文件托管路径穿越　【P1 · 安全】

- **涉及文件（server 模块）**：
  1. `server/app/main.py`（`_spa_catch_all`：归一化 `candidate = os.path.realpath(...)`，断言其 `startswith(PUBLIC_DIR)`，否则 `404`）
  2. `server/app/config.py`（将 `PUBLIC_DIR` 暴露为可复用常量，避免重复拼接路径）
  3. `server/tests/test_static_serving.py`（**新增**回归测试：请求 `/../<repo 外文件>` 必须 404；正常静态资源正常返回）
- **依赖**：无
- **优先级**：P1
- **最小改动**：仅修改 catch-all 处理函数与新增测试；正常文件服务能力完全不变。
- **验证**：`pytest server/tests/test_static_serving.py`；手动 `curl /index.html` 仍 200。

### T02 — Android 收紧明文流量并修正默认服务器地址　【P1 · 安全】

- **涉及文件（android 模块）**：
  1. `android/app/src/main/AndroidManifest.xml`（移除全局 `android:usesCleartextTraffic="true"`，改由 network security config 限定）
  2. `android/app/src/main/res/xml/network_security_config.xml`（**新增**：debug 仅允许 `localhost`/指定域明文；release 禁止明文）
  3. `android/app/src/main/java/com/zjx93/reach/data/remote/RetrofitClient.kt`（默认地址由硬编码 `http://192.168.9.3:8000` 改为 `https://` 占位，并从 `res/values` 或 `UserPrefs` 读取；空白时不再回退到该内网 IP）
- **依赖**：无
- **优先级**：P1
- **最小改动**：纯配置 + 默认字符串；不改变已配置用户的连接行为（用户显式填 `http://` 仍可在 debug 下工作）。
- **验证**：debug 包连内网 http 可用；release 包明文请求被系统拒绝；已登录用户 Token 不再经明文泄漏。

### T03 — 后端补充安全响应头中间件　【P2 · 安全】

- **涉及文件（server 模块）**：
  1. `server/app/security_headers.py`（**新增** `SecurityHeadersMiddleware`：`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Referrer-Policy: no-referrer`、`Content-Security-Policy`（单体托管 SPA 的保守策略））
  2. `server/app/main.py`（`app.add_middleware(SecurityHeadersMiddleware)`）
  3. `server/tests/test_security_headers.py`（**新增**：断言上述响应头存在）
- **依赖**：与 T01 都改 `main.py`，**建议先于或与 T01 同 PR 顺序处理**（改动位置不冲突）。
- **优先级**：P2
- **最小改动**：仅注入响应头，不修改任何业务逻辑与响应体。
- **验证**：`pytest server/tests/test_security_headers.py`；接口功能与响应体不变。

### T04 — 前端运行 ESLint 并清零 error 级问题　【P2 · 质量】

- **涉及文件（web 模块）**：
  1. `web/eslint.config.js`（确认 `no-unused-vars` 维持 `warn`，`rules-of-hooks` 维持 `error`；如需可把 `no-unused-vars` 暂升 `error`）
  2. `web/src/**` 中实际产生 `error` 级告警的文件（运行 `npm run lint` 后确定，典型如未使用导入/变量；逐一清理，**不改动逻辑**）
  3. `web/package.json`（已有 `lint` / `lint:fix` 脚本，作为本任务执行入口）
- **依赖**：需 `npm install`（拉取 devDependencies）
- **优先级**：P2
- **最小改动**：仅删除/修正未使用符号、补 `@ts`-无关的小修；不改变任何运行时行为。
- **验证**：`npm run lint` 退出码 0（无 error 级问题）。

### T05 — 导出 CSV 公式注入防护　【P2 · 安全】

- **涉及文件（server 模块）**：
  1. `server/app/routers/export.py`（`csv.writerow` 前对字符串单元格首字符为 `= + - @` 的，前置 `\t` 转义，或用 `=` 包裹为公式文本）
  2. `server/tests/test_export_csv.py`（**新增**：构造以 `=` 开头的 title，断言导出 CSV 中已被转义）
  3. `server/app/main.py`（无代码改动，作为回归范围参照；若需统一转义工具可放 `server/app/sanitize.py` 新增 `safe_csv_cell`——**可选**）
- **依赖**：无
- **优先级**：P2
- **最小改动**：仅影响 CSV 单元格文本前缀；JSON 导出与接口行为完全不变。
- **验证**：`pytest server/tests/test_export_csv.py`；用 Excel 打开导出文件不再触发公式执行。

---

## 五、交付说明

- 本报告仅记录评审结论与任务分解，**未修改任何业务源码**（主理人转交工程师后，由工程师按本批 T01–T05 实施）。
- 本批 5 个任务均为**低风险、最小改动、保留现有行为**；高风险项（跨端 DRY、JS→TS、models 拆分、限速升级）已列入第三节 backlog，标注为"建议/待确认"，待主理人评审排期。
- 建议实施顺序：T01 + T03（同改 `main.py`，可同 PR）→ T02（Android）→ T05（server export）→ T04（web lint）。回归以各任务附带的**新增测试**为准。
