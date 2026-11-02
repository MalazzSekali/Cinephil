import "server-only";
import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Database is not configured. Add Supabase server credentials.");
  if (!client) client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
