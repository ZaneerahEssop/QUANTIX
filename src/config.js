// Get the base URL from environment variables with fallback to current origin
const getBaseUrl = () => {
  // Use REACT_APP_BASE_URL if defined, otherwise fall back to window.location.origin
  if (process.env.REACT_APP_BASE_URL) {
    return process.env.REACT_APP_BASE_URL;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
};

export const BASE_URL = getBaseUrl();

// Ensure the OAuth redirect URL is properly formatted
export const OAUTH_REDIRECT_URL = `${BASE_URL.replace(/\/+$/, '')}/loading`;
