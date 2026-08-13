// 本地日期工具：默认使用浏览器本地时区计算"今天"。
// 历史背景：曾用 new Date().toISOString().slice(0,10)（UTC 日期），
// 在 UTC+8 凌晨 0 点~8 点间会把"今天"算成昨天，导致待办/记录日期错位。
//
// 时区支持：todayStr(tz) / nowHM(tz) / daysFromToday(ds, tz) 均接受可选 IANA 时区名，
// 不传则回落到浏览器本地时区（向后兼容既有调用）。日历、面板、记录编辑器据此按用户设置显示。

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)!.value
}

/** 浏览器本地时区（模块加载时解析一次） */
export const DEFAULT_TZ =
  (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) ||
  'Asia/Shanghai'

/** 指定时区下的"今天" YYYY-MM-DD（用 Intl 取该时区的年月日分量，避免手动换算跨日错误） */
export function todayInTZ(tz: string = DEFAULT_TZ): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const y = part(parts, 'year')
  const m = part(parts, 'month')
  const d = part(parts, 'day')
  return `${y}-${m}-${d}`
}

/** Date 对象 → 本地 YYYY-MM-DD */
export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 今天的 YYYY-MM-DD；可传 tz 按指定时区计算 */
export function todayStr(tz?: string): string {
  return tz ? todayInTZ(tz) : toYMD(new Date())
}

/** 当前时分 HH:MM；可传 tz 按指定时区计算 */
export function nowHM(tz?: string): string {
  if (tz) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date())
    const h = part(parts, 'hour')
    const m = part(parts, 'minute')
    return `${h}:${m}`
  }
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 年/月/日 → YYYY-MM-DD */
export function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`
}

/** YYYY-MM-DD → "2026年8月7日 周五" */
export function formatDateCN(ds: string): string {
  const [y, m, d] = ds.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const map = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${y}年${m}月${d}日 ${map[date.getDay()]}`
}

/** 目标日期相对今天的中文描述；可传 tz 按指定时区的"今天"计算 */
export function daysFromToday(ds: string, tz?: string): string {
  const [y, m, d] = ds.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const todayStrVal = tz ? todayInTZ(tz) : toYMD(new Date())
  const [ty, tm, td] = todayStrVal.split('-').map(Number)
  const today = new Date(ty, tm - 1, td)
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target - today) / 86400000)
  if (diff === 0) return '今天'
  if (diff > 0) return `距离今日：${diff} 天后`
  return `距离今日：${Math.abs(diff)} 天前`
}

/** 一年中的第几周（周日为一周起点，与日历展示一致） */
export function weekOfYear(ds: string): number {
  const [y, m, d] = ds.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const one = new Date(y, 0, 1)
  const day = Math.floor((date - one) / 86400000)
  return Math.ceil((day + one.getDay() + 1) / 7)
}

/** 一年中的第几天 */
export function dayOfYear(ds: string): number {
  const [y, m, d] = ds.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const one = new Date(y, 0, 0)
  return Math.floor((date - one) / 86400000)
}

/** 去掉 HTML 标签，取纯文本（用于记录摘要展示） */
export function stripTags(s: string): string {
  return s ? s.replace(/<[^>]+>/g, '') : ''
}
