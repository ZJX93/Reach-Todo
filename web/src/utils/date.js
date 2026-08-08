// 本地日期工具：统一使用浏览器本地时区计算"今天"。
// 历史背景：曾用 new Date().toISOString().slice(0,10)（UTC 日期），
// 在 UTC+8 凌晨 0 点~8 点间会把"今天"算成昨天，导致待办/记录日期错位。

function pad(n) {
  return String(n).padStart(2, '0')
}

/** Date 对象 → 本地 YYYY-MM-DD */
export function toYMD(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 今天的本地 YYYY-MM-DD */
export function todayStr() {
  return toYMD(new Date())
}

/** 当前时分 HH:MM */
export function nowHM() {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 年/月/日 → YYYY-MM-DD */
export function ymd(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`
}

/** YYYY-MM-DD → "2026年8月7日 周五" */
export function formatDateCN(ds) {
  const [y, m, d] = ds.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const map = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${y}年${m}月${d}日 ${map[date.getDay()]}`
}

/** 目标日期相对今天的中文描述 */
export function daysFromToday(ds) {
  const [y, m, d] = ds.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target - today) / 86400000)
  if (diff === 0) return '今天'
  if (diff > 0) return `距离今日：${diff} 天后`
  return `距离今日：${Math.abs(diff)} 天前`
}

/** 一年中的第几周（周日为一周起点，与日历展示一致） */
export function weekOfYear(ds) {
  const [y, m, d] = ds.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const one = new Date(y, 0, 1)
  const day = Math.floor((date - one) / 86400000)
  return Math.ceil((day + one.getDay() + 1) / 7)
}

/** 一年中的第几天 */
export function dayOfYear(ds) {
  const [y, m, d] = ds.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const one = new Date(y, 0, 0)
  return Math.floor((date - one) / 86400000)
}

/** 去掉 HTML 标签，取纯文本（用于记录摘要展示） */
export function stripTags(s) {
  return s ? s.replace(/<[^>]+>/g, '') : ''
}
