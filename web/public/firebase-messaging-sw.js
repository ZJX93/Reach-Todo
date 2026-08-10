// 抵达 Reach · Web 端 FCM 后台消息 Service Worker
//
// 占位 Firebase 配置 —— 替换为你的 Firebase 项目实际值（需与 src/lib/fcm.js 一致）。
// 注意：getToken 使用 VAPID 公钥（Firebase 控制台 → 云消息传送 → Web 推送证书）。
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'REPLACE_API_KEY',
  authDomain: 'REPLACE_PROJECT.firebaseapp.com',
  projectId: 'REPLACE_PROJECT',
  storageBucket: 'REPLACE_PROJECT.appspot.com',
  messagingSenderId: 'REPLACE_SENDER_ID',
  appId: 'REPLACE_APP_ID',
})

const messaging = firebase.messaging()

// 应用未在前台时，由浏览器系统通知展示
messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {}
  self.registration.showNotification(notification.title || '抵达 · Reach', {
    body: notification.body || '',
    icon: '/icon.svg',
  })
})
