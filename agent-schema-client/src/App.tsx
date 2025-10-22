import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { useAuth } from 'react-oidc-context'
import { useEffect } from 'react'
import { darkTheme } from '@/lib/theme'
import { ProtectedRoute, Layout } from '@/components'
import { routes } from '@/routes'
import { setAuthInstance } from '@/services/authAxios'
import { getTokenExpiryInfo, logTokenInfo } from '@/utils/auth'

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const auth = useAuth();

  // Set up auth instance for API calls
  useEffect(() => {
    setAuthInstance(auth);
  }, [auth]);

  // Monitor token expiration and handle automatic refresh
  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      logTokenInfo(auth.user, 'on app load');

      const tokenInfo = getTokenExpiryInfo(auth.user);
      
      // Set up a timer to refresh token before it expires
      if (!tokenInfo.isExpired && tokenInfo.timeUntilExpiry > 0) {
        // Refresh 5 minutes before expiry, but at least 1 minute from now
        const refreshTime = Math.max((tokenInfo.timeUntilExpiry - 300) * 1000, 60 * 1000);

        if (refreshTime > 0) {
          console.log(`Setting up proactive token refresh in ${Math.round(refreshTime / 1000)} seconds`);
          const refreshTimer = setTimeout(() => {
            console.log('Proactively refreshing token...');
            auth.signinSilent().then(() => {
              console.log('Proactive token refresh successful');
            }).catch((err) => {
              console.error('Proactive token refresh failed:', err);
            });
          }, refreshTime);

          return () => clearTimeout(refreshTimer);
        }
      } else if (tokenInfo.isExpired) {
        console.log('Token is already expired, attempting immediate refresh');
        auth.signinSilent().catch((err) => {
          console.error('Immediate token refresh failed:', err);
          // If refresh fails, redirect to login
          auth.signinRedirect();
        });
      }
    }
  }, [auth.isAuthenticated, auth.user, auth]);

  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Authentication Error</h1>
          <p className="text-muted-foreground">{auth.error.message}</p>
        </div>
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={darkTheme}>
          <CssBaseline />
          <Router>
            <ProtectedRoute>
              <Layout>
                <Routes>
                  {routes.map((route) => (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={route.element}
                    />
                  ))}
                </Routes>
              </Layout>
            </ProtectedRoute>
          </Router>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Multi-Agent Management UI</h1>
        <p className="text-muted-foreground mb-8">Please sign in to access your dashboard</p>
        <div className="space-x-4">
          <button 
            onClick={() => auth.signinRedirect()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

export default App