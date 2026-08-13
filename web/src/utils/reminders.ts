// 到期提醒工具：从任务列表中挑出需要弹通知的任务（逾期 / 今天 / 即将到期）。
// 仅针对顶层任务（忽略子任务），且必须是未完成。
import type { Task } from '../types'

export type DueKind = 'overdue' | 'today' | 'soon'

export interface DueItem {
  task: Task
  kind: DueKind
  diffMin?: number
}

export function getDueSoonTasks(tasks: Task[], now: Date = new Date()): DueItem[] {
  const today = now.toISOString().slice(0, 10)
  const out: DueItem[] = []
  for (const t of tasks) {
    if (t.status === 'done' || t.parent_id != null) continue
    if (!t.due_date) continue
    if (t.due_date < today) {
      out.push({ task: t, kind: 'overdue' })
    } else if (t.due_date === today) {
      if (!t.due_time) {
        out.push({ task: t, kind: 'today' })
      } else {
        const due = new Date(`${t.due_date}T${t.due_time}:00`)
        const diffMin = (due - now) / 60000
        // 到期前 15 分钟内，或刚过期 30 分钟内
        if (diffMin <= 15 && diffMin >= -30) {
          out.push({ task: t, kind: 'soon', diffMin })
        }
      }
    }
  }
  return out
}

export function kindLabel(kind: DueKind): string {
  if (kind === 'overdue') return '已逾期'
  if (kind === 'soon') return '即将到期'
  return '今天到期'
}
