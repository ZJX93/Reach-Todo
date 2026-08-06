import { useState } from 'react'
import api from '../../api.js'
import { RECORD_TYPE_LIST, typeMeta } from '../recordMeta.js'
import { field, btnPrim, Icon } from '../ui.jsx'

export default function TemplatesManager({ open, templates, onClose, onChanged }) {
  const [editing, setEditing] = useState(null) // null=closed form, obj=edit
  const [form, setForm] = useState({ type: 'diary', name: '', icon: '', content: '' })
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const presets = (templates || []).filter((t) => t.is_preset)
  const customs = (templates || []).filter((t) => !t.is_preset)

  const openNew = () => {
    setEditing({ id: null })
    setForm({ type: 'diary', name: '', icon: '', content: '' })
  }
  const openEdit = (t) => {
    setEditing({ id: t.id })
    setForm({ type: t.type, name: t.name, icon: t.icon, content: t.content || '' })
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editing.id) {
        await api.put(`/templates/${editing.id}`, form)
      } else {
        await api.post('/templates', form)
      }
      setEditing(null)
      onChanged && (await onChanged())
    } finally {
      setSaving(false)
    }
  }

  const del = async (t) => {
    if (!confirm(`删除模板「${t.name}」？`)) return
    await api.delete(`/templates/${t.id}`)
    onChanged && (await onChanged())
  }

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
          <h3 className="text-base font-bold text-[#0f172a]">我的模板</h3>
          <button
            onClick={onClose}
            className="text-[#cbd5e1] hover:text-[#475569] transition"
            aria-label="关闭"
          >
            <Icon.close />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* 内置预设 */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[#cbd5e1] mb-2">
              内置预设（不可修改）
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map((t) => (
                <span
                  key={t.id}
                  className="px-3 py-1.5 rounded-full text-xs bg-white/60 text-[#475569] border border-white/75 flex items-center gap-1"
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>

          {/* 自定义 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#cbd5e1]">
                自定义模板
              </div>
              {editing === null && (
                <button
                  onClick={openNew}
                  className="text-xs font-semibold text-[#2563eb] hover:underline"
                >
                  + 新建模板
                </button>
              )}
            </div>
            {customs.length === 0 && editing === null && (
              <p className="text-xs text-[#94a3b8]">
                还没有自定义模板，点「新建模板」创建一个吧。
              </p>
            )}
            <div className="space-y-2">
              {customs.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between bg-white/55 border border-white/75 rounded-xl px-3 py-2"
                >
                  <span className="text-sm text-[#0f172a]">
                    {t.name}
                    <span className="ml-2 text-[11px] text-[#94a3b8]">
                      {typeMeta(t.type).label}
                    </span>
                  </span>
                  <span className="flex gap-3">
                    <button
                      onClick={() => openEdit(t)}
                      className="text-xs text-[#2563eb] hover:underline"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => del(t)}
                      className="text-xs text-[#ef4444] hover:underline"
                    >
                      删除
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 编辑 / 新建表单 */}
          {editing !== null && (
            <div className="space-y-3 border-t border-white/75 pt-4">
              <div className="text-sm font-semibold text-[#0f172a]">
                {editing.id ? '编辑模板' : '新建模板'}
              </div>
              <div className="flex gap-2">
                {RECORD_TYPE_LIST.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setForm((s) => ({ ...s, type: t.key }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                      form.type === t.key
                        ? 'text-white border-transparent'
                        : 'bg-white/60 text-[#475569] border-white/75'
                    }`}
                    style={form.type === t.key ? { backgroundColor: t.color } : {}}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <input
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="模板名称"
                className={field}
              />
              <textarea
                value={form.content}
                onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
                placeholder="模板正文（创建记录时会预填到这里）"
                rows={5}
                className={`${field} resize-none`}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#475569] border border-white/75 hover:bg-white/60 transition"
                >
                  取消
                </button>
                <button
                  onClick={save}
                  disabled={saving || !form.name.trim()}
                  className={btnPrim + ' flex-1'}
                >
                  {saving ? '保存中…' : '保存模板'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
