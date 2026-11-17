"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase, erroreIt } from "@/lib/supabase/client";
import { analizzaRicerca } from "@/lib/misura";
import { CAMPI_LISTA, STAGIONI, TIPI, type Gomma, type Stagione, type TipoGomma } from "@/lib/types";
import CardGomma from "@/components/CardGomma";
import { Chip, Messaggio, Vuoto } from "@/components/ui";
import { IcoPiu, IcoScanner } from "@/components/Icone";

interface Filtri { q: string; stagione: Stagione | null; tipi: TipoGomma[]; marca: string; esauriti: boolean }
interface Salvata { filtri: Filtri; risultati: Gomma[]; quando: string }

const CHIAVE = "lupi:ultima-ricerca";
const FILTRI_BASE: Filtri = { q: "", stagione: null, tipi: ["nuova", "usata"], marca: "", esauriti: false };

function leggiSalvata(): Salvata | null {
  try { return JSON.parse(localStorage.getItem(CHIAVE) ?? "null"); } catch { return null; }
}

export default function Ricerca() {
  const [filtri, setFiltri] = useState<Filtri>(FILTRI_BASE);
  const [risultati, setRisultati] = useState<Gomma[] | null>(null);
  const [offline, setOffline] = useState<string | null>(null);
  const [errore, setErrore] = useState("");
  const [marche, setMarche] = useState<string[]>([]);
  const [dotAnni, setDotAnni] = useState(5);
  const [mostraFiltri, setMostraFiltri] = useState(false);
  // Tastierino numerico di default: le misure si scrivono solo con cifre ("2055516")
  const [tastiera, setTastiera] = useState<"numeric" | "text">("numeric");
  function cambiaTastiera() {
    const t = tastiera === "numeric" ? "text" : "numeric";
    setTastiera(t);
    try { localStorage.setItem("lupi:tastiera", t === "text" ? "testo" : "numeri"); } catch {}
    inputRef.current?.blur();
    setTimeout(() => inputRef.current?.focus(), 50);
  }
  const richiesta = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const pronto = useRef(false);

  // Ripristina l'ultima ricerca (visibile anche senza campo)
  useEffect(() => {
    const s = leggiSalvata();
    const daLink = new URLSearchParams(location.search).get("q");
    if (daLink) {
      setFiltri({ ...FILTRI_BASE, q: daLink, esauriti: true });
      history.replaceState(null, "", "/");
    } else if (s) {
      setFiltri({ ...FILTRI_BASE, ...s.filtri });
      setRisultati(s.risultati);
    }
    try { setTastiera(localStorage.getItem("lupi:tastiera") === "testo" ? "text" : "numeric"); } catch {}
    pronto.current = true;
    const sb = supabase();
    sb.from("tyres").select("marca").limit(5000).then(({ data }) => {
      if (data) setMarche([...new Set(data.map((r) => r.marca as string))].sort((a, b) => a.localeCompare(b, "it")));
    });
    sb.from("impostazioni").select("dot_anni").single().then(({ data }) => data && setDotAnni(data.dot_anni));
  }, []);

  const cerca = useCallback(async (f: Filtri) => {
    const { cifre, parole } = analizzaRicerca(f.q);
    if (!cifre && parole.length === 0 && !f.marca) {
      setRisultati(null);
      return;
    }
    const id = ++richiesta.current;
    let q = supabase().from("tyres").select(CAMPI_LISTA)
      .order("size_key").order("quantita", { ascending: false }).order("marca").limit(80);
    if (cifre) q = q.like("size_key", `${cifre}%`);
    for (const p of parole) {
      const s = p.replace(/[^A-Za-zÀ-ÿ0-9]/g, "");
      q = q.or(`marca.ilike.%${s}%,modello.ilike.%${s}%`);
    }
    if (f.marca) q = q.eq("marca", f.marca);
    if (f.stagione) q = q.eq("stagione", f.stagione);
    if (f.tipi.length && f.tipi.length < 3) q = q.in("tipo", f.tipi);
    if (!f.esauriti) q = q.gt("quantita", 0);

    const { data, error } = await q;
    if (id !== richiesta.current) return; // arrivata una ricerca più recente
    if (error) {
      const s = leggiSalvata();
      setOffline(s ? new Date(s.quando).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }) : "");
      if (!/connessione/.test(erroreIt(error))) setErrore(erroreIt(error));
      return;
    }
    setOffline(null);
    setErrore("");
    setRisultati(data as unknown as Gomma[]);
    try {
      localStorage.setItem(CHIAVE, JSON.stringify({ filtri: f, risultati: data, quando: new Date().toISOString() }));
    } catch {}
  }, []);

  // Risultati mentre scrivi
  useEffect(() => {
    if (!pronto.current) return;
    const t = setTimeout(() => cerca(filtri), 180);
    return () => clearTimeout(t);
  }, [filtri, cerca]);

  const set = (p: Partial<Filtri>) => setFiltri((f) => ({ ...f, ...p }));
  const toggleTipo = (t: TipoGomma) =>
    set({ tipi: filtri.tipi.includes(t) ? filtri.tipi.filter((x) => x !== t) : [...filtri.tipi, t] });
  const totale = risultati?.reduce((s, g) => s + g.quantita, 0) ?? 0;
  const nFiltri = (filtri.stagione ? 1 : 0) + (filtri.marca ? 1 : 0) + (filtri.esauriti ? 1 : 0) +
    (filtri.tipi.join() !== "nuova,usata" ? 1 : 0);

  return (
    <main>
      <div className="sticky top-0 z-20 space-y-2 bg-ink px-3 pb-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
        <div className="flex items-center justify-between text-white">
          <p className="text-lg font-black tracking-tight">LUPI <span className="rounded bg-brand px-1 text-ink">GOMME</span></p>
          <Link href="/gomma/nuova" className="flex min-h-12 items-center gap-1 rounded-xl px-3 font-bold text-brand"><IcoPiu className="h-6 w-6" />Nuova</Link>
        </div>
        <div className="flex gap-2">
          <input ref={inputRef} autoFocus type="search" enterKeyHint="search" autoComplete="off" inputMode={tastiera}
            placeholder={tastiera === "numeric" ? "Misura, es. 2055516" : "Misura o marca"} aria-label="Cerca misura o marca"
            className="min-h-14 w-full flex-1 rounded-xl border-0 bg-white px-4 text-2xl font-bold tracking-wide outline-none placeholder:text-lg placeholder:font-normal"
            value={filtri.q} onChange={(e) => set({ q: e.target.value })} />
          <button type="button" onClick={cambiaTastiera} aria-label="Cambia tastiera"
            className="w-14 rounded-xl bg-gray-700 text-base font-black text-white">{tastiera === "numeric" ? "ABC" : "123"}</button>
          <Link href="/scanner" className="flex w-14 items-center justify-center rounded-xl bg-brand text-ink" aria-label="Scanner"><IcoScanner /></Link>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button type="button" onClick={() => setMostraFiltri((v) => !v)}
            className={`min-h-12 shrink-0 rounded-full px-4 font-bold ${nFiltri ? "bg-brand text-ink" : "bg-gray-700 text-white"}`}>
            Filtri{nFiltri ? ` (${nFiltri})` : ""}
          </button>
          {(Object.keys(STAGIONI) as Stagione[]).map((s) => (
            <button key={s} type="button" onClick={() => set({ stagione: filtri.stagione === s ? null : s })}
              className={`min-h-12 shrink-0 rounded-full px-4 font-bold ${filtri.stagione === s ? "bg-white text-ink" : "bg-gray-700 text-white"}`}>
              {STAGIONI[s]}
            </button>
          ))}
        </div>
      </div>

      {mostraFiltri && (
        <div className="space-y-3 border-b border-gray-200 bg-white p-3">
          <div>
            <p className="etichetta">Tipo</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TIPI) as TipoGomma[]).map((t) => (
                <Chip key={t} attivo={filtri.tipi.includes(t)} onClick={() => toggleTipo(t)}>{TIPI[t]}</Chip>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="etichetta">Marca</span>
            <select className="campo" value={filtri.marca} onChange={(e) => set({ marca: e.target.value })}>
              <option value="">Tutte le marche</option>
              {marche.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <Chip attivo={filtri.esauriti} onClick={() => set({ esauriti: !filtri.esauriti })}>Mostra esaurite</Chip>
            <button type="button" className="btn-ghost ml-auto" onClick={() => setFiltri({ ...FILTRI_BASE, q: filtri.q })}>Azzera</button>
          </div>
        </div>
      )}

      <section className="space-y-3 p-3" aria-live="polite">
        {offline !== null && (
          <Messaggio tipo="info">Nessuna connessione. {offline ? `Vedi l'ultima ricerca (${offline}).` : ""}</Messaggio>
        )}
        {errore && <Messaggio>{errore}</Messaggio>}
        {risultati === null && (
          <Vuoto>Scrivi la misura come vuoi:<br /><b>205/55 R16</b> · <b>2055516</b> · <b>205 55 16</b></Vuoto>
        )}
        {risultati && risultati.length === 0 && (
          <div className="space-y-3 py-6 text-center">
            <p className="text-2xl font-extrabold text-ko">Non ce l&apos;abbiamo</p>
            <p className="text-gray-600">Nessuna gomma{filtri.esauriti ? "" : " disponibile"} per questa ricerca.</p>
            {!filtri.esauriti && <button className="btn-ghost" onClick={() => set({ esauriti: true })}>Mostra anche esaurite</button>}
          </div>
        )}
        {risultati && risultati.length > 0 && (
          <>
            <p className="px-1 text-lg font-bold">
              <span className="text-ok">{totale} gomme</span> in {risultati.length} {risultati.length === 1 ? "articolo" : "articoli"}
              {risultati.length === 80 && <span className="font-normal text-gray-500"> (primi 80: restringi la ricerca)</span>}
            </p>
            {risultati.map((g) => <CardGomma key={g.id} g={g} dotAnni={dotAnni} />)}
          </>
        )}
      </section>
    </main>
  );
}
