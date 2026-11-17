"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { erroreIt, supabase } from "@/lib/supabase/client";
import { MOTIVI, type Motivo, type Movimento } from "@/lib/types";
import { dataOraIt } from "@/lib/dati";
import { Caricamento, Messaggio, Testata, Vuoto } from "@/components/ui";

const PAGINA = 50;

export default function Storico() {
  const [lista, setLista] = useState<Movimento[] | null>(null);
  const [motivo, setMotivo] = useState<Motivo | "">("");
  const [testo, setTesto] = useState("");
  const [dal, setDal] = useState("");
  const [al, setAl] = useState("");
  const [altri, setAltri] = useState(false);
  const [errore, setErrore] = useState("");

  const carica = useCallback(async (offset: number) => {
    let q = supabase().from("movements").select("*").order("created_at", { ascending: false }).range(offset, offset + PAGINA - 1);
    if (motivo) q = q.eq("motivo", motivo);
    const t = testo.trim().replace(/[^A-Za-zÀ-ÿ0-9/ ]/g, "");
    if (t) q = q.or(`descrizione.ilike.%${t}%,user_nome.ilike.%${t}%`);
    if (dal) q = q.gte("created_at", new Date(dal).toISOString());
    if (al) q = q.lt("created_at", new Date(new Date(al).getTime() + 864e5).toISOString());
    const { data, error } = await q;
    if (error) return setErrore(erroreIt(error));
    setAltri((data ?? []).length === PAGINA);
    setLista((prev) => (offset === 0 ? (data as Movimento[]) : [...(prev ?? []), ...(data as Movimento[])]));
  }, [motivo, testo, dal, al]);

  useEffect(() => {
    const t = setTimeout(() => carica(0), 250);
    return () => clearTimeout(t);
  }, [carica]);

  return (
    <main>
      <Testata titolo="Storico movimenti" indietro="/altro" />
      <div className="space-y-3 p-3">
        <input className="campo" type="search" placeholder="Misura, marca o persona" value={testo} onChange={(e) => setTesto(e.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          <select className="campo" value={motivo} onChange={(e) => setMotivo(e.target.value as Motivo | "")}>
            <option value="">Tutti</option>
            {(Object.keys(MOTIVI) as Motivo[]).map((m) => <option key={m} value={m}>{MOTIVI[m]}</option>)}
          </select>
          <input className="campo text-base" type="date" aria-label="Dal" value={dal} onChange={(e) => setDal(e.target.value)} />
          <input className="campo text-base" type="date" aria-label="Al" value={al} onChange={(e) => setAl(e.target.value)} />
        </div>
        {errore && <Messaggio>{errore}</Messaggio>}
        {!lista && !errore && <Caricamento />}
        {lista?.length === 0 && <Vuoto>Nessun movimento.</Vuoto>}
        <ul className="space-y-2">
          {lista?.map((m) => (
            <li key={m.id} className="card flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                {m.tyre_id ? <Link href={`/gomma/${m.tyre_id}`} className="block truncate font-bold underline-offset-2 active:underline">{m.descrizione}</Link>
                  : <p className="truncate font-bold text-gray-500">{m.descrizione} (eliminata)</p>}
                <p className="text-sm text-gray-600">
                  {MOTIVI[m.motivo]}{m.motivo === "spostamento" && ` ${m.da_posizione ?? "—"} → ${m.a_posizione ?? "—"}`}
                  {" · "}{dataOraIt(m.created_at)} · {m.user_nome ?? "?"}
                </p>
                {m.note && <p className="text-sm italic text-gray-600">{m.note}</p>}
              </div>
              <div className="text-right">
                {m.delta !== 0 && <p className={`text-2xl font-black ${m.delta > 0 ? "text-ok" : "text-ko"}`}>{m.delta > 0 ? "+" : ""}{m.delta}</p>}
                <p className="text-xs text-gray-500">rest. {m.quantita_dopo}</p>
              </div>
            </li>
          ))}
        </ul>
        {altri && <button className="btn-ghost w-full" onClick={() => carica(lista?.length ?? 0)}>Carica altri</button>}
      </div>
    </main>
  );
}
