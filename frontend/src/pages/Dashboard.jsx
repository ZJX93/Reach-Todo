import { useState, useEffect, useCallback } from 'react'
import api from '../api.js'
import Sidebar from './components/Sidebar.jsx'
import TaskCard from './components/TaskCard.jsx'
import TaskForm from './components/TaskForm.jsx'

export default function Dashboard() {
  const [categories, setCategories] = useState([])
  const [goals, setGoals] = useState([])
  const [tasks, setTasks] = useState([])
  const [summary, setSummary] = useState(null)
  const [selected, setSelected] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(
    async (catId) => {
      catId = catId ?? selected
      const [c, g, s] = await Promise.all([
        api.get('/categories'),
        api.get('/goals'),
        api.get('/tasks/summary'),
      ])
      setCategories(c.data)
      setGoals(g.data)
      setSummary(s.data)
      const params = catId === 'all' ? {} : { category_id: catId }
      const res = await api.get('/tasks', { params })
      setTasks(res.data)
      setLoading(false)
    },
    [selected],
  )

  // 初始加载（全部待办）
  useEffect(() => {
    loadAll('all')
  }, [])

  // 切换维度时只刷新任务 + 统计
  useEffect(() => {
    if (categories.length) loadAll(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const handleSubmit = async (payload) => {
    await api.post('/tasks', payload)
    setShowForm(false)
    await loadAll()
  }

  const handleToggle = async (task) => {
    await api.put(`/tasks/${task.id}`, {
      status: task.status === 'done' ? 'todo' : 'done',
    })
    await loadAll()
  }

  const handleDelete = async (task) => {
    if (!confirm('确定删除该任务？')) return
    await api.delete(`/tasks/${task.id}`)
    await loadAll()
  }

  // 按维度分组（全部视图用）
  const groups = categories.map((c) => ({
    ...c,
    items: tasks.filter((t) => t.category_id === c.id),
  }))

  const currentName =
    selected === 'all'
      ? '今日待办'
      : categories.find((c) => c.id === selected)?.name || '待办'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar summary={summary} selected={selected} onSelect={setSelected} />

      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 bg-white/80 backdrop-blur border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">{currentName}</h1>
            <p className="text-xs text-slate-400">一切都是为了抵达 📱</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            + 新建任务
          </button>
        </header>

        <div className="p-6 space-y-6">
          {loading ? (
            <p className="text-sm text-slate-400">加载中…</p>
          ) : selected === 'all' ? (
            groups.map((g) => (
              <section key={g.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: g.color }}
                  ></span>
                  <h2 className="font-medium text-slate-700">
                    {g.icon} {g.name}
                  </h2>
                  <span className="text-xs text-slate-400">
                    待办 {g.items.filter((t) => t.status === 'todo').length}
                  </span>
                </div>
                {g.items.length === 0 ? (
                  <p className="text-sm text-slate-300 pl-5">这个维度还没有任务</p>
                ) : (
                  <div className="space-y-2 pl-5">
                    {g.items.map((t) => (
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
            ))
          ) : (
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-sm text-slate-300">这个维度还没有任务</p>
              ) : (
                tasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </main>

      <TaskForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        categories={categories}
        goals={goals}
      />
    </div>
  )
}
