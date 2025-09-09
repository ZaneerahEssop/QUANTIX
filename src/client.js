import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config';

if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
  throw new Error('Missing required Supabase configuration. Please check your environment variables.');
}

export const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.sessionStorage
  }
});