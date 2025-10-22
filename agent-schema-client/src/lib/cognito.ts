// AWS Cognito OIDC configuration for react-oidc-context
export const oidcConfig = {
  authority: import.meta.env.VITE_COGNITO_DOMAIN || '',
  client_id: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
  redirect_uri: import.meta.env.VITE_REDIRECT_URI || window.location.origin,
  response_type: 'code',
  scope: "email openid phone",
  automaticSilentRenew: true,
  includeIdTokenInSilentRenew: true,
};

// Helper function for custom sign out with redirect
export const signOutRedirect = () => {
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || '';
  const logoutUri = import.meta.env.VITE_LOGOUT_URI || window.location.origin;
  const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN || '';
  
  window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
};