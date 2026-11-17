"use client";
import { useState } from "react";
import { erroreIt, supabase } from "@/lib/supabase/client";
import { MOTIVI, MOTIVI_CARICO, MOTIVI_SCARICO, type Motivo } from "@/lib/types";
import { Messaggio } from "./ui";

/** Carico/scarico: +1 / −1 / quantità, poi un tocco sul motivo. */
export default function Movimenta({ tyreId, quantita, onFatto }: { tyreId: string; quantita: number; onFatto: (q: number) => void }) {
  const [delta, setDelta] = useState<number | null>(null);
  const [qta, setQta] = useState("");
  const [libero, setLibero] = useState<"+" | "-" | null>(null);
  const [errore, setErrore] = useState("");
  const [ok, setOk] = useState("");
  const [attesa, setAttesa] = useState(false);

  async function esegui(motivo: Motivo) {
    if (!delta) return;
    setAttesa(true);
    setErrore("");
    const { data, error } = await supabase().rpc("muovi_stock", { p_tyre: tyreId, p_delta: delta, p_motivo: motivo });
    setAttesa(false);
    if (error) return setErrore(erroreIt(error));
    navigator.vibrate?.(30);
    setOk(`${delta > 0 ? "+" : ""}${delta} · ${MOTIVI[motivo]}`);
    setDelta(null);
    setLibero(null);
    setQta("");
    onFatto(data as number);
    setTimeout(() => setOk(""), 3000);
  }

  function confermaLibero() {
    const n = Number(qta);
    if (!Number.isInteger(n) || n <= 0) return setErrore("Scrivi una quantità intera");
    setErrore("");
    setDelta(libero === "-" ? -n : n);
  }

  const motivi = delta === null ? [] : delta > 0 ? MOTIVI_CARICO : MOTIVI_SCARICO;

  return (
    <div className="space-y-3">
      {errore && <Messaggio>{errore}</Messaggio>}
      {ok && <Messaggio tipo="ok">Fatto: {ok}</Messaggio>}

      {delta === null && libero === null && (
        <div className="grid grid-cols-4 gap-2">
          <button className="btn-danger col-span-1 h-16 text-3xl" disabled={quantita === 0} onClick={() => setDelta(-1)} aria-label="Scarica 1">−1</button>
          <button className="btn-ghost h-16 text-base" disabled={quantita === 0} onClick={() => setLibero("-")}>− N</button>
          <button className="btn-ghost h-16 text-base" onClick={() => setLibero("+")}>+ N</button>
          <button className="btn h-16 bg-ok text-3xl text-white" onClick={() => setDelta(1)} aria-label="Carica 1">+1</button>
        </div>
      )}

      {libero !== null && delta === null && (
        <div className="flex gap-2">
          <input autoFocus className="campo text-2xl font-bold" inputMode="numeric" placeholder={libero === "-" ? "Quante tolgo?" : "Quante aggiungo?"}
            value={qta} onChange={(e) => setQta(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confermaLibero()} />
          <button className="btn-primary" onClick={confermaLibero}>Avanti</button>
          <button className="btn-ghost" onClick={() => { setLibero(null); setQta(""); }}>✕</button>
        </div>
      )}

      {delta !== null && (
        <div className="space-y-2 rounded-2xl border-2 border-ink p-3">
          <p className="text-lg font-extrabold">
            {delta > 0 ? `Carico +${delta}` : `Scarico ${delta}`} — perché?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {motivi.map((m) => (
              <button key={m} disabled={attesa} className={delta > 0 ? "btn bg-ok text-white" : "btn-danger"} onClick={() => esegui(m)}>
                {MOTIVI[m]}
              </button>
            ))}
          </div>
          <button className="btn-ghost w-full" onClick={() => { setDelta(null); setLibero(null); setQta(""); }}>Annulla</button>
        </div>
      )}
    </div>
  );
}
