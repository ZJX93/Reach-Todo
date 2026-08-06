# DesignSystemManifest · 抵达 · Reach（App 版液态玻璃）

> 复用落地页已验证的蓝→青→青绿液态玻璃基调，扩展为 App 上下文所需的语义色与组件规范。

## 1. 配色 Color

| Token | Hex | 用途 |
|-------|-----|------|
| `--ink` | `#0f172a` | 主文本 |
| `--ink-2` | `#475569` | 次级文本 |
| `--ink-3` | `#94a3b8` | 辅助/占位文本 |
| `--b1` | `#2563eb` | 品牌蓝（主强调） |
| `--b2` | `#06b6d4` | 品牌青（次强调） |
| `--b3` | `#14b8a6` | 品牌青绿（点缀） |
| `--grad` | `linear-gradient(135deg,#2563eb 0%,#06b6d4 55%,#14b8a6 100%)` | 主渐变（按钮/激活/图标） |
| `--glass` | `rgba(255,255,255,.55)` | 玻璃卡片底 |
| `--glass-strong` | `rgba(255,255,255,.72)` | 强玻璃（输入框/弹窗） |
| `--glass-bd` | `rgba(255,255,255,.75)` | 玻璃描边 |
| `--glass-line` | `rgba(15,23,42,.06)` | 玻璃内分隔线 |
| `--danger` | `#ef4444` | 危险/错误（退出 hover、校验） |
| `--warn` | `#f59e0b` | 提醒（临近截止） |
| `--ok` | `#14b8a6` | 完成/成功 |
| `--bg` | `linear-gradient(160deg,#eef6ff 0%,#e6fbff 50%,#ecfdf5 100%)` | 应用背景 |
| `--shadow` | `0 20px 50px -20px rgba(8,145,178,.35)` | 大阴影 |
| `--shadow-sm` | `0 8px 24px -12px rgba(8,145,178,.30)` | 小阴影 |

强调色面积约束：渐变/强调色总面积 < 15% 可见区，仅用于 CTA、激活态、关键数据、选中态。

## 2. 字体 Typography

- display：`"Sora"`（标题、数字、品牌）
- ui：`"Plus Jakarta Sans"`（按钮、导航、正文 UI）
- cjk：`"Noto Sans SC"`（中文正文）
- 字号梯度：12 / 13 / 14 / 15 / 17 / 19 / 22 / 26 / 34 / 56（clamp 用于大标题）
- 字重：400 / 500 / 600 / 700 / 800
- 行高：标题 1.1–1.3，正文 1.6

## 3. 间距 Spacing（8 基）

`--s1:4 --s2:8 --s3:12 --s4:16 --s5:24 --s6:32 --s7:48 --s8:64 --s9:96`

## 4. 圆角 Radius / 阴影

- `--r:24px`（大卡片） `--r-sm:14px`（小卡/输入） `--r-pill:999px`
- 阴影见上；hover 提升用 `--shadow`，过渡 `0.2s ease`

## 5. 背景动效

固定浮光 blob 三枚（蓝/青/青绿，`blur(70px)`，缓慢浮动），`z-index:-1`，`prefers-reduced-motion` 时关闭。

## 6. 组件规范 ComponentSpec

### 6.1 侧边栏 Sidebar
- 容器：左 264px，玻璃面板 `var(--glass)` + `var(--glass-bd)`，圆角 `--r`，内边距 `--s5`
- 品牌区：渐变圆角方块 + 「抵达 · Reach」+ 副标「清单与目标」
- 导航项（`<button>`，全 SVG icon，**禁用 emoji**）：
  - default：透明底，`--ink-2` 文字
  - hover：浅玻璃底 `--glass-2`，轻微位移
  - active：左侧渐变细条 + 文字 `--b1` + 极浅渐变底 `rgba(37,99,235,.08)`
  - focus-visible：青色外环
- 计数徽标：`--ink-3` 小字，右对齐

### 6.2 顶部栏 Topbar
- 标题（Sora 22/700）+ 右侧日期/用户/操作；玻璃底或透明

### 6.3 卡片 Card
- `var(--glass)` + `var(--glass-bd)` + `--r` + `--shadow`，内距 `--s5`
- hover：上移 4px + `--shadow`

### 6.4 按钮 Button
- primary：`--grad` 白字 `--r-pill`；hover 上移+大阴影；active `scale(.98)`；focus-visible 青环；disabled `opacity .5`
- ghost：玻璃底 + 描边；同状态集

### 6.5 输入框 Input
- `var(--glass-strong)` 底 + `var(--glass-bd)` 描边 + `--r-sm`
- focus：边框 `--b2` + 柔和青环
- error：边框 `--danger` + 文字提示（不止颜色）

### 6.6 待办项 TodoItem
- 行布局：复选框（圆/方，done 填渐变 + 勾）｜标题（完成划线 `--ink-3`）｜类目色点｜时间/优先级徽标
- hover：浅玻璃底；active：微缩

### 6.7 登录卡 LoginCard
- 居中玻璃大卡，品牌 + 标题 + 两个输入框（账号/密码）+ primary 登录按钮 + 次要链接

## 7. 状态全集（所有交互元素）
default / hover / active / focus-visible / disabled / loading / error 七态齐备；reduced-motion 降级。
