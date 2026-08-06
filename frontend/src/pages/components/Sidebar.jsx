import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth.jsx'

const icons = {
  todo: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  matrix: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  cal: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="20" x2="4" y2="10"/><line x1="10" y1="20" x2="10" y2="4"/><line x1="16" y1="20" x2="16" y2="13"/><line x1="22" y1="20" x2="2" y2="20"/>
    </svg>
  ),
  timer: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/>
    </svg>
  ),
  goal: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  ),
}

const brand = (
  <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
  </svg>
)

export default function Sidebar({ summary, selected, onSelect }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const cats = summary?.categories || []

  const isActive = (path) =>
    path === '/'
      ? location.pathname === '/' && selected === 'all'
      : location.pathname === path

  const desktopNav = [
    { key: 'all', path: '/', label: '今日待办', icon: icons.todo, count: summary ? (summary.today_todo ?? summary.total_todo) : 0 },
    { key: 'matrix', path: '/matrix', label: '四象限', icon: icons.matrix },
    { key: 'records', path: '/records', label: '记录', icon: icons.doc },
    { key: 'calendar', path: '/calendar', label: '日历', icon: icons.cal },
    { key: 'stats', path: '/stats', label: '回顾 / 数据', icon: icons.chart },
  ]

  const footNav = [
    { key: 'focus', path: '/focus', label: '专注 / 番茄钟', icon: icons.timer },
    { key: 'goals', path: '/goals', label: '我的目标', icon: icons.goal },
  ]

  const navClick = (item) => {
    navigate(item.path)
    onSelect(item.key)
  }

  const baseItem = `w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06b6d4] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent`

  return (
    <aside className="sidebar hidden md:flex w-64 shrink-0 h-screen m-4 rounded-3xl bg-white/55 border border-white/75 backdrop-blur-[18px] shadow-[0_20px_50px_-20px_rgba(8,145,178,0.35)] flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="w-10 h-10 rounded-2xl brand-gradient grid place-items-center text-white font-bold text-lg shadow-[0_8px_24px_-12px_rgba(8,145,178,0.3)]">
          {brand}
        </div>
        <div>
          <div className="text-[17px] font-bold text-[#0f172a] leading-tight font-[Sora]">抵达 · Reach</div>
          <div className="text-[11px] text-[#475569]">清单与目标</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        {desktopNav.map((item) => (
          <button
            key={item.key}
            onClick={() => navClick(item)}
            className={`${baseItem} ${
              isActive(item.path) && selected === item.key
                ? 'bg-[rgba(37,99,235,0.08)] text-[#2563eb] font-semibold before:content-[""] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:brand-gradient'
                : 'text-[#475569] hover:bg-white/40'
            } relative`}
          >
            <span className="flex items-center gap-3">
              {item.icon}
              {item.label}
            </span>
            {typeof item.count === 'number' && (
              <span className="text-xs text-[#475569] font-semibold">{item.count}</span>
            )}
          </button>
        ))}

        <div className="pt-4 pb-1 px-3 text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">维度分类</div>
        {cats.map((c) => (
          <button
            key={c.category_id}
            onClick={() => {
              navigate('/')
              onSelect(c.category_id)
            }}
            className={`${baseItem} ${
              selected === c.category_id
                ? 'bg-white/40 font-semibold text-[#0f172a]'
                : 'text-[#475569] hover:bg-white/40'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }}></span>
              <span className="truncate">{c.name}</span>
            </span>
            <span className="text-xs text-[#475569]">{c.todo}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-[rgba(15,23,42,0.06)] space-y-1">
        {footNav.map((item) => (
          <button
            key={item.key}
            onClick={() => navClick(item)}
            className={`${baseItem} ${
              isActive(item.path) && selected === item.key
                ? 'bg-[rgba(37,99,235,0.08)] text-[#2563eb] font-semibold'
                : 'text-[#475569] hover:bg-white/40'
            }`}
          >
            <span className="flex items-center gap-3">
              {item.icon}
              {item.label}
            </span>
          </button>
        ))}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[#475569] truncate">@{user?.username}</span>
          <button
            onClick={logout}
            className="text-xs text-[#475569] hover:text-[#ef4444] transition font-medium"
          >
            退出
          </button>
        </div>
      </div>
    </aside>
  )
}
