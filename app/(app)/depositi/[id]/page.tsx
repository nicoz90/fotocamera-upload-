"use client";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { erroreIt, supabase } from "@/lib/supabase/client";
import { formatMisura, normalizzaTarga } from "@/lib/misura";
import type { Deposito } from "@/lib/types";
import { dataIt } from "@/lib/dati";
import { useProfilo } from "@/components/Profilo";
import { Caricamento, Chip, Messaggio, Testata } from "@/components/ui";
import { IcoTelefono } from "@/components/Icone";
import BadgeGomma from "@/components/BadgeGomma";

export default function SchedaDeposito({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { admin } = useProfilo();
  const router = useRouter();
  const [d, setD] = useState<Deposito | null>(null);
  const [errore, setErrore] = useState("");
  const [modifica, setModifica] = useState(false);
  const [form, setForm] = useState({ targa: "", cliente_nome: "", telefono: "", con_cerchi: false, note: "" });

  const carica = useCallback(async () => {
    const { data, error } = await supabase().from("deposits").select("*, tyres(*)").eq("id", id).single();
    if (error) return setErrore(erroreIt(error));
    const dep = data as Deposito;
    setD(dep);
    setForm({ targa: dep.targa, cliente_nome: dep.cliente_nome, telefono: dep.telefono ?? "", con_cerchi: dep.con_cerchi, note: dep.note ?? "" });
  }, [id]);
  useEffect(() => { carica(); }, [carica]);

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase().from("deposits").update({
      targa: normalizzaTarga(form.targa), cliente_nome: form.cliente_nome.trim(),
      telefono: form.telefono.replace(/[^0-9+ ]/g, "").trim() || null, con_cerchi: form.con_cerchi, note: form.note.trim() || null,
    }).eq("id", id);
    if (error) return setErrore(erroreIt(error));
    setModifica(false);
    carica();
  }

  async function ritira() {
    if (!d || !confirm(`Riconsegnare le gomme di ${d.targa}? La quantità va a zero.`)) return;
    const { error } = await supabase().rpc("ritira_deposito", { p_deposit: id });
    if (error) return setErrore(erroreIt(error));
    carica();
  }

  async function elimina() {
    if (!d || !confirm(`Cancellare definitivamente il deposito ${d.targa} e i dati del cliente?`)) return;
    const { error } = await supabase().from("tyres").delete().eq("id", d.tyre_id);
    if (error) return setErrore(erroreIt(error));
    router.replace("/depositi");
  }

  if (!d) return (<><Testata titolo="Deposito" indietro="/depositi" />{errore ? <div className="p-3"><Messaggio>{errore}</Messaggio></div> : <Caricamento />}</>);
  const g = d.tyres!;

  return (
    <main>
      <Testata titolo={d.targa} indietro="/depositi"
        azione={<button className="min-h-12 px-3 font-bold text-brand" onClick={() => setModifica(!modifica)}>{modifica ? "Chiudi" : "Modifica"}</button>} />
      <div className="space-y-3 p-3">
        {errore && <Messaggio>{errore}</Messaggio>}
        {d.data_ritiro && <Messaggio tipo="info">Ritirato il {dataIt(d.data_ritiro)}</Messaggio>}

        {modifica ? (
          <form onSubmit={salva} className="card space-y-3">
            <label className="block"><span className="etichetta">Targa</span>
              <input className="campo font-mono uppercase" value={form.targa} onChange={(e) => setForm({ ...form, targa: e.target.value })} /></label>
            <label className="block"><span className="etichetta">Nome</span>
              <input className="campo" value={form.cliente_nome} onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })} /></label>
            <label className="block"><span className="etichetta">Telefono</span>
              <input className="campo" type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></label>
            <Chip attivo={form.con_cerchi} onClick={() => setForm({ ...form, con_cerchi: !form.con_cerchi })}>{form.con_cerchi ? "Con cerchi" : "Senza cerchi"}</Chip>
            <label className="block"><span className="etichetta">Note</span>
              <textarea className="campo" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
            <button className="btn-brand w-full">Salva</button>
          </form>
        ) : (
          <section className="card space-y-2">
            <p className="font-mono text-4xl font-black tracking-wider">{d.targa}</p>
            <p className="text-2xl font-bold">{d.cliente_nome}</p>
            {d.telefono && (
              <a href={`tel:${d.telefono.replace(/\s/g, "")}`} className="btn-ghost w-full text-xl"><IcoTelefono />{d.telefono}</a>
            )}
            <p className="text-lg">Depositate il <b>{dataIt(d.data_deposito)}</b> · <b>{d.con_cerchi ? "con cerchi" : "senza cerchi"}</b></p>
            {d.note && <p className="rounded-xl bg-gray-100 p-3">{d.note}</p>}
          </section>
        )}

        <Link href={`/gomma/${g.id}`} className="card block space-y-2 active:bg-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-black">{formatMisura(g)}</p>
              <p className="text-lg font-bold">{g.marca} {g.modello}</p>
            </div>
            <p className="text-4xl font-black">{g.quantita}<span className="text-base text-gray-500"> pz</span></p>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-brand px-4 py-3">
            <span className="font-bold uppercase">Posizione</span>
            <span className="text-3xl font-black">{g.posizione ?? "—"}</span>
          </div>
          <BadgeGomma g={g} />
          <p className="text-sm font-bold text-gray-500">Tocca per spostarle o modificarle →</p>
        </Link>

        {!d.data_ritiro && <button className="btn-primary w-full text-lg" onClick={ritira}>Cliente ritira le gomme</button>}
        {admin && <button className="btn-danger w-full" onClick={elimina}>Cancella deposito e dati cliente</button>}
      </div>
    </main>
  );
}
