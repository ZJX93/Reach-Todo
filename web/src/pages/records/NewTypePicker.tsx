import { RECORD_TYPE_LIST } from '../recordMeta'
import { Icon } from '../ui'

const DESCS = {
  diary: '记录每天的心情与随笔',
  worklog: '整理工作进展与项目要点',
  note: '沉淀读书心得与书摘',
}

/** 新建记录时先选类型的弹窗 */
export default function NewTypePicker({ onPick, onClose }) {
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
