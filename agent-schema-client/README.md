# Multi-Agent Management UI

A modern React application for managing multiple AI agents with authentication, real-time monitoring, and intuitive user interface.

## Tech Stack

- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **UI Libraries**: 
  - shadcn/ui (component library)
  - Material-UI (MUI)
  - Aceternity UI (modern components)
  - Tailwind CSS (styling)
- **State Management**: Zustand
- **Authentication**: AWS Cognito
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router DOM
- **Animations**: Framer Motion

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   └── index.ts        # Component exports
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── services/           # API services and external integrations
├── stores/             # Zustand state stores
├── types/              # TypeScript type definitions
├── utils/              # Utility functions and constants
├── lib/                # Third-party library configurations
└── assets/             # Static assets
```

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your AWS Cognito and API configuration.

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## Environment Variables

- `VITE_COGNITO_DOMAIN`: AWS Cognito domain (e.g., https://your-domain.auth.region.amazoncognito.com)
- `VITE_COGNITO_CLIENT_ID`: Cognito App Client ID
- `VITE_REDIRECT_URI`: Redirect URI after login (e.g., http://localhost:5173)
- `VITE_LOGOUT_URI`: Redirect URI after logout (e.g., http://localhost:5173)
- `VITE_API_BASE_URL`: Backend API base URL

## Features

- 🔐 AWS Cognito authentication
- 🎨 Modern dark theme UI
- 📱 Responsive design
- 🔄 Real-time agent monitoring
- 📊 Agent performance analytics
- ⚡ Fast development with Vite
- 🎯 Type-safe with TypeScript