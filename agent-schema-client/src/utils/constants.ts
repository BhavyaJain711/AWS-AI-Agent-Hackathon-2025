// Application constants
export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'Multi-Agent Management UI',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
} as const;

export const AWS_CONFIG = {
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  userPoolId: import.meta.env.VITE_AWS_USER_POOL_ID || '',
  userPoolWebClientId: import.meta.env.VITE_AWS_USER_POOL_WEB_CLIENT_ID || '',
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  AGENTS: '/agents',
  SETTINGS: '/settings',
} as const;