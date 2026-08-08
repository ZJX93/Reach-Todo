import { create } from 'zustand'

// 轻量本地设置（仅保存在浏览器 localStorage，不上云）：
// - defaultFocusMinutes: 番茄钟默认时长（15 / 25 / 45 / 60）
// - weekStart: 日历与周回顾的周起始日（'sun' 周日起 / 'mon' 周一起，默认 'sun'）
//
// 选择 localStorage 的原因：偏好是个体体验，跨设备同步反而容易让"自己习惯的设置"
// 在别的设备上变扭；用户量小且主要在 NAS 本地访问，丢失成本极低。如未来需要
// 跨设备同步，再加一个 user_settings 表 + 启动时拉取覆盖即可。

const KEY = 'reach.settings.v1'

const DEFAULTS = {
  defaultFocusMinutes: 25,
  weekStart: 'sun', // 'sun' | 'mon'
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
}))

export default useSettingsStore