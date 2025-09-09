import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config';

// Debug logging
console.log('Supabase Config:', {
  url: CONFIG.supabaseUrl ? '✓ Configured' : '✗ Missing',
  key: CONFIG.supabaseAnonKey ? '✓ Configured' : '✗ Missing',
  baseUrl: CONFIG.baseUrl || '✗ Missing'
});

if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
  const errorMsg = 'Missing required Supabase configuration. Please check your environment variables.';
  console.error(errorMsg, {
    supabaseUrl: CONFIG.supabaseUrl,
    supabaseAnonKey: CONFIG.supabaseAnonKey ? '***' : 'Missing',
    windowEnv: typeof window !== 'undefined' ? window.env : 'Not available'
  });
  throw new Error(errorMsg);
}

export const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.sessionStorage
  }
});