import { useState } from 'react'
import api from '../../api.js'
import { RECORD_TYPE_LIST } from '../recordMeta.js'
import { field, btnPrim, Icon } from '../ui.jsx'

export default function TemplateManager({ templates, onClose, onChange }) {
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
