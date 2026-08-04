import { useState, useEffect, useRef } from 'react'
import api from '../api.js'
import Sidebar from './components/Sidebar.jsx'

const PRESETS = [25, 45, 5]

export default function Focus() {
  const [minutes, setMinutes] = useState(25)
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [tasks, setTasks] = useState([])
  const [taskId, setTaskId] = useState('')
  const [logged, setLogged] = useState(null)
  const [sessions, setSessions] = useState([])
  const [summary, setSummary] = useState(null)
  const [selected, setSelected] = useState('all')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (e) {
      // 忽略记录失败，不打断专注体验
    }
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar summary={summary} selected={selected} onSelect={setSelected} />

      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 bg-white/80 backdrop-blur border-b border-slate-200 px-6 py-4 z-10">
          <h1 className="text-lg font-semibold text-slate-800">🍅 专注 / 番茄钟</h1>
          <p className="text-xs text-slate-400">选个任务，进入心流，时间到自动记录</p>
        </header>

        <div className="p-6 max-w-2xl mx-auto space-y-6">
          {/* 计时器 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <div className="text-6xl font-bold tabular-nums text-indigo-600">
              {mm}:{ss}
            </div>
            <div className="flex justify-center gap-2 mt-4">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  onClick={() => setPreset(m)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    minutes === m
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m} 分
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-3 mt-5">
              {running ? (
                <button
                  onClick={pause}
                  className="px-6 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium"
                >
                  暂停
                </button>
              ) : (
                <button
                  onClick={start}
                  className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
                >
                  开始专注
                </button>
              )}
              <button
                onClick={reset}
                className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100"
              >
                重置
              </button>
            </div>
          </div>

          {/* 关联任务 */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              关联任务（可选）
            </label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:border-indigo-500"
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
            <div className="text-sm text-emerald-600 text-center">
              ✅ 已记录 {logged} 分钟专注
            </div>
          )}

          {/* 最近专注 */}
          <div>
            <h2 className="font-medium text-slate-700 mb-2">最近专注</h2>
            {sessions.length === 0 ? (
              <p className="text-sm text-slate-300">还没有专注记录</p>
            ) : (
              <div className="space-y-1">
                {sessions.slice(0, 8).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between text-sm text-slate-600 bg-white rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <span>{s.minutes} 分钟</span>
                    <span className="text-xs text-slate-400">
                      {new Date(s.started_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
