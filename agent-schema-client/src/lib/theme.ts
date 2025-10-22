import { createTheme } from '@mui/material/styles';

// Create a dark theme for MUI components
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6', // Blue
    },
    secondary: {
      main: '#8b5cf6', // Purple
    },
    background: {
      default: '#0f172a', // Dark slate
      paper: '#1e293b', // Slate
    },
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
    },
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#6b7280 #2d3748',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            backgroundColor: '#2d3748',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#6b7280',
            minHeight: 24,
            border: '3px solid #2d3748',
          },
          '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus': {
            backgroundColor: '#959ca9',
          },
          '&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active': {
            backgroundColor: '#959ca9',
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#959ca9',
          },
          '&::-webkit-scrollbar-corner, & *::-webkit-scrollbar-corner': {
            backgroundColor: '#2d3748',
          },
        },
      },
    },
  },
});