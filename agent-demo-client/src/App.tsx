import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import TodoPage from './pages/TodoPage'
import AgentOrb from './agent/components/AgentOrb'
import { useWebSocket } from './agent'
import './App.css'

function App() {
  const { isConnected } = useWebSocket()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-semibold hover:text-primary">
              AI Task Manager
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<TodoPage />} />
      </Routes>

      <AgentOrb />
      <ToastContainer theme="dark" position="bottom-right" />
    </div>
  )
}

export default App
