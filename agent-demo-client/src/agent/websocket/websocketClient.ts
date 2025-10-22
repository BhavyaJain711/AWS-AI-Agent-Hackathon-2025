import { io, Socket } from 'socket.io-client'
import { agent } from '../agent'

type AgentCallMessage = {
  action: string
  id: string
  args?: any[]
}

type FrontendToolMessage = {
  toolCallId: string
  action: string
  id: string
  args?: any[]
}

class WebSocketClient {
  private socket: Socket | null = null
  private url: string

  constructor(url: string) {
    this.url = url
  }

  connect() {
    if (this.socket?.connected) {
      console.log('[Socket.IO] Already connected')
      return
    }

    this.socket = io(this.url, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      transports: ['websocket', 'polling'],
    })

    this.socket.on('connect', () => {
      console.log('[Socket.IO] Connected to', this.url)
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('[Socket.IO] Connection error:', error.message)
    })

    // Listen for agent function calls
    this.socket.on('agent:call', async (message: AgentCallMessage) => {
      console.log('[Socket.IO] Received agent:call:', message)

      if (message.action && message.id) {
        try {
          const result = await agent.call(message.action, message.id, ...(message.args || []))

          // Send acknowledgment back to server
          this.socket?.emit('agent:result', {
            action: message.action,
            id: message.id,
            success: true,
            result,
            timestamp: Date.now(),
          })

          console.log('[Socket.IO] Executed:', message.action, 'Result:', result)
        } catch (error) {
          console.error('[Socket.IO] Error executing action:', error)

          this.socket?.emit('agent:result', {
            action: message.action,
            id: message.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
          })
        }
      }
    })

    // Listen for agent responses
    this.socket.on('agent_response', (response: any) => {
      console.log('[Socket.IO] Received agent_response:', response)

      if (response.success) {
        // Agent processed successfully
        console.log('[Socket.IO] Agent says:', response.response)
      } else {
        console.error('[Socket.IO] Agent error:', response.error)
      }
    })

    // Listen for agent busy notifications
    this.socket.on('agent_busy', (data: any) => {
      console.warn('[Socket.IO] ⏳ Agent is busy:', data.message)
      // You could show a toast notification here
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.warning(data.message)
      }
    })

    // Listen for agent turn complete (end_turn)
    this.socket.on('agent_turn_complete', () => {
      console.log('[Socket.IO] ✅ Agent turn complete')
      // Notify that agent finished processing
      window.dispatchEvent(new CustomEvent('agent-turn-complete'))
    })

    // Listen for speak_audio events (TTS from backend)
    this.socket.on('speak_audio', (data: any) => {
      console.log('[Socket.IO] Received speak_audio:', data.message)
      this.playAudio(data.audio, data.message, data.speech_id)
    })

    // Listen for ask_user_question events (TTS question + wait for response)
    this.socket.on('ask_user_question', (data: any) => {
      console.log('[Socket.IO] Received ask_user_question:', data.question)

        // Store the request ID for when user responds
        ; (window as any).__pendingQuestionRequestId = data.request_id

      // Play the question audio without speech_id (don't send completion)
      // We'll wait for user's actual response instead
      const audio = this.playAudio(data.audio, data.question, undefined)

      // Auto-start microphone after audio finishes
      if (audio) {
        audio.onended = () => {
          // Trigger microphone start after a short delay
          setTimeout(() => {
            console.log('[Socket.IO] 🎤 Auto-starting microphone for response...')
            // Trigger global event that AgentOrb can listen to
            window.dispatchEvent(new CustomEvent('agent-start-listening'))
          }, 300) // Small delay after speech ends
        }
      }

      // Show visual indicator that agent is waiting for response
      console.log('[Socket.IO] 🎤 Agent is waiting for your response...')
    })

    // Listen for frontend tool calls (with toolCallId)
    this.socket.on('frontend_tool', async (message: FrontendToolMessage) => {
      console.log('[Socket.IO] Received frontend_tool:', message)

      if (message.action && message.id && message.toolCallId) {
        try {
          const result = await agent.call(message.action, message.id, ...(message.args || []))

          // Send tool response back to server
          this.socket?.emit('frontend_tool_response', {
            toolCallId: message.toolCallId,
            action: message.action,
            id: message.id,
            success: true,
            result,
            timestamp: Date.now(),
          })

          console.log('[Socket.IO] Tool executed:', message.action, 'Result:', result)
        } catch (error) {
          console.error('[Socket.IO] Error executing tool:', error)

          this.socket?.emit('frontend_tool_response', {
            toolCallId: message.toolCallId,
            action: message.action,
            id: message.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
          })
        }
      }
    })

    // Socket.IO handles ping/pong automatically, no manual handling needed
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    console.log('[Socket.IO] Disconnected intentionally')
  }

  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn('[Socket.IO] Cannot emit, not connected')
    }
  }

  sendUserPrompt(prompt: string) {
    // Check if this is a response to a pending question
    const pendingRequestId = (window as any).__pendingQuestionRequestId

    if (pendingRequestId) {
      // This is a response to ask_user
      this.emit('user_response', {
        request_id: pendingRequestId,
        response: prompt,
        timestamp: Date.now()
      })
      console.log('[Socket.IO] Sent user_response for request:', pendingRequestId)

      // Clear the pending request
      delete (window as any).__pendingQuestionRequestId
    } else {
      // Normal user prompt
      this.emit('user_prompt', { prompt, timestamp: Date.now() })
      console.log('[Socket.IO] Sent user_prompt:', prompt)
    }
  }

  private playAudio(audioBase64: string, message: string, speechId?: string): HTMLAudioElement | null {
    try {
      // Convert base64 to audio blob
      const audioData = atob(audioBase64)
      const arrayBuffer = new ArrayBuffer(audioData.length)
      const view = new Uint8Array(arrayBuffer)
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i)
      }

      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(blob)

      // Play audio
      const audio = new Audio(audioUrl)
      audio.play().then(() => {
        console.log('[Socket.IO] Playing audio:', message)
      }).catch((error) => {
        console.error('[Socket.IO] Failed to play audio:', error)
      })

      // Send completion notification 0.5 seconds before audio ends
      if (speechId) {
        audio.ontimeupdate = () => {
          const timeRemaining = audio.duration - audio.currentTime
          if (timeRemaining <= 0.5 && timeRemaining > 0) {
            // Send completion notification
            this.socket?.emit('speech_completed', {
              speech_id: speechId,
              timestamp: Date.now()
            })
            console.log('[Socket.IO] Speech nearly complete, notified backend')
            // Remove listener to avoid multiple notifications
            audio.ontimeupdate = null
          }
        }
      }

      // Clean up URL after playing
      const originalOnEnded = audio.onended
      audio.onended = (event) => {
        URL.revokeObjectURL(audioUrl)
        if (originalOnEnded) {
          originalOnEnded.call(audio, event)
        }
      }

      return audio
    } catch (error) {
      console.error('[Socket.IO] Error processing audio:', error)
      return null
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }

  getState(): string {
    if (!this.socket) return 'CLOSED'
    return this.socket.connected ? 'CONNECTED' : 'DISCONNECTED'
  }
}

// Singleton instance
const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000'
export const websocketClient = new WebSocketClient(serverUrl)
