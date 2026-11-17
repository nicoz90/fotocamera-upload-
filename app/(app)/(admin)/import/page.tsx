"use client";
import { useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { erroreIt, supabase } from "@/lib/supabase/client";
import { interpretaRighe, INTESTAZIONI_MODELLO, type RigaImport } from "@/lib/importa";
import { formatMisura, formatDot } from "@/lib/misura";
import { toCsv, scaricaFile } from "@/lib/csv";
import { STAGIONI, TIPI } from "@/lib/types";
import { Messaggio, Testata } from "@/components/ui";

async function leggiFile(file: File): Promise<unknown[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import("read-excel-file/browser");
    return (await readSheet(file)) as unknown[][];
  }
  if (/\.xls$/i.test(file.name)) throw new Error("Formato .xls vecchio: in Excel fai Salva con nome → .xlsx oppure CSV.");
  const testo = await file.text();
  const r = Papa.parse<string[]>(testo, { skipEmptyLines: "greedy" });
  return r.data;
}

export default function Import() {
  const [righe, setRighe] = useState<RigaImport[] | null>(null);
  const [mancanti, setMancanti] = useState<string[]>([]);
  const [ignorate, setIgnorate] = useState<string[]>([]);
  const [nomeFile, setNomeFile] = useState("");
  const [errore, setErrore] = useState("");
  const [progresso, setProgresso] = useState("");
  const [fatto, setFatto] = useState<number | null>(null);

  async function scegli(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErrore(""); setFatto(null); setRighe(null); setNomeFile(f.name);
    try {
      const dati = await leggiFile(f);
      const r = interpretaRighe(dati);
      setRighe(r.righe); setMancanti(r.mancanti); setIgnorate(r.ignorate);
    } catch (ex) {
      setErrore((ex as Error).message || "File non leggibile");
    }
  }

  const valide = righe?.filter((r) => r.dati) ?? [];
  const sbagliate = righe?.filter((r) => !r.dati) ?? [];

  async function importa() {
    if (!valide.length) return;
    if (!confirm(`Importare ${valide.length} righe? Vengono AGGIUNTE al magazzino (non sostituiscono le esistenti).`)) return;
    const sb = supabase();
    let n = 0;
    try {
      for (let i = 0; i < valide.length; i += 200) {
        const blocco = valide.slice(i, i + 200);
        setProgresso(`Salvataggio ${i + 1}–${i + blocco.length} di ${valide.length}…`);
        const { data, error } = await sb.from("tyres").insert(blocco.map((r) => r.dati!)).select("id");
        if (error) throw error;
        const costi = blocco.map((r, k) => ({ tyre_id: data[k].id, prezzo_acquisto: r.prezzo_acquisto }))
          .filter((c) => c.prezzo_acquisto !== null);
        if (costi.length) {
          const r = await sb.from("tyre_costs").insert(costi);
          if (r.error) throw r.error;
        }
        n += blocco.length;
      }
      setFatto(n);
      setRighe(null);
    } catch (ex) {
      setErrore(`Interrotto dopo ${n} righe salvate: ${erroreIt(ex)}`);
    } finally {
      setProgresso("");
    }
  }

  function modello() {
    scaricaFile("modello-import-magazzino.csv", toCsv(INTESTAZIONI_MODELLO, [
      ["205/55 R16", "Michelin", "Primacy 4", "Estiva", "Nuova", "91", "V", "2423", "", "no", "no", "3528701234567", 4, "A-3-2", 95, 62, ""],
      ["225/45 R17", "Pirelli", "Sottozero 3", "Invernale", "Usata", "94", "H", "4021", "5,5", "no", "sì", "", 2, "B-1-4", 40, "", "leggero segno spalla"],
    ]));
  }

  return (
    <main>
      <Testata titolo="Importa magazzino" indietro="/altro" />
      <div className="space-y-3 p-3">
        <section className="card space-y-3">
          <p>Carica il file Excel (.xlsx) o CSV del magazzino attuale. Prima di salvare vedi l&apos;anteprima e gli errori riga per riga.</p>
          <p className="text-sm text-gray-600">Colonne obbligatorie: <b>Misura</b> (o Larghezza/Serie/Diametro), <b>Marca</b>, <b>Quantità</b>. Le altre sono facoltative.
            Stagione: E / I / 4S. Tipo: nuova / usata. DOT: SSAA. Posizione: A-3-2.</p>
          <button className="btn-ghost w-full" onClick={modello}>Scarica file modello</button>
          <label className="btn-brand w-full cursor-pointer text-lg">
            Scegli file
            <input type="file" accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={scegli} />
          </label>
        </section>

        {errore && <Messaggio>{errore}</Messaggio>}
        {progresso && <Messaggio tipo="info">{progresso}</Messaggio>}
        {fatto !== null && (
          <Messaggio tipo="ok">Importate {fatto} righe. <Link href="/scaffali" className="underline">Vedi scaffali</Link></Messaggio>
        )}

        {righe && (
          <>
            {mancanti.length > 0 ? (
              <Messaggio>Nel file &quot;{nomeFile}&quot; mancano le colonne: <b>{mancanti.join(", ")}</b>. Controlla la prima riga (intestazioni).</Messaggio>
            ) : (
              <section className="card space-y-2">
                <p className="text-lg"><b className="text-ok">{valide.length} righe valide</b> · <b className={sbagliate.length ? "text-ko" : ""}>{sbagliate.length} con errori</b></p>
                {ignorate.length > 0 && <p className="text-sm text-gray-600">Colonne ignorate: {ignorate.join(", ")}</p>}
                {sbagliate.length > 0 && <p className="text-sm">Le righe con errori <b>non</b> vengono importate: correggile nel file e ricaricalo, oppure importa solo le valide.</p>}
                <button className="btn-brand w-full text-lg" disabled={!valide.length || !!progresso} onClick={importa}>
                  Importa {valide.length} righe valide
                </button>
              </section>
            )}

            {sbagliate.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-lg font-black text-ko">Errori</h2>
                {sbagliate.slice(0, 200).map((r) => (
                  <div key={r.riga} className="card border-l-8 border-ko py-3">
                    <p className="font-bold">Riga {r.riga}</p>
                    <ul className="list-disc pl-5 text-ko">{r.errori.map((e) => <li key={e}>{e}</li>)}</ul>
                  </div>
                ))}
              </section>
            )}

            {valide.length > 0 && mancanti.length === 0 && (
              <section className="space-y-2">
                <h2 className="text-lg font-black">Anteprima {valide.length > 100 && "(prime 100)"}</h2>
                <div className="overflow-x-auto rounded-xl bg-white">
                  <table className="w-full text-left text-base">
                    <thead className="bg-gray-100 text-sm uppercase"><tr>
                      <th className="p-2">Riga</th><th className="p-2">Misura</th><th className="p-2">Marca</th><th className="p-2">Stag.</th>
                      <th className="p-2">Tipo</th><th className="p-2">DOT</th><th className="p-2">Q.tà</th><th className="p-2">Pos.</th>
                    </tr></thead>
                    <tbody>
                      {valide.slice(0, 100).map(({ riga, dati: d }) => (
                        <tr key={riga} className="border-t">
                          <td className="p-2 text-gray-500">{riga}</td>
                          <td className="whitespace-nowrap p-2 font-bold">{formatMisura(d!)}</td>
                          <td className="p-2">{d!.marca} {d!.modello}</td>
                          <td className="p-2">{STAGIONI[d!.stagione]}</td>
                          <td className="p-2">{TIPI[d!.tipo]}</td>
                          <td className="p-2">{formatDot(d!.dot_settimana, d!.dot_anno)}</td>
                          <td className="p-2 font-bold">{d!.quantita}</td>
                          <td className="p-2">{[d!.scaffale, d!.ripiano, d!.posto].filter(Boolean).join("-")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
