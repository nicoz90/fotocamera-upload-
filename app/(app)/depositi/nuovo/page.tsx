"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { erroreIt, supabase } from "@/lib/supabase/client";
import { normalizzaTarga } from "@/lib/misura";
import { useMarche } from "@/lib/dati";
import { useProfilo } from "@/components/Profilo";
import { Chip, Testata } from "@/components/ui";
import FormGomma, { type DatiGomma } from "@/components/FormGomma";

export default function NuovoDeposito() {
  const router = useRouter();
  const { admin } = useProfilo();
  const marche = useMarche();
  const [targa, setTarga] = useState("");
  const [nome, setNome] = useState("");
  const [telefono, setTelefono] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [cerchi, setCerchi] = useState(false);

  async function salva(g: DatiGomma) {
    const t = normalizzaTarga(targa);
    const tel = telefono.replace(/[^0-9+ ]/g, "").trim();
    if (t.length < 4) throw new Error("Targa non valida");
    if (!nome.trim()) throw new Error("Manca il nome del cliente");
    if (tel && tel.replace(/\D/g, "").length < 6) throw new Error("Telefono non valido");
    const { data: id, error } = await supabase().rpc("crea_deposito", {
      p_gomma: { ...g, tipo: "deposito" },
      p_cliente: { targa: t, cliente_nome: nome.trim(), telefono: tel || null, data_deposito: data, con_cerchi: cerchi },
    });
    if (error) throw new Error(erroreIt(error));
    router.replace(`/depositi/${id}`);
  }

  return (
    <main>
      <Testata titolo="Nuovo deposito" indietro="/depositi" />
      <div className="space-y-3 p-3">
        <section className="card space-y-4">
          <h2 className="text-lg font-extrabold">Cliente</h2>
          <label className="block">
            <span className="etichetta">Targa *</span>
            <input className="campo font-mono text-2xl font-black uppercase tracking-wider" autoCapitalize="characters" autoComplete="off"
              value={targa} onChange={(e) => setTarga(e.target.value.toUpperCase())} />
          </label>
          <label className="block">
            <span className="etichetta">Nome e cognome *</span>
            <input className="campo" autoCapitalize="words" autoComplete="off" value={nome} onChange={(e) => setNome(e.target.value)} />
          </label>
          <label className="block">
            <span className="etichetta">Telefono</span>
            <input className="campo" type="tel" inputMode="tel" autoComplete="off" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 items-end gap-3">
            <label className="block">
              <span className="etichetta">Data deposito</span>
              <input className="campo" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </label>
            <Chip attivo={cerchi} onClick={() => setCerchi(!cerchi)}>{cerchi ? "Con cerchi" : "Senza cerchi"}</Chip>
          </div>
          <p className="text-sm text-gray-500">Salviamo solo targa, nome e telefono: servono per riconsegnare le gomme (GDPR).</p>
        </section>
        <section className="card space-y-4">
          <h2 className="text-lg font-extrabold">Gomme</h2>
          <FormGomma nuova admin={admin} marche={marche} nascondiTipo iniziale={{ tipo: "deposito", quantita: 4 }}
            onSalva={salva} etichettaSalva="Salva deposito" />
        </section>
      </div>
    </main>
  );
}
