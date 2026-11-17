"use client";
import { useCallback, useEffect, useState } from "react";
import { erroreIt, supabase } from "@/lib/supabase/client";
import { formatMisura, parseMisura, sizeKey } from "@/lib/misura";
import { Messaggio, Testata } from "@/components/ui";

interface Soglia { size_key: string; larghezza: number; serie: number; diametro: number; min_qty: number }

export default function Impostazioni() {
  const [dotAnni, setDotAnni] = useState("5");
  const [mesi, setMesi] = useState("12");
  const [soglie, setSoglie] = useState<Soglia[]>([]);
  const [misura, setMisura] = useState("");
  const [minimo, setMinimo] = useState("4");
  const [errore, setErrore] = useState("");
  const [ok, setOk] = useState("");

  const carica = useCallback(async () => {
    const sb = supabase();
    const [{ data: imp }, { data: s }] = await Promise.all([
      sb.from("impostazioni").select("*").single(),
      sb.from("soglie").select("*").order("size_key"),
    ]);
    if (imp) { setDotAnni(String(imp.dot_anni)); setMesi(String(imp.mesi_conservazione_depositi)); }
    setSoglie((s as Soglia[]) ?? []);
  }, []);
  useEffect(() => { carica(); }, [carica]);

  const avvisa = (m: string) => { setOk(m); setErrore(""); setTimeout(() => setOk(""), 2500); };

  async function salvaGenerali(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase().from("impostazioni")
      .update({ dot_anni: Number(dotAnni), mesi_conservazione_depositi: Number(mesi) }).eq("id", 1);
    if (error) return setErrore(erroreIt(error));
    avvisa("Impostazioni salvate");
  }

  async function aggiungiSoglia(e: React.FormEvent) {
    e.preventDefault();
    const m = parseMisura(misura);
    const n = Number(minimo);
    if (!m) return setErrore("Misura non valida");
    if (!Number.isInteger(n) || n < 1) return setErrore("Minimo non valido");
    const { error } = await supabase().from("soglie").upsert({ size_key: sizeKey(m), ...m, min_qty: n });
    if (error) return setErrore(erroreIt(error));
    setMisura("");
    avvisa("Soglia salvata");
    carica();
  }

  async function togliSoglia(k: string) {
    const { error } = await supabase().from("soglie").delete().eq("size_key", k);
    if (error) return setErrore(erroreIt(error));
    carica();
  }

  async function pulisci() {
    if (!confirm(`Cancellare definitivamente i depositi ritirati da più di ${mesi} mesi (dati clienti compresi)?`)) return;
    const { data, error } = await supabase().rpc("pulisci_depositi_ritirati");
    if (error) return setErrore(erroreIt(error));
    avvisa(`Cancellati ${data} depositi`);
  }

  return (
    <main>
      <Testata titolo="Impostazioni" indietro="/altro" />
      <div className="space-y-4 p-3">
        {errore && <Messaggio>{errore}</Messaggio>}
        {ok && <Messaggio tipo="ok">{ok}</Messaggio>}

        <form onSubmit={salvaGenerali} className="card space-y-3">
          <h2 className="text-lg font-extrabold">Avvisi e privacy</h2>
          <label className="block"><span className="etichetta">Avvisa se il DOT è più vecchio di (anni)</span>
            <input className="campo" inputMode="numeric" value={dotAnni} onChange={(e) => setDotAnni(e.target.value)} /></label>
          <label className="block"><span className="etichetta">Conserva i depositi ritirati per (mesi)</span>
            <input className="campo" inputMode="numeric" value={mesi} onChange={(e) => setMesi(e.target.value)} /></label>
          <button className="btn-brand w-full">Salva</button>
          <button type="button" className="btn-ghost w-full" onClick={pulisci}>Cancella ora i depositi ritirati scaduti</button>
        </form>

        <section className="card space-y-3">
          <h2 className="text-lg font-extrabold">Scorta minima per misura</h2>
          <p className="text-sm text-gray-600">Conta le gomme nuove e usate (non i depositi). Sotto il minimo compare un avviso.</p>
          <form onSubmit={aggiungiSoglia} className="flex gap-2">
            <input className="campo flex-1" placeholder="205/55 R16" value={misura} onChange={(e) => setMisura(e.target.value)} />
            <input className="campo w-20" inputMode="numeric" aria-label="Minimo" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
            <button className="btn-primary">+</button>
          </form>
          <ul className="divide-y">
            {soglie.map((s) => (
              <li key={s.size_key} className="flex items-center justify-between py-2">
                <span className="text-lg font-bold">{formatMisura(s)}</span>
                <span className="flex items-center gap-3">min <b className="text-xl">{s.min_qty}</b>
                  <button className="btn-ghost min-h-10 px-3 text-ko" onClick={() => togliSoglia(s.size_key)} aria-label={`Togli ${formatMisura(s)}`}>✕</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
