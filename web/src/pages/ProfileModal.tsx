import { useEffect, useState } from 'react'
import api from '../api'
import useAuthStore from '../store/authStore'
import { cardLg, field, btnPrim, btnGhost, gradText, Icon } from './ui'

// 个人信息弹窗：从侧边栏头像/用户名点击唤起，展示资料、可改邮箱、改密、退出登录。
// 与系统设置页 (Settings.jsx) 是平级入口，但这里聚焦"我"这个账号本身。

function initial(name = '') {
  const s = String(name).trim()
  return s ? s[0].toUpperCase() : '?'
}

function fmtDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`
  } catch {
    return ''
  }
}

export default function ProfileModal({ open, onClose }) {
  const { user, logout } = useAuthStore()
  const [email, setEmail] = useState(user?.email ?? '')
  const [savingEmail, setSavingEmail] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [cfmPw, setCfmPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  // 每次打开时重置邮箱草稿，避免上次编辑残留
  useEffect(() => {
    if (open) {
      setEmail(user?.email ?? '')
      setPwOpen(false)
      setOldPw('')
      setNewPw('')
      setCfmPw('')
    }
  }, [open, user])

  // Esc 关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const saveEmail = async () => {
    const trimmed = email.trim()
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      alert('邮箱格式不正确')
      return
    }
    setSavingEmail(true)
    try {
      const { data } = await api.patch('/auth/me', { email: trimmed })
      // 同步本地缓存与 store，让侧边栏 / 其他页立刻反映
      useAuthStore.setState({ user: data })
      localStorage.setItem('user', JSON.stringify(data))
      onClose?.()
    } finally {
      setSavingEmail(false)
    }
  }

  const savePassword = async () => {
    if (newPw.length < 6) {
      alert('新密码至少 6 位')
      return
    }
    if (newPw !== cfmPw) {
      alert('两次输入的新密码不一致')
      return
    }
    if (newPw === oldPw) {
      alert('新密码不能与当前密码相同')
      return
    }
    setSavingPw(true)
    try {
      await api.post('/auth/me/password', {
        old_password: oldPw,
        new_password: newPw,
      })
      alert('密码已修改，下次登录请使用新密码')
      setOldPw('')
      setNewPw('')
      setCfmPw('')
      setPwOpen(false)
    } finally {
      setSavingPw(false)
    }
  }

  const onLogout = () => {
    if (!confirm('确定要退出登录吗？')) return
    logout()
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/30 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className={`${cardLg} w-full max-w-md p-6 md:p-7 relative`}>
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-[#94a3b8] hover:bg-white/60 hover:text-[#0f172a] transition"
        >
          <Icon.close className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-bold text-[#0f172a] mb-1">个人信息</h2>
        <p className="text-xs text-[#475569] mb-5">管理你的账号资料与登录安全</p>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl brand-gradient grid place-items-center text-white text-xl font-bold shadow-[0_8px_24px_-12px_rgba(8,145,178,0.45)]">
            {initial(user?.username)}
          </div>
          <div className="min-w-0">
            <div className={`text-base font-bold ${gradText}`}>@{user?.username}</div>
            <div className="text-xs text-[#475569] mt-0.5">
              注册于 {fmtDate(user?.created_at)}
            </div>
            <div className="text-[11px] text-[#94a3b8] mt-0.5">
              用户名作为登录主键，不可修改
            </div>
          </div>
        </div>

        <div className="space-y-1.5 mb-4">
          <label className="text-xs font-semibold text-[#475569]">邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="可填写，用于找回 / 通知"
            className={field}
          />
          <p className="text-[11px] text-[#94a3b8]">留空表示不设置</p>
        </div>

        <div className="flex items-center justify-end gap-2 mb-5">
          <button onClick={onClose} className={btnGhost}>
            取消
          </button>
          <button onClick={saveEmail} disabled={savingEmail} className={btnPrim}>
            {savingEmail ? '保存中…' : '保存'}
          </button>
        </div>

        <div className="border-t border-[rgba(15,23,42,0.08)] pt-4">
          <button
            type="button"
            onClick={() => setPwOpen((v) => !v)}
            className="flex items-center justify-between w-full text-sm font-semibold text-[#0f172a] py-1"
          >
            <span>修改密码</span>
            <span className="text-[#94a3b8]">{pwOpen ? '收起' : '展开'}</span>
          </button>
          {pwOpen && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#475569]">当前密码</label>
                <input
                  type="password"
                  value={oldPw}
                  onChange={(e) => setOldPw(e.target.value)}
                  className={`${field} mt-1`}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#475569]">新密码（至少 6 位）</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className={`${field} mt-1`}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#475569]">确认新密码</label>
                <input
                  type="password"
                  value={cfmPw}
                  onChange={(e) => setCfmPw(e.target.value)}
                  className={`${field} mt-1`}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setOldPw('')
                    setNewPw('')
                    setCfmPw('')
                    setPwOpen(false)
                  }}
                  className={btnGhost}
                >
                  取消
                </button>
                <button
                  onClick={savePassword}
                  disabled={savingPw || !oldPw || !newPw || !cfmPw}
                  className={btnPrim}
                >
                  {savingPw ? '修改中…' : '确认修改'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[rgba(15,23,42,0.08)] mt-5 pt-4">
          <button
            onClick={onLogout}
            className="text-sm font-semibold text-[#ef4444] hover:text-[#b91c1c] transition"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  )
}