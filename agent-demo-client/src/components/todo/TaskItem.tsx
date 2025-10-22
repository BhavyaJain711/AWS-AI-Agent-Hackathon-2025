import type { Task } from '@/stores/todoStore'
import { CheckCircle2, Circle, Clock, AlertCircle, Trash2, Edit } from 'lucide-react'
import { toast } from 'react-toastify'

interface TaskItemProps {
  task: Task
  isHighlighted: boolean
  onClick: () => void
  onUpdate?: () => void
}

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000'

export default function TaskItem({ task, isHighlighted, onClick, onUpdate }: TaskItemProps) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
  const isDueToday = task.due_date && task.due_date === new Date().toISOString().split('T')[0]

  const statusColors = {
    pending: 'border-gray-300',
    in_progress: 'border-blue-500 bg-blue-500/5',
    blocked: 'border-red-500 bg-red-500/5',
    completed: 'border-green-500 bg-green-500/5 opacity-60',
    archived: 'border-gray-300 opacity-40'
  }

  const priorityColors = {
    low: 'text-gray-500',
    medium: 'text-blue-500',
    high: 'text-orange-500',
    urgent: 'text-red-500'
  }

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (task.status === 'completed') {
        // Reset to pending
        await fetch(`${API_URL}/api/tasks/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'pending' })
        })
        toast.success('Task reopened')
      } else {
        // Mark as completed
        await fetch(`${API_URL}/api/tasks/${task.id}/complete`, {
          method: 'POST'
        })
        toast.success('Task completed! 🎉')
      }
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to update task')
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this task?')) return
    
    try {
      await fetch(`${API_URL}/api/tasks/${task.id}`, {
        method: 'DELETE'
      })
      toast.success('Task deleted')
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to delete task')
    }
  }

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`${API_URL}/api/tasks/${task.id}/start`, {
        method: 'POST'
      })
      toast.success('⏱️ Timer started!')
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to start task')
    }
  }

  const handlePause = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await fetch(`${API_URL}/api/tasks/${task.id}/pause`, {
        method: 'POST'
      })
      const data = await response.json()
      const duration = data.duration_minutes
      if (duration) {
        toast.success(`⏸️ Paused. Worked for ${Math.round(duration)} minutes`)
      } else {
        toast.success('Task paused')
      }
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to pause task')
    }
  }

  const handleStatusChange = async (e: React.MouseEvent, newStatus: string) => {
    e.stopPropagation()
    try {
      await fetch(`${API_URL}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`)
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  return (
    <div
      onClick={onClick}
      className={`
        border rounded-lg p-4 cursor-pointer transition-all
        hover:shadow-md hover:border-primary
        ${statusColors[task.status]}
        ${isHighlighted ? 'ring-2 ring-primary ring-offset-2 animate-pulse' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon - Clickable */}
        <button
          onClick={handleToggleComplete}
          className="mt-1 hover:scale-110 transition-transform"
          title={task.status === 'completed' ? 'Reopen task' : 'Complete task'}
        >
          {task.status === 'completed' ? (
            <CheckCircle2 className="w-5 h-5 text-green-500 hover:text-gray-500" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground hover:text-green-500" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/*show task id */}
            <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              #{task.id}
            </span>
            </div>

          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-semibold ${task.status === 'completed' ? 'line-through' : ''}`}>
              {task.title}
            </h4>
            <span className={`text-xs font-medium ${priorityColors[task.priority]}`}>
              {task.priority.toUpperCase()}
            </span>
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
            {task.due_date && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : isDueToday ? 'text-blue-500 font-medium' : ''}`}>
                <Clock className="w-3 h-3" />
                {new Date(task.due_date).toLocaleString()}
                {isOverdue && ' (Overdue)'}
                {isDueToday && ' (Today)'}
              </div>
            )}

            {task.estimated_minutes && (
              <div className="flex items-center gap-1">
                ⏱️ Est: {Math.floor(task.estimated_minutes / 60)}h {task.estimated_minutes % 60}m
              </div>
            )}

            {task.actual_minutes && task.actual_minutes > 0 && (
              <div className="flex items-center gap-1 text-blue-500 font-medium">
                ⏲️ Tracked: {Math.round(task.actual_minutes / 60)}h {task.actual_minutes % 60}m
              </div>
            )}

            {task.subtasks.length > 0 && (
              <div className="flex items-center gap-1">
                📋 {task.subtasks.filter(s => s.status === 'completed').length}/{task.subtasks.length} subtasks
              </div>
            )}

            {task.dependencies.length > 0 && (
              <div className="flex items-center gap-1">
                🔗 {task.dependencies.length} dependencies
              </div>
            )}

            {task.status === 'blocked' && (
              <div className="flex items-center gap-1 text-red-500">
                <AlertCircle className="w-3 h-3" />
                Blocked
              </div>
            )}
          </div>

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Research indicator */}
          {task.research_data && (
            <div className="mt-2 text-xs text-blue-500 flex items-center gap-1">
              🔬 Research data available
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-1 ml-2">
          {/* Status Actions */}
          {task.status !== 'completed' && task.status !== 'archived' && (
            <div className="flex gap-1">
              {task.status !== 'in_progress' && (
                <button
                  onClick={handleStart}
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  title="Start working (starts timer)"
                >
                  ▶ Start
                </button>
              )}
              {task.status === 'in_progress' && (
                <button
                  onClick={handlePause}
                  className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  title="Pause (stops timer)"
                >
                  ⏸ Pause
                </button>
              )}
              {task.status === 'blocked' && (
                <button
                  onClick={(e) => handleStatusChange(e, 'pending')}
                  className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                  title="Unblock"
                >
                  Unblock
                </button>
              )}
            </div>
          )}
          
          {/* Main Actions */}
          <div className="flex gap-1">
            <button
              onClick={onClick}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
              title="View details"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
