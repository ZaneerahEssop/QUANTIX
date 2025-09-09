// Client-side configuration
export const CONFIG = {
  supabaseUrl: process.env.REACT_APP_SUPABASE_URL || window.env?.REACT_APP_SUPABASE_URL,
  supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY || window.env?.REACT_APP_SUPABASE_ANON_KEY,
  baseUrl: process.env.REACT_APP_BASE_URL || 
           (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
};

// Validate configuration
if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
  console.error('Missing required Supabase configuration. Please check your environment variables.');
}

// OAuth redirect URL
export const OAUTH_REDIRECT_URL = `${CONFIG.baseUrl.replace(/\/+$/, '')}/loading`;
