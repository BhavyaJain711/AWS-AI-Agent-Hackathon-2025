import { useEffect } from 'react'
import { useAgentSettingsStore } from '../store/agentSettingsStore'
import { useWebSocket } from '../websocket/useWebSocket'

interface AgentSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'ar-SA', name: 'Arabic' },
]

export default function AgentSettingsModal({ isOpen, onClose }: AgentSettingsModalProps) {
  const {
    currentState,
    setState,
    language,
    setLanguage,
    autoStopTimeout,
    setAutoStopTimeout,
    isAutoStopEnabled,
    setAutoStopEnabled,
  } = useAgentSettingsStore()

  const { isConnected, connectionState, connect, disconnect } = useWebSocket()

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Agent Settings</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* WebSocket Connection */}
          <div>
            <label className="block text-sm font-medium mb-2">WebSocket Connection</label>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm">{connectionState}</span>
              </div>
              <button
                onClick={isConnected ? disconnect : connect}
                className={`px-3 py-1 text-sm rounded ${
                  isConnected
                    ? 'bg-red-500 text-white hover:opacity-90'
                    : 'bg-green-500 text-white hover:opacity-90'
                }`}
              >
                {isConnected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {import.meta.env.VITE_SERVER_URL || 'http://localhost:8000'}
            </p>
          </div>

          {/* Current State */}
          <div>
            <label className="block text-sm font-medium mb-2">Current State</label>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  currentState === 'listening'
                    ? 'bg-blue-500'
                    : currentState === 'speaking'
                    ? 'bg-green-500'
                    : 'bg-muted'
                }`}
              />
              <span className="capitalize">{currentState}</span>
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Transcription Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-Stop Settings */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Auto-Stop Recording</label>
              <button
                onClick={() => setAutoStopEnabled(!isAutoStopEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAutoStopEnabled ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAutoStopEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Automatically stop recording after silence
            </p>

            {isAutoStopEnabled && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Silence Timeout: {autoStopTimeout / 1000}s
                </label>
                <input
                  type="range"
                  min="1000"
                  max="10000"
                  step="500"
                  value={autoStopTimeout}
                  onChange={(e) => setAutoStopTimeout(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1s</span>
                  <span>10s</span>
                </div>
              </div>
            )}
          </div>

          {/* Test States */}
          <div>
            <label className="block text-sm font-medium mb-2">Test States</label>
            <div className="flex gap-2">
              <button
                onClick={() => setState('idle')}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded hover:opacity-90"
              >
                Idle
              </button>
              <button
                onClick={() => setState('listening')}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:opacity-90"
              >
                Listening
              </button>
              <button
                onClick={() => setState('speaking')}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:opacity-90"
              >
                Speaking
              </button>
            </div>
          </div>

          {/* Speech Recognition Info */}
          <div className="bg-muted/50 rounded p-4">
            <h3 className="font-medium mb-2">Controls</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Click: Toggle microphone</li>
              <li>• Long press (500ms): Open settings</li>
              <li>• Blue border: Listening</li>
              <li>• Green border: Speaking</li>
            </ul>
          </div>

          {/* Browser Support */}
          <div className="bg-muted/50 rounded p-4">
            <h3 className="font-medium mb-2">Browser Support</h3>
            <p className="text-sm text-muted-foreground">
              {(window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
                ? '✓ Speech recognition is supported'
                : '✗ Speech recognition is not supported in your browser'}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
