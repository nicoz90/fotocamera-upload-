import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Profilo } from "@/lib/types";

export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // chiamato da un Server Component: il refresh lo fa proxy.ts
          }
        },
      },
    },
  );
}

/** Utente loggato + profilo, oppure null. */
export async function profiloCorrente(): Promise<Profilo | null> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("profiles").select("id,email,nome,ruolo,attivo").eq("id", user.id).single();
  return (data as Profilo) ?? null;
}
