"use client";
import { useState } from "react";
import { erroreIt, supabase } from "@/lib/supabase/client";
import { Messaggio } from "@/components/ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState("");
  const [attesa, setAttesa] = useState(false);
  const disattivato = typeof window !== "undefined" && new URLSearchParams(location.search).has("disattivato");

  async function entra(e: React.FormEvent) {
    e.preventDefault();
    setErrore("");
    setAttesa(true);
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setErrore(erroreIt(error));
      setAttesa(false);
      return;
    }
    location.replace("/");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink p-4">
      <form onSubmit={entra} className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6">
        <div className="text-center">
          <p className="text-3xl font-black tracking-tight">LUPI <span className="rounded bg-brand px-1">GOMME</span></p>
          <p className="mt-1 text-gray-600">Magazzino – accesso riservato</p>
        </div>
        {disattivato && <Messaggio>Account disattivato. Chiedi al titolare.</Messaggio>}
        {errore && <Messaggio>{errore}</Messaggio>}
        <label className="block">
          <span className="etichetta">Email</span>
          <input className="campo" type="email" autoComplete="username" inputMode="email" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="etichetta">Password</span>
          <input className="campo" type="password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn-brand w-full text-lg" disabled={attesa}>{attesa ? "Accesso…" : "Entra"}</button>
        <p className="text-center text-sm text-gray-500">Resti collegato su questo telefono. Account e password li gestisce il titolare.</p>
      </form>
    </main>
  );
}
