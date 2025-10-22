import { useEffect, useMemo } from 'react'
import { useTodoStore, type Task } from '@/stores/todoStore'
import { useAgentExpose } from '@/agent'
import { toast } from 'react-toastify'
import TaskList from '@/components/todo/TaskList'
import Dashboard from '@/components/todo/Dashboard'
import CreateTaskModal from '@/components/todo/CreateTaskModal'
import TaskDetailModal from '@/components/todo/TaskDetailModal'
import FilterBar from '@/components/todo/FilterBar'

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000'

export default function TodoPage() {
  const {
    tasks,
    selectedTask,
    highlightedTaskId,
    fetchTasks,
    addTask,
    updateTask,
    removeTask,
    setSelectedTask,
    setFilters,
    setHighlightedTask
  } = useTodoStore()

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Expose actions to agent system
  useAgentExpose('todo-list', useMemo(() => ({
    // Create task
    create_task: async (params: any) => {
      try {
        const response = await fetch(`${API_URL}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        })
        const task = await response.json()
        addTask(task)
        toast.success(`Created task: ${task.title}`)
        return { success: true, task_id: task.id, task }
      } catch (error: any) {
        toast.error('Failed to create task')
        return { success: false, error: error.message }
      }
    },

    // Bulk create tasks
    bulk_create_tasks: async (params: any) => {
      try {
        const response = await fetch(`${API_URL}/api/tasks/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params.tasks)
        })
        const tasks = await response.json()
        
        // Add all tasks to store
        tasks.forEach((task: Task) => addTask(task))
        
        toast.success(`Created ${tasks.length} tasks`)
        return { 
          success: true, 
          count: tasks.length,
          task_ids: tasks.map((t: Task) => t.id),
          tasks 
        }
      } catch (error: any) {
        toast.error('Failed to create tasks')
        return { success: false, error: error.message }
      }
    },

    // Update task
    update_task: async (params: any) => {
      try {
        const { task_id, ...updates } = params
        const response = await fetch(`${API_URL}/api/tasks/${task_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })
        const task = await response.json()
        updateTask(task_id, task)
        toast.success('Task updated')
        return { success: true, task }
      } catch (error: any) {
        toast.error('Failed to update task')
        return { success: false, error: error.message }
      }
    },

    // Delete task
    delete_task: async (params: any) => {
      try {
        await fetch(`${API_URL}/api/tasks/${params.task_id}`, {
          method: 'DELETE'
        })
        removeTask(params.task_id)
        toast.success('Task deleted')
        return { success: true }
      } catch (error: any) {
        toast.error('Failed to delete task')
        return { success: false, error: error.message }
      }
    },

    // Complete task
    complete_task: async (params: any) => {
      try {
        const response = await fetch(`${API_URL}/api/tasks/${params.task_id}/complete`, {
          method: 'POST'
        })
        const task = await response.json()
        updateTask(params.task_id, task)
        toast.success('Task completed! 🎉')
        return { success: true, task }
      } catch (error: any) {
        toast.error('Failed to complete task')
        return { success: false, error: error.message }
      }
    },

    // Get tasks
    get_tasks: async (params: any = {}) => {
      try {
        const queryParams = new URLSearchParams()
        if (params.status) queryParams.append('status', params.status)
        if (params.priority) queryParams.append('priority', params.priority)
        if (params.tag) queryParams.append('tag', params.tag)
        if (params.due_today) queryParams.append('due_today', 'true')
        if (params.overdue) queryParams.append('overdue', 'true')

        const response = await fetch(`${API_URL}/api/tasks?${queryParams}`)
        const fetchedTasks = await response.json()
        return { success: true, tasks: fetchedTasks, count: fetchedTasks.length }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    },

    // Get task details
    get_task_details: async (params: any) => {
      try {
        const response = await fetch(`${API_URL}/api/tasks/${params.task_id}`)
        const task = await response.json()
        return { success: true, task }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    },

    // Create subtask
    create_subtask: async (params: any) => {
      try {
        const response = await fetch(`${API_URL}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: params.title,
            description: params.description,
            parent_task_id: params.parent_task_id
          })
        })
        const subtask = await response.json()
        await fetchTasks() // Refresh to get updated parent
        toast.success(`Created subtask: ${subtask.title}`)
        return { success: true, subtask_id: subtask.id, subtask }
      } catch (error: any) {
        toast.error('Failed to create subtask')
        return { success: false, error: error.message }
      }
    },

    // Add research notes
    add_research_notes: async (params: any) => {
      try {
        const response = await fetch(`${API_URL}/api/tasks/${params.task_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ research_data: params.research_data })
        })
        const task = await response.json()
        updateTask(params.task_id, task)
        toast.success('Research notes added')
        return { success: true, task }
      } catch (error: any) {
        toast.error('Failed to add research notes')
        return { success: false, error: error.message }
      }
    },

    // Set task dependency
    set_task_dependency: async (params: any) => {
      try {
        await fetch(`${API_URL}/api/tasks/${params.task_id}/dependencies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        })
        await fetchTasks()
        toast.success('Dependency added')
        return { success: true }
      } catch (error: any) {
        toast.error('Failed to add dependency')
        return { success: false, error: error.message }
      }
    },

    // Bulk update status
    bulk_update_status: async (params: any) => {
      try {
        await fetch(`${API_URL}/api/tasks/bulk/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        })
        await fetchTasks()
        toast.success(`Updated ${params.task_ids.length} tasks`)
        return { success: true, count: params.task_ids.length }
      } catch (error: any) {
        toast.error('Failed to bulk update')
        return { success: false, error: error.message }
      }
    },

    // Reorder tasks
    reorder_tasks: async (params: any) => {
      // This would require additional backend support
      toast.info('Task reordering noted')
      return { success: true }
    },

    // Get daily plan
    get_daily_plan: async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const response = await fetch(`${API_URL}/api/tasks?due_date=${today}`)
        const tasks = await response.json()
        return { success: true, date: today, tasks, count: tasks.length }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    },

    // Get weekly overview
    get_weekly_overview: async () => {
      try {
        const response = await fetch(`${API_URL}/api/tasks`)
        const allTasks = await response.json()
        
        // Group by week (simplified)
        const today = new Date()
        const weekTasks = allTasks.filter((task: Task) => {
          if (!task.due_date) return false
          const dueDate = new Date(task.due_date)
          const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          return diffDays >= 0 && diffDays <= 7
        })
        
        return { success: true, tasks: weekTasks, count: weekTasks.length }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    },

    // Analyze workload
    analyze_workload: async () => {
      try {
        const response = await fetch(`${API_URL}/api/tasks/stats/workload`)
        const analysis = await response.json()
        return { success: true, analysis }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    },

    // Suggest next task
    suggest_next_task: async () => {
      // Simple algorithm: highest priority, not completed, due soonest
      const availableTasks = tasks.filter(t => 
        t.status !== 'completed' && t.status !== 'archived'
      )
      
      if (availableTasks.length === 0) {
        return { success: true, message: 'No pending tasks!', task: null }
      }
      
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
      const sorted = [...availableTasks].sort((a, b) => {
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        }
        return 0
      })
      
      const suggested = sorted[0]
      setHighlightedTask(suggested.id)
      return { success: true, task: suggested, reason: 'Highest priority with nearest deadline' }
    },

    // Filter tasks
    filter_tasks: async (params: any) => {
      setFilters(params.filters)
      await fetchTasks()
      return { success: true, filters: params.filters }
    },

    // Highlight task
    highlight_task: async (params: any) => {
      setHighlightedTask(params.task_id)
      return { success: true, task_id: params.task_id }
    },

    // Open task detail
    open_task_detail: async (params: any) => {
      try {
        const response = await fetch(`${API_URL}/api/tasks/${params.task_id}`)
        const task = await response.json()
        setSelectedTask(task)
        return { success: true, task }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    },

    // Show notification
    show_notification: async (params: any) => {
      const { message, type = 'info' } = params
      switch (type) {
        case 'success': toast.success(message); break
        case 'error': toast.error(message); break
        case 'warning': toast.warning(message); break
        default: toast.info(message)
      }
      return { success: true }
    },

    // Start task timer
    start_task_timer: async (params: any) => {
      try {
        const response = await fetch(`${API_URL}/api/tasks/${params.task_id}/start`, {
          method: 'POST'
        })
        const data = await response.json()
        await fetchTasks()
        toast.success('⏱️ Timer started!')
        return { success: true, data }
      } catch (error: any) {
        toast.error('Failed to start timer')
        return { success: false, error: error.message }
      }
    },

    // Pause task timer
    pause_task_timer: async (params: any) => {
      try {
        const response = await fetch(`${API_URL}/api/tasks/${params.task_id}/pause`, {
          method: 'POST'
        })
        const data = await response.json()
        await fetchTasks()
        const duration = data.duration_minutes
        if (duration) {
          toast.success(`⏸️ Paused. Worked for ${Math.round(duration)} minutes`)
        }
        return { success: true, data }
      } catch (error: any) {
        toast.error('Failed to pause timer')
        return { success: false, error: error.message }
      }
    },

    // Get time analytics
    get_time_analytics: async () => {
      try {
        const response = await fetch(`${API_URL}/api/tasks/stats/time-analytics`)
        const analytics = await response.json()
        return { success: true, analytics }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  }), [tasks, addTask, updateTask, removeTask, fetchTasks, setSelectedTask, setFilters, setHighlightedTask]))

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">AI Task Manager</h1>
          <p className="text-muted-foreground">
            Intelligent task management powered by AI agents
          </p>
        </header>

        <Dashboard />
        
        <div className="mt-8">
          <FilterBar />
          <TaskList 
            tasks={tasks} 
            highlightedTaskId={highlightedTaskId}
            onTaskClick={async (task) => {
              // Fetch fresh task data before opening modal
              try {
                const response = await fetch(`${API_URL}/api/tasks/${task.id}`)
                const freshTask = await response.json()
                setSelectedTask(freshTask)
              } catch (error) {
                // Fallback to cached task if fetch fails
                setSelectedTask(task)
              }
            }}
            onUpdate={fetchTasks}
          />
        </div>

        <CreateTaskModal onTaskCreated={fetchTasks} />
        {selectedTask && (
          <TaskDetailModal 
            task={selectedTask} 
            onClose={() => setSelectedTask(null)}
            onUpdate={fetchTasks}
          />
        )}
      </div>
    </div>
  )
}
