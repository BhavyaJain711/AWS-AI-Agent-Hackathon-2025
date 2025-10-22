import { create } from 'zustand'

export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type Status = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'archived'
export type TaskType = 'simple' | 'research' | 'project' | 'recurring'

export interface ResearchData {
  steps?: string[]
  prerequisites?: string[]
  resources?: string[]
  notes?: string
}

export interface Task {
  id: number
  title: string
  description?: string
  notes?: string
  priority: Priority
  status: Status
  task_type: TaskType
  due_date?: string
  estimated_minutes?: number
  actual_minutes?: number
  created_at: string
  updated_at: string
  completed_at?: string
  parent_task_id?: number
  research_data?: ResearchData
  ai_insights?: Record<string, any>
  tags: string[]
  subtasks: Task[]
  dependencies: number[]
}

export interface TaskFilters {
  status?: Status
  priority?: Priority
  tag?: string
  due_today?: boolean
  overdue?: boolean
}

interface TodoStore {
  tasks: Task[]
  selectedTask: Task | null
  filters: TaskFilters
  highlightedTaskId: number | null
  loading: boolean
  
  // Actions
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (taskId: number, updates: Partial<Task>) => void
  removeTask: (taskId: number) => void
  setSelectedTask: (task: Task | null) => void
  setFilters: (filters: TaskFilters) => void
  setHighlightedTask: (taskId: number | null) => void
  setLoading: (loading: boolean) => void
  
  // Fetch from API
  fetchTasks: () => Promise<void>
  fetchTask: (taskId: number) => Promise<Task | null>
}

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000'

export const useTodoStore = create<TodoStore>((set, get) => ({
  tasks: [],
  selectedTask: null,
  filters: {},
  highlightedTaskId: null,
  loading: false,
  
  setTasks: (tasks) => set({ tasks }),
  
  addTask: (task) => set((state) => ({ 
    tasks: [...state.tasks, task] 
  })),
  
  updateTask: (taskId, updates) => set((state) => ({
    tasks: state.tasks.map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    ),
    selectedTask: state.selectedTask?.id === taskId 
      ? { ...state.selectedTask, ...updates }
      : state.selectedTask
  })),
  
  removeTask: (taskId) => set((state) => ({
    tasks: state.tasks.filter(t => t.id !== taskId),
    selectedTask: state.selectedTask?.id === taskId ? null : state.selectedTask
  })),
  
  setSelectedTask: (task) => set({ selectedTask: task }),
  
  setFilters: (filters) => set({ filters }),
  
  setHighlightedTask: (taskId) => {
    set({ highlightedTaskId: taskId })
    // Auto-clear highlight after 3 seconds
    if (taskId !== null) {
      setTimeout(() => {
        if (get().highlightedTaskId === taskId) {
          set({ highlightedTaskId: null })
        }
      }, 3000)
    }
  },
  
  setLoading: (loading) => set({ loading }),
  
  fetchTasks: async () => {
    set({ loading: true })
    try {
      const params = new URLSearchParams()
      const filters = get().filters
      
      if (filters.status) params.append('status', filters.status)
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.tag) params.append('tag', filters.tag)
      if (filters.due_today) params.append('due_today', 'true')
      if (filters.overdue) params.append('overdue', 'true')
      
      const response = await fetch(`${API_URL}/api/tasks?${params}`)
      const tasks = await response.json()
      set({ tasks, loading: false })
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      set({ loading: false })
    }
  },
  
  fetchTask: async (taskId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`)
      if (response.ok) {
        const task = await response.json()
        return task
      }
      return null
    } catch (error) {
      console.error('Failed to fetch task:', error)
      return null
    }
  }
}))
