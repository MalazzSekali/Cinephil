import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

let client: ReturnType<typeof createClient<Database>> | null = null;
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Database is not configured. Add Supabase server credentials.");
  if (!client) client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
