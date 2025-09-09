const isProduction = process.env.NODE_ENV === 'production';

export const BASE_URL = isProduction 
  ? 'https://quantix-production.up.railway.app/'  // Replace with your actual Railway URL
  : 'http://localhost:3000';

export const OAUTH_REDIRECT_URL = `${BASE_URL}/loading`;
