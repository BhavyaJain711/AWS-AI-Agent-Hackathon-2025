/// <reference types="vite/client" />

import { agent } from './agent'

declare global {
  interface Window {
    agent: typeof agent
  }
}
