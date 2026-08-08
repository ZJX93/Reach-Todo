import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import TaskCard from './TaskCard.jsx'

/**
 * 可拖拽的任务卡片：在 SortableContext 内使用。
 * 拖拽手柄为整个卡片（listeners 挂在根节点），并叠加视觉态。
 */
export default function SortableTaskCard({
  task,
  category,
  onToggle,
  onDelete,
  subtasks,
  onAddSubtask,
  onToggleSub,
  onDeleteSub,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none cursor-grab active:cursor-grabbing"
    >
      <TaskCard
        task={task}
        category={category}
        onToggle={onToggle}
        onDelete={onDelete}
        subtasks={subtasks}
        onAddSubtask={onAddSubtask}
        onToggleSub={onToggleSub}
        onDeleteSub={onDeleteSub}
      />
    </div>
  )
}
