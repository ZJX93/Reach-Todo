import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api.js'

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const res = await api.get('/goals/board')
    setGoals(res.data)
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const add = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    await api.post('/goals', { title: title.trim(), description: desc || null })
    setTitle('')
    setDesc('')
    await load()
  }

  const toggle = async (g) => {
    await api.put(`/goals/${g.id}`, {
      status: g.status === 'done' ? 'active' : 'done',
    })
    await load()
  }
  const remove = async (g) => {
    if (!confirm('删除目标？关联的任务将失去目标关联')) return
    await api.delete(`/goals/${g.id}`)
    await load()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">🎯 我的目标</h1>
          <p className="text-xs text-slate-400">给待办关联目标，让每件事都有方向</p>
        </div>
        <Link to="/" className="text-sm text-indigo-600 hover:underline">
          ← 返回看板
        </Link>
      </header>

      <div className="max-w-2xl mx-auto p-6">
        <form
          onSubmit={add}
          className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 mb-6"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="目标标题，例如：三个月减重 5 公斤"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:border-indigo-500"
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="描述（可选）"
            rows={2}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:border-indigo-500"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            + 新建目标
          </button>
        </form>

        {loading ? (
          <p className="text-slate-400 text-sm">加载中…</p>
        ) : goals.length === 0 ? (
          <p className="text-slate-400 text-sm">还没有目标，先建一个吧。</p>
        ) : (
          <div className="space-y-3">
            {goals.map((g) => (
              <div
                key={g.id}
                className={`flex items-start gap-3 p-4 rounded-xl border ${
                  g.status === 'done'
                    ? 'bg-slate-50 border-slate-100'
                    : 'bg-white border-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={g.status === 'done'}
                  onChange={() => toggle(g)}
                  className="mt-1 w-4 h-4 accent-indigo-600"
                />
                <div className="flex-1">
                  <div
                    className={`text-sm font-medium ${
                      g.status === 'done'
                        ? 'line-through text-slate-400'
                        : 'text-slate-800'
                    }`}
                  >
                    {g.title}
                  </div>
                  {g.description && (
                    <div className="text-xs text-slate-400 mt-1">
                      {g.description}
                    </div>
                  )}
                  {g.deadline && (
                    <div className="text-xs text-slate-400 mt-1">
                      截止：{g.deadline}
                    </div>
                  )}

                  {/* 进度条 + 统计 */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>
                        完成 {g.done}/{g.total}
                        {g.overdue > 0 && (
                          <span className="text-red-500 ml-2">
                            ⚠ 逾期 {g.overdue}
                          </span>
                        )}
                      </span>
                      <span>{g.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${g.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => remove(g)}
                  className="text-slate-300 hover:text-red-500 text-sm"
                  title="删除"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
