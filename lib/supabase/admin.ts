import "server-only";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { createClient } from "@supabase/supabase-js";

/** Client con service role: SOLO lato server, solo dopo aver verificato che chi chiama è admin. */
export function supabaseAdmin() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
