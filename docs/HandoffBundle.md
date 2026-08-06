# HandoffBundle · 抵达 · Reach（GoalFlow）App UI 重构

> 说明：早期 `/workspace/landing/index.html` 为需求误读产物（独立落地页），现已按用户澄清转向完整 App 可点击原型。落地页文件可保留作后续营销页参考或弃用。

## 本次交付物

| 文件 | 说明 |
|------|------|
| `/workspace/app-ui/shell.html` | **完整 App 高保真可点击原型**（登录页 + 玻璃侧边栏 + 7 个主页面 + 记录编辑器弹窗） |
| `/workspace/docs/DesignBrief.md` | 修正后的需求文档 |
| `/workspace/docs/DesignSystemManifest.md` | 液态玻璃设计系统 Token 与组件规范 |
| `/workspace/docs/WireframeSpec.md` | 外壳低保真线框与布局变体 |
| `/workspace/docs/QAReport.md` | 五维质量检查报告（完整原型版） |
| `/workspace/docs/PatchLog.md` | 迭代修改记录 |
| `/workspace/docs/SESSION_SUMMARY.md` | 会话上下文与待办 |
| `/workspace/verify_app.py` | Playwright 验证脚本（遍历全部页面 + 编辑器弹窗） |
| `/workspace/app_login.png` / `app_dashboard.png` / `app_records.png` / `app_calendar.png` / `app_matrix.png` / `app_stats.png` / `app_goals.png` / `app_focus.png` / `app_editor.png` | 桌面端验证截图 |
| `/workspace/app_login_m.png` / `app_dashboard_m.png` | 移动端验证截图 |

## 设计系统摘要

- **主色**：蓝 `#2563eb` → 青 `#06b6d4` → 青绿 `#14b8a6`
- **字体**：Sora（标题）/ Plus Jakarta Sans（UI）/ Noto Sans SC（中文）
- **风格**：液态玻璃 — 磨砂半透卡片、浮光 blob、圆角、青蓝渐变
- **交互**：hover 上移 + 阴影、active 微缩、`focus-visible` 青环、`prefers-reduced-motion` 降级
- **图标**：全 SVG line icons，**无 emoji**

## 原型如何查看

```bash
# 本地打开
open /workspace/app-ui/shell.html

# 或本地起服务
python3 -m http.server 8080 --directory /workspace/app-ui
```

原型内点击「登录 →」进入 App；侧边栏各导航可切换全部视图：今日待办、记录（含筛选与编辑器弹窗）、日历、四象限、回顾/数据、专注/番茄钟、我的目标；点击「退出」返回登录页。

## 页面总览

| 页面 | 主要内容 |
|------|---------|
| 登录 | 居中玻璃登录卡、品牌、账号/密码输入 |
| 今日待办 | 统计卡 + 待办列表（可点击完成） |
| 记录 | 类型筛选 chip + 记录卡片列表 + 新建记录编辑器弹窗 |
| 日历 | 月视图 + 农历/节气标签 + 事件点 |
| 四象限 | 2×2 艾森豪威尔矩阵 |
| 我的目标 | 进度卡 + 渐变进度条 |
| 专注 / 番茄钟 | 圆形计时器 + 今日专注列表 |
| 回顾 / 数据 | 统计卡 + 每周完成柱状图 + 记录类型分布 |

## QA 结论

- AI 味检测 0/10；可访问性 / 层级节奏 / 交互状态 / 终检均通过。
- P0 阻塞问题：0 个。
- P2 可选优化：移动端需补导航（抽屉/底栏）；编辑器富文本区可后续接入真实组件。

## 后续建议步骤

1. **审阅完整原型**：确认各页面风格是否符合预期；颜色/圆角/玻璃浓度是否需要微调。
2. **移动端导航方案**：选定抽屉或底栏，补进原型。
3. **接入 React**：将 `DesignSystemManifest` 里的 Token 写入 Tailwind 配置或 CSS 变量，逐步替换 `frontend/src` 现有紫色样式，再重新发布。

## 接入已发布应用

当前前端发布在 `https://a6b47180c33600087.bj6.agentos-app.net`。确认风格后，我可以直接重构 `/workspace/frontend/src` 的 React 组件并重新发布。
