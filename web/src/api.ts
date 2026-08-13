import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'
import { toast } from './toast'

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // token 失效：回到登录页（避免停留在原页面反复静默失败）
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return Promise.reject(err)
    }
    // 全局错误提示：避免请求失败导致白屏 / unhandled rejection
    const status = err.response?.status
    let msg = '请求失败，请稍后重试'
    if (err.code === 'ERR_NETWORK' || !err.response) {
      msg = '网络异常，请检查连接'
    } else if (status && status >= 500) {
      msg = '服务器开小差了，请稍后再试'
    } else if (status === 429) {
      msg = '操作太频繁，请稍后再试'
    } else if (status === 400 || status === 422) {
      const d = err.response.data as Record<string, unknown> | undefined
      const detail = d?.detail
      msg =
        (Array.isArray(detail) ? (detail[0] as { msg?: string })?.msg : detail) ||
        (d?.msg as string | undefined) ||
        '提交内容有误'
    } else if (typeof err.response?.data?.detail === 'string') {
      msg = err.response.data.detail as string
    }
    toast(msg, 'error')
    return Promise.reject(err)
  },
)

export default api
