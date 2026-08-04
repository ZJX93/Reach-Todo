import { useState, useEffect, useCallback } from 'react'
import api from '../api.js'
import Sidebar from './components/Sidebar.jsx'
import TaskCard from './components/TaskCard.jsx'

const ACCENT = {
  q1: 'border-t-red-400',
  q2: 'border-t-indigo-400',
  q3: 'border-t-amber-400',
  q4: 'border-t-slate-300',
}

export default function Matrix() {
  const [quadrants, setQuadrants] = useState([])
  const [summary, setSummary] = useState(null)
  const [selected, setSelected] = useState('all')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [m, s] = await Promise.all([
      api.get('/tasks/matrix'),
      api.get('/tasks/summary'),
    ])
    setQuadrants(m.data)
    setSummary(s.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleToggle = async (task) => {
    await api.put(`/tasks/${task.id}`, {
      status: task.status === 'done' ? 'todo' : 'done',
    })
    await load()
  }
  const handleDelete = async (task) => {
    if (!confirm('确定删除该任务？')) return
    await api.delete(`/tasks/${task.id}`)
    await load()
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar summary={summary} selected={selected} onSelect={setSelected} />

      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 bg-white/80 backdrop-blur border-b border-slate-200 px-6 py-4 z-10">
          <h1 className="text-lg font-semibold text-slate-800">🎯 艾森豪威尔四象限</h1>
          <p className="text-xs text-slate-400">按「重要 × 紧急」排优先级，先搞定 Q1</p>
        </header>

        <div className="p-6">
          {loading ? (
            <p className="text-sm text-slate-400">加载中…</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quadrants.map((q) => (
                <section
                  key={q.key}
                  className={`bg-white rounded-xl border border-slate-200 border-t-4 ${ACCENT[q.key]} p-4`}
                >
                  <div className="flex items-baseline justify-between mb-3">
                    <h2 className="font-semibold text-slate-700">{q.title}</h2>
                    <span className="text-xs text-slate-400">{q.sub}</span>
                  </div>
                  {q.tasks.length === 0 ? (
                    <p className="text-sm text-slate-300">暂无任务</p>
                  ) : (
                    <div className="space-y-2">
                      {q.tasks.map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          onToggle={handleToggle}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
