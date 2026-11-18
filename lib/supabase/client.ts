import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function supabase(): SupabaseClient {
  client ??= createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  );
  return client;
}

/** Messaggio d'errore leggibile in italiano. */
export function erroreIt(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return "Nessuna connessione. Riprova quando c'è campo.";
  if (/violates check constraint.*ean/i.test(msg)) return "EAN non valido (8-14 cifre).";
  if (/violates check constraint.*targa/i.test(msg)) return "Targa non valida.";
  if (/violates check constraint.*telefono/i.test(msg)) return "Telefono non valido.";
  if (/violates check constraint/i.test(msg)) return "Un valore non è valido. Controlla i campi.";
  if (/row-level security|permission denied/i.test(msg)) return "Non hai il permesso per questa operazione.";
  if (/Invalid login credentials/i.test(msg)) return "Email o password sbagliate.";
  if (/banned|User is banned/i.test(msg)) return "Account disattivato. Chiedi al titolare.";
  return msg;
}
