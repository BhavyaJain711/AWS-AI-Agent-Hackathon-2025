import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AgentState = 'idle' | 'listening' | 'speaking'

interface AgentSettings {
  language: string
  autoStopTimeout: number // in milliseconds
  isAutoStopEnabled: boolean
}

interface AgentSettingsStore extends AgentSettings {
  currentState: AgentState
  setLanguage: (language: string) => void
  setAutoStopTimeout: (timeout: number) => void
  setAutoStopEnabled: (enabled: boolean) => void
  setState: (state: AgentState) => void
}

export const useAgentSettingsStore = create<AgentSettingsStore>()(
  persist(
    (set) => ({
      // Settings
      language: 'en-US',
      autoStopTimeout: 3000,
      isAutoStopEnabled: true,

      // State
      currentState: 'idle',

      // Actions
      setLanguage: (language) => set({ language }),
      setAutoStopTimeout: (timeout) => set({ autoStopTimeout: timeout }),
      setAutoStopEnabled: (enabled) => set({ isAutoStopEnabled: enabled }),
      setState: (state) => set({ currentState: state }),
    }),
    {
      name: 'agent-settings',
      partialize: (state) => ({
        language: state.language,
        autoStopTimeout: state.autoStopTimeout,
        isAutoStopEnabled: state.isAutoStopEnabled,
      }),
    }
  )
)
