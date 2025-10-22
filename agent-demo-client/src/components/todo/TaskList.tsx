import type { Task } from '@/stores/todoStore'
import TaskItem from './TaskItem'

interface TaskListProps {
  tasks: Task[]
  highlightedTaskId: number | null
  onTaskClick: (task: Task) => void
  onUpdate?: () => void
}

export default function TaskList({ tasks, highlightedTaskId, onTaskClick, onUpdate }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 bg-card border border-border rounded-lg">
        <p className="text-muted-foreground text-lg">No tasks found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Try asking the AI agent to create some tasks!
        </p>
      </div>
    )
  }

  // Group by priority
  const grouped = tasks.reduce((acc, task) => {
    if (!acc[task.priority]) acc[task.priority] = []
    acc[task.priority].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  const priorityOrder = ['urgent', 'high', 'medium', 'low']

  return (
    <div className="space-y-6">
      {priorityOrder.map(priority => {
        const priorityTasks = grouped[priority]
        if (!priorityTasks || priorityTasks.length === 0) return null

        return (
          <div key={priority}>
            <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">
              {priority} Priority ({priorityTasks.length})
            </h3>
            <div className="space-y-2">
              {priorityTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isHighlighted={task.id === highlightedTaskId}
                  onClick={() => onTaskClick(task)}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
