import { NextResponse } from "next/server";
import { profiloCorrente } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Gestione account: SOLO il titolare. La service role key non esce mai dal server.
async function soloAdmin() {
  const p = await profiloCorrente();
  return p?.ruolo === "admin" && p.attivo ? p : null;
}

const err = (msg: string, status = 400) => NextResponse.json({ errore: msg }, { status });

export async function POST(req: Request) {
  if (!(await soloAdmin())) return err("Solo il titolare", 403);
  const { email, password, nome, ruolo } = await req.json().catch(() => ({}));
  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) return err("Email non valida");
  if (typeof password !== "string" || password.length < 10) return err("Password di almeno 10 caratteri");
  if (typeof nome !== "string" || !nome.trim()) return err("Manca il nome");
  if (ruolo !== "admin" && ruolo !== "dipendente") return err("Ruolo non valido");

  const sb = supabaseAdmin();
  const { data, error } = await sb.auth.admin.createUser({
    email: email.trim().toLowerCase(), password, email_confirm: true, user_metadata: { nome: nome.trim() },
  });
  if (error) return err(/already/i.test(error.message) ? "Email già registrata" : error.message);
  const up = await sb.from("profiles").update({ nome: nome.trim(), ruolo }).eq("id", data.user.id);
  if (up.error) return err(up.error.message, 500);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const io = await soloAdmin();
  if (!io) return err("Solo il titolare", 403);
  const { id, attivo, password, ruolo } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return err("Utente mancante");
  if (id === io.id && (attivo === false || ruolo === "dipendente")) return err("Non puoi disattivare o declassare te stesso");

  const sb = supabaseAdmin();
  if (typeof attivo === "boolean") {
    // ban = blocca subito login e refresh del token; profilo.attivo = blocca la RLS
    const r = await sb.auth.admin.updateUserById(id, { ban_duration: attivo ? "none" : "876000h" });
    if (r.error) return err(r.error.message, 500);
    const p = await sb.from("profiles").update({ attivo }).eq("id", id);
    if (p.error) return err(p.error.message, 500);
  }
  if (password !== undefined) {
    if (typeof password !== "string" || password.length < 10) return err("Password di almeno 10 caratteri");
    const r = await sb.auth.admin.updateUserById(id, { password });
    if (r.error) return err(r.error.message, 500);
  }
  if (ruolo === "admin" || ruolo === "dipendente") {
    const p = await sb.from("profiles").update({ ruolo }).eq("id", id);
    if (p.error) return err(p.error.message, 500);
  }
  return NextResponse.json({ ok: true });
}
