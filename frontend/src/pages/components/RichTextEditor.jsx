import { useRef, useEffect } from 'react'
import { field } from '../ui.jsx'

const FONTS = [
  { label: '字体', value: '' },
  { label: '宋体', value: '"SimSun", serif' },
  { label: '黑体', value: '"SimHei", sans-serif' },
  { label: '楷体', value: '"KaiTi", serif' },
  { label: '雅黑', value: '"Microsoft YaHei", sans-serif' },
  { label: '衬线', value: 'Georgia, serif' },
  { label: '等宽', value: '"JetBrains Mono", monospace' },
]
const SIZES = [
  { label: '字号', value: '' },
  { label: '小', value: '13' },
  { label: '标准', value: '15' },
  { label: '大', value: '18' },
  { label: '特大', value: '24' },
  { label: '超大', value: '32' },
]
const COLORS = ['#0f172a', '#2563eb', '#06b6d4', '#dc2626', '#059669', '#d97706', '#db2777']

const tb =
  'min-w-8 h-8 px-2 rounded-lg border border-white/75 text-[#475569] hover:bg-white/60 transition text-sm flex items-center justify-center'

export default function RichTextEditor({ value, onChange, placeholder }) {
  const ref = useRef(null)
  const last = useRef(null) // 上次应用到编辑器的 HTML，避免回环导致光标跳动

  useEffect(() => {
    if (ref.current && value !== last.current) {
      ref.current.innerHTML = value || ''
      last.current = value
    }
  }, [value])

  const emit = () => {
    last.current = ref.current.innerHTML
    onChange(ref.current.innerHTML)
  }

  // 工具栏按钮：mousedown 阻止默认，保留编辑区选区
  const noBlur = (e) => e.preventDefault()

  const exec = (cmd, val) => {
    ref.current.focus()
    document.execCommand('styleWithCSS', false, true)
    document.execCommand(cmd, false, val)
    emit()
  }

  const setFont = (family) => {
    if (!family) return
    exec('fontName', family)
  }

  const setSize = (px) => {
    if (!px) return
    ref.current.focus()
    document.execCommand('styleWithCSS', false, false)
    document.execCommand('fontSize', false, '7')
    // 将刚插入的 <font size="7"> 转为带 px 的 span，便于精确字号
    ref.current.querySelectorAll('font[size="7"]').forEach((f) => {
      const span = document.createElement('span')
      span.style.fontSize = px + 'px'
      span.innerHTML = f.innerHTML
      f.replaceWith(span)
    })
    emit()
  }

  const setColor = (c) => exec('foreColor', c)

  const onPaste = (e) => {
    e.preventDefault()
    const text = (e.clipboardData || window.clipboardData).getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <button type="button" className={tb} onMouseDown={noBlur} onClick={() => exec('bold')}>
          <b>B</b>
        </button>
        <button type="button" className={tb} onMouseDown={noBlur} onClick={() => exec('italic')}>
          <i>I</i>
        </button>
        <button type="button" className={tb} onMouseDown={noBlur} onClick={() => exec('underline')}>
          <u>U</u>
        </button>
        <span className="w-px h-5 bg-white/75 mx-0.5" />
        <select
          className={tb}
          defaultValue=""
          onChange={(e) => {
            setFont(e.target.value)
            e.target.value = ''
          }}
        >
          {FONTS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          className={tb}
          defaultValue=""
          onChange={(e) => {
            setSize(e.target.value)
            e.target.value = ''
          }}
        >
          {SIZES.map((s) => (
            <option key={s.label} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="w-px h-5 bg-white/75 mx-0.5" />
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onMouseDown={noBlur}
            onClick={() => setColor(c)}
            className="w-6 h-6 rounded-lg border border-white/75 shadow-sm"
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onPaste={onPaste}
        data-ph={placeholder}
        className={`rich-editor min-h-[70vh] overflow-y-auto w-full border border-white/75 rounded-xl px-4 py-3 text-sm leading-relaxed text-[#0f172a] focus:border-[#06b6d4] focus:ring-2 focus:ring-[#06b6d4]/20 transition bg-white/70 ${field}`}
      />
    </div>
  )
}
