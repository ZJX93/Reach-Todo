const PRIORITY = {
  low: { label: '低', cls: 'bg-slate-100 text-slate-500' },
  normal: { label: '中', cls: 'bg-blue-100 text-blue-600' },
  high: { label: '高', cls: 'bg-orange-100 text-orange-600' },
  urgent: { label: '紧急', cls: 'bg-red-100 text-red-600' },
}
const IMPORTANCE = {
  low: { label: '不重要', star: '' },
  normal: { label: '一般重要', star: '☆' },
  high: { label: '很重要', star: '★' },
}
const RECUR_LABEL = { daily: '每天', weekly: '每周', monthly: '每月' }

export default function TaskCard({ task, onToggle, onDelete }) {
  const p = PRIORITY[task.priority] || PRIORITY.normal
  const imp = IMPORTANCE[task.importance] || IMPORTANCE.normal
  const done = task.status === 'done'
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border ${
        done
          ? 'bg-slate-50 border-slate-100'
          : 'bg-white border-slate-200'
      } hover:shadow-sm transition`}
    >
      <input
        type="checkbox"
        checked={done}
        onChange={() => onToggle(task)}
        className="mt-1 w-4 h-4 accent-indigo-600 cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm ${
            done ? 'line-through text-slate-400' : 'text-slate-800'
          }`}
        >
          {task.title}
        </div>

        {/* 关联目标：蓝色文字标注 */}
        {task.goal_title && (
          <div className="mt-1 text-xs font-medium text-blue-600">
            🎯 关联目标：{task.goal_title}
          </div>
        )}

        {task.note && (
          <div className="mt-1 text-xs text-slate-400 line-clamp-2">
            {task.note}
          </div>
        )}

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${p.cls}`}>
            {p.label}
          </span>
          {imp.star && (
            <span
              className="text-[11px] text-amber-500"
              title={`重要度：${imp.label}`}
            >
              {imp.star} 重要
            </span>
          )}
          {task.recurrence && task.recurrence !== 'none' && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600"
              title="重复任务"
            >
              🔁 {RECUR_LABEL[task.recurrence]}
            </span>
          )}
          {task.due_date && (
            <span className="text-[11px] text-slate-400">📅 {task.due_date}</span>
          )}
        </div>
      </div>
      <button
        onClick={() => onDelete(task)}
        className="text-slate-300 hover:text-red-500 text-sm"
        title="删除"
      >
        ✕
      </button>
    </div>
  )
}
