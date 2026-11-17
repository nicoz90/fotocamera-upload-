"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { erroreIt, supabase } from "@/lib/supabase/client";
import { formatMisura } from "@/lib/misura";
import { CAMPI_LISTA, type Gomma } from "@/lib/types";
import { useDotAnni } from "@/lib/dati";
import CardGomma from "@/components/CardGomma";
import { Caricamento, Messaggio, Testata } from "@/components/ui";

interface Scorta { size_key: string; larghezza: number; serie: number; diametro: number; min_qty: number; disponibili: number }

export default function Avvisi() {
  const dotAnni = useDotAnni();
  const [scorte, setScorte] = useState<Scorta[] | null>(null);
  const [vecchie, setVecchie] = useState<Gomma[] | null>(null);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    const sb = supabase();
    sb.from("v_scorte_basse").select("*").order("size_key")
      .then(({ data, error }) => (error ? setErrore(erroreIt(error)) : setScorte(data as Scorta[])));
    sb.from("v_dot_vecchi").select(CAMPI_LISTA).order("dot_anno").order("dot_settimana").limit(500)
      .then(({ data, error }) => (error ? setErrore(erroreIt(error)) : setVecchie(data as unknown as Gomma[])));
  }, []);

  return (
    <main>
      <Testata titolo="Avvisi" indietro="/altro" />
      <div className="space-y-5 p-3">
        {errore && <Messaggio>{errore}</Messaggio>}
        <section className="space-y-2">
          <h2 className="text-xl font-black">Scorta sotto la soglia {scorte && <span className="text-ko">({scorte.length})</span>}</h2>
          {!scorte && <Caricamento />}
          {scorte?.length === 0 && <p className="text-gray-600">Tutte le misure sono sopra la soglia minima.</p>}
          {scorte?.map((s) => (
            <Link key={s.size_key} href={`/?q=${encodeURIComponent(formatMisura(s))}`} className="card flex items-center justify-between">
              <span className="text-2xl font-black">{formatMisura(s)}</span>
              <span className="text-lg font-bold"><span className="text-3xl font-black text-ko">{s.disponibili}</span> / min {s.min_qty}</span>
            </Link>
          ))}
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-black">DOT più vecchio di {dotAnni} anni {vecchie && <span className="text-ko">({vecchie.length})</span>}</h2>
          {!vecchie && <Caricamento />}
          {vecchie?.length === 0 && <p className="text-gray-600">Nessuna gomma troppo vecchia in magazzino.</p>}
          {vecchie?.map((g) => <CardGomma key={g.id} g={g} dotAnni={dotAnni} />)}
        </section>
        <p className="text-sm text-gray-500">Soglie minime e anni DOT si cambiano in Impostazioni (titolare).</p>
      </div>
    </main>
  );
}
