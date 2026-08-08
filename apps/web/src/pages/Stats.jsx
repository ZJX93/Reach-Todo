import { useState, useEffect } from 'react'
import api from '../api.js'
import Layout from './Layout.jsx'
import { header, card, gradText } from './ui.jsx'

function StatCard({ label, value, hint }) {
  return (
    <div className={`${card} p-4`}>
      <div className="text-xs text-[#94a3b8] font-medium">{label}</div>
      <div className={`text-[28px] font-extrabold mt-1 ${gradText}`}>{value}</div>
      {hint && <div className="text-[11px] text-[#94a3b8] mt-0.5">{hint}</div>}
    </div>
  )
}

export default function Stats() {
  const [data, setData] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [s, sm] = await Promise.all([
      api.get('/stats/summary'),
      api.get('/tasks/summary'),
    ])
    setData(s.data)
    setSummary(sm.data)
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  if (loading || !data) {
    return (
      <Layout summary={summary} selected="stats" onSelect={() => {}}>
        <main className="flex-1 p-6 text-sm text-[#94a3b8]">加载中…</main>
      </Layout>
    )
  }

  const weekArr = Array.isArray(data.week) ? data.week : []
  const weekVal = (d) => (typeof d === 'number' ? d : d?.count ?? 0)
  const weekLabel = (d, i) =>
    typeof d === 'number'
      ? ['一', '二', '三', '四', '五', '六', '日'][i]
      : d?.label ?? ['一', '二', '三', '四', '五', '六', '日'][i]
  const weekMax = weekArr.length ? Math.max(...weekArr.map(weekVal), 1) : 1

  return (
    <Layout summary={summary} selected="stats" onSelect={() => {}}>
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <header className={header}>
          <h1 className="text-lg font-bold text-[#0f172a] font-display">
            周回顾 / 数据看板
          </h1>
          <p className="text-xs text-[#475569]">回顾这一周，看清节奏与方向</p>
        </header>

        <div className="p-5 md:p-7 space-y-7">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="本周完成" value={data.week_completed} hint="近 7 天" />
            <StatCard label="连续完成" value={`${data.streak} 天`} hint="streak" />
            <StatCard
              label="今日专注"
              value={`${data.focus_minutes_today} 分`}
              hint="番茄钟"
            />
            <StatCard
              label="本周专注"
              value={`${data.focus_minutes_week} 分`}
              hint="累计"
            />
          </div>

          {weekArr.length > 0 && (
            <section className={`${card} p-5`}>
              <h2 className="font-bold text-[#475569] mb-4">近 7 天完成趋势</h2>
              <div className="flex gap-2.5 items-end h-40">
                {weekArr.map((d, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                  >
                    <div
                      className="w-full max-w-[34px] rounded-lg brand-gradient transition-all"
                      style={{ height: `${(weekVal(d) / weekMax) * 100}%` }}
                    ></div>
                    <span className="text-[11px] text-[#94a3b8] font-medium">
                      {weekLabel(d, i)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="font-bold text-[#475569] mb-3">目标进展</h2>
            {data.goals_progress.length === 0 ? (
              <p className="text-sm text-[#cbd5e1]">
                还没有目标，去「我的目标」建一个吧。
              </p>
            ) : (
              <div className="space-y-3">
                {data.goals_progress.map((g) => (
                  <div key={g.id} className={`${card} p-4`}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-semibold text-[#0f172a]">{g.title}</span>
                      <span className="text-xs text-[#94a3b8]">
                        {g.done}/{g.total} · {g.progress}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/60 overflow-hidden">
                      <div
                        className="h-full rounded-full brand-gradient"
                        style={{ width: `${g.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-bold text-[#475569] mb-3">各维度分布</h2>
            <div className="space-y-2.5">
              {data.per_category.map((c) => {
                const total = c.todo + c.done
                const pct = total ? Math.round((c.done / total) * 100) : 0
                return (
                  <div
                    key={c.name}
                    className={`${card} flex items-center gap-3 p-3`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    ></span>
                    <span className="text-sm text-[#0f172a] w-24 shrink-0">
                      {c.name}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-white/60 overflow-hidden">
                      <div
                        className="h-full rounded-full brand-gradient"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-[#94a3b8] w-20 text-right shrink-0">
                      待办 {c.todo} / 完成 {c.done}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </main>
    </Layout>
  )
}
