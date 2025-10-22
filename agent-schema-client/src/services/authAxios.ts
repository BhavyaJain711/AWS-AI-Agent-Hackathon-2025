import axios from 'axios';
import { useAuth } from 'react-oidc-context';
import { APP_CONFIG } from '@/utils/constants';
import { isTokenExpired, logTokenInfo } from '@/utils/auth';

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;
let retryCount = 0;
const MAX_RETRY_ATTEMPTS = 2;

// Get auth instance (will be set by the app)
let authInstance: ReturnType<typeof useAuth> | null = null;

export const setAuthInstance = (auth: ReturnType<typeof useAuth>) => {
  authInstance = auth;
};

async function refreshToken() {
  if (!authInstance) {
    throw new Error('Auth instance not available');
  }

  try {
    console.log('Attempting to refresh token...');
    
    // Check if user exists and has a refresh token
    if (!authInstance.user) {
      console.log('No user found, redirecting to login');
      authInstance.signinRedirect();
      throw new Error('AUTH_ERROR');
    }

    // For Cognito, we use signinSilent to refresh the token
    const user = await authInstance.signinSilent();
    console.log('Token refreshed successfully');
    
    retryCount = 0; // Reset retry count on success
    return user;
  } catch (err) {
    console.log('Error refreshing token:', err);
    
    // If silent refresh fails, redirect to login
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      console.log('Max retry attempts reached, redirecting to login');
      authInstance.signoutRedirect();
      throw new Error('AUTH_ERROR');
    }
    
    retryCount++;
    throw new Error('REFRESH_ERROR');
  }
}

const authAxios = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

// Add a request interceptor
authAxios.interceptors.request.use(
  (request) => {
    // Add auth token if available
    if (authInstance?.user?.id_token) {
      request.headers.Authorization = `Bearer ${authInstance.user.id_token}`;
    }
    return request;
  },
  (error) => {
    console.log('Request error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor
authAxios.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.log('Response error:', error);
    
    if (!error.response) {
      console.log('Network error - no response');
      return Promise.reject(error);
    }

    if (error.response.status === 401) {
      console.log('401 Unauthorized - token may be expired');
      
      // Check if token is expired or invalid
      const tokenExpired = isTokenExpired(authInstance?.user || null);
      
      if (tokenExpired) {
        logTokenInfo(authInstance?.user || null, 'before refresh attempt');
        console.log('Token expired, attempting refresh');
        
        if (isRefreshing) {
          // If already refreshing, wait for it to complete
          return refreshPromise!.then(() => {
            error.config.headers.Authorization = `Bearer ${authInstance?.user?.id_token}`;
            return authAxios(error.config);
          });
        } else {
          // Start refresh process
          isRefreshing = true;
          refreshPromise = refreshToken()
            .then(() => {
              isRefreshing = false;
              refreshPromise = null;
              retryCount = 0;
            })
            .catch((err) => {
              isRefreshing = false;
              refreshPromise = null;
              
              if (err.message === 'REFRESH_ERROR') {
                if (retryCount <= MAX_RETRY_ATTEMPTS) {
                  console.log(`Token refresh failed, retrying... (${retryCount}/${MAX_RETRY_ATTEMPTS})`);
                  // Wait before retry with exponential backoff
                  return new Promise((resolve, reject) => {
                    setTimeout(() => {
                      isRefreshing = true;
                      refreshToken()
                        .then(() => {
                          isRefreshing = false;
                          resolve(undefined);
                        })
                        .catch((retryErr) => {
                          isRefreshing = false;
                          reject(retryErr);
                        });
                    }, 1000 * retryCount);
                  });
                } else {
                  console.log('Max retry attempts reached');
                  retryCount = 0;
                  return Promise.reject(new Error('MAX_RETRIES_EXCEEDED'));
                }
              } else if (err.message === 'AUTH_ERROR') {
                // Already redirected to login
                return Promise.reject(err);
              } else {
                return Promise.reject(err);
              }
            });

          return refreshPromise.then(() => {
            error.config.headers.Authorization = `Bearer ${authInstance?.user?.id_token}`;
            return authAxios(error.config);
          }).catch((refreshErr) => {
            if (refreshErr.message === 'MAX_RETRIES_EXCEEDED') {
              console.log('Cancelling request due to auth issues');
              return Promise.reject(new Error('Authentication failed - request cancelled'));
            }
            return Promise.reject(refreshErr);
          });
        }
      }
    }

    return Promise.reject(error);
  }
);

export default authAxios;