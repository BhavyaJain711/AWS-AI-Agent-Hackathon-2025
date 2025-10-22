import { User } from 'oidc-client-ts';

export const isTokenExpired = (user: User | null): boolean => {
  if (!user || !user.expires_at) {
    return true;
  }
  
  // Add a 30-second buffer to account for network delays
  const bufferTime = 30;
  const currentTime = Date.now() / 1000;
  
  return user.expires_at <= (currentTime + bufferTime);
};

export const getTokenExpiryInfo = (user: User | null) => {
  if (!user || !user.expires_at) {
    return {
      isExpired: true,
      expiresAt: null,
      timeUntilExpiry: 0,
      shouldRefresh: true
    };
  }
  
  const currentTime = Date.now() / 1000;
  const timeUntilExpiry = user.expires_at - currentTime;
  const shouldRefresh = timeUntilExpiry <= 300; // Refresh if less than 5 minutes remaining
  
  return {
    isExpired: user.expires_at <= currentTime,
    expiresAt: new Date(user.expires_at * 1000),
    timeUntilExpiry: Math.max(0, timeUntilExpiry),
    shouldRefresh
  };
};

export const logTokenInfo = (user: User | null, context: string = '') => {
  const info = getTokenExpiryInfo(user);
  console.log(`Token info ${context}:`, {
    isExpired: info.isExpired,
    expiresAt: info.expiresAt?.toISOString(),
    timeUntilExpiryMinutes: Math.round(info.timeUntilExpiry / 60),
    shouldRefresh: info.shouldRefresh,
    hasIdToken: !!user?.id_token,
    hasAccessToken: !!user?.access_token,
    hasRefreshToken: !!user?.refresh_token
  });
};