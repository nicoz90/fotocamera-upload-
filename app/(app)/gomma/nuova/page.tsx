"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { erroreIt, supabase } from "@/lib/supabase/client";
import { parseMisura } from "@/lib/misura";
import { useMarche } from "@/lib/dati";
import { useProfilo } from "@/components/Profilo";
import { Messaggio, Testata } from "@/components/ui";
import FormGomma, { type DatiGomma } from "@/components/FormGomma";

function Nuova() {
  const router = useRouter();
  const sp = useSearchParams();
  const { admin } = useProfilo();
  const marche = useMarche();
  const ean = sp.get("ean") ?? "";
  const m = parseMisura(sp.get("misura") ?? "");

  async function salva(d: DatiGomma, pa: number | null) {
    const sb = supabase();
    const { data, error } = await sb.from("tyres").insert(d).select("id").single();
    if (error) throw new Error(erroreIt(error));
    if (admin && pa !== null) await sb.from("tyre_costs").insert({ tyre_id: data.id, prezzo_acquisto: pa });
    router.replace(`/gomma/${data.id}`);
  }

  return (
    <main>
      <Testata titolo="Nuova gomma" indietro />
      <div className="space-y-3 p-3">
        {ean && <Messaggio tipo="info">EAN {ean} non presente in magazzino: compila la scheda.</Messaggio>}
        <section className="card">
          <FormGomma nuova admin={admin} marche={marche} onSalva={salva} etichettaSalva="Crea gomma"
            iniziale={{ ean: ean || null, ...(m ?? {}) }} />
        </section>
      </div>
    </main>
  );
}

export default function Pagina() {
  return <Suspense><Nuova /></Suspense>;
}
