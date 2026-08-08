// 记录类型元信息（颜色 / 标签），记录页与日历页共用
// 注：图标不再使用 emoji，统一以「彩色标签 + 文字」呈现，契合液态玻璃设计系统
export const RECORD_TYPES = {
  diary: { key: 'diary', label: '个人日记', color: '#14b8a6' },
  worklog: { key: 'worklog', label: '工作日志', color: '#2563eb' },
  note: { key: 'note', label: '读书笔记', color: '#f59e0b' },
}

export const RECORD_TYPE_LIST = [RECORD_TYPES.diary, RECORD_TYPES.worklog, RECORD_TYPES.note]

export function typeMeta(type) {
  return RECORD_TYPES[type] || RECORD_TYPES.diary
}

// 日记心情选项（文字标签，非 emoji）
export const MOODS = ['开心', '平静', '低落', '加油', '闪亮', '疲惫', '思考', '喜爱']

export function excerpt(text, n = 90) {
  if (!text) return ''
  const flat = text.replace(/\n+/g, ' ').trim()
  return flat.length > n ? flat.slice(0, n) + '…' : flat
}

// 富文本存储为 HTML，展示前做轻量清洗，仅保留安全标签、移除事件属性/危险协议
export function sanitizeHtml(html) {
  if (!html) return ''
  const allowed = new Set([
    'B', 'STRONG', 'I', 'EM', 'U', 'S', 'SPAN', 'DIV', 'BR', 'P',
    'FONT', 'A', 'UL', 'OL', 'LI', 'H3', 'H4',
  ])
  const tpl = document.createElement('div')
  tpl.innerHTML = html
  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType !== 1) return
      Array.from(child.attributes).forEach((a) => {
        const name = a.name.toLowerCase()
        if (name.startsWith('on')) child.removeAttribute(a.name)
        else if (/javascript:|script:|data:/i.test(a.value)) child.removeAttribute(a.name)
      })
      if (!allowed.has(child.tagName)) {
        const parent = child.parentNode
        while (child.firstChild) parent.insertBefore(child.firstChild, child)
        parent.removeChild(child)
        return
      }
      walk(child)
    })
  }
  walk(tpl)
  return tpl.innerHTML
}
