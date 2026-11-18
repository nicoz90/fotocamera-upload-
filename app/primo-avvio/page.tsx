"use client";
import { useEffect, useState } from "react";
import { Messaggio } from "@/components/ui";

export default function PrimoAvvio() {
  const [disponibile, setDisponibile] = useState<boolean | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState("");
  const [attesa, setAttesa] = useState(false);
  const [fatto, setFatto] = useState(false);

  useEffect(() => {
    fetch("/api/primo-avvio").then((r) => r.json()).then((j) => setDisponibile(j.disponibile)).catch(() => setDisponibile(false));
  }, []);

  async function crea(e: React.FormEvent) {
    e.preventDefault();
    setErrore("");
    setAttesa(true);
    const r = await fetch("/api/primo-avvio", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome, email, password }),
    });
    const j = await r.json().catch(() => ({}));
    setAttesa(false);
    if (!r.ok) return setErrore(j.errore ?? "Errore");
    setFatto(true);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink p-4">
      <div className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6">
        <div className="text-center">
          <p className="text-3xl font-black tracking-tight">LUPI <span className="rounded bg-brand px-1">GOMME</span></p>
          <p className="mt-1 font-bold">Primo avvio</p>
        </div>
        {disponibile === null && <p className="text-center text-gray-500">Controllo…</p>}
        {disponibile === false && !fatto && (
          <>
            <Messaggio tipo="info">Il titolare è già stato creato. Gli account nuovi li crea lui dall&apos;app.</Messaggio>
            <a href="/login" className="btn-brand w-full">Vai al login</a>
          </>
        )}
        {fatto && (
          <>
            <Messaggio tipo="ok">Account titolare creato. Ora accedi con email e password.</Messaggio>
            <a href="/login" className="btn-brand w-full">Accedi</a>
          </>
        )}
        {disponibile && !fatto && (
          <form onSubmit={crea} className="space-y-4">
            <p className="text-gray-600">Crea l&apos;account del <b>titolare</b>. Si fa una volta sola: dopo questa pagina si chiude.</p>
            {errore && <Messaggio>{errore}</Messaggio>}
            <label className="block"><span className="etichetta">Nome</span>
              <input className="campo" required value={nome} onChange={(e) => setNome(e.target.value)} /></label>
            <label className="block"><span className="etichetta">Email</span>
              <input className="campo" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="block"><span className="etichetta">Password (min. 10 caratteri)</span>
              <input className="campo" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button className="btn-brand w-full text-lg" disabled={attesa}>{attesa ? "Creazione…" : "Crea titolare"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
