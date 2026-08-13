import useAuthStore from './store/authStore'
import type { AuthResponse } from './store/authStore'
import type { User } from './types'

// 兼容旧 API：返回与历史 Context 一致的字段集合（user / token / login /
// register / logout / isAuth），所有原有消费方无需改动。
interface UseAuthReturn {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<AuthResponse>
  register: (username: string, password: string) => Promise<AuthResponse>
  logout: () => void
  isAuth: boolean
}

export function useAuth(): UseAuthReturn {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const logout = useAuthStore((s) => s.logout)
  const isAuth = useAuthStore((s) => s.isAuth)
  return { user, token, login, register, logout, isAuth }
}
