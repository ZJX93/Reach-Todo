import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api.js'
import Layout from './Layout.jsx'
import { RECORD_TYPE_LIST, typeMeta, MOODS, excerpt, sanitizeHtml } from './recordMeta.js'
import RichTextEditor from './components/RichTextEditor.jsx'
import { header, card, field, btnPrim, btnGhost, Icon } from './ui.jsx'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// 当前时分（HH:MM），新建记录默认带精确时间
function nowHM() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

// 纯文本 → HTML（保留换行）；已含标签则原样保留
function toHtml(s) {
  if (!s) return ''
  return s.includes('<') ? s : s.replace(/\n/g, '<br>')
}

export default function Records() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [records, setRecords] = useState([])
  const [templates, setTemplates] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState(null) // null=closed, {} = new, {id...} = edit
  const [tmplOpen, setTmplOpen] = useState(false)
  const [newPicker, setNewPicker] = useState(false)
  const [initialDate, setInitialDate] = useState(null)

  const load = async () => {
    const params = new URLSearchParams()
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (query.trim()) params.set('q', query.trim())
    const [r, t, s] = await Promise.all([
      api.get(`/records?${params.toString()}`),
      api.get('/templates'),
      api.get('/tasks/summary'),
    ])
    setRecords(r.data)
    setTemplates(t.data)
    setSummary(s.data)
    setLoading(false)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, query])

  // 从日历页跳转过来：定位到指定记录 / 预填日期
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId) {
      ;(async () => {
        try {
          const r = await api.get(`/records/${editId}`)
          setEditor(r.data)
        } catch (e) {
          /* 忽略：权限或不存在 */
        }
      })()
    }
    const d = searchParams.get('date')
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setInitialDate(d)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const groups = useMemo(() => {
    const m = {}
    for (const rec of records) {
      ;(m[rec.record_date] = m[rec.record_date] || []).push(rec)
    }
    return Object.keys(m)
      .sort()
      .reverse()
      .map((d) => ({ date: d, items: m[d] }))
  }, [records])

  const remove = async (rec) => {
    if (!confirm('删除这条记录？')) return
    await api.delete(`/records/${rec.id}`)
    await load()
  }

  const counts = useMemo(() => {
    const c = { all: records.length, diary: 0, worklog: 0, note: 0 }
    records.forEach((r) => (c[r.type] = (c[r.type] || 0) + 1))
    return c
  }, [records])

  return (
    <Layout summary={summary} selected="records" onSelect={() => {}}>
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <header className={`${header} flex items-center justify-between gap-3 flex-wrap`}>
          <div>
            <h1 className="text-lg font-bold text-[#0f172a] font-display">记录</h1>
            <p className="text-xs text-[#475569]">个人日记 · 工作日志 · 读书笔记</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                <Icon.search />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索标题 / 内容"
                className={`${field} w-44 pl-9`}
              />
            </div>
            <button
              onClick={() => setTmplOpen(true)}
              className={btnGhost}
            >
              模板
            </button>
            <button onClick={() => setNewPicker(true)} className={btnPrim}>
              + 新建
            </button>
          </div>
        </header>

        {/* 类型筛选 */}
        <div className="max-w-3xl mx-auto px-5 md:px-7 pt-4">
          <div className="flex gap-2 flex-wrap">
            {[{ key: 'all', label: '全部', color: '#2563eb' }, ...RECORD_TYPE_LIST].map((t) => {
              const active = typeFilter === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setTypeFilter(t.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition border ${
                    active
                      ? 'text-white border-transparent brand-gradient'
                      : 'text-[#475569] border-white/75 bg-white/40 hover:bg-white/60'
                  }`}
                >
                  {t.label}
                  <span className="ml-1 opacity-70">{counts[t.key] || 0}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-5 md:p-7 space-y-6">
          {loading ? (
            <p className="text-[#94a3b8] text-sm">加载中…</p>
          ) : records.length === 0 ? (
            <div className="text-center py-16 text-[#94a3b8]">
              <p className="text-sm">还没有记录，点「+ 新建」开始第一篇吧</p>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.date}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-[#94a3b8]">{g.date}</span>
                  <button
                    onClick={() => navigate(`/calendar?date=${g.date}`)}
                    className="text-[11px] text-[#2563eb] hover:underline inline-flex items-center gap-1"
                    title="在日历中查看"
                  >
                    <Icon.cal className="w-3.5 h-3.5" />
                    日历
                  </button>
                </div>
                <div className="space-y-3">
                  {g.items.map((rec) => (
                    <RecordCard
                      key={rec.id}
                      rec={rec}
                      onOpen={() => setEditor(rec)}
                      onDelete={() => remove(rec)}
                      onCalendar={() => navigate(`/calendar?date=${rec.record_date}`)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {newPicker &&
        createPortal(
          <NewTypePicker
            onPick={(type) => {
              setNewPicker(false)
              setEditor(initialDate ? { type, record_date: initialDate } : { type })
            }}
            onClose={() => setNewPicker(false)}
          />,
          document.body,
        )}
      {editor !== null &&
        createPortal(
          <RecordEditor
            initial={editor}
            templates={templates}
            onClose={() => setEditor(null)}
            onSaved={async () => {
              setEditor(null)
              await load()
            }}
          />,
          document.body,
        )}
      {tmplOpen &&
        createPortal(
          <TemplateManager
            templates={templates}
            onClose={() => setTmplOpen(false)}
            onChange={async () => {
              const t = await api.get('/templates')
              setTemplates(t.data)
            }}
          />,
          document.body,
        )}
    </Layout>
  )
}

function RecordCard({ rec, onOpen, onDelete, onCalendar }) {
  const meta = typeMeta(rec.type)
  return (
    <div
      onClick={onOpen}
      className="cursor-pointer bg-white/55 backdrop-blur-[18px] border border-white/75 rounded-2xl p-4 shadow-[0_8px_24px_-12px_rgba(8,145,178,0.30)] hover:shadow-[0_12px_30px_-12px_rgba(8,145,178,0.40)] transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
            style={{ backgroundColor: meta.color }}
          >
            {meta.label}
          </span>
          <span className="text-sm font-semibold text-[#0f172a] truncate">{rec.title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="cursor-pointer text-[#94a3b8] hover:text-[#2563eb] transition"
            onClick={(e) => {
              e.stopPropagation()
              onCalendar()
            }}
            title="在日历中查看"
          >
            <Icon.cal className="w-4 h-4" />
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="text-[#cbd5e1] hover:text-[#ef4444] transition"
            title="删除"
            aria-label="删除"
          >
            <Icon.close />
          </button>
        </div>
      </div>

      {rec.content && (
        <div
          className="rich-preview text-xs text-[#475569] mt-2 whitespace-pre-wrap line-clamp-3"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(rec.content) }}
        />
      )}

      <div className="flex items-center gap-2 flex-wrap mt-2 text-[11px] text-[#475569]">
        {rec.record_time && (
          <span className="inline-flex items-center gap-1">
            <Icon.clock className="w-3.5 h-3.5 text-[#94a3b8]" />
            {rec.record_time}
          </span>
        )}
        {rec.type === 'diary' && rec.mood && <span>{rec.mood} 心情</span>}
        {rec.type === 'worklog' && rec.project && <span>项目 · {rec.project}</span>}
        {rec.type === 'note' && (rec.book_title || rec.book_author) && (
          <span>
            《{rec.book_title}
            {rec.book_author ? ` · ${rec.book_author}` : ''}》
          </span>
        )}
        {rec.tags &&
          rec.tags
            .split(',')
            .filter(Boolean)
            .map((t) => (
              <span key={t} className="px-1.5 py-0.5 rounded bg-white/60 text-[#475569]">
                #{t.trim()}
              </span>
            ))}
      </div>
    </div>
  )
}

function RecordEditor({ initial, templates, onClose, onSaved }) {
  const isEdit = !!initial.id
  const [type, setType] = useState(initial.type || 'diary')
  const [title, setTitle] = useState(initial.title || '')
  const [content, setContent] = useState(initial.content ? toHtml(initial.content) : '')
  const [mood, setMood] = useState(initial.mood || '')
  const [project, setProject] = useState(initial.project || '')
  const [bookTitle, setBookTitle] = useState(initial.book_title || '')
  const [bookAuthor, setBookAuthor] = useState(initial.book_author || '')
  const [tags, setTags] = useState(initial.tags || '')
  const [date, setDate] = useState(initial.record_date || todayStr())
  const [time, setTime] = useState(initial.record_time || nowHM())
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

function TemplateManager({ templates, onClose, onChange }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [type, setType] = useState('diary')
  const [content, setContent] = useState('')
  const [editing, setEditing] = useState(null)

  const presets = templates.filter((t) => t.is_preset)
  const customs = templates.filter((t) => !t.is_preset)

  const save = async () => {
    if (!name.trim()) {
      alert('请填写模板名称')
      return
    }
    const payload = {
      name: name.trim(),
      icon,
      type,
      content: content || null,
    }
    if (editing) await api.put(`/templates/${editing.id}`, payload)
    else await api.post('/templates', payload)
    setName('')
    setIcon('')
    setContent('')
    setEditing(null)
    await onChange()
  }

  const del = async (t) => {
    if (!confirm(`删除自定义模板「${t.name}」？`)) return
    await api.delete(`/templates/${t.id}`)
    await onChange()
  }

  const edit = (t) => {
    setEditing(t)
    setName(t.name)
    setIcon(t.icon)
    setType(t.type)
    setContent(t.content || '')
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0f172a]/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white/70 backdrop-blur-[18px] border border-white/75 rounded-3xl shadow-[0_20px_50px_-20px_rgba(8,145,178,0.35)] w-full max-w-lg max-h-[90vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#0f172a]">我的模板</h2>
          <button
            onClick={onClose}
            className="text-[#cbd5e1] hover:text-[#475569] transition"
            aria-label="关闭"
          >
            <Icon.close />
          </button>
        </div>

        {/* 新建 / 编辑 */}
        <div className="bg-white/55 rounded-2xl p-4 mb-4 space-y-3">
          <div className="text-xs font-semibold text-[#475569]">
            {editing ? `编辑：${editing.name}` : '新建自定义模板'}
          </div>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${field} flex-1`}
              placeholder="模板名称"
            />
            <select value={type} onChange={(e) => setType(e.target.value)} className={field}>
              {RECORD_TYPE_LIST.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="模板正文（创建记录时自动填入，支持换行）"
            rows={4}
            className={`${field} resize-none`}
          />
          <div className="flex gap-2">
            {editing && (
              <button
                onClick={() => {
                  setEditing(null)
                  setName('')
                  setIcon('')
                  setContent('')
                }}
                className="text-sm px-3 py-2 rounded-xl border border-white/75 text-[#475569] hover:bg-white/60 transition"
              >
                取消
              </button>
            )}
            <button onClick={save} className={btnPrim}>
              {editing ? '保存修改' : '+ 添加模板'}
            </button>
          </div>
        </div>

        {/* 内置模板 */}
        <div className="text-xs font-semibold text-[#94a3b8] mb-2">内置模板（不可修改）</div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {presets.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/75 bg-white/40 text-sm text-[#475569]"
            >
              <span className="truncate">{t.name}</span>
            </div>
          ))}
        </div>

        {/* 自定义模板 */}
        <div className="text-xs font-semibold text-[#94a3b8] mb-2">我的模板</div>
        {customs.length === 0 ? (
          <p className="text-xs text-[#94a3b8]">还没有自定义模板</p>
        ) : (
          <div className="space-y-2">
            {customs.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/75 bg-white/55"
              >
                <span className="text-sm text-[#0f172a] flex-1 truncate">{t.name}</span>
                <button onClick={() => edit(t)} className="text-xs text-[#2563eb] hover:underline">
                  编辑
                </button>
                <button onClick={() => del(t)} className="text-xs text-[#ef4444] hover:underline">
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 主页「新建」时先选类型
function NewTypePicker({ onPick, onClose }) {
  const DESCS = {
    diary: '记录每天的心情与随笔',
    worklog: '整理工作进展与项目要点',
    note: '沉淀读书心得与书摘',
  }
  return (
    <div
      className="fixed inset-0 z-50 bg-[#0f172a]/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white/70 backdrop-blur-[18px] border border-white/75 rounded-3xl shadow-[0_20px_50px_-20px_rgba(8,145,178,0.35)] w-full max-w-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#0f172a]">选择记录类型</h2>
          <button
            onClick={onClose}
            className="text-[#cbd5e1] hover:text-[#475569] transition"
            aria-label="关闭"
          >
            <Icon.close />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {RECORD_TYPE_LIST.map((t) => (
            <button
              key={t.key}
              onClick={() => onPick(t.key)}
              className="text-left rounded-2xl border border-white/75 hover:border-[#06b6d4] hover:shadow-[0_8px_24px_-12px_rgba(8,145,178,0.30)] p-4 transition bg-white/55"
            >
              <div
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white w-fit mb-2"
                style={{ backgroundColor: t.color }}
              >
                {t.label}
              </div>
              <div className="text-sm font-semibold text-[#0f172a]">{t.label}</div>
              <div className="text-[11px] text-[#94a3b8] mt-1 leading-snug">{DESCS[t.key]}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
