import { useState } from 'react'
import api from '../../api.js'
import { typeMeta, MOODS } from '../recordMeta.js'
import RichTextEditor from '../components/RichTextEditor.jsx'
import { field, btnPrim } from '../ui.jsx'
import { todayStr, nowHM } from '../../utils/date.js'
import useSettingsStore from '../../store/settingsStore.js'

// 纯文本 → HTML（保留换行）；已含标签则原样保留
function toHtml(s) {
  if (!s) return ''
  return s.includes('<') ? s : s.replace(/\n/g, '<br>')
}

export default function RecordEditor({ initial, templates, onClose, onSaved }) {
  const timezone = useSettingsStore((s) => s.timezone)
  const isEdit = !!initial.id
  const [type] = useState(initial.type || 'diary')
  const [title, setTitle] = useState(initial.title || '')
  const [content, setContent] = useState(initial.content ? toHtml(initial.content) : '')
  const [mood, setMood] = useState(initial.mood || '')
  const [project, setProject] = useState(initial.project || '')
  const [bookTitle, setBookTitle] = useState(initial.book_title || '')
  const [bookAuthor, setBookAuthor] = useState(initial.book_author || '')
  const [tags, setTags] = useState(initial.tags || '')
  const [date, setDate] = useState(initial.record_date || todayStr(timezone))
  const [time, setTime] = useState(initial.record_time || nowHM(timezone))
  const [templateId, setTemplateId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showProps, setShowProps] = useState(false)

  const meta = typeMeta(type)
  const tmpls = templates.filter((t) => t.type === type || t.type === 'all')

  const pickTemplate = (t) => {
    if (t.id === templateId) return // 再次点击当前模板不改变内容，避免误清空
    setTemplateId(t.id)
    if (!title) setTitle(t.name)
    if (t.content) setContent(toHtml(t.content))
  }

  const save = async () => {
    if (!title.trim()) {
      alert('请填写标题')
      return
    }
    setSaving(true)
    const payload = {
      type,
      title: title.trim(),
      content: content || null,
      mood: type === 'diary' ? mood || null : null,
      project: type === 'worklog' ? project || null : null,
      book_title: type === 'note' ? bookTitle || null : null,
      book_author: type === 'note' ? bookAuthor || null : null,
      tags: tags || null,
      record_date: date,
      record_time: time || null,
      template_id: templateId,
    }
    try {
      if (isEdit) await api.put(`/records/${initial.id}`, payload)
      else await api.post('/records', payload)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!confirm('删除这条记录？')) return
    await api.delete(`/records/${initial.id}`)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* 顶部操作栏 */}
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b border-white/75 px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm text-[#475569] hover:text-[#0f172a] transition shrink-0"
        >
          ‹ 返回
        </button>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
          style={{ backgroundColor: meta.color }}
        >
          {meta.label}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {isEdit && (
            <button
              onClick={del}
              className="text-sm text-[#ef4444] px-3 py-1.5 rounded-xl hover:bg-[#ef4444]/10 transition"
            >
              删除
            </button>
          )}
          <button onClick={save} disabled={saving} className={btnPrim}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </header>

      {/* 编辑区：文档式写作页面（类型已在主页选定） */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-4 md:px-10 lg:px-16 py-6 space-y-4">
          {/* 套用模板（轻量，不抢写作视线） */}
          {tmpls.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[#94a3b8]">套用模板</span>
              {tmpls.map((t) => (
                <button
                  key={t.id}
                  onClick={() => pickTemplate(t)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs border transition ${
                    templateId === t.id
                      ? 'border-transparent text-white brand-gradient'
                      : 'border-white/75 text-[#475569] bg-white/40 hover:bg-white/60'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {/* 文档卡片：标题 + 正文，像 Word 一样 */}
          <div className="bg-white/70 backdrop-blur-[18px] border border-white/75 shadow-[0_8px_24px_-12px_rgba(8,145,178,0.30)] rounded-2xl px-5 md:px-8 py-6 space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="无标题文档"
              className="w-full bg-transparent text-2xl md:text-3xl font-bold text-[#0f172a] placeholder-[#cbd5e1] outline-none border-none px-0"
            />
            <div className="text-[11px] text-[#94a3b8]">正文（支持加粗 / 斜体 / 字体 / 字号 / 颜色）</div>
            <RichTextEditor value={content} onChange={setContent} placeholder="开始写作…像在 Word 里一样" />
          </div>

          {/* 日期 / 时间：始终可见，精确到分 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#94a3b8]">日期 / 时间</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${field} w-auto`}
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={`${field} w-auto`}
            />
          </div>

          {/* 属性（可折叠，默认收起，不干扰写作） */}
          <div className="border border-white/75 rounded-2xl bg-white/55 overflow-hidden">
            <button
              onClick={() => setShowProps((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[#475569] hover:bg-white/60 transition"
            >
              <span>属性</span>
              <span className="text-[#94a3b8]">{showProps ? '▴' : '▾'}</span>
            </button>
            {showProps && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/75">
                {type === 'diary' && (
                  <div>
                    <div className="text-[11px] text-[#94a3b8] mb-1">心情</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {MOODS.map((m) => (
                        <button
                          key={m}
                          onClick={() => setMood(m)}
                          className={`text-sm px-2.5 h-9 rounded-xl transition ${
                            mood === m
                              ? 'bg-[#06b6d4]/15 ring-2 ring-[#06b6d4] text-[#0f172a]'
                              : 'bg-white/60 hover:bg-white/80 text-[#475569]'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {type === 'worklog' && (
                  <input
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    placeholder="关联项目（可选）"
                    className={field}
                  />
                )}
                {type === 'note' && (
                  <div className="flex gap-2">
                    <input
                      value={bookTitle}
                      onChange={(e) => setBookTitle(e.target.value)}
                      placeholder="书名"
                      className={`${field} flex-1`}
                    />
                    <input
                      value={bookAuthor}
                      onChange={(e) => setBookAuthor(e.target.value)}
                      placeholder="作者"
                      className={`${field} flex-1`}
                    />
                  </div>
                )}
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="标签，逗号分隔，如：coding,生活"
                  className={field}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
