import { useTodoStore } from '@/stores/todoStore'
import { Filter, X, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'react-toastify'

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000'

export default function FilterBar() {
  const { filters, setFilters, fetchTasks, tasks } = useTodoStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleFilterChange = async (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    await fetchTasks()
  }

  const clearFilters = async () => {
    setFilters({})
    await fetchTasks()
  }

  const hasFilters = Object.keys(filters).length > 0

  const handleDeleteAll = async () => {
    try {
      // Get all task IDs
      const taskIds = tasks.map(t => t.id)
      
      if (taskIds.length === 0) {
        toast.info('No tasks to delete')
        return
      }

      // Delete all tasks
      await Promise.all(
        taskIds.map(id => 
          fetch(`${API_URL}/api/tasks/${id}`, { method: 'DELETE' })
        )
      )

      toast.success(`Deleted ${taskIds.length} tasks`)
      await fetchTasks()
      setShowDeleteConfirm(false)
    } catch (error) {
      toast.error('Failed to delete tasks')
      console.error(error)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4" />
        <h3 className="font-semibold">Filters</h3>
        <div className="ml-auto flex items-center gap-2">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
            title="Delete all tasks"
          >
            <Trash2 className="w-3 h-3" />
            Delete All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <select
          value={filters.status || ''}
          onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
          className="px-3 py-2 border border-border rounded-md bg-background text-sm"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="completed">Completed</option>
        </select>

        <select
          value={filters.priority || ''}
          onChange={(e) => handleFilterChange('priority', e.target.value || undefined)}
          className="px-3 py-2 border border-border rounded-md bg-background text-sm"
        >
          <option value="">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <button
          onClick={() => handleFilterChange('due_today', !filters.due_today)}
          className={`px-3 py-2 border rounded-md text-sm transition-colors ${
            filters.due_today
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border bg-background hover:bg-accent'
          }`}
        >
          Due Today
        </button>

        <button
          onClick={() => handleFilterChange('overdue', !filters.overdue)}
          className={`px-3 py-2 border rounded-md text-sm transition-colors ${
            filters.overdue
              ? 'bg-red-500 text-white border-red-500'
              : 'border-border bg-background hover:bg-accent'
          }`}
        >
          Overdue
        </button>

        <input
          type="text"
          placeholder="Filter by tag..."
          value={filters.tag || ''}
          onChange={(e) => handleFilterChange('tag', e.target.value || undefined)}
          className="px-3 py-2 border border-border rounded-md bg-background text-sm"
        />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete All Tasks?</h3>
            <p className="text-muted-foreground mb-4">
              This will permanently delete all {tasks.length} tasks. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-border rounded-md hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
