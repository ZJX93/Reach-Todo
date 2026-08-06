import { Icon } from '../ui.jsx'

const RECUR_LABEL = { daily: '每天', weekly: '每周', monthly: '每月' }

export default function TaskCard({ task, onToggle, onDelete, category }) {
  const done = task.status === 'done'
  const catBg = category?.color ? category.color + '1a' : undefined
  return (
    <div
      className={`group flex items-start gap-3.5 p-3.5 rounded-2xl border transition hover:shadow-[0_8px_24px_-12px_rgba(8,145,178,0.30)] hover:-translate-y-0.5 ${
        done ? 'bg-white/30 border-white/75' : 'bg-white/55 border-white/75'
      }`}
    >
      {/* 渐变勾选框 */}
      <button
        onClick={() => onToggle(task)}
        aria-label={done ? '标记为未完成' : '标记为完成'}
        className={`mt-0.5 w-[22px] h-[22px] shrink-0 rounded-lg border-2 grid place-items-center text-white text-[13px] transition ${
          done
            ? 'brand-gradient border-transparent'
            : 'border-[#94a3b8] hover:border-[#06b6d4]'
        }`}
      >
        {done ? '✓' : ''}
      </button>

      <div className="flex-1 min-w-0">
        <div
          className={`text-[15px] font-semibold ${
            done ? 'line-through text-[#94a3b8]' : 'text-[#0f172a]'
          }`}
        >
          {task.title}
        </div>

        {task.goal_title && (
          <div className="mt-1 text-xs font-medium" style={{ color: '#2563eb' }}>
            关联目标 · {task.goal_title}
          </div>
        )}

        {task.note && (
          <div className="mt-1 text-xs text-[#94a3b8] line-clamp-2">{task.note}</div>
        )}

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {category && (
            <span
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"
              style={{ color: category.color, backgroundColor: catBg }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </span>
          )}
          {task.importance === 'high' && (
            <span className="text-[11px] font-semibold text-[#db2777] bg-[#db2777]/10 rounded-lg px-2 py-0.5">
              重要
            </span>
          )}
          {task.recurrence && task.recurrence !== 'none' && (
            <span className="text-[11px] font-semibold text-[#0891b2] bg-[#0891b2]/10 rounded-lg px-2 py-0.5">
              {RECUR_LABEL[task.recurrence]} · 重复
            </span>
          )}
          {task.due_date && (
            <span className="text-[11px] text-[#475569]">
              截止 {task.due_date}
              {task.due_time ? ` ${task.due_time}` : ''}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(task)}
        className="text-[#cbd5e1] hover:text-[#ef4444] text-sm opacity-0 group-hover:opacity-100 transition shrink-0"
        title="删除"
        aria-label="删除"
      >
        <Icon.close />
      </button>
    </div>
  )
}
