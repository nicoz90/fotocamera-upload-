"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useProfilo } from "@/components/Profilo";
import { Testata } from "@/components/ui";

export default function Altro() {
  const p = useProfilo();
  const [avvisi, setAvvisi] = useState<number | null>(null);

  useEffect(() => {
    const sb = supabase();
    Promise.all([
      sb.from("v_scorte_basse").select("size_key", { count: "exact", head: true }),
      sb.from("v_dot_vecchi").select("id", { count: "exact", head: true }),
    ]).then(([a, b]) => setAvvisi((a.count ?? 0) + (b.count ?? 0)));
  }, []);

  async function esci() {
    await supabase().auth.signOut();
    location.replace("/login");
  }

  const voce = "card flex min-h-16 items-center justify-between text-xl font-bold active:bg-gray-50";
  return (
    <main>
      <Testata titolo="Altro" />
      <div className="space-y-3 p-3">
        <p className="px-1 text-gray-600">Collegato come <b>{p.nome || p.email}</b> ({p.admin ? "titolare" : "dipendente"})</p>
        <Link href="/avvisi" className={voce}>Avvisi {avvisi ? <span className="rounded-full bg-ko px-3 py-1 text-white">{avvisi}</span> : <span>→</span>}</Link>
        <Link href="/gomma/nuova" className={voce}>Nuova gomma <span>→</span></Link>
        <Link href="/depositi/nuovo" className={voce}>Nuovo deposito <span>→</span></Link>
        {p.admin && (
          <>
            <h2 className="px-1 pt-3 text-sm font-bold uppercase text-gray-500">Titolare</h2>
            <Link href="/storico" className={voce}>Storico movimenti <span>→</span></Link>
            <Link href="/import" className={voce}>Importa da Excel / CSV <span>→</span></Link>
            <Link href="/export" className={voce}>Esporta CSV <span>→</span></Link>
            <Link href="/utenti" className={voce}>Account dipendenti <span>→</span></Link>
            <Link href="/impostazioni" className={voce}>Impostazioni e soglie <span>→</span></Link>
          </>
        )}
        <button onClick={esci} className="btn-ghost mt-6 w-full">Esci</button>
      </div>
    </main>
  );
}
