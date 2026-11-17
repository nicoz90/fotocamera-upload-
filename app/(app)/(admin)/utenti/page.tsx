"use client";
import { useCallback, useEffect, useState } from "react";
import { erroreIt, supabase } from "@/lib/supabase/client";
import type { Profilo, Ruolo } from "@/lib/types";
import { useProfilo } from "@/components/Profilo";
import { Chip, Messaggio, Testata } from "@/components/ui";

async function chiama(metodo: "POST" | "PATCH", corpo: object) {
  const r = await fetch("/api/admin/utenti", { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.errore ?? "Errore");
}

function passwordCasuale() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const a = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(a, (n) => c[n % c.length]).join("");
}

export default function Utenti() {
  const io = useProfilo();
  const [lista, setLista] = useState<Profilo[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(passwordCasuale);
  const [ruolo, setRuolo] = useState<Ruolo>("dipendente");
  const [errore, setErrore] = useState("");
  const [ok, setOk] = useState("");

  const carica = useCallback(async () => {
    const { data, error } = await supabase().from("profiles").select("*").order("attivo", { ascending: false }).order("nome");
    if (error) return setErrore(erroreIt(error));
    setLista(data as Profilo[]);
  }, []);
  useEffect(() => { carica(); }, [carica]);

  async function azione(fn: () => Promise<void>, msg: string) {
    setErrore(""); setOk("");
    try { await fn(); setOk(msg); carica(); } catch (e) { setErrore((e as Error).message); }
  }

  function crea(e: React.FormEvent) {
    e.preventDefault();
    const pw = password;
    azione(async () => {
      await chiama("POST", { nome, email, password: pw, ruolo });
      setNome(""); setEmail(""); setPassword(passwordCasuale()); setRuolo("dipendente");
    }, `Account creato. Comunica a ${nome} email e password: ${pw}`);
  }

  return (
    <main>
      <Testata titolo="Account" indietro="/altro" />
      <div className="space-y-4 p-3">
        {errore && <Messaggio>{errore}</Messaggio>}
        {ok && <Messaggio tipo="ok">{ok}</Messaggio>}

        <ul className="space-y-2">
          {lista.map((u) => (
            <li key={u.id} className={`card space-y-2 ${u.attivo ? "" : "opacity-60"}`}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{u.nome || "—"} {u.id === io.id && <span className="text-sm text-gray-500">(tu)</span>}</p>
                  <p className="truncate text-sm text-gray-600">{u.email}</p>
                </div>
                <span className={`rounded-md px-2 py-1 text-sm font-bold ${u.ruolo === "admin" ? "bg-brand" : "bg-gray-200"}`}>
                  {u.ruolo === "admin" ? "Titolare" : "Dipendente"}
                </span>
              </div>
              {u.id !== io.id && (
                <div className="grid grid-cols-2 gap-2">
                  <button className={u.attivo ? "btn-danger" : "btn bg-ok text-white"}
                    onClick={() => azione(() => chiama("PATCH", { id: u.id, attivo: !u.attivo }), u.attivo ? `${u.nome} disattivato` : `${u.nome} riattivato`)}>
                    {u.attivo ? "Disattiva" : "Riattiva"}
                  </button>
                  <button className="btn-ghost" onClick={() => {
                    const pw = passwordCasuale();
                    if (confirm(`Nuova password per ${u.nome}?`)) azione(() => chiama("PATCH", { id: u.id, password: pw }), `Nuova password di ${u.nome}: ${pw}`);
                  }}>Nuova password</button>
                </div>
              )}
            </li>
          ))}
        </ul>

        <form onSubmit={crea} className="card space-y-3">
          <h2 className="text-lg font-extrabold">Nuovo account</h2>
          <label className="block"><span className="etichetta">Nome</span>
            <input className="campo" required value={nome} onChange={(e) => setNome(e.target.value)} /></label>
          <label className="block"><span className="etichetta">Email</span>
            <input className="campo" type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="block"><span className="etichetta">Password iniziale</span>
            <input className="campo font-mono" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <div className="flex gap-2">
            <Chip attivo={ruolo === "dipendente"} onClick={() => setRuolo("dipendente")}>Dipendente</Chip>
            <Chip attivo={ruolo === "admin"} onClick={() => setRuolo("admin")}>Titolare</Chip>
          </div>
          <button className="btn-brand w-full">Crea account</button>
        </form>
      </div>
    </main>
  );
}
