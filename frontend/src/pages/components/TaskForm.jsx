import { useState, useEffect } from 'react'

const PRIORITY = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
]
const IMPORTANCE = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '中' },
  { value: 'high', label: '高' },
]
const RECURRENCE = [
  { value: 'none', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
]

export default function TaskForm({ open, onClose, onSubmit, categories, goals }) {
  const [form, setForm] = useState({
    title: '',
    category_id: '',
    goal_id: '',
    priority: 'normal',
    importance: 'normal',
    recurrence: 'none',
    note: '',
    due_date: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setError('')
      setForm({
        title: '',
        category_id: categories[0]?.id || '',
        goal_id: '',
        priority: 'normal',
        importance: 'normal',
        recurrence: 'none',
        note: '',
        due_date: '',
      })
    }
  }, [open, categories])

  if (!open) return null

  const submit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('请填写任务标题')
      return
    }
    if (!form.category_id) {
      setError('请选择维度')
      return
    }
    onSubmit({
      title: form.title.trim(),
      category_id: Number(form.category_id),
      goal_id: form.goal_id ? Number(form.goal_id) : null,
      priority: form.priority,
      importance: form.importance,
      recurrence: form.recurrence,
      note: form.note || null,
      due_date: form.due_date || null,
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-800 mb-4">新建任务</h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">标题 *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:border-indigo-500"
              placeholder="要做什么？"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">维度 *</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:border-indigo-500"
              >
                <option value="">请选择</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">优先级（紧急度）</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:border-indigo-500"
              >
                {PRIORITY.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">重要度</label>
              <select
                value={form.importance}
                onChange={(e) => setForm({ ...form, importance: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:border-indigo-500"
              >
                {IMPORTANCE.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">重复</label>
              <select
                value={form.recurrence}
                onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:border-indigo-500"
              >
                {RECURRENCE.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              关联目标（可选）
            </label>
            <select
              value={form.goal_id}
              onChange={(e) => setForm({ ...form, goal_id: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:border-indigo-500"
            >
              <option value="">不关联</option>
              {goals
                .filter((g) => g.status !== 'done')
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              截止日期（可选）
            </label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">备注（可选）</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:border-indigo-500"
              placeholder="补充说明…"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
