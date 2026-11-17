"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { erroreIt, supabase } from "@/lib/supabase/client";
import { Caricamento, Messaggio, Testata, Vuoto } from "@/components/ui";

interface Riepilogo { scaffale: string; articoli: number; pezzi: number }

export default function Scaffali() {
  const [lista, setLista] = useState<Riepilogo[] | null>(null);
  const [senza, setSenza] = useState(0);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    supabase().from("tyres").select("scaffale,quantita").gt("quantita", 0).limit(20000).then(({ data, error }) => {
      if (error) return setErrore(erroreIt(error));
      const m = new Map<string, Riepilogo>();
      let n = 0;
      for (const r of data as { scaffale: string | null; quantita: number }[]) {
        if (!r.scaffale) { n += r.quantita; continue; }
        const x = m.get(r.scaffale) ?? { scaffale: r.scaffale, articoli: 0, pezzi: 0 };
        x.articoli++;
        x.pezzi += r.quantita;
        m.set(r.scaffale, x);
      }
      setSenza(n);
      setLista([...m.values()].sort((a, b) => a.scaffale.localeCompare(b.scaffale, "it", { numeric: true })));
    });
  }, []);

  return (
    <main>
      <Testata titolo="Scaffali" />
      <div className="space-y-3 p-3">
        {errore && <Messaggio>{errore}</Messaggio>}
        {!lista && !errore && <Caricamento />}
        {lista?.length === 0 && <Vuoto>Nessuna gomma con posizione.</Vuoto>}
        <div className="grid grid-cols-2 gap-3">
          {lista?.map((s) => (
            <Link key={s.scaffale} href={`/scaffali/${encodeURIComponent(s.scaffale)}`} className="card text-center active:bg-gray-50">
              <p className="text-5xl font-black">{s.scaffale}</p>
              <p className="mt-1 font-bold text-gray-600">{s.pezzi} pz · {s.articoli} art.</p>
            </Link>
          ))}
        </div>
        {senza > 0 && (
          <Link href="/scaffali/-" className="card block text-center font-bold text-ko">{senza} gomme senza posizione →</Link>
        )}
      </div>
    </main>
  );
}
