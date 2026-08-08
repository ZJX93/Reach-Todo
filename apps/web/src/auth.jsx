import useAuthStore from './store/authStore.js'

// 兼容旧 API：返回与历史 Context 一致的字段集合（user / token / login /
// register / logout / isAuth），所有原有消费方无需改动。
export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const logout = useAuthStore((s) => s.logout)
  const isAuth = useAuthStore((s) => s.isAuth)
  return { user, token, login, register, logout, isAuth }
}
