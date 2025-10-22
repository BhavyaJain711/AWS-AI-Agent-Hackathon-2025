import { useEffect, useState } from 'react'
import { websocketClient } from './websocketClient'

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState('CLOSED')

  useEffect(() => {
    // Connect on mount
    websocketClient.connect()

    // Poll connection state
    const interval = setInterval(() => {
      setIsConnected(websocketClient.isConnected())
      setConnectionState(websocketClient.getState())
    }, 1000)

    return () => {
      clearInterval(interval)
      // Don't disconnect on unmount to keep connection alive
    }
  }, [])

  return {
    isConnected,
    connectionState,
    connect: () => websocketClient.connect(),
    disconnect: () => websocketClient.disconnect(),
  }
}
