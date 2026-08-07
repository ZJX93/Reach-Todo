import { useState, useEffect, useCallback } from 'react'
import api from '../api.js'
import { useAuth } from '../auth.jsx'
import Layout from './Layout.jsx'
import TaskCard from './components/TaskCard.jsx'
import TaskForm from './components/TaskForm.jsx'
import { header, field, btnPrim, Icon } from './ui.jsx'
import { todayStr } from '../utils/date.js'

export default function Dashboard() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [goals, setGoals] = useState([])
  const [tasks, setTasks] = useState([])
  const [summary, setSummary] = useState(null)
  const [selected, setSelected] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showOverdue, setShowOverdue] = useState(false)

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

  useEffect(() => {
    loadAll('all')
  }, [])

  useEffect(() => {
    if (categories.length) loadAll(selected)
  }, [selected])

  const handleSubmit = async (payload) => {
    await api.post('/tasks', payload)
    setShowForm(false)
    await loadAll()
  }

  const handleToggle = async (task) => {
    const prev = task.status
    const next = prev === 'done' ? 'todo' : 'done'
    // 乐观更新：先改本地状态，后台静默同步（失败回滚）
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, status: next } : t)))
    try {
      await api.put(`/tasks/${task.id}`, { status: next })
      // 轻量同步统计（不再全量重拉任务列表）
      const s = await api.get('/tasks/summary')
      setSummary(s.data)
    } catch {
      setTasks((ts) =>
        ts.map((t) => (t.id === task.id ? { ...t, status: prev } : t)),
      )
    }
  }

  const handleDelete = async (task) => {
    if (!confirm('确定删除该任务？')) return
    await api.delete(`/tasks/${task.id}`)
    await loadAll()
  }

  const visibleTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const today = todayStr()

  // 「今日待办」：未完成，且属于 今天 / 未来 / 未排期 的任务。
  // 已完成任务不显示；逾期的任务统一收进「逾期任务」折叠区。
  const isForToday = (t) => {
    if (t.status === 'done') return false
    if (!t.due_date) return true
    return t.due_date >= today
  }

  // 逾期任务：未完成且到期日早于今天的任务，默认折叠。
  const isOverdue = (t) => {
    if (t.status === 'done') return false
    if (!t.due_date) return false
    return t.due_date < today
  }

  const groups = categories.map((c) => ({
    ...c,
    items: visibleTasks.filter(
      (t) => t.category_id === c.id && (selected === 'all' ? isForToday(t) : true),
    ),
  }))

  const overdueGroups = categories.map((c) => ({
    ...c,
    items: visibleTasks.filter(
      (t) => t.category_id === c.id && isOverdue(t),
    ),
  }))
  const overdueTotal = overdueGroups.reduce((sum, g) => sum + g.items.length, 0)

  const currentName =
    selected === 'all'
      ? '今日待办'
      : categories.find((c) => c.id === selected)?.name || '待办'
  const currentCat =
    selected === 'all' ? null : categories.find((c) => c.id === selected)

  return (
    <Layout summary={summary} selected={selected} onSelect={setSelected}>
      <main className="flex-1 overflow-y-auto md:pb-0 pb-20">
        <header className={`${header} flex items-center justify-between gap-3`}>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-[#0f172a] truncate font-display">
              {currentName}
            </h1>
            <p className="text-xs text-[#475569]">
              下午好，{user?.username} · 一切都是为了抵达
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative hidden sm:block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                <Icon.search />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索任务…"
                className={`${field} w-44 pl-9`}
              />
            </div>
            <button onClick={() => setShowForm(true)} className={btnPrim}>
              + 新建
            </button>
          </div>
        </header>

        <div className="p-5 md:p-7 space-y-7">
          {loading ? (
            <p className="text-sm text-[#94a3b8]">加载中…</p>
          ) : selected === 'all' ? (
            <>
            {groups.map((g) => (
              <section key={g.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: g.color }}
                  ></span>
                  <h2 className="font-bold text-[#475569]">{g.name}</h2>
                  <span className="text-xs text-[#94a3b8]">
                    待办 {g.items.filter((t) => t.status === 'todo').length}
                  </span>
                </div>
                {g.items.length === 0 ? (
                  <p className="text-sm text-[#cbd5e1] pl-5">
                    今天这个维度还没有任务
                  </p>
                ) : (
                  <div className="space-y-2.5 pl-1">
                    {g.items.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        category={g}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))}
            {overdueTotal > 0 && (
              <section className="pt-2">
                <button
                  onClick={() => setShowOverdue((s) => !s)}
                  className="flex items-center gap-2 text-sm text-[#64748b] hover:text-[#0f172a] transition"
                >
                  <span className="text-xs">
                    {showOverdue ? '▾' : '▸'}
                  </span>
                  <span>逾期任务</span>
                  <span className="text-xs text-[#94a3b8]">({overdueTotal})</span>
                </button>
                {showOverdue && (
                  <div className="mt-4 space-y-6">
                    {overdueGroups
                      .filter((g) => g.items.length > 0)
                      .map((g) => (
                        <section key={g.id}>
                          <div className="flex items-center gap-2 mb-3">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: g.color }}
                            ></span>
                            <h2 className="font-bold text-[#475569]">{g.name}</h2>
                            <span className="text-xs text-[#94a3b8]">
                              待办 {g.items.length}
                            </span>
                          </div>
                          <div className="space-y-2.5 pl-1">
                            {g.items.map((t) => (
                              <TaskCard
                                key={t.id}
                                task={t}
                                category={g}
                                onToggle={handleToggle}
                                onDelete={handleDelete}
                              />
                            ))}
                          </div>
                        </section>
                      ))}
                  </div>
                )}
              </section>
            )}
          </>
          ) : (
            <div className="space-y-2.5">
              {visibleTasks.length === 0 ? (
                <p className="text-sm text-[#cbd5e1]">这个维度还没有任务</p>
              ) : (
                visibleTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    category={currentCat}
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
    </Layout>
  )
}
