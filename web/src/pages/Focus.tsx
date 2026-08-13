import { useState, useEffect, useRef } from 'react'
import api from '../api'
import Layout from './Layout'
import { header, cardLg, field, btnPrim, gradText } from './ui'
import useSettingsStore from '../store/settingsStore'

const PRESETS = [
  { m: 25, label: '专注 25' },
  { m: 45, label: '深度 45' },
  { m: 5, label: '休息 5' },
]

export default function Focus() {
  // 默认时长取自系统设置，仅在新会话/手动重置时生效；
  // 已经在跑的计时器不受设置变更影响，避免误清零
  const defaultFocus = useSettingsStore((s) => s.defaultFocusMinutes)
  const [minutes, setMinutes] = useState(defaultFocus)
  const [remaining, setRemaining] = useState(defaultFocus * 60)
  const [running, setRunning] = useState(false)
  const [tasks, setTasks] = useState([])
  const [taskId, setTaskId] = useState('')
  const [logged, setLogged] = useState(null)
  const [sessions, setSessions] = useState([])
  const [summary, setSummary] = useState(null)
  const timerRef = useRef(null)

  const refresh = async () => {
    const [t, s, sm] = await Promise.all([
      api.get('/tasks', { params: { status: 'todo' } }),
      api.get('/focus'),
      api.get('/tasks/summary'),
    ])
    setTasks(t.data)
    setSessions(s.data)
    setSummary(sm.data)
  }
  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(timerRef.current)
            setRunning(false)
            handleFinish(minutes)
            return 0
          }
          return r - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [running])

  const start = () => {
    if (remaining === 0) setRemaining(minutes * 60)
    setRunning(true)
  }
  const pause = () => {
    setRunning(false)
    clearInterval(timerRef.current)
  }
  const reset = () => {
    setRunning(false)
    clearInterval(timerRef.current)
    setRemaining(minutes * 60)
  }
  const setPreset = (m) => {
    setRunning(false)
    clearInterval(timerRef.current)
    setMinutes(m)
    setRemaining(m * 60)
  }

  const handleFinish = async (mins) => {
    try {
      await api.post('/focus', {
        task_id: taskId ? Number(taskId) : null,
        minutes: mins,
      })
      setLogged(mins)
      refresh()
    } catch {
      // 忽略记录失败，不打断专注体验
    }
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  const totalSec = minutes * 60
  const elapsed = totalSec - remaining
  const deg = totalSec ? (elapsed / totalSec) * 360 : 0

  return (
    <Layout summary={summary} selected="focus" onSelect={() => {}}>
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <header className={header}>
          <h1 className="text-lg font-bold text-[#0f172a] font-display">
            专注 / 番茄钟
          </h1>
          <p className="text-xs text-[#475569]">
            选个任务，进入心流，时间到自动记录
          </p>
        </header>

        <div className="p-5 md:p-7 max-w-2xl mx-auto space-y-6">
          {/* 计时器 */}
          <div className={`${cardLg} p-8 text-center`}>
            <div
              className="relative w-60 h-60 rounded-full grid place-items-center mx-auto"
              style={{
                background: `conic-gradient(#06b6d4 ${deg}deg, #e2e8f0 ${deg}deg)`,
              }}
            >
              <div className="absolute inset-[18px] rounded-full bg-white shadow-[0_8px_24px_-12px_rgba(8,145,178,0.30)] grid place-items-center">
                <div className={`text-5xl font-extrabold tabular-nums ${gradText}`}>
                  {mm}:{ss}
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-2 mt-6">
              {PRESETS.map((p) => (
                <button
                  key={p.m}
                  onClick={() => setPreset(p.m)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                    minutes === p.m
                      ? 'text-white brand-gradient shadow-[0_8px_24px_-12px_rgba(8,145,178,0.30)]'
                      : 'bg-white/60 text-[#475569] hover:bg-white/80'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-3 mt-5">
              {running ? (
                <button
                  onClick={pause}
                  className="px-7 py-2.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-sm font-semibold transition"
                >
                  暂停
                </button>
              ) : (
                <button onClick={start} className={btnPrim + ' px-7 py-2.5'}>
                  开始专注
                </button>
              )}
              <button
                onClick={reset}
                className="px-5 py-2.5 rounded-xl text-sm text-[#475569] hover:bg-white/60 transition"
              >
                重置
              </button>
            </div>
          </div>

          {/* 关联任务 */}
          <div>
            <label className="block text-sm text-[#475569] mb-1">
              关联任务（可选）
            </label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className={field}
            >
              <option value="">不关联（仅记录专注时长）</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {logged && (
            <div className="text-sm text-[#059669] text-center font-medium">
              已记录 {logged} 分钟专注
            </div>
          )}

          {/* 最近专注 */}
          <div>
            <h2 className="font-bold text-[#475569] mb-2">最近专注</h2>
            {sessions.length === 0 ? (
              <p className="text-sm text-[#cbd5e1]">还没有专注记录</p>
            ) : (
              <div className="space-y-1.5">
                {sessions.slice(0, 8).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between text-sm text-[#475569] bg-white/55 border border-white/75 rounded-xl px-3 py-2.5"
                  >
                    <span className="font-semibold text-[#0f172a]">
                      {s.minutes} 分钟
                    </span>
                    <span className="text-xs text-[#94a3b8]">
                      {new Date(s.started_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </Layout>
  )
}
