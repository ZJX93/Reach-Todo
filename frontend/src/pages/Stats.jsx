import { useState, useEffect } from 'react'
import api from '../api.js'
import Sidebar from './components/Sidebar.jsx'

function StatCard({ label, value, hint, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color || 'text-slate-800'}`}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>}
    </div>
  )
}

export default function Stats() {
  const [data, setData] = useState(null)
  const [summary, setSummary] = useState(null)
  const [selected, setSelected] = useState('all')
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
      <div className="flex h-screen">
        <Sidebar summary={summary} selected={selected} onSelect={setSelected} />
        <main className="flex-1 p-6 text-sm text-slate-400">加载中…</main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar summary={summary} selected={selected} onSelect={setSelected} />

      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 bg-white/80 backdrop-blur border-b border-slate-200 px-6 py-4 z-10">
          <h1 className="text-lg font-semibold text-slate-800">📊 周回顾 / 数据看板</h1>
          <p className="text-xs text-slate-400">回顾这一周，看清节奏与方向</p>
        </header>

        <div className="p-6 space-y-6">
          {/* 概览卡 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="本周完成" value={data.week_completed} hint="近 7 天" color="text-indigo-600" />
            <StatCard label="连续完成" value={`${data.streak} 天`} hint="streak 🔥" color="text-orange-500" />
            <StatCard label="今日专注" value={`${data.focus_minutes_today} 分`} hint="番茄钟" color="text-emerald-600" />
            <StatCard label="本周专注" value={`${data.focus_minutes_week} 分`} hint="累计" color="text-emerald-600" />
          </div>

          {/* 目标进展 */}
          <section>
            <h2 className="font-medium text-slate-700 mb-3">🎯 目标进展</h2>
            {data.goals_progress.length === 0 ? (
              <p className="text-sm text-slate-300">还没有目标，去「我的目标」建一个吧。</p>
            ) : (
              <div className="space-y-3">
                {data.goals_progress.map((g) => (
                  <div key={g.id} className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{g.title}</span>
                      <span className="text-xs text-slate-400">
                        {g.done}/{g.total} · {g.progress}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${g.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 各维度分布 */}
          <section>
            <h2 className="font-medium text-slate-700 mb-3">📁 各维度分布</h2>
            <div className="space-y-2">
              {data.per_category.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-3"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: c.color }}
                  ></span>
                  <span className="text-sm text-slate-700 w-24">
                    {c.icon} {c.name}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-400"
                      style={{
                        width: `${
                          c.todo + c.done
                            ? Math.round((c.done / (c.todo + c.done)) * 100)
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-xs text-slate-400 w-20 text-right">
                    待办 {c.todo} / 完成 {c.done}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
