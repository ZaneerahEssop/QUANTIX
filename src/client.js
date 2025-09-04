import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
    "https://njhwaupliwtjrvmcjeot.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qaHdhdXBsaXd0anJ2bWNqZW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODM3ODUsImV4cCI6MjA3MjQ1OTc4NX0.0E5SlgJmtqjFV-3TcFYqj35S8TnzY4tHSjrhxleOePE"
)