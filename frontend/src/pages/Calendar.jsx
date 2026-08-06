import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api.js'
import Layout from './Layout.jsx'
import { RECORD_TYPES, typeMeta } from './recordMeta.js'
import { header, card, btnGhost, Icon } from './ui.jsx'

const WEEK = ['一', '二', '三', '四', '五', '六', '日']

function pad(n) {
  return String(n).padStart(2, '0')
}
function ymd(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`
}

// —— 农历 / 节气：浏览器端直连第三方 API ——
// 由用户浏览器发起请求（依赖浏览器联网），满足「第三方接口、不本地计算」的要求；
// 若网络/CORS 不可达，则静默降级，仅显示公历日期。
const lunarCache = {}
function parseLunar(j) {
  if (j && j.code === 1 && j.data) {
    return {
      lunar: (j.data.lunarMonth || '') + (j.data.lunarDay || ''),
      term: j.data.solarTerms || '',
    }
  }
  return null
}

// 多个数据源依次尝试：直连 → CORS 代理（解决浏览器跨域拦截）。
// 数据全部来自第三方接口，满足「不本地计算」的要求；全部失败则静默降级。
async function fetchLunar(dateStr) {
  if (lunarCache[dateStr]) return lunarCache[dateStr]
  lunarCache[dateStr] = { lunar: '', term: '' }
  const target = `https://api.vvhan.com/api/lunar?date=${dateStr}`
  const sources = [
    target,
    'https://api.allorigins.win/raw?url=' + encodeURIComponent(target),
    'https://corsproxy.io/?url=' + encodeURIComponent(target),
  ]
  for (const url of sources) {
    try {
      const r = await fetch(url)
      const res = parseLunar(await r.json())
      if (res) {
        lunarCache[dateStr] = res
        break
      }
    } catch (e) {
      /* 尝试下一个数据源 */
    }
  }
  return lunarCache[dateStr]
}

// 并发限制拉取整月，避免一次性 42 个请求压垮代理
async function fetchAllLunar(dateStrs, limit = 6) {
  let i = 0
  const worker = async () => {
    while (i < dateStrs.length) {
      const ds = dateStrs[i++]
      await fetchLunar(ds)
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
}

function stripTags(s) {
  return s ? s.replace(/<[^>]+>/g, '') : ''
}

export default function Calendar() {
  const now = new Date()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [days, setDays] = useState({}) // "YYYY-MM-DD" -> CalendarDay
  const [tasks, setTasks] = useState([])
  const [summary, setSummary] = useState(null)
  const [selected, setSelected] = useState(ymd(now.getFullYear(), now.getMonth() + 1, now.getDate()))
  const [loading, setLoading] = useState(true)
  const [, setLunarTick] = useState(0) // 农历拉取完成后触发重渲染

  // 从记录页跳转过来时，定位到指定日期
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

      // 拉取当月 42 天农历 / 节气
      const first = new Date(year, month - 1, 1)
      const offset = (first.getDay() + 6) % 7
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
  const offset = (first.getDay() + 6) % 7 // 周一为起点
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

  return (
    <Layout summary={summary} selected="calendar" onSelect={() => {}}>
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <header className={header}>
          <div>
            <h1 className="text-lg font-bold text-[#0f172a] font-display">日历</h1>
            <p className="text-xs text-[#475569]">记录与待办的每日视图（含农历 / 节气）</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => shift(-1)}
              className="w-9 h-9 rounded-xl border border-white/75 text-[#475569] hover:bg-white/60 transition"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-[#0f172a] w-24 text-center">
              {year} 年 {month} 月
            </span>
            <button
              onClick={() => shift(1)}
              className="w-9 h-9 rounded-xl border border-white/75 text-[#475569] hover:bg-white/60 transition"
            >
              ›
            </button>
            <button onClick={goToday} className={btnGhost + ' brand-gradient text-white'}>
              今天
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto p-5 md:p-7 grid md:grid-cols-[1fr_300px] gap-5">
          {/* 月历 */}
          <div className={`${card} p-3`}>
            <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-[#94a3b8] mb-1">
              {WEEK.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((dt, i) => {
                const ds = ymd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
                const inMonth = dt.getMonth() + 1 === month
                const d = days[ds]
                const L = lunarCache[ds]
                const isSel = ds === selected
                const isToday = ds === ymd(now.getFullYear(), now.getMonth() + 1, now.getDate())
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(ds)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-start pt-1 px-0.5 transition text-left ${
                      isSel
                        ? 'bg-[#06b6d4]/10 ring-2 ring-[#06b6d4]'
                        : 'hover:bg-white/60'
                    } ${inMonth ? 'bg-white/55' : 'bg-transparent opacity-40'}`}
                  >
                    <div className="w-full flex items-start justify-between">
                      <span
                        className={`text-xs font-semibold ${
                          isToday ? 'text-[#2563eb]' : 'text-[#0f172a]'
                        }`}
                      >
                        {dt.getDate()}
                      </span>
                      {L?.term && (
                        <span className="text-[8px] leading-none text-[#d97706] font-semibold mt-0.5">
                          {L.term.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] leading-none text-[#94a3b8] mt-0.5">
                      {L?.lunar}
                    </span>
                    <span className="flex gap-0.5 mt-auto mb-1 justify-center">
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
            <p className="text-[10px] text-[#cbd5e1] mt-2">
              农历 / 节气由浏览器实时调用第三方接口获取（需联网）。
            </p>
          </div>

          {/* 当日详情 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[#0f172a]">{selected}</div>
              <button
                onClick={() => navigate(`/records?date=${selected}`)}
                className={`${btnGhost} inline-flex items-center gap-1`}
              >
                <Icon.pencil className="w-4 h-4" />
                写此日记录
              </button>
            </div>

            {/* 记录 */}
            <div>
              <div className="text-[11px] font-semibold text-[#94a3b8] mb-1">
                记录（{recordsForDay.length}）
              </div>
              {recordsForDay.length === 0 ? (
                <p className="text-xs text-[#94a3b8]">这一天还没有记录</p>
              ) : (
                recordsForDay.map((r) => {
                  const m = typeMeta(r.type)
                  return (
                    <div
                      key={r.id}
                      onClick={() => navigate(`/records?edit=${r.id}`)}
                      className="cursor-pointer bg-white/55 border border-white/75 rounded-xl p-3 mb-2 shadow-[0_8px_24px_-12px_rgba(8,145,178,0.30)] hover:shadow-[0_12px_30px_-12px_rgba(8,145,178,0.40)] transition"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: m.color }}
                        >
                          {m.label}
                        </span>
                        <span className="text-sm font-semibold text-[#0f172a] truncate">
                          {r.title}
                        </span>
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
                })
              )}
            </div>

            {/* 待办 */}
            <div>
              <div className="text-[11px] font-semibold text-[#94a3b8] mb-1">
                待办到期（{tasksForDay.length}）
              </div>
              {tasksForDay.length === 0 ? (
                <p className="text-xs text-[#94a3b8]">这一天没有到期待办</p>
              ) : (
                tasksForDay.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 bg-white/55 border border-white/75 rounded-xl p-2.5 mb-2"
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
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </Layout>
  )
}
