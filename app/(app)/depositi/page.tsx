"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { erroreIt, supabase } from "@/lib/supabase/client";
import { formatMisura } from "@/lib/misura";
import type { Deposito } from "@/lib/types";
import { dataIt } from "@/lib/dati";
import { Chip, Messaggio, Testata, Vuoto } from "@/components/ui";
import { IcoPiu } from "@/components/Icone";

export default function Depositi() {
  const [q, setQ] = useState("");
  const [ritirati, setRitirati] = useState(false);
  const [lista, setLista] = useState<Deposito[] | null>(null);
  const [errore, setErrore] = useState("");
  const req = useRef(0);

  useEffect(() => {
    const t = setTimeout(async () => {
      const id = ++req.current;
      let query = supabase().from("deposits").select("*, tyres(*)").order("data_deposito", { ascending: false }).limit(100);
      query = ritirati ? query.not("data_ritiro", "is", null) : query.is("data_ritiro", null);
      const s = q.trim().replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "");
      if (s) {
        const targa = s.toUpperCase().replace(/[^A-Z0-9]/g, "");
        const tel = s.replace(/\D/g, "");
        const parti = [`cliente_nome.ilike.%${s}%`];
        if (targa) parti.push(`targa.ilike.%${targa}%`);
        if (tel.length >= 3) parti.push(`telefono.ilike.%${tel}%`);
        query = query.or(parti.join(","));
      }
      const { data, error } = await query;
      if (id !== req.current) return;
      if (error) return setErrore(erroreIt(error));
      setErrore("");
      setLista(data as Deposito[]);
    }, 200);
    return () => clearTimeout(t);
  }, [q, ritirati]);

  return (
    <main>
      <Testata titolo="Depositi clienti"
        azione={<Link href="/depositi/nuovo" className="flex min-h-12 items-center gap-1 px-3 font-bold text-brand"><IcoPiu className="h-6 w-6" />Nuovo</Link>} />
      <div className="space-y-3 p-3">
        <input autoFocus type="search" className="campo text-xl" placeholder="Targa, nome o telefono" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex gap-2">
          <Chip attivo={!ritirati} onClick={() => setRitirati(false)}>In deposito</Chip>
          <Chip attivo={ritirati} onClick={() => setRitirati(true)}>Ritirati</Chip>
        </div>
        {errore && <Messaggio>{errore}</Messaggio>}
        {lista?.length === 0 && <Vuoto>Nessun deposito trovato.</Vuoto>}
        {lista?.map((d) => (
          <Link key={d.id} href={`/depositi/${d.id}`} className="card flex items-center gap-3 active:bg-gray-50">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-2xl font-black tracking-wider">{d.targa}</p>
              <p className="truncate text-lg font-bold">{d.cliente_nome}</p>
              <p className="text-gray-600">
                {d.tyres && `${formatMisura(d.tyres)} ${d.tyres.marca} · ${d.tyres.quantita} pz`}{d.con_cerchi ? " · cerchi" : ""} · {dataIt(d.data_deposito)}
              </p>
            </div>
            <p className={`rounded-lg px-2 py-1 text-xl font-black ${d.tyres?.posizione ? "bg-brand" : "bg-gray-200 text-gray-500"}`}>{d.tyres?.posizione ?? "—"}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
