import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config';

// Always use cloud Supabase instance for now
const supabaseUrl = CONFIG.supabaseUrl;
const supabaseAnonKey = CONFIG.supabaseAnonKey;

// Debug logging
console.log('Supabase Config:', {
  supabaseUrl,
  supabaseAnonKey: supabaseAnonKey ? '*** Configured' : '✗ Missing',
  baseUrl: CONFIG.baseUrl
});

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = 'Missing required Supabase configuration. Please check your environment variables.';
  console.error(errorMsg, {
    supabaseUrl,
    supabaseAnonKey: supabaseAnonKey ? '***' : 'Missing'
  });
  throw new Error(errorMsg);
}

// Configure auth options
const authOptions = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  storage: window.sessionStorage
};

// Ensure proper redirect URL
const baseUrl = CONFIG.baseUrl || window.location.origin;
authOptions.flowType = 'pkce';
authOptions.redirectTo = `${baseUrl}/loading`;

console.log('Using redirect URL:', authOptions.redirectTo);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: authOptions
});