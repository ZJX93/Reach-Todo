import { create } from 'zustand'

// 轻量本地设置（仅保存在浏览器 localStorage，不上云）：
// - defaultFocusMinutes: 番茄钟默认时长（15 / 25 / 45 / 60）
// - weekStart: 日历与周回顾的周起始日（'sun' 周日起 / 'mon' 周一起，默认 'sun'）
// - timezone: 应用使用的时区（IANA 名称，如 Asia/Shanghai），影响"今天"判定、日历、时间展示
//
// 选择 localStorage 的原因：偏好是个体体验，跨设备同步反而容易让"自己习惯的设置"
// 在别的设备上变扭；用户量小且主要在 NAS 本地访问，丢失成本极低。如未来需要
// 跨设备同步，再加一个 user_settings 表 + 启动时拉取覆盖即可。

const KEY = 'reach.settings.v1'

// 浏览器当前的本地时区（首次加载解析一次）；用户未手动设置时以此作为默认值，
// 保证从"本地时区"升级到"可配置时区"时行为不变。
const BROWSER_TZ =
  (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) ||
  'Asia/Shanghai'

const DEFAULTS = {
  defaultFocusMinutes: 25,
  weekStart: 'sun', // 'sun' | 'mon'
  timezone: BROWSER_TZ,
  // 农历/节假日数据源：
  // - lunarSource: 'backend' 走后端代理（apihz.cn / jiejiariapi，key 在服务端）
  // - lunarSource: 'custom' 走用户自定义接口（前端直连，需 CORS / 同源）
  lunarSource: 'backend', // 'backend' | 'custom'
  lunarApiBase: '', // 自定义农历接口模板，支持 {date} / {y} / {m} / {d} 占位
  holidayApiBase: '', // 自定义节假日接口模板，支持 {year} 占位
  lunarApiKey: '', // 可选：自定义接口密钥，以 Authorization: Bearer 发送
}

const readSettings = () => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    return { ...DEFAULTS, ...parsed }
  } catch {
    return { ...DEFAULTS }
  }
}

const writeSettings = (s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* quota / private mode → 静默忽略，不阻塞 UI */
  }
}

const useSettingsStore = create((set) => ({
  ...readSettings(),
  setDefaultFocusMinutes: (m) => {
    const next = { ...readSettings(), defaultFocusMinutes: m }
    writeSettings(next)
    set({ defaultFocusMinutes: m })
  },
  setWeekStart: (w) => {
    const next = { ...readSettings(), weekStart: w }
    writeSettings(next)
    set({ weekStart: w })
  },
  setTimezone: (tz) => {
    const next = { ...readSettings(), timezone: tz }
    writeSettings(next)
    set({ timezone: tz })
  },
  // 农历数据源配置：合并写入（支持一次更新多个字段）
  updateLunar: (partial) => {
    const next = { ...readSettings(), ...partial }
    writeSettings(next)
    set(partial)
  },
}))

export default useSettingsStore