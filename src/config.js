// Client-side configuration
export const CONFIG = {
  // Check window.env first, then process.env
  supabaseUrl: (typeof window !== 'undefined' && window.env?.REACT_APP_SUPABASE_URL) || 
               process.env.REACT_APP_SUPABASE_URL,
  
  supabaseAnonKey: (typeof window !== 'undefined' && window.env?.REACT_APP_SUPABASE_ANON_KEY) || 
                   process.env.REACT_APP_SUPABASE_ANON_KEY,
  
  baseUrl: (typeof window !== 'undefined' && window.env?.REACT_APP_BASE_URL) || 
           process.env.REACT_APP_BASE_URL ||
           (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
};

// For debugging
console.log('Supabase URL:', CONFIG.supabaseUrl ? 'Configured' : 'Missing');

// OAuth redirect URL
export const OAUTH_REDIRECT_URL = `${CONFIG.baseUrl.replace(/\/+$/, '')}/loading`;
