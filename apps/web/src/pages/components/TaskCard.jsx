import { useState } from 'react'
import { Icon } from '../ui.jsx'

const RECUR_LABEL = { daily: '每天', weekly: '每周', monthly: '每月' }

export default function TaskCard({
  task,
  onToggle,
  onDelete,
  category,
  subtasks = [],
  onAddSubtask,
  onToggleSub,
  onDeleteSub,
}) {
  const done = task.status === 'done'
  const catBg = category?.color ? category.color + '1a' : undefined
  const [showSub, setShowSub] = useState(subtasks.length > 0)
  const [subTitle, setSubTitle] = useState('')

  const doneCount = subtasks.filter((s) => s.status === 'done').length

  const submitSub = async (e) => {
    e.preventDefault()
    const title = subTitle.trim()
    if (!title || !onAddSubtask) return
    await onAddSubtask(task.id, title)
    setSubTitle('')
  }

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
          done ? 'brand-gradient border-transparent' : 'border-[#94a3b8] hover:border-[#06b6d4]'
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

        {/* 子任务区 */}
        {(subtasks.length > 0 || showSub) && (
          <div className="mt-3 pt-3 border-t border-white/60">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setShowSub((s) => !s)}
                className="text-[12px] font-semibold text-[#475569] hover:text-[#0f172a] transition flex items-center gap-1"
              >
                <span className="text-[10px]">{showSub ? '▾' : '▸'}</span>
                子任务
                {subtasks.length > 0 && (
                  <span className="text-[#94a3b8] font-normal">
                    （{doneCount}/{subtasks.length}）
                  </span>
                )}
              </button>
            </div>

            {showSub && (
              <>
                <ul className="space-y-1.5">
                  {subtasks.map((s) => {
                    const sDone = s.status === 'done'
                    return (
                      <li key={s.id} className="flex items-center gap-2 group/sub">
                        <button
                          onClick={() => onToggleSub && onToggleSub(s)}
                          aria-label={sDone ? '标记为未完成' : '标记为完成'}
                          className={`w-[16px] h-[16px] shrink-0 rounded border grid place-items-center text-white text-[10px] transition ${
                            sDone
                              ? 'brand-gradient border-transparent'
                              : 'border-[#94a3b8] hover:border-[#06b6d4]'
                          }`}
                        >
                          {sDone ? '✓' : ''}
                        </button>
                        <span
                          className={`flex-1 text-[13px] ${
                            sDone ? 'line-through text-[#94a3b8]' : 'text-[#334155]'
                          }`}
                        >
                          {s.title}
                        </span>
                        <button
                          onClick={() => onDeleteSub && onDeleteSub(s)}
                          className="text-[#cbd5e1] hover:text-[#ef4444] text-xs opacity-0 group-hover/sub:opacity-100 transition"
                          aria-label="删除子任务"
                        >
                          <Icon.close />
                        </button>
                      </li>
                    )
                  })}
                </ul>

                <form onSubmit={submitSub} className="mt-2 flex items-center gap-2">
                  <input
                    value={subTitle}
                    onChange={(e) => setSubTitle(e.target.value)}
                    placeholder="添加子任务…"
                    className="flex-1 text-[13px] px-2.5 py-1.5 rounded-lg border border-white/70 bg-white/60 outline-none focus:border-[#06b6d4]"
                  />
                  <button
                    type="submit"
                    className="text-[12px] font-semibold text-white brand-gradient px-3 py-1.5 rounded-lg shrink-0"
                  >
                    添加
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {subtasks.length === 0 && !showSub && (
          <button
            onClick={() => setShowSub(true)}
            className="mt-2 text-[12px] text-[#94a3b8] hover:text-[#06b6d4] transition"
          >
            + 子任务
          </button>
        )}
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
