import { useState, useEffect, useRef } from 'react'
import { useAgentSettingsStore } from '../store/agentSettingsStore'
import { websocketClient } from '../websocket/websocketClient'
import AgentSettingsModal from './AgentSettingsModal'

export default function AgentOrb() {
  const { currentState, setState, language, autoStopTimeout, isAutoStopEnabled } =
    useAgentSettingsStore()
  const [isRecording, setIsRecording] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)

  const longPressTimer = useRef<number | undefined>(undefined)
  const recognitionRef = useRef<any>(null)
  const autoStopTimer = useRef<number | undefined>(undefined)
  const lastSpeechTime = useRef<number>(Date.now())
  const transcriptRef = useRef<string>('')

  // Listen for auto-start events from websocket
  useEffect(() => {
    const handleAutoStart = () => {
      if (!isRecording) {
        console.log('[AgentOrb] Auto-starting microphone for agent question')
        if (recognitionRef.current) {
          recognitionRef.current.start()
        }
      }
    }

    const handleTurnComplete = () => {
      // Agent turn complete (end_turn), stop waiting animation
      console.log('[AgentOrb] Agent turn complete, stopping waiting animation')
      setIsWaitingForResponse(false)
    }

    window.addEventListener('agent-start-listening', handleAutoStart)
    window.addEventListener('agent-turn-complete', handleTurnComplete)
    return () => {
      window.removeEventListener('agent-start-listening', handleAutoStart)
      window.removeEventListener('agent-turn-complete', handleTurnComplete)
    }
  }, [isRecording])

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = language

      recognition.onstart = () => {
        setState('listening')
        setIsRecording(true)
        lastSpeechTime.current = Date.now()
        transcriptRef.current = '' // Clear transcript on start
        setTranscript('')
      }

      recognition.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        // Accumulate final transcripts
        if (finalTranscript) {
          transcriptRef.current += finalTranscript
        }

        // Display current transcript (accumulated + interim)
        const currentTranscript = transcriptRef.current + interimTranscript
        setTranscript(currentTranscript)

        // Update last speech time when we get results
        if (currentTranscript.trim()) {
          lastSpeechTime.current = Date.now()
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setState('idle')
        setIsRecording(false)
      }

      recognition.onend = () => {
        setState('idle')
        setIsRecording(false)
        if (autoStopTimer.current) {
          clearInterval(autoStopTimer.current)
        }

        // Send final transcript to server if not empty
        const finalTranscript = transcriptRef.current.trim()
        if (finalTranscript) {
          console.log('[AgentOrb] Sending user prompt:', finalTranscript)
          setIsWaitingForResponse(true) // Start waiting animation
          websocketClient.sendUserPrompt(finalTranscript)
        }

        // Clear transcript after sending
        transcriptRef.current = ''
        setTranscript('')
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (autoStopTimer.current) {
        clearInterval(autoStopTimer.current)
      }
    }
  }, [language, setState])

  // Auto-stop timer
  useEffect(() => {
    if (isRecording && isAutoStopEnabled) {
      autoStopTimer.current = window.setInterval(() => {
        const timeSinceLastSpeech = Date.now() - lastSpeechTime.current
        if (timeSinceLastSpeech >= autoStopTimeout) {
          if (recognitionRef.current) {
            recognitionRef.current.stop()
          }
        }
      }, 500)
    }

    return () => {
      if (autoStopTimer.current) {
        clearInterval(autoStopTimer.current)
      }
    }
  }, [isRecording, isAutoStopEnabled, autoStopTimeout])

  const handleMouseDown = () => {
    longPressTimer.current = window.setTimeout(() => {
      setShowSettings(true)
    }, 500)
  }

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
  }

  const handleClick = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }

    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser')
      return
    }

    if (isRecording) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.start()
    }
  }

  const getBorderColor = () => {
    if (isWaitingForResponse) {
      return 'border-yellow-500'
    }
    switch (currentState) {
      case 'listening':
        return 'border-blue-500'
      case 'speaking':
        return 'border-green-500'
      default:
        return 'border-muted'
    }
  }

  const getAnimation = () => {
    if (isWaitingForResponse) {
      return 'animate-pulse'
    }
    switch (currentState) {
      case 'listening':
        return 'animate-pulse'
      case 'speaking':
        return 'animate-spin'
      default:
        return ''
    }
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        {/* Transcript Display */}
        {transcript && (
          <div className="absolute bottom-20 right-0 bg-card border border-border rounded-lg p-3 max-w-xs mb-2 shadow-lg">
            <p className="text-sm">{transcript}</p>
          </div>
        )}

        {/* Orb */}
        <button
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          className={`
            relative w-16 h-16 rounded-full 
            bg-gradient-to-br from-primary to-primary/70
            border-4 ${getBorderColor()} ${getAnimation()}
            shadow-lg hover:shadow-xl
            transition-all duration-300
            flex items-center justify-center
            cursor-pointer
            group
          `}
        >
          {/* Microphone Icon */}
          <svg
            className={`w-8 h-8 text-primary-foreground transition-transform ${isRecording ? 'scale-110' : 'scale-100'
              }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isRecording ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            )}
          </svg>

          {/* Pulse Effect */}
          {currentState === 'listening' && (
            <span className="absolute inset-0 rounded-full bg-blue-500 opacity-20 animate-ping" />
          )}
        </button>

        {/* Status Indicator */}
        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-background border-2 border-background">
          <div
            className={`w-full h-full rounded-full ${currentState === 'listening'
                ? 'bg-blue-500'
                : currentState === 'speaking'
                  ? 'bg-green-500'
                  : 'bg-muted'
              }`}
          />
        </div>
      </div>

      <AgentSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  )
}
