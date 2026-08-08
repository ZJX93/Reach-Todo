import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useSettingsStore from '../store/settingsStore.js'
import ProfileModal from './ProfileModal.jsx'
import { cardLg, gradText } from './ui.jsx'

// 时区选项：优先用浏览器原生 IANA 列表（Chrome/Edge/Firefox 新版支持），
// 不支持时回落到一份常用清单，保证老浏览器也能选。
const ALL_TZ =
  typeof Intl !== 'undefined' && Intl.supportedValuesOf
    ? Intl.supportedValuesOf('timeZone')
    : [
        'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Asia/Singapore',
        'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney', 'Europe/London',
        'Europe/Paris', 'Europe/Moscow', 'America/New_York', 'America/Chicago',
        'America/Denver', 'America/Los_Angeles', 'UTC',
      ]

// 取某时区在指定时刻的 UTC 偏移短标签，如 "GMT+8"
function tzOffsetLabel(tz, at) {
  try {
    const s = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).format(at)
    const m = s.match(/GMT[+-]\d+/)
    return m ? m[0] : ''
  } catch {
    return ''
  }
}

// 分段控件：视觉上是一组互斥按钮，选中态用品牌渐变高亮
function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-white/55 border border-white/75 gap-1">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
              active
                ? 'brand-gradient text-white shadow-[0_4px_14px_-8px_rgba(8,145,178,0.45)]'
                : 'text-[#475569] hover:bg-white/60'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Section({ title, desc, children }) {
  return (
    <section className={`${cardLg} p-5 md:p-6`}>
      <div className="mb-4">
        <h2 className="text-base font-bold text-[#0f172a]">{title}</h2>
        {desc && <p className="text-xs text-[#475569] mt-0.5">{desc}</p>}
      </div>
      {children}
    </section>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const defaultFocusMinutes = useSettingsStore((s) => s.defaultFocusMinutes)
  const setDefaultFocusMinutes = useSettingsStore((s) => s.setDefaultFocusMinutes)
  const weekStart = useSettingsStore((s) => s.weekStart)
  const setWeekStart = useSettingsStore((s) => s.setWeekStart)
  const timezone = useSettingsStore((s) => s.timezone)
  const setTimezone = useSettingsStore((s) => s.setTimezone)
  const [profileOpen, setProfileOpen] = useState(false)

  // 当前所选时区的实时时钟（每秒刷新）
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const clockStr = new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(clock)
  const offset = tzOffsetLabel(timezone, clock)

  return (
    <div className="min-h-screen w-full px-4 md:px-8 py-6 md:py-10">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* 顶部：返回 + 标题 */}
        <header className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            aria-label="返回"
            className="p-2 rounded-xl bg-white/55 border border-white/75 text-[#475569] hover:text-[#0f172a] hover:bg-white/80 transition"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 className={`text-xl font-bold ${gradText}`}>系统设置</h1>
            <p className="text-xs text-[#475569] mt-0.5">
              个性化你的专注与日历体验
            </p>
          </div>
        </header>

        <Section
          title="专注"
          desc="番茄钟启动时的默认时长，可在专注页面单次覆盖"
        >
          <Segmented
            value={defaultFocusMinutes}
            onChange={setDefaultFocusMinutes}
            options={[
              { value: 15, label: '15 分钟' },
              { value: 25, label: '25 分钟' },
              { value: 45, label: '45 分钟' },
              { value: 60, label: '60 分钟' },
            ]}
          />
        </Section>

        <Section
          title="日历"
          desc="日历表头与每周起始列的位置"
        >
          <Segmented
            value={weekStart}
            onChange={setWeekStart}
            options={[
              { value: 'sun', label: '周日' },
              { value: 'mon', label: '周一' },
            ]}
          />
        </Section>

        <Section
          title="时区"
          desc="应用使用的时区，影响「今天」判定、日历与时间的展示"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-sm text-[#475569]">当前时区时间</span>
              <span className="text-sm font-semibold text-[#0f172a] tabular-nums">
                {clockStr} <span className="text-[#06b6d4]">{offset}</span>
              </span>
            </div>
            <label className="block">
              <span className="text-xs text-[#475569]">选择时区</span>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1.5 w-full border border-white/75 rounded-lg px-3 py-2 text-sm bg-white/70 text-[#0f172a] focus:border-[#06b6d4] focus:ring-2 focus:ring-[#06b6d4]/20 transition"
              >
                {ALL_TZ.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-[#94a3b8]">
              默认取浏览器所在时区（{typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '—'}）；
              若列表中没有你需要的时区，可直接在此选择相近的 IANA 时区。
            </p>
          </div>
        </Section>

        <Section title="账户" desc="账号资料与登录安全">
          <button
            onClick={() => setProfileOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/55 border border-white/75 hover:bg-white/80 transition"
          >
            <div className="text-left">
              <div className="text-sm font-semibold text-[#0f172a]">个人信息</div>
              <div className="text-xs text-[#475569] mt-0.5">
                修改邮箱、更换密码、退出登录
              </div>
            </div>
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 text-[#94a3b8]"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </Section>

        <footer className="text-[11px] text-[#94a3b8] text-center pb-6">
          设置仅保存在当前浏览器（localStorage），不会同步到服务器
        </footer>
      </div>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}