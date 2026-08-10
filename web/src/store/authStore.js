import { create } from 'zustand'
import api from '../api.js'
import { initWebPush } from '../lib/fcm.js'

// 全局认证状态（zustand）：替代原先的 React Context，避免逐层透传，
// 任意组件可直接 useAuthStore(selector) 订阅，且无需 Provider 包裹。
const readUser = () => {
  try {
    const u = localStorage.getItem('user')
    return u ? JSON.parse(u) : null
  } catch {
    return null
  }
}

const useAuthStore = create((set) => ({
  user: readUser(),
  token: localStorage.getItem('token'),
  isAuth: !!localStorage.getItem('token'),

  login: async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password })
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    set({ token: data.access_token, user: data.user, isAuth: true })
    initWebPush()
    return data
  },

  register: async (username, password) => {
    const { data } = await api.post('/auth/register', { username, password })
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    set({ token: data.access_token, user: data.user, isAuth: true })
    initWebPush()
    return data
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null, isAuth: false })
  },
}))

export default useAuthStore
