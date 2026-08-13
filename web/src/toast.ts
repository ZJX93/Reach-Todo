// 轻量级全局 toast —— 不依赖任何状态管理库，直接挂到 body。
// 用于 axios 拦截器统一报错，避免请求失败导致白屏 / unhandled rejection。

export type ToastType = 'error' | 'success' | 'info'

const TYPES: Record<ToastType, { bg: string; icon: string }> = {
  error: { bg: '#ef4444', icon: '!' },
  success: { bg: '#10b981', icon: '✓' },
  info: { bg: '#3b82f6', icon: 'i' },
}

function ensureContainer(): HTMLElement {
  let c = document.getElementById('__toast_container')
  if (!c) {
    c = document.createElement('div')
    c.id = '__toast_container'
    c.style.cssText =
      'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;'
    document.body.appendChild(c)
  }
  return c
}

export function toast(
  message: string,
  type: ToastType = 'info',
  duration = 3200,
): void {
  if (typeof document === 'undefined') return
  const meta = TYPES[type] || TYPES.info
  const el = document.createElement('div')
  el.style.cssText =
    'pointer-events:auto;max-width:320px;background:' +
    meta.bg +
    ';color:#fff;padding:10px 14px;border-radius:10px;font-size:13px;line-height:1.4;' +
    'box-shadow:0 8px 24px rgba(0,0,0,.18);display:flex;gap:8px;align-items:flex-start;' +
    'opacity:0;transform:translateY(-6px);transition:opacity .2s,transform .2s;'
  const safe = String(message)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  el.innerHTML =
    '<span style="flex:0 0 auto;width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.25);' +
    'display:grid;place-items:center;font-size:11px;font-weight:700;">' +
    meta.icon +
    '</span><span style="flex:1;word-break:break-word;">' +
    safe +
    '</span>'
  ensureContainer().appendChild(el)
  requestAnimationFrame(() => {
    el.style.opacity = '1'
    el.style.transform = 'translateY(0)'
  })
  setTimeout(() => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(-6px)'
    setTimeout(() => el.remove(), 220)
  }, duration)
}

export default toast
