import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api.js'
import Layout from './Layout.jsx'
import { RECORD_TYPES, typeMeta } from './recordMeta.js'
import { card, btnGhost, Icon } from './ui.jsx'

const WEEK = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}月` }))

function pad(n) {
  return String(n).padStart(2, '0')
}
function ymd(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`
}
function formatDateCN(ds) {
  const [y, m, d] = ds.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const map = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${y}年${m}月${d}日 ${map[date.getDay()]}`
}
function daysFromToday(ds) {
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
function weekOfYear(ds) {
  const [y, m, d] = ds.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const one = new Date(y, 0, 1)
  const day = Math.floor((date - one) / 86400000)
  return Math.ceil((day + one.getDay() + 1) / 7)
}
function dayOfYear(ds) {
  const [y, m, d] = ds.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const one = new Date(y, 0, 0)
  return Math.floor((date - one) / 86400000)
}

// —— 农历 / 节气：对接第三方免费接口（腾讯云推荐「接口盒子」万年历 API）——
const APIHZ_ID = '88888888'
const APIHZ_KEY = '88888888'

const LUNAR_CACHE_KEY = 'reach_lunar_cache_v4'

function loadLunarCache() {
  try {
    const obj = JSON.parse(localStorage.getItem(LUNAR_CACHE_KEY) || '{}')
    for (const k of Object.keys(obj)) if (obj[k] && obj[k].__p) delete obj[k]
    return obj
  } catch {
    return {}
  }
}
function persistLunarCache() {
  try {
    localStorage.setItem(LUNAR_CACHE_KEY, JSON.stringify(lunarCache))
  } catch {
    /* 超出配额则忽略 */
  }
}

const lunarCache = loadLunarCache()

function parseApizh(j) {
  if (j && j.code === 200) {
    const nyue = j.nyue || ''
    const nri = j.nri || ''
    const jieqi = j.jieqi || ''
    const jqDays = String(j.JIEQIDAYS || '')
    const isTermDay = jqDays === '1'
    const festival = j.jieri || ''
    const term = isTermDay ? jieqi : ''
    const lunar = nri === '初一' ? nyue : nri
    // 物候取后半段，如 "寒露 初候鸿雁来宾" → "鸿雁来宾"
    const wuhou = (j.WUHOU || '').split(' ').pop() || ''
    return {
      lunar,
      term,
      festival,
      lunarYear: j.nnian || '',
      lunarMonth: nyue,
      lunarDay: nri,
      ganzhiYear: j.YEARGANZHI || j.ganzhinian || '',
      shengxiao: j.DAYSHENGXIAO || j.shengxiao || '',
      yearShengxiao: shengxiaoFromGanzhi(j.YEARGANZHI || j.ganzhinian),
      xingzuo: j.xingzuo || '',
      yi: (j.yi || '').split('|').filter(Boolean),
      ji: (j.ji || '').split('|').filter(Boolean),
      yuexiang: j.YUEXIANG || '',
      wuhou,
      xi: j.DAYPOSITIONXI || '',
      yanggui: j.DAYPOSITIONYANGGUI || '',
      yingui: j.DAYPOSITIONYINGUI || '',
      fu: j.DAYPOSITIONFU || '',
      cai: j.DAYPOSITIONCAI || '',
      daysOfYear: j.DAYSINYEAR || '',
      weekOfYear: j.YLWEEKNOY || '',
    }
  }
  return null
}
function parseVvhan(j) {
  if (j && j.code === 1 && j.data) {
    return {
      lunar: (j.data.lunarMonth || '') + (j.data.lunarDay || ''),
      term: j.data.solarTerms || '',
      festival: '',
      lunarYear: '', lunarMonth: '', lunarDay: '',
      ganzhiYear: '', shengxiao: '', yearShengxiao: '', xingzuo: '',
      yi: [], ji: [], yuexiang: '', wuhou: '',
      xi: '', yanggui: '', yingui: '', fu: '', cai: '',
      daysOfYear: '', weekOfYear: '',
    }
  }
  return null
}

async function fetchLunar(dateStr) {
  const cached = lunarCache[dateStr]
  if (cached && !cached.__p) return cached
  if (cached && cached.__p) return cached
  lunarCache[dateStr] = {
      lunar: '', term: '', festival: '', lunarYear: '', lunarMonth: '', lunarDay: '',
      ganzhiYear: '', shengxiao: '', yearShengxiao: '', xingzuo: '', yi: [], ji: [], yuexiang: '', wuhou: '',
      xi: '', yanggui: '', yingui: '', fu: '', cai: '', daysOfYear: '', weekOfYear: '', __p: true,
  }
  const [y, m, d] = dateStr.split('-').map(Number)
  const sources = [
    `https://cn.apihz.cn/api/time/getzdday.php?id=${APIHZ_ID}&key=${APIHZ_KEY}&nian=${y}&yue=${m}&ri=${d}`,
    `https://api.vvhan.com/api/lunar?date=${dateStr}`,
    'https://api.allorigins.win/raw?url=' + encodeURIComponent(`https://api.vvhan.com/api/lunar?date=${dateStr}`),
  ]
  let res = null
  for (const url of sources) {
    try {
      const r = await fetch(url)
      const j = await r.json()
      res = url.includes('apihz') ? parseApizh(j) : parseVvhan(j)
      if (res && (res.lunar || res.term || res.festival)) break
    } catch (e) {
      /* 尝试下一个数据源 */
    }
  }
  if (res) {
    res.__p = false
    lunarCache[dateStr] = res
    persistLunarCache()
  } else {
    delete lunarCache[dateStr]
  }
  return lunarCache[dateStr] || { lunar: '', term: '', festival: '' }
}

async function fetchAllLunar(dateStrs, limit = 3) {
  let i = 0
  const worker = async () => {
    while (i < dateStrs.length) {
      const ds = dateStrs[i++]
      await fetchLunar(ds)
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
}

// —— 休假 / 补班：节假日安排接口 ——
const HOLIDAY_CACHE_KEY = 'reach_holiday_cache_v1'

function loadHolidayCache() {
  try {
    return JSON.parse(localStorage.getItem(HOLIDAY_CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}
function persistHolidayCache(obj) {
  try {
    localStorage.setItem(HOLIDAY_CACHE_KEY, JSON.stringify(obj))
  } catch {
    /* 忽略 */
  }
}
const holidayCache = loadHolidayCache()

async function fetchHolidayYear(year) {
  if (holidayCache[year]) return holidayCache[year]
  try {
    const r = await fetch(`/api/holidays/${year}`)
    const data = await r.json()
    const map = {}
    for (const [k, v] of Object.entries(data)) {
      map[k] = { name: v.name || '', isOffDay: !!v.isOffDay }
    }
    holidayCache[year] = map
    persistHolidayCache(holidayCache)
    return map
  } catch (e) {
    return {}
  }
}

function stripTags(s) {
  return s ? s.replace(/<[^>]+>/g, '') : ''
}

// 由年干支推导年生肖（apihz 返回的 DAYSHENGXIAO 是日生肖，年生肖需从年干支地支对应）
function shengxiaoFromGanzhi(gz) {
  if (!gz) return ''
  const map = {
    子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇',
    午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪',
  }
  const zhi = String(gz).slice(-1)
  return map[zhi] || ''
}

export default function Calendar() {
  const now = new Date()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [days, setDays] = useState({})
  const [tasks, setTasks] = useState([])
  const [summary, setSummary] = useState(null)
  const [selected, setSelected] = useState(ymd(now.getFullYear(), now.getMonth() + 1, now.getDate()))
  const [loading, setLoading] = useState(true)
  const [holidays, setHolidays] = useState({})
  const [, setLunarTick] = useState(0)

  useEffect(() => {
    const d = searchParams.get('date')
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setSelected(d)
      setYear(+d.slice(0, 4))
      setMonth(+d.slice(5, 7))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const [cal, allTasks, s] = await Promise.all([
        api.get(`/records/calendar?year=${year}&month=${month}`),
        api.get('/tasks'),
        api.get('/tasks/summary'),
      ])
      const m = {}
      cal.data.forEach((d) => (m[d.date] = d))
      setDays(m)
      setTasks(allTasks.data)
      setSummary(s.data)
      setLoading(false)

      fetchHolidayYear(year).then(setHolidays)

      const first = new Date(year, month - 1, 1)
      const offset = first.getDay() // 周日为起点
      const startD = new Date(year, month - 1, 1 - offset)
      const dateStrs = []
      for (let i = 0; i < 42; i++) {
        const dt = new Date(startD)
        dt.setDate(startD.getDate() + i)
        dateStrs.push(ymd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()))
      }
      await fetchAllLunar(dateStrs)
      setLunarTick((t) => t + 1)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  const first = new Date(year, month - 1, 1)
  const offset = first.getDay()
  const start = new Date(year, month - 1, 1 - offset)
  const cells = []
  for (let i = 0; i < 42; i++) {
    const dt = new Date(start)
    dt.setDate(start.getDate() + i)
    cells.push(dt)
  }

  const [recordsForDay, setRecordsForDay] = useState([])
  const tasksForDay = useMemo(
    () => tasks.filter((t) => t.due_date === selected),
    [tasks, selected],
  )

  useEffect(() => {
    ;(async () => {
      const r = await api.get(`/records?date=${selected}`)
      setRecordsForDay(r.data)
    })()
  }, [selected])

  const shift = (delta) => {
    let m = month + delta
    let y = year
    if (m < 1) {
      m = 12
      y--
    } else if (m > 12) {
      m = 1
      y++
    }
    setMonth(m)
    setYear(y)
  }

  const goToday = () => {
    const t = new Date()
    setYear(t.getFullYear())
    setMonth(t.getMonth() + 1)
    setSelected(ymd(t.getFullYear(), t.getMonth() + 1, t.getDate()))
  }

  const selectedLunar = lunarCache[selected] || { lunar: '', term: '', festival: '' }
  const selectedHoliday = holidays[selected]

  return (
    <Layout summary={summary} selected="calendar" onSelect={() => {}}>
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {/* 顶部控制栏 */}
        <header className="sticky top-0 z-10 bg-white/55 backdrop-blur-[18px] border-b border-white/75 px-5 md:px-7 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-[#0f172a] font-display">日历</h1>
              <p className="text-xs text-[#475569]">{daysFromToday(selected)}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1900}
                max={2100}
                value={year}
                onChange={(e) => setYear(Math.max(1900, Math.min(2100, Number(e.target.value) || year)))}
                className="w-24 border border-white/75 rounded-lg px-2 py-1.5 text-sm bg-white/70 text-[#0f172a] focus:border-[#06b6d4] focus:ring-2 focus:ring-[#06b6d4]/20 transition text-center"
              />
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="border border-white/75 rounded-lg px-2 py-1.5 text-sm bg-white/70 text-[#0f172a] focus:border-[#06b6d4] focus:ring-2 focus:ring-[#06b6d4]/20 transition"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center bg-white/70 border border-white/75 rounded-lg overflow-hidden">
                <button
                  onClick={() => shift(-1)}
                  className="w-8 h-8 flex items-center justify-center text-[#475569] hover:bg-white/60 transition"
                >
                  ‹
                </button>
                <button
                  onClick={goToday}
                  className="h-8 px-2.5 text-xs font-semibold text-[#06b6d4] hover:bg-white/60 transition border-x border-white/75"
                >
                  今
                </button>
                <button
                  onClick={() => shift(1)}
                  className="w-8 h-8 flex items-center justify-center text-[#475569] hover:bg-white/60 transition"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto p-4 md:p-6 grid lg:grid-cols-[1fr_360px] gap-4">
          {/* 月历 */}
          <div className={`${card} p-4 md:p-5 relative overflow-hidden`}>
            {/* 大月份水印 */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
              <span className="text-[480px] font-black text-[#94a3b8]/[0.12] leading-none">{month}</span>
            </div>

            {/* 星期表头 */}
            <div className="relative grid grid-cols-7 text-center text-sm font-medium text-[#64748b] mb-2">
              {WEEK.map((w, idx) => (
                <div key={w} className={`py-2 ${idx === 0 || idx === 6 ? 'text-[#ef4444]' : ''}`}>
                  {w}
                </div>
              ))}
            </div>

            {/* 日期格子 */}
            <div className="relative grid grid-cols-7 gap-1 md:gap-2">
              {cells.map((dt, i) => {
                const ds = ymd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
                const inMonth = dt.getMonth() + 1 === month
                const d = days[ds]
                const L = lunarCache[ds] || {
                  lunar: '', term: '', festival: '', lunarYear: '', lunarMonth: '', lunarDay: '',
                  ganzhiYear: '', shengxiao: '', yearShengxiao: '', xingzuo: '', yi: [], ji: [], yuexiang: '', wuhou: '',
                  xi: '', yanggui: '', yingui: '', fu: '', cai: '', daysOfYear: '', weekOfYear: '',
                }
                const hd = holidays[ds]
                const isSel = ds === selected
                const isToday = ds === ymd(now.getFullYear(), now.getMonth() + 1, now.getDate())
                const dayOfWeek = dt.getDay()
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                const isLegalHoliday = hd && hd.isOffDay === true
                const isWorkDay = hd && hd.isOffDay === false
                const termOrFestival = L.term || L.festival || hd?.name || ''

                return (
                  <button
                    key={i}
                    onClick={() => setSelected(ds)}
                    className={`relative min-h-[90px] md:min-h-[110px] rounded-xl md:rounded-2xl flex flex-col items-start p-2 md:p-2.5 transition text-left ${
                      isSel
                        ? 'bg-[#2563eb] text-white shadow-lg shadow-[#2563eb]/25'
                        : isLegalHoliday
                          ? 'bg-[#fef2f2] hover:bg-[#fee2e2]'
                          : isWorkDay
                            ? 'bg-[#eff6ff] hover:bg-[#dbeafe]'
                            : inMonth
                              ? 'bg-white/60 hover:bg-white/90'
                              : 'bg-transparent opacity-35'
                    }`}
                  >
                    {/* 休 / 班 角标 */}
                    {hd && hd.isOffDay && (
                      <span className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold bg-[#ef4444] text-white">
                        休
                      </span>
                    )}
                    {hd && hd.isOffDay === false && (
                      <span className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold bg-[#2563eb] text-white">
                        班
                      </span>
                    )}

                    {/* 公历日期 */}
                    <span
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold ${
                        isSel
                          ? 'bg-white text-[#2563eb]'
                          : isToday
                            ? 'bg-[#2563eb] text-white'
                            : isWeekend || isLegalHoliday
                              ? 'text-[#ef4444]'
                              : 'text-[#1e293b]'
                      }`}
                    >
                      {dt.getDate()}
                    </span>

                    {/* 农历 */}
                    {L.lunar && (
                      <span className={`text-xs mt-1 ${isSel ? 'text-white/90' : 'text-[#64748b]'}`}>
                        {L.lunar}
                      </span>
                    )}

                    {/* 节气 / 节日 / 节假日名称 */}
                    {termOrFestival && (
                      <span
                        className={`text-[10px] mt-0.5 truncate max-w-full ${
                          isSel
                            ? 'text-white/95'
                            : L.term
                              ? 'text-[#2563eb]'
                              : isLegalHoliday
                                ? 'text-[#ef4444]'
                                : 'text-[#0ea5e9]'
                        }`}
                      >
                        {termOrFestival}
                      </span>
                    )}

                    {/* 记录/任务小点 */}
                    <span className="flex gap-1 mt-auto pt-1">
                      {d?.diary > 0 && (
                        <i
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: RECORD_TYPES.diary.color }}
                        />
                      )}
                      {d?.worklog > 0 && (
                        <i
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: RECORD_TYPES.worklog.color }}
                        />
                      )}
                      {d?.note > 0 && (
                        <i
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: RECORD_TYPES.note.color }}
                        />
                      )}
                      {d?.tasks > 0 && (
                        <i className="w-1.5 h-1.5 rounded-full bg-[#94a3b8]" />
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 右侧详情 */}
          <div className="space-y-4">
            {/* 日期卡片 */}
            <div className={`${card} p-5`}>
              <div className="text-sm text-[#64748b] text-center">{formatDateCN(selected)}</div>
              <div className="flex items-center justify-center mt-2">
                <div className="w-20 h-20 rounded-2xl bg-[#2563eb] text-white flex flex-col items-center justify-center shadow-lg shadow-[#2563eb]/25">
                  <span className="text-4xl font-black leading-none">{selected.slice(8, 10)}</span>
                </div>
              </div>

              <div className="text-center mt-3 space-y-0.5">
                <div className="text-sm text-[#1e293b]">
                  {selectedLunar.lunarYear && selectedLunar.lunarMonth && selectedLunar.lunarDay
                    ? `${selectedLunar.lunarYear}年${selectedLunar.lunarMonth}${selectedLunar.lunarDay}`
                    : selectedLunar.lunar || '农历信息加载中'}
                </div>
                <div className="text-xs text-[#64748b]">
                  {selectedLunar.ganzhiYear && selectedLunar.yearShengxiao
                    ? `${selectedLunar.ganzhiYear}（${selectedLunar.yearShengxiao}）年`
                    : ''}
                </div>
                <div className="text-xs text-[#64748b]">
                  本年第{selectedLunar.daysOfYear || dayOfYear(selected)}天 第{selectedLunar.weekOfYear || weekOfYear(selected)}周
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {selectedLunar.xingzuo && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#fce7f3] text-[#db2777]">
                    星座 {selectedLunar.xingzuo}
                  </span>
                )}
                {selectedLunar.term && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#eff6ff] text-[#2563eb]">
                    {selectedLunar.term}
                  </span>
                )}
                {selectedLunar.festival && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#fff7ed] text-[#f97316]">
                    {selectedLunar.festival}
                  </span>
                )}
                {selectedHoliday?.name && (
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      selectedHoliday.isOffDay
                        ? 'bg-[#fef2f2] text-[#ef4444]'
                        : 'bg-[#eff6ff] text-[#2563eb]'
                    }`}
                  >
                    {selectedHoliday.name} {selectedHoliday.isOffDay ? '休' : '班'}
                  </span>
                )}
              </div>

              {/* 宜 / 忌 */}
              {(selectedLunar.yi?.length > 0 || selectedLunar.ji?.length > 0) && (
                <div className="mt-4 space-y-2">
                  {selectedLunar.yi?.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 w-5 h-5 rounded bg-[#22c55e] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                        宜
                      </span>
                      <p className="text-xs text-[#475569] leading-relaxed">
                        {selectedLunar.yi.join('，')}
                      </p>
                    </div>
                  )}
                  {selectedLunar.ji?.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 w-5 h-5 rounded bg-[#ef4444] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                        忌
                      </span>
                      <p className="text-xs text-[#475569] leading-relaxed">
                        {selectedLunar.ji.join('，')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 月相 / 物候 */}
              {(selectedLunar.yuexiang || selectedLunar.wuhou) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedLunar.yuexiang && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#f3e8ff] text-[#9333ea]">
                      月相 {selectedLunar.yuexiang}
                    </span>
                  )}
                  {selectedLunar.wuhou && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#eef2ff] text-[#4f46e5]">
                      物候 {selectedLunar.wuhou}
                    </span>
                  )}
                </div>
              )}

              {/* 神位 */}
              {(selectedLunar.xi || selectedLunar.yanggui || selectedLunar.yingui || selectedLunar.fu || selectedLunar.cai) && (
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  {selectedLunar.xi && (
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">喜神位</span>
                      <span className="text-[#1e293b]">{selectedLunar.xi}</span>
                    </div>
                  )}
                  {selectedLunar.yanggui && (
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">阳贵位</span>
                      <span className="text-[#1e293b]">{selectedLunar.yanggui}</span>
                    </div>
                  )}
                  {selectedLunar.yingui && (
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">阴贵位</span>
                      <span className="text-[#1e293b]">{selectedLunar.yingui}</span>
                    </div>
                  )}
                  {selectedLunar.fu && (
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">福神位</span>
                      <span className="text-[#1e293b]">{selectedLunar.fu}</span>
                    </div>
                  )}
                  {selectedLunar.cai && (
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">财神位</span>
                      <span className="text-[#1e293b]">{selectedLunar.cai}</span>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => navigate(`/records?date=${selected}`)}
                className={`${btnGhost} w-full mt-4 justify-center inline-flex items-center gap-1`}
              >
                <Icon.pencil className="w-4 h-4" />
                写此日记录
              </button>
            </div>

            {/* 待办 */}
            <div className={`${card} p-4`}>
              <div className="text-sm font-bold text-[#0f172a] mb-3 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-[#2563eb]" />
                待办到期（{tasksForDay.length}）
              </div>
              {tasksForDay.length === 0 ? (
                <p className="text-xs text-[#94a3b8]">这一天没有到期待办</p>
              ) : (
                <div className="max-h-[175px] overflow-y-auto pr-1">
                  {tasksForDay.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 bg-white/50 border border-white/75 rounded-xl p-2.5 mb-2"
                    >
                      <span
                        className={`w-4 h-4 rounded-md border-2 grid place-items-center text-[10px] ${
                          t.status === 'done'
                            ? 'brand-gradient border-transparent text-white'
                            : 'border-[#94a3b8]'
                        }`}
                      >
                        {t.status === 'done' ? '✓' : ''}
                      </span>
                      <span
                        className={`text-sm truncate ${
                          t.status === 'done' ? 'line-through text-[#94a3b8]' : 'text-[#0f172a]'
                        }`}
                      >
                        {t.title}
                      </span>
                      {t.due_time && (
                        <span className="text-[10px] text-[#94a3b8] shrink-0 ml-auto inline-flex items-center gap-1">
                          <Icon.clock className="w-3.5 h-3.5" />
                          {t.due_time}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 记录 */}
            <div className={`${card} p-4`}>
              <div className="text-sm font-bold text-[#0f172a] mb-3 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-[#14b8a6]" />
                记录（{recordsForDay.length}）
              </div>
              {recordsForDay.length === 0 ? (
                <p className="text-xs text-[#94a3b8]">这一天还没有记录</p>
              ) : (
                <div className="max-h-[130px] overflow-y-auto pr-1">
                  {recordsForDay.map((r) => {
                    const m = typeMeta(r.type)
                    return (
                      <div
                        key={r.id}
                        onClick={() => navigate(`/records?edit=${r.id}`)}
                        className="cursor-pointer bg-white/50 border border-white/75 rounded-xl p-3 mb-2 hover:bg-white/80 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: m.color }}
                          >
                            {m.label}
                          </span>
                          <span className="text-sm font-semibold text-[#0f172a] truncate">{r.title}</span>
                          {r.record_time && (
                            <span className="text-[10px] text-[#94a3b8] shrink-0 ml-auto inline-flex items-center gap-1">
                              <Icon.clock className="w-3.5 h-3.5" />
                              {r.record_time}
                            </span>
                          )}
                        </div>
                        {r.content && (
                          <p className="text-[11px] text-[#475569] mt-1 whitespace-pre-wrap line-clamp-2">
                            {stripTags(r.content).slice(0, 60)}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </Layout>
  )
}
