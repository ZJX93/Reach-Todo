import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth.jsx'

export default function Sidebar({ summary, selected, onSelect }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const cats = summary?.categories || []

  const navItem = (path, label, icon, key) => {
    const active = location.pathname === path
    return (
      <button
        key={key}
        onClick={() => navigate(path)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
          active
            ? 'bg-indigo-50 text-indigo-700 font-medium'
            : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        <span>{icon} {label}</span>
      </button>
    )
  }

  return (
    <aside className="w-64 shrink-0 h-screen bg-white border-r border-slate-200 flex flex-col">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="text-xl font-bold text-indigo-600">抵达 · Reach</div>
        <div className="text-xs text-slate-400 mt-0.5">清单 · 目标</div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <button
          onClick={() => {
            navigate('/')
            onSelect('all')
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
            selected === 'all' && location.pathname === '/'
              ? 'bg-indigo-50 text-indigo-700 font-medium'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>📋 全部待办</span>
          <span className="text-xs text-slate-400">
            {summary ? summary.total_todo : 0}
          </span>
        </button>

        {navItem('/matrix', '四象限', '🎯', 'matrix')}
        {navItem('/stats', '回顾 / 数据', '📊', 'stats')}

        <div className="pt-3 pb-1 px-3 text-xs uppercase tracking-wide text-slate-400">
          维度分类
        </div>
        {cats.map((c) => (
          <button
            key={c.category_id}
            onClick={() => {
              navigate('/')
              onSelect(c.category_id)
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
              selected === c.category_id
                ? 'bg-slate-100 font-medium text-slate-800'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: c.color }}
              ></span>
              {c.icon} {c.name}
            </span>
            <span className="text-xs text-slate-400">{c.todo}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-100 space-y-1">
        <button
          onClick={() => navigate('/focus')}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
            location.pathname === '/focus'
              ? 'bg-indigo-50 text-indigo-700 font-medium'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          🍅 专注 / 番茄钟
        </button>
        <button
          onClick={() => navigate('/goals')}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
            location.pathname === '/goals'
              ? 'bg-indigo-50 text-indigo-700 font-medium'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          🎯 我的目标
        </button>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-slate-500 truncate">{user?.username}</span>
          <button onClick={logout} className="text-xs text-red-500 hover:underline">
            退出
          </button>
        </div>
      </div>
    </aside>
  )
}
