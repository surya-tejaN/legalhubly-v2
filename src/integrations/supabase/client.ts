import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { env } from "@/config/env";

/**
 * Browser Supabase client for Legalhubly's own project.
 * Uses the anon/publishable key only — never service role in the frontend.
 */
export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    global: {
      headers: {
        "x-client-info": "legalhubly-web",
      },
    },
  },
);
