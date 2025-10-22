import { useEffect, useState } from 'react'
import { useTodoStore } from '@/stores/todoStore'

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000'

interface WorkloadStats {
  total_tasks: number
  pending_tasks: number
  in_progress_tasks: number
  completed_today: number
  overdue_tasks: number
  total_estimated_hours: number
  tasks_by_priority: Record<string, number>
  completion_rate: number
  insights: string[]
}

interface TimeAnalytics {
  time_today_hours: number
  time_this_week_hours: number
  active_sessions: number
  avg_session_minutes: number
  top_tasks_today: Array<{
    id: number
    title: string
    total_minutes: number
  }>
}

export default function Dashboard() {
  const { tasks } = useTodoStore()
  const [stats, setStats] = useState<WorkloadStats | null>(null)
  const [timeStats, setTimeStats] = useState<TimeAnalytics | null>(null)

  useEffect(() => {
    fetchStats()
    fetchTimeStats()
  }, [tasks])

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/stats/workload`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchTimeStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/stats/time-analytics`)
      const data = await response.json()
      setTimeStats(data)
    } catch (error) {
      console.error('Failed to fetch time stats:', error)
    }
  }

  if (!stats) return null

  return (
    <div className="space-y-4 mb-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Tasks"
          value={stats.total_tasks}
          subtitle={`${stats.pending_tasks} pending`}
          color="blue"
        />
        <StatCard
          title="In Progress"
          value={stats.in_progress_tasks}
          subtitle={`${stats.total_estimated_hours}h estimated`}
          color="yellow"
        />
        <StatCard
          title="Completed Today"
          value={stats.completed_today}
          subtitle={`${stats.completion_rate}% rate`}
          color="green"
        />
        <StatCard
          title="Overdue"
          value={stats.overdue_tasks}
          subtitle={stats.overdue_tasks > 0 ? 'Needs attention' : 'All good!'}
          color={stats.overdue_tasks > 0 ? 'red' : 'gray'}
        />
      </div>

      {/* Time Tracking Stats */}
      {timeStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Time Today"
            value={`${timeStats.time_today_hours}h`}
            subtitle={timeStats.active_sessions > 0 ? `${timeStats.active_sessions} active` : 'No active timers'}
            color="purple"
          />
          <StatCard
            title="Time This Week"
            value={`${timeStats.time_this_week_hours}h`}
            subtitle="Total tracked"
            color="indigo"
          />
          <StatCard
            title="Avg Session"
            value={`${timeStats.avg_session_minutes}m`}
            subtitle="Per work session"
            color="cyan"
          />
          <StatCard
            title="Focus Score"
            value={timeStats.time_today_hours >= 4 ? '🔥' : timeStats.time_today_hours >= 2 ? '👍' : '💪'}
            subtitle={timeStats.time_today_hours >= 4 ? 'Excellent!' : timeStats.time_today_hours >= 2 ? 'Good work' : 'Keep going'}
            color="pink"
          />
        </div>
      )}

      {/* Top Tasks Today */}
      {timeStats && timeStats.top_tasks_today.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3">⏱️ Most Worked On Today</h3>
          <div className="space-y-2">
            {timeStats.top_tasks_today.map((task) => (
              <div key={task.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate flex-1">{task.title}</span>
                <span className="font-medium ml-2">{Math.round(task.total_minutes)} min</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Insights */}
      {stats.insights && stats.insights.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-2">💡 Insights</h3>
          <ul className="space-y-1">
            {stats.insights.map((insight, i) => (
              <li key={i} className="text-sm text-muted-foreground">• {insight}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, subtitle, color }: {
  title: string
  value: number | string
  subtitle: string
  color: string
}) {
  const colorClasses = {
    blue: 'border-blue-500 bg-blue-500/10',
    yellow: 'border-yellow-500 bg-yellow-500/10',
    green: 'border-green-500 bg-green-500/10',
    red: 'border-red-500 bg-red-500/10',
    gray: 'border-gray-500 bg-gray-500/10',
    purple: 'border-purple-500 bg-purple-500/10',
    indigo: 'border-indigo-500 bg-indigo-500/10',
    cyan: 'border-cyan-500 bg-cyan-500/10',
    pink: 'border-pink-500 bg-pink-500/10'
  }

  return (
    <div className={`border-l-4 ${colorClasses[color as keyof typeof colorClasses]} rounded-lg p-4`}>
      <div className="text-sm text-muted-foreground mb-1">{title}</div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </div>
  )
}
