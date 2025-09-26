// Client-side configuration
export const CONFIG = {
  // Check window.env first, then process.env
  supabaseUrl: (typeof window !== 'undefined' && window.env?.REACT_APP_SUPABASE_URL) || 
               process.env.REACT_APP_SUPABASE_URL,
  
  supabaseAnonKey: (typeof window !== 'undefined' && window.env?.REACT_APP_SUPABASE_ANON_KEY) || 
                   process.env.REACT_APP_SUPABASE_ANON_KEY
};

// For debugging
console.log('Supabase URL:', CONFIG.supabaseUrl ? 'Configured' : 'Missing');