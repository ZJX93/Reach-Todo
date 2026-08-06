import { useState, useEffect } from 'react'
import api from '../../api.js'
import { RECORD_TYPE_LIST, typeMeta, MOODS } from '../recordMeta.js'
import { field, btnPrim, Icon } from '../ui.jsx'

const empty = (date) => ({
  type: 'diary',
  title: '',
  content: '',
  mood: '',
  tags: '',
  book_title: '',
  book_author: '',
  project: '',
  record_date: date || new Date().toISOString().slice(0, 10),
  template_id: '',
})

export default function RecordEditor({ open, mode, initial, defaultDate, templates, onClose, onSaved, onDeleted }) {
  const [f, setF] = useState(empty(defaultDate))
  const [saving, setSaving] = useState(false)
  const [showTpl, setShowTpl] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && initial) {
      setF({
        type: initial.type,
        title: initial.title || '',
        content: initial.content || '',
        mood: initial.mood || '',
        tags: initial.tags || '',
        book_title: initial.book_title || '',
        book_author: initial.book_author || '',
        project: initial.project || '',
        record_date: initial.record_date || new Date().toISOString().slice(0, 10),
        template_id: '',
      })
    } else {
      setF(empty(defaultDate))
    }
    setShowTpl(false)
  }, [open, mode, initial, defaultDate])

  if (!open) return null

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  const pickTemplate = (t) => {
    setF((s) => ({
      ...s,
      template_id: t.id,
      type: t.type !== 'all' ? t.type : s.type,
      title: s.title || t.name,
      content: s.content || t.content || '',
    }))
    setShowTpl(false)
  }

  const save = async () => {
    setSaving(true)
    const payload = {
      type: f.type,
      title: f.title.trim() || '无标题记录',
      content: f.content || null,
      mood: f.mood || null,
      tags: f.tags.trim() || null,
      book_title: f.book_title.trim() || null,
      book_author: f.book_author.trim() || null,
      project: f.project.trim() || null,
      record_date: f.record_date,
    }
    try {
      let res
      if (mode === 'edit' && initial) {
        res = await api.put(`/records/${initial.id}`, payload)
      } else {
        res = await api.post('/records', { ...payload, template_id: f.template_id || null })
      }
      onSaved && onSaved(res.data)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!initial || !confirm('确定删除这条记录？')) return
    await api.delete(`/records/${initial.id}`)
    onDeleted && onDeleted(initial.id)
    onClose()
  }

  const tpls = templates || []
  const meta = typeMeta(f.type)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0f172a]/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white/70 backdrop-blur-[18px] border border-white/75 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-[0_20px_50px_-20px_rgba(8,145,178,0.35)] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/70 backdrop-blur px-5 py-4 border-b border-white/75 flex items-center justify-between rounded-t-3xl">
          <h3 className="text-base font-bold text-[#0f172a]">
            {mode === 'edit' ? '编辑记录' : '新建记录'}
          </h3>
          <button
            onClick={onClose}
            className="text-[#cbd5e1] hover:text-[#475569] transition"
            aria-label="关闭"
          >
            <Icon.close />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 类型选择 */}
          <div className="flex gap-2">
            {RECORD_TYPE_LIST.map((t) => (
              <button
                key={t.key}
                onClick={() => set('type', t.key)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${
                  f.type === t.key
                    ? 'text-white border-transparent'
                    : 'bg-white/60 text-[#475569] border-white/75'
                }`}
                style={f.type === t.key ? { backgroundColor: t.color } : {}}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 模板选择（仅新建） */}
          {mode === 'create' && (
            <div>
              <button
                onClick={() => setShowTpl((v) => !v)}
                className="text-xs font-semibold text-[#2563eb] hover:underline"
              >
                {showTpl ? '收起模板' : '从模板新建'}
              </button>
              {showTpl && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tpls
                    .filter((t) => t.type === 'all' || t.type === f.type)
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => pickTemplate(t)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition flex items-center gap-1 ${
                          f.template_id === t.id
                            ? 'text-white border-transparent brand-gradient'
                            : 'bg-white/60 text-[#475569] border-white/75 hover:bg-white/80'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* 标题 */}
          <input
            value={f.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="标题"
            className={field}
          />

          {/* 类型相关字段 */}
          {f.type === 'diary' && (
            <div>
              <div className="text-xs text-[#94a3b8] mb-1.5">今天的心情</div>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => set('mood', m)}
                    className={`px-2.5 h-9 rounded-xl text-sm transition ${
                      f.mood === m
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
          {f.type === 'note' && (
            <div className="grid grid-cols-2 gap-3">
              <input
                value={f.book_title}
                onChange={(e) => set('book_title', e.target.value)}
                placeholder="书名"
                className={field}
              />
              <input
                value={f.book_author}
                onChange={(e) => set('book_author', e.target.value)}
                placeholder="作者"
                className={field}
              />
            </div>
          )}
          {f.type === 'worklog' && (
            <input
              value={f.project}
              onChange={(e) => set('project', e.target.value)}
              placeholder="关联项目（可选）"
              className={field}
            />
          )}

          {/* 正文 */}
          <textarea
            value={f.content}
            onChange={(e) => set('content', e.target.value)}
            placeholder="写点什么…"
            rows={8}
            className={`${field} resize-none`}
          />

          {/* 标签 + 日期 */}
          <div className="grid grid-cols-2 gap-3">
            <input
              value={f.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="标签，逗号分隔"
              className={field}
            />
            <input
              type="date"
              value={f.record_date}
              onChange={(e) => set('record_date', e.target.value)}
              className={`${field} w-auto`}
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white/70 backdrop-blur px-5 py-4 border-t border-white/75 flex items-center gap-3">
          {mode === 'edit' && (
            <button
              onClick={del}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444]/10 transition"
            >
              删除
            </button>
          )}
          <button
            onClick={save}
            disabled={saving}
            className={btnPrim + ' flex-1'}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
