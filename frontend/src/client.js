import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "./config";

// Always use cloud Supabase instance for now
const supabaseUrl = CONFIG.supabaseUrl;
const supabaseAnonKey = CONFIG.supabaseAnonKey;

// Debug logging
console.log("Supabase Config:", {
  supabaseUrl,
  supabaseAnonKey: supabaseAnonKey ? "*** Configured" : "✗ Missing",
});

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg =
    "Missing required Supabase configuration. Please check your environment variables.";
  console.error(errorMsg, {
    supabaseUrl,
    supabaseAnonKey: supabaseAnonKey ? "***" : "Missing",
  });
  throw new Error(errorMsg);
}

const baseUrl = `${window.location.protocol}//${window.location.host}`;
// Configure auth options
const authOptions = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  storage: window.localStorage,
  flowType: "pkce",
  redirectTo: `${baseUrl}/loading`,
};

console.log("Using redirect URL:", authOptions.redirectTo);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: authOptions,
});
