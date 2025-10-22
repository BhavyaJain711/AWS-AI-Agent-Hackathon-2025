import { useState } from 'react'
import type { Task } from '@/stores/todoStore'
import { X, Calendar, Clock, Tag, Link2, FileText, CheckCircle, Play, Pause, Trash2, Edit2, Save, Archive, RotateCcw } from 'lucide-react'
import { toast } from 'react-toastify'

interface TaskDetailModalProps {
  task: Task
  onClose: () => void
  onUpdate?: () => void
}

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000'

export default function TaskDetailModal({ task, onClose, onUpdate }: TaskDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showTimeSessions, setShowTimeSessions] = useState(false)
  const [timeSessions, setTimeSessions] = useState<any[]>([])
  const [editData, setEditData] = useState({
    title: task.title,
    description: task.description || '',
    notes: task.notes || '',
    priority: task.priority,
    status: task.status,
    task_type: task.task_type,
    due_date: task.due_date || '',
    estimated_minutes: task.estimated_minutes?.toString() || ''
  })

  const fetchTimeSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${task.id}/time-sessions`)
      const data = await response.json()
      setTimeSessions(data.sessions || [])
      setShowTimeSessions(true)
    } catch (error) {
      toast.error('Failed to fetch time sessions')
    }
  }

  const handleSave = async () => {
    try {
      const payload: any = {
        title: editData.title,
        description: editData.description || undefined,
        notes: editData.notes || undefined,
        priority: editData.priority,
        status: editData.status,
        task_type: editData.task_type,
        due_date: editData.due_date || undefined,
        estimated_minutes: editData.estimated_minutes ? parseInt(editData.estimated_minutes) : undefined
      }

      await fetch(`${API_URL}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      toast.success('Task updated')
      setIsEditing(false)
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to update task')
    }
  }

  const handleComplete = async () => {
    try {
      if (task.status === 'completed') {
        // Reopen task
        await fetch(`${API_URL}/api/tasks/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'pending' })
        })
        toast.success('Task reopened')
      } else {
        await fetch(`${API_URL}/api/tasks/${task.id}/complete`, {
          method: 'POST'
        })
        toast.success('Task completed! 🎉')
      }
      onUpdate?.()
      onClose()
    } catch (error) {
      toast.error('Failed to update task')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this task permanently?')) return

    try {
      await fetch(`${API_URL}/api/tasks/${task.id}`, {
        method: 'DELETE'
      })
      toast.success('Task deleted')
      onUpdate?.()
      onClose()
    } catch (error) {
      toast.error('Failed to delete task')
    }
  }

  const handleStatusChange = async (newStatus: string) => {
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

  const handlePriorityChange = async (newPriority: string) => {
    try {
      await fetch(`${API_URL}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      })
      toast.success(`Priority updated to ${newPriority}`)
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to update priority')
    }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4">
          <div className="flex items-start justify-between mb-3">
            {isEditing ? (
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="text-2xl font-bold bg-background border border-border rounded px-2 py-1 flex-1 mr-2"
              />
            ) : (
              <h2 className="text-2xl font-bold">{task.title}</h2>
            )}
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="p-2 bg-green-500 text-white hover:bg-green-600 rounded-lg transition-colors"
                    title="Save changes"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditData({
                        title: task.title,
                        description: task.description || '',
                        notes: task.notes || '',
                        priority: task.priority,
                        status: task.status,
                        task_type: task.task_type,
                        due_date: task.due_date || '',
                        estimated_minutes: task.estimated_minutes?.toString() || ''
                      })
                    }}
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                    title="Cancel editing"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                    title="Edit task"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {isEditing ? (
              <>
                <select
                  value={editData.priority}
                  onChange={(e) => setEditData({ ...editData, priority: e.target.value as any })}
                  className="px-2 py-1 text-xs rounded-full border border-border bg-background"
                >
                  <option value="low">LOW</option>
                  <option value="medium">MEDIUM</option>
                  <option value="high">HIGH</option>
                  <option value="urgent">URGENT</option>
                </select>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                  className="px-2 py-1 text-xs rounded-full border border-border bg-background"
                >
                  <option value="pending">PENDING</option>
                  <option value="in_progress">IN PROGRESS</option>
                  <option value="blocked">BLOCKED</option>
                  <option value="completed">COMPLETED</option>
                  <option value="archived">ARCHIVED</option>
                </select>
                <select
                  value={editData.task_type}
                  onChange={(e) => setEditData({ ...editData, task_type: e.target.value as any })}
                  className="px-2 py-1 text-xs rounded-full border border-border bg-background"
                >
                  <option value="simple">SIMPLE</option>
                  <option value="research">RESEARCH</option>
                  <option value="project">PROJECT</option>
                  <option value="recurring">RECURRING</option>
                </select>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    const priorities = ['low', 'medium', 'high', 'urgent']
                    const currentIndex = priorities.indexOf(task.priority)
                    const nextPriority = priorities[(currentIndex + 1) % priorities.length]
                    handlePriorityChange(nextPriority)
                  }}
                  className={`px-2 py-1 text-xs rounded-full hover:opacity-80 transition-opacity ${task.priority === 'urgent' ? 'bg-red-500 text-white' :
                      task.priority === 'high' ? 'bg-orange-500 text-white' :
                        task.priority === 'medium' ? 'bg-blue-500 text-white' :
                          'bg-gray-500 text-white'
                    }`}
                  title="Click to cycle priority"
                >
                  {task.priority.toUpperCase()}
                </button>
                <span className={`px-2 py-1 text-xs rounded-full ${task.status === 'completed' ? 'bg-green-500 text-white' :
                    task.status === 'in_progress' ? 'bg-blue-500 text-white' :
                      task.status === 'blocked' ? 'bg-red-500 text-white' :
                        task.status === 'archived' ? 'bg-gray-600 text-white' :
                          'bg-gray-500 text-white'
                  }`}>
                  {task.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="px-2 py-1 text-xs rounded-full bg-purple-500 text-white">
                  {task.task_type.toUpperCase()}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Description
            </h3>
            {isEditing ? (
              <textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background min-h-[100px]"
                placeholder="Add description..."
              />
            ) : (
              <p className="text-muted-foreground">{task.description || 'No description'}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <h3 className="font-semibold mb-2">Notes</h3>
            {isEditing ? (
              <textarea
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background min-h-[100px]"
                placeholder="Add notes..."
              />
            ) : (
              <p className="text-muted-foreground whitespace-pre-wrap">{task.notes || 'No notes'}</p>
            )}
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Due Date & Time
              </h4>
              {isEditing ? (
                <input
                  type="datetime-local"
                  value={editData.due_date}
                  onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                />
              ) : (
                <p className="text-muted-foreground">
                  {task.due_date ? new Date(task.due_date).toLocaleString() : 'Not set'}
                </p>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Estimated Time
              </h4>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editData.estimated_minutes}
                    onChange={(e) => setEditData({ ...editData, estimated_minutes: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                    placeholder="Minutes"
                    min="0"
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {task.estimated_minutes
                    ? `${Math.floor(task.estimated_minutes / 60)}h ${task.estimated_minutes % 60}m`
                    : 'Not set'
                  }
                </p>
              )}
            </div>
          </div>

          {/* Time Tracking */}
          {(task.actual_minutes || task.status === 'in_progress') && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-blue-500 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Tracking
              </h3>

              <div className="space-y-2">
                {task.actual_minutes && task.actual_minutes > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Tracked:</span>
                    <span className="font-medium">
                      {Math.floor(task.actual_minutes / 60)}h {task.actual_minutes % 60}m
                    </span>
                  </div>
                )}

                {task.estimated_minutes && task.actual_minutes && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">vs Estimated:</span>
                    <span className={`font-medium ${task.actual_minutes > task.estimated_minutes ? 'text-red-500' : 'text-green-500'
                      }`}>
                      {task.actual_minutes > task.estimated_minutes ? '+' : ''}
                      {Math.round(((task.actual_minutes - task.estimated_minutes) / task.estimated_minutes) * 100)}%
                    </span>
                  </div>
                )}

                {task.status === 'in_progress' && (
                  <div className="flex items-center gap-2 text-sm text-blue-500 mt-2 pt-2 border-t border-blue-500/20">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    Timer is running...
                  </div>
                )}

                {task.actual_minutes && task.actual_minutes > 0 && (
                  <button
                    onClick={fetchTimeSessions}
                    className="w-full mt-2 px-3 py-1.5 text-sm border border-blue-500/30 text-blue-500 rounded hover:bg-blue-500/10 transition-colors"
                  >
                    {showTimeSessions ? 'Hide' : 'View'} Time Sessions
                  </button>
                )}
              </div>

              {/* Time Sessions List */}
              {showTimeSessions && timeSessions.length > 0 && (
                <div className="mt-3 space-y-2">
                  <h4 className="text-sm font-medium">Work Sessions:</h4>
                  {timeSessions.map((session, index) => (
                    <div key={session.id} className="flex items-center justify-between text-sm bg-background/50 rounded p-2">
                      <div>
                        <div className="font-medium">Session {timeSessions.length - index}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(session.started_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{session.duration_minutes} min</div>
                        {session.ended_at && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(session.ended_at).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {task.tags.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {task.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Research Data */}
          {task.research_data && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-blue-500">🔬 Research Data</h3>
              <div className="space-y-2">
                <ResearchDataRenderer data={task.research_data} />
              </div>
            </div>
          )}

          {/* Subtasks */}
          {task.subtasks.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Subtasks ({task.subtasks.length})</h3>
              <div className="space-y-2">
                {task.subtasks.map(subtask => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-2 p-2 border border-border rounded"
                  >
                    <input
                      type="checkbox"
                      checked={subtask.status === 'completed'}
                      readOnly
                      className="w-4 h-4"
                    />
                    <span className={subtask.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {task.dependencies.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Dependencies
              </h3>
              <p className="text-sm text-muted-foreground">
                This task depends on {task.dependencies.length} other task(s)
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
            <p>Created: {new Date(task.created_at).toLocaleString()}</p>
            <p>Updated: {new Date(task.updated_at).toLocaleString()}</p>
            {task.completed_at && (
              <p>Completed: {new Date(task.completed_at).toLocaleString()}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t border-border">
            {/* Primary Actions */}
            <div className="flex gap-2">
              {task.status === 'completed' ? (
                <button
                  onClick={handleComplete}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reopen Task
                </button>
              ) : (
                <>
                  <button
                    onClick={handleComplete}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Complete
                  </button>

                  {task.status !== 'in_progress' ? (
                    <button
                      onClick={() => handleStatusChange('in_progress')}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Start
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange('pending')}
                      className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Pause className="w-4 h-4" />
                      Pause
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Secondary Actions */}
            <div className="flex gap-2">
              {task.status !== 'blocked' && task.status !== 'completed' && (
                <button
                  onClick={() => handleStatusChange('blocked')}
                  className="flex-1 px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  Block
                </button>
              )}
              {task.status === 'blocked' && (
                <button
                  onClick={() => handleStatusChange('pending')}
                  className="flex-1 px-4 py-2 border border-yellow-500 text-yellow-500 rounded-md hover:bg-yellow-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  Unblock
                </button>
              )}
              {task.status !== 'archived' ? (
                <button
                  onClick={() => handleStatusChange('archived')}
                  className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors flex items-center justify-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </button>
              ) : (
                <button
                  onClick={() => handleStatusChange('pending')}
                  className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Unarchive
                </button>
              )}
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Recursive component to render research data in a nice format
function ResearchDataRenderer({ data, level = 0 }: { data: any; level?: number }) {
  if (data === null || data === undefined) {
    return <span className="text-muted-foreground italic">null</span>
  }

  if (typeof data === 'string') {
    return <span className="text-sm text-foreground whitespace-pre-wrap">{data}</span>
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return <span className="text-sm text-blue-400">{String(data)}</span>
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-muted-foreground italic">empty array</span>
    }
    return (
      <ul className="space-y-1 ml-4">
        {data.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span className="text-muted-foreground">•</span>
            <div className="flex-1">
              <ResearchDataRenderer data={item} level={level + 1} />
            </div>
          </li>
        ))}
      </ul>
    )
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data)
    if (entries.length === 0) {
      return <span className="text-muted-foreground italic">empty object</span>
    }
    return (
      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className={level > 0 ? 'ml-4' : ''}>
            <div className="flex gap-2">
              <span className="text-sm font-medium text-blue-500 capitalize">
                {key.replace(/_/g, ' ')}:
              </span>
            </div>
            <div className="ml-4 mt-1">
              <ResearchDataRenderer data={value} level={level + 1} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return <span className="text-muted-foreground italic">unknown type</span>
}
