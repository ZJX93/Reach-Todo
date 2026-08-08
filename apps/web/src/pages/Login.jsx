import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { field, btnPrim } from './ui.jsx'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // login | register
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError('请输入用户名和密码')
      return
    }
    setLoading(true)
    try {
      if (mode === 'login') await login(username.trim(), password)
      else await register(username.trim(), password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* 浮动光斑：液态玻璃氛围 */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#2563eb]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#14b8a6]/25 blur-3xl" />

      <div className="relative w-full max-w-sm bg-white/55 backdrop-blur-[18px] border border-white/75 rounded-3xl shadow-[0_20px_50px_-20px_rgba(8,145,178,0.35)] p-8">
        <div className="text-center mb-7">
          <div className="mx-auto w-14 h-14 rounded-2xl brand-gradient grid place-items-center text-white text-2xl font-bold shadow-[0_8px_24px_-12px_rgba(8,145,178,0.3)] mb-4">
            抵
          </div>
          <div className="text-2xl font-bold text-[#0f172a] font-display">抵达 · Reach</div>
          <p className="text-sm text-[#475569] mt-2">
            清单分类 + 关联目标，高效每一天
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#475569] mb-1">用户名</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="例如 alice"
              className={field}
            />
          </div>
          <div>
            <label className="block text-sm text-[#475569] mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={field}
            />
          </div>
          {error && <p className="text-sm text-[#ef4444]">{error}</p>}
          <button type="submit" disabled={loading} className={btnPrim + ' w-full'}>
            {loading ? '处理中…' : mode === 'login' ? '登录' : '注册并进入'}
          </button>
        </form>
        <p className="text-center text-sm mt-5 text-[#475569]">
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError('')
            }}
            className="text-[#2563eb] font-semibold ml-1 hover:underline"
          >
            {mode === 'login' ? '去注册' : '去登录'}
          </button>
        </p>
        <p className="text-center text-xs text-[#94a3b8] mt-4">
          注册即自动获得 工作 / 健康 / 学习 / 生活 四个维度
        </p>
      </div>
    </div>
  )
}
