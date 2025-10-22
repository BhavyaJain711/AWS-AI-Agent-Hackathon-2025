import { useAuth as useOidcAuth } from 'react-oidc-context';
import { signOutRedirect } from '@/lib/cognito';

export const useAuth = () => {
  const auth = useOidcAuth();

  const signOutWithRedirect = () => {
    signOutRedirect();
  };

  const getAccessToken = () => {
    return auth.user?.access_token;
  };

  const getUserInfo = () => {
    return {
      email: auth.user?.profile?.email,
      name: auth.user?.profile?.name || auth.user?.profile?.email,
      sub: auth.user?.profile?.sub,
    };
  };

  const isTokenExpired = () => {
    if (!auth.user?.expires_at) return true;
    return Date.now() >= auth.user.expires_at * 1000;
  };

  return {
    // Original auth methods
    ...auth,
    
    // Enhanced methods
    signOutWithRedirect,
    getAccessToken,
    getUserInfo,
    isTokenExpired,
    
    // Convenient properties
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
  };
};