"use client";
import { use, useEffect, useState } from "react";
import { erroreIt, supabase } from "@/lib/supabase/client";
import { CAMPI_LISTA, type Gomma } from "@/lib/types";
import { useDotAnni } from "@/lib/dati";
import CardGomma from "@/components/CardGomma";
import { Caricamento, Messaggio, Testata, Vuoto } from "@/components/ui";

export default function Scaffale({ params }: { params: Promise<{ s: string }> }) {
  const s = decodeURIComponent(use(params).s);
  const senza = s === "-";
  const dotAnni = useDotAnni();
  const [gomme, setGomme] = useState<Gomma[] | null>(null);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    let q = supabase().from("tyres").select(CAMPI_LISTA).gt("quantita", 0);
    q = senza ? q.is("scaffale", null) : q.eq("scaffale", s);
    q.order("ripiano", { nullsFirst: true }).order("posto", { nullsFirst: true }).order("size_key").limit(2000)
      .then(({ data, error }) => (error ? setErrore(erroreIt(error)) : setGomme(data as unknown as Gomma[])));
  }, [s, senza]);

  const ripiani = new Map<string, Gomma[]>();
  gomme?.forEach((g) => {
    const k = g.ripiano ?? "";
    ripiani.set(k, [...(ripiani.get(k) ?? []), g]);
  });
  const ordinati = [...ripiani.entries()].sort(([a], [b]) => a.localeCompare(b, "it", { numeric: true }));

  return (
    <main>
      <Testata titolo={senza ? "Senza posizione" : `Scaffale ${s}`} indietro="/scaffali" />
      <div className="space-y-4 p-3">
        {errore && <Messaggio>{errore}</Messaggio>}
        {!gomme && !errore && <Caricamento />}
        {gomme?.length === 0 && <Vuoto>Scaffale vuoto.</Vuoto>}
        {ordinati.map(([rip, lista]) => (
          <section key={rip} className="space-y-2">
            {!senza && (
              <h2 className="sticky top-14 z-10 bg-gray-100 py-1 text-xl font-black">
                {rip ? `Ripiano ${rip}` : "Ripiano non indicato"}
                <span className="ml-2 text-base font-bold text-gray-500">{lista.reduce((t, g) => t + g.quantita, 0)} pz</span>
              </h2>
            )}
            {lista.map((g) => <CardGomma key={g.id} g={g} dotAnni={dotAnni} />)}
          </section>
        ))}
      </div>
    </main>
  );
}
