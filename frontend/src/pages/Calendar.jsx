import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api.js'
import Layout from './Layout.jsx'
import CalendarGrid from './components/CalendarGrid.jsx'
import DayDetail from './components/DayDetail.jsx'
import { fetchHolidayYear, fetchAllLunar, getCachedLunar } from '../services/lunar.js'
import { ymd, todayStr, daysFromToday } from '../utils/date.js'

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}月` }))

export default function Calendar() {
  const now = new Date()
  const [searchParams] = useSearchParams()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [days, setDays] = useState({})
  const [tasks, setTasks] = useState([])
  const [summary, setSummary] = useState(null)
  const [selected, setSelected] = useState(ymd(now.getFullYear(), now.getMonth() + 1, now.getDate()))
  const [, setLoading] = useState(true)
  const [holidays, setHolidays] = useState({})
  const [lunarTick, setLunarTick] = useState(0)

  useEffect(() => {
    const d = searchParams.get('date')
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setSelected(d)
      setYear(+d.slice(0, 4))
      setMonth(+d.slice(5, 7))
    }
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
  }, [year, month])

  const cells = useMemo(() => {
    const first = new Date(year, month - 1, 1)
    const offset = first.getDay()
    const start = new Date(year, month - 1, 1 - offset)
    return Array.from({ length: 42 }, (_, i) => {
      const dt = new Date(start)
      dt.setDate(start.getDate() + i)
      return dt
    })
  }, [year, month])

  // 农历/黄历同步读取缓存（fetchLunar 完成后 tick 触发重渲染）
  const lunarMap = useMemo(() => {
    const m = {}
    for (const dt of cells) {
      const ds = ymd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
      m[ds] = getCachedLunar(ds)
    }
    return m
    // lunarTick 变化时重建（fetchLunar 完成后 setLunarTick 触发）；getCachedLunar 读模块缓存
  }, [cells, lunarTick])

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
          <CalendarGrid
            cells={cells}
            month={month}
            todayStr={todayStr()}
            selected={selected}
            onSelect={setSelected}
            days={days}
            lunarMap={lunarMap}
            holidays={holidays}
          />
          <DayDetail
            selected={selected}
            lunar={getCachedLunar(selected)}
            holiday={holidays[selected]}
            tasks={tasksForDay}
            records={recordsForDay}
          />
        </div>
      </main>
    </Layout>
  )
}
