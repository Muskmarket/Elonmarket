import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const CURRENT_BACKEND_URL = "https://afydkqfqzmrevhelmujn.supabase.co";
const CURRENT_BACKEND_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmeWRrcWZxem1yZXZoZWxtdWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODA0NTIsImV4cCI6MjA4NTY1NjQ1Mn0.U6Wq4FRxNrN39qWFBaG_aiuT5-0T1wN__1YNsYgM65U";

export const adminSupabase = createClient<Database>(
  CURRENT_BACKEND_URL,
  CURRENT_BACKEND_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export const getAdminFunctionUrl = (functionName: string) =>
  `${CURRENT_BACKEND_URL}/functions/v1/${functionName}`;

export const getAdminFunctionHeaders = () => ({
  "Content-Type": "application/json",
  apikey: CURRENT_BACKEND_PUBLISHABLE_KEY,
  Authorization: `Bearer ${CURRENT_BACKEND_PUBLISHABLE_KEY}`,
});
