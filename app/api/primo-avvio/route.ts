import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Primo avvio: crea il PRIMO titolare. Funziona solo finché nel database non esiste nessun titolare,
// poi risponde sempre 403. Dopo, gli account si creano solo dall'app (Altro → Account dipendenti).

async function esisteTitolare(): Promise<boolean> {
  const { count, error } = await supabaseAdmin()
    .from("profiles").select("id", { count: "exact", head: true }).eq("ruolo", "admin");
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function GET() {
  try {
    return NextResponse.json({ disponibile: !(await esisteTitolare()) });
  } catch {
    return NextResponse.json({ disponibile: false });
  }
}

export async function POST(req: Request) {
  const err = (msg: string, status = 400) => NextResponse.json({ errore: msg }, { status });
  try {
    if (await esisteTitolare()) return err("Il titolare esiste già. Accedi dalla pagina di login.", 403);
  } catch {
    return err("Database non raggiungibile. Hai eseguito lo schema SQL?", 500);
  }
  const { email, password, nome } = await req.json().catch(() => ({}));
  if (typeof nome !== "string" || !nome.trim()) return err("Manca il nome");
  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) return err("Email non valida");
  if (typeof password !== "string" || password.length < 10) return err("Password di almeno 10 caratteri");

  const sb = supabaseAdmin();
  const { data, error } = await sb.auth.admin.createUser({
    email: email.trim().toLowerCase(), password, email_confirm: true, user_metadata: { nome: nome.trim() },
  });
  if (error) return err(/already/i.test(error.message) ? "Email già registrata" : error.message);
  // ricontrollo: se nel frattempo qualcun altro è diventato titolare, questo resta dipendente
  if (await esisteTitolare()) return err("Il titolare esiste già.", 403);
  const up = await sb.from("profiles").update({ nome: nome.trim(), ruolo: "admin" }).eq("id", data.user.id);
  if (up.error) return err(up.error.message, 500);
  return NextResponse.json({ ok: true });
}
