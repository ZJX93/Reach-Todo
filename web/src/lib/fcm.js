// 抵达 Reach · Web 端 FCM 推送（多端提醒）
//
// 流程：初始化 Firebase → 请求通知权限 → 用 VAPID 取 FCM token →
// 调用后端 POST /api/devices/register (platform=web) → 后端据此向本设备推送。
// 占位配置需替换为你的 Firebase 项目实际值。
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import api from '../api.js'

// 占位 Firebase 配置 —— 替换为你的项目实际值（与 public/firebase-messaging-sw.js 一致）
export const firebaseConfig = {
  apiKey: 'REPLACE_API_KEY',
  authDomain: 'REPLACE_PROJECT.firebaseapp.com',
  projectId: 'REPLACE_PROJECT',
  storageBucket: 'REPLACE_PROJECT.appspot.com',
  messagingSenderId: 'REPLACE_SENDER_ID',
  appId: 'REPLACE_APP_ID',
}

// Web 推送 VAPID 公钥（Firebase 控制台 → 云消息传送 → Web 推送证书）
export const VAPID_KEY = 'REPLACE_VAPID_KEY'

let messaging = null
let initialized = false

export async function initWebPush() {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return
  if (Notification.permission === 'denied') return

  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    if (!initialized) {
      messaging = getMessaging(app)
      // 前台消息：直接弹出通知
      onMessage(messaging, (payload) => {
        const n = payload.notification || {}
        new Notification(n.title || '抵达 · Reach', {
          body: n.body || '',
          icon: '/icon.svg',
        })
      })
      initialized = true
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    // 注册 FCM Service Worker 并取 token
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    await navigator.serviceWorker.ready
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    })
    if (!token) return

    // 上报到后端（api 拦截器会自动附带登录令牌）
    await api.post('/devices/register', { token, platform: 'web' })
  } catch (e) {
    // 配置缺失/被墙时仅告警，不影响主流程
    console.warn('初始化 Web 推送失败（请检查 Firebase 配置）:', e)
  }
}
