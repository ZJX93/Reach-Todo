# PatchLog · 抵达 · Reach UI 重构

> 注：Patch #1–#2 属于早期误读为"独立落地页"的产物，保留备查；Patch #3 起为 App 外壳重构主路径。

## Patch #1
- **时间**：2026-08-05
- **位置**：`/workspace/landing/index.html` — 功能卡片/链接节点/Logo
- **修改内容**：emoji 图标 → inline SVG line icons；预览列表 emoji 标签 → 文字标签「读书」「日记」
- **原因**：QA 检测到无意义 emoji 装饰，且截图环境中 emoji 渲染为空白方框
- **关联产物**：`verify_landing.py` 截图验证
- **AI 味复检**：通过

## Patch #2
- **时间**：2026-08-05
- **位置**：`/workspace/landing/index.html` — `.grid-feat`、`.btn`、`<style>` 末尾
- **修改内容**：
  - 功能卡片由 3 列等宽改为 3 列不对称 bento（2+1 / 1+2 / 2+1），移动端恢复单列
  - 按钮补全 `:active` 缩放、`focus-visible` 青环、`:disabled` 样式
  - 新增 `@media (prefers-reduced-motion: reduce)`，关闭 blob 动画与过渡
- **原因**：QA 命中强禁止清单「三列 icon 卡片」；可访问性缺少 reduced-motion 与完整交互状态
- **关联产物**：`verify_landing.py` 截图验证
- **AI 味复检**：通过

## Patch #3
- **时间**：2026-08-05
- **位置**：`/workspace/app-ui/shell.html` — 初始创建
- **修改内容**：建立 App 外壳高保真可点击原型，包含登录页、玻璃侧边栏（SVG icon 替代 emoji）、仪表盘（今日待办统计卡 + 待办列表），蓝→青→青绿新品牌色，删除紫色/靛蓝。
- **原因**：用户澄清需求为「优化重构抵达·Reach 整个 App UI」，先以设计系统+外壳原型交付。
- **关联产物**：`verify_app.py` 截图验证
- **AI 味复检**：通过

## Patch #4
- **时间**：2026-08-05
- **位置**：`/workspace/app-ui/shell.html` — 色彩对比度与可访问性
- **修改内容**：
  - 小字辅助文本统一由 `--ink-3` 提升为 `--ink-2`（登录备注、品牌副标、统计说明、待办时间、计数徽标、退出按钮、已完成标题）
  - 待办复选框添加 `role="button" tabindex="0" aria-label`，并支持 Enter/Space 键盘切换
  - 导航项 active 状态添加 `aria-current="page"`
- **原因**：QA 可访问性审查发现小字对比度偏低；键盘可达性需补全复选框。
- **关联产物**：`verify_app.py` 截图验证
- **AI 味复检**：通过

## Patch #5
- **时间**：2026-08-06
- **位置**：`/workspace/app-ui/shell.html` — 扩展为完整 App 原型
- **修改内容**：
  - 替换 6 个占位 stub：记录（含筛选 + 记录列表 + 新建记录编辑器弹窗）、日历（月视图 + 农历/节气/事件点）、四象限（2×2 优先级矩阵）、我的目标（进度卡）、专注 / 番茄钟（计时器 + 今日专注列表）、回顾 / 数据（统计卡 + 柱状图 + 类型分布）
  - 新增 SVG 关闭图标 symbol
  - 修复导航：把点击事件绑定从 `#nav .nav-item` 改为 `.sidebar .nav-item`，使底部「专注/目标」和维度分类按钮正常切换
- **原因**：按昨日待办 B 推进，把外壳原型扩展为可在侧边栏整页点击浏览的完整 App 原型。
- **关联产物**：`verify_app.py` 遍历全部页面截图
- **AI 味复检**：通过

## Patch #6
- **时间**：2026-08-06
- **位置**：`/workspace/app-ui/shell.html` — 可访问性与交互状态补全
- **修改内容**：
  - 日历星期头、农历文字、四象限时间统一由 `--ink-3` 提升为 `--ink-2`
  - 为筛选 chip、日历翻页按钮、编辑器关闭按钮补全 `:focus-visible` 青环与 `:active` 缩放
  - 更新 `QAReport.md` 与 `SESSION_SUMMARY.md`
- **原因**：新增页面后重新 QA，补齐小字对比度与新增交互元素状态。
- **关联产物**：`verify_app.py` 截图验证
- **AI 味复检**：通过

## Patch #7
- **时间**：2026-08-06
- **位置**：`/workspace/app-ui/shell.html` — 移动端底部导航
- **修改内容**：
  - 新增 `<nav class="mobile-nav">` 底栏（待办/记录/日历/目标/专注），固定底部、玻璃磨砂背景
  - 提取 `switchView(v)` 统一处理侧边栏与底栏视图切换
  - `.main` 在移动端增加 `padding-bottom` 避免内容被底栏遮挡
  - `verify_app.py` 增加移动端底栏点击截图
- **原因**：补齐原型在移动端的可用性，QA P2 优化项。
- **关联产物**：`verify_app.py` 截图验证（`app_mobile_nav.png`）
- **AI 味复检**：通过

## Patch #8
- **时间**：2026-08-06
- **位置**：`/workspace/frontend/src` 全局（设计系统落地到 React）
- **修改内容**：
  - 新增 `src/pages/ui.jsx`：集中设计令牌 `card / cardLg / header / field / btnPrim / btnGhost / pill / gradText` + `NavIcon` + `Icon`（SVG line icon 集：search/clock/cal/pencil/close/chart/flag/flame/plus/check）。
  - 重写 `Layout / BottomNav / Login / TaskCard / TaskForm / RichTextEditor / recordMeta / Dashboard / Matrix / Goals / Focus / Stats / Records / Calendar`（含孤立组件 `RecordEditor / TemplatesManager`）：
    - 移除紫色/靛蓝（violet/indigo/`#6d28d9`/`#8b5cf6`/`#6366f1`），统一蓝→青→青绿；
    - 移除 UI 中的 emoji 装饰，改为 SVG 线性图标或纯文字标签（记录类型/维度/心情均不再渲染 emoji）；
    - 输入框 focus 环改为品牌青 `#06b6d4`；卡片/页头改磨砂玻璃 `bg-white/55 backdrop-blur-[18px] border-white/75`；
    - CTA 沿用 `brand-gradient`；专注计时器 conic 渐变紫→青 `#06b6d4`、数字渐变改为品牌三色；统计数字 `gradText`；四象限强调色重映射（红/蓝/琥珀/灰）以保留语义。
- **原因**：用户确认「重构整个 App UI」并接受了「先原型后改码」建议路径，将液态玻璃设计系统落到 React 实装。
- **关联产物**：`npm run build` 通过（105 modules，无报错）；`smoke_live.py` 登录 + 7 页面 + 移动端全导航通过。
- **AI 味复检**：通过（沿用已通过 QA 的设计系统，0/10）

## Patch #9
- **时间**：2026-08-06
- **位置**：`/workspace/backend/app/database.py`、`/workspace/backend/app/routers/auth.py`、`/workspace/frontend/src/pages/components/Sidebar.jsx`
- **修改内容**：
  - 新用户默认维度种子色：学习 `#8B5CF6`（紫）→ `#06B6D4`（青），契合新品牌；其余维度（工作蓝 / 健康绿 / 生活琥珀）保持不变。
  - 侧边栏 `<aside>` 增加 `className="sidebar"`，便于 E2E 选择器与后续维护。
- **原因**：QA 截图发现「学习」维度仍为紫色点，与新设计系统冲突（种子仅影响新注册用户，存量用户颜色不变）。
- **关联产物**：重新 `npm run build` + 重新发布（同链接）；`smoke_live.py` 复验通过。
- **AI 味复检**：通过
