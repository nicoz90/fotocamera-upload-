"use client";
import { useState } from "react";
import { erroreIt, supabase } from "@/lib/supabase/client";
import { toCsv, scaricaFile } from "@/lib/csv";
import { formatMisura, formatDot } from "@/lib/misura";
import { MOTIVI, STAGIONI, TIPI, type Deposito, type Gomma, type Movimento } from "@/lib/types";
import { Messaggio, Testata } from "@/components/ui";

async function tutte<T>(tabella: string, select: string, ordine: string): Promise<T[]> {
  const out: T[] = [];
  for (let da = 0; ; da += 1000) {
    const { data, error } = await supabase().from(tabella).select(select).order(ordine).range(da, da + 999);
    if (error) throw error;
    out.push(...(data as T[]));
    if (!data || data.length < 1000) return out;
  }
}

const oggi = () => new Date().toISOString().slice(0, 10);

export default function Export() {
  const [stato, setStato] = useState("");
  const [errore, setErrore] = useState("");

  async function esegui(fn: () => Promise<void>) {
    setErrore("");
    setStato("Preparazione…");
    try { await fn(); setStato("File scaricato."); } catch (e) { setErrore(erroreIt(e)); setStato(""); }
  }

  const gomme = () => esegui(async () => {
    const g = await tutte<Gomma & { tyre_costs: { prezzo_acquisto: number } | null }>("tyres", "*, tyre_costs(prezzo_acquisto)", "size_key");
    scaricaFile(`magazzino-gomme-${oggi()}.csv`, toCsv(
      ["Misura", "Marca", "Modello", "Stagione", "Tipo", "Indice carico", "Velocità", "DOT", "Battistrada mm", "Runflat", "XL", "EAN",
        "Quantità", "Posizione", "Prezzo vendita", "Prezzo acquisto", "Note", "ID"],
      g.map((r) => [formatMisura(r), r.marca, r.modello, STAGIONI[r.stagione], TIPI[r.tipo], r.indice_carico, r.codice_velocita,
        formatDot(r.dot_settimana, r.dot_anno), r.battistrada_mm, r.runflat, r.xl, r.ean, r.quantita, r.posizione,
        r.prezzo_vendita, r.tyre_costs?.prezzo_acquisto ?? null, r.note, r.id]),
    ));
  });

  const depositi = () => esegui(async () => {
    const d = await tutte<Deposito>("deposits", "*, tyres(*)", "data_deposito");
    scaricaFile(`depositi-${oggi()}.csv`, toCsv(
      ["Targa", "Cliente", "Telefono", "Data deposito", "Con cerchi", "Data ritiro", "Misura", "Marca", "Modello", "Quantità", "Posizione", "Note"],
      d.map((r) => [r.targa, r.cliente_nome, r.telefono, r.data_deposito, r.con_cerchi, r.data_ritiro,
        r.tyres ? formatMisura(r.tyres) : "", r.tyres?.marca, r.tyres?.modello, r.tyres?.quantita, r.tyres?.posizione, r.note]),
    ));
  });

  const movimenti = () => esegui(async () => {
    const m = await tutte<Movimento>("movements", "*", "created_at");
    scaricaFile(`movimenti-${oggi()}.csv`, toCsv(
      ["Data", "Gomma", "Motivo", "Variazione", "Quantità dopo", "Da", "A", "Utente", "Note"],
      m.map((r) => [new Date(r.created_at).toLocaleString("it-IT"), r.descrizione, MOTIVI[r.motivo], r.delta, r.quantita_dopo,
        r.da_posizione, r.a_posizione, r.user_nome, r.note]),
    ));
  });

  return (
    <main>
      <Testata titolo="Esporta CSV" indietro="/altro" />
      <div className="space-y-3 p-3">
        <p className="text-gray-600">File CSV con separatore &quot;;&quot;: si aprono direttamente in Excel.</p>
        {errore && <Messaggio>{errore}</Messaggio>}
        {stato && <Messaggio tipo="info">{stato}</Messaggio>}
        <button className="btn-brand w-full text-lg" onClick={gomme}>Magazzino gomme (con prezzi)</button>
        <button className="btn-primary w-full" onClick={depositi}>Depositi clienti</button>
        <button className="btn-primary w-full" onClick={movimenti}>Storico movimenti</button>
        <p className="text-sm text-gray-500">Il file depositi contiene dati personali dei clienti: non inoltrarlo e cancellalo quando non serve più.</p>
      </div>
    </main>
  );
}
