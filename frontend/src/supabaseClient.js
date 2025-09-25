// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// Frontend environment variables (must start with REACT_APP_)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Validation
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing frontend Supabase environment variables:");
  console.error("REACT_APP_SUPABASE_URL:", supabaseUrl);
  console.error("REACT_APP_SUPABASE_ANON_KEY", supabaseAnonKey);

  // You can throw an error or handle gracefully
  throw new Error("Missing Supabase configuration for frontend");
}

// Create frontend client with Anon Key (not Service Role Key!)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
