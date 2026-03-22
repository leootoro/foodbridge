import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kxprmcueryahiwirokxl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cHJtY3VlcnlhaGl3aXJva3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTQwOTksImV4cCI6MjA4ODgzMDA5OX0.741gogSJ4Bt2renfSkmkO3vAYJcyO2n5WK59znFzys8";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);