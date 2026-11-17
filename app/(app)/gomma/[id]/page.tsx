"use client";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { erroreIt, supabase } from "@/lib/supabase/client";
import { formatMisura, formatDot, etaDot } from "@/lib/misura";
import { CAMPI_LISTA, MOTIVI, STAGIONI, TIPI, type Deposito, type Gomma, type Movimento } from "@/lib/types";
import { dataIt, dataOraIt, euro, useDotAnni, useMarche } from "@/lib/dati";
import { useProfilo } from "@/components/Profilo";
import { Caricamento, Messaggio, Testata, Vuoto } from "@/components/ui";
import FormGomma, { type DatiGomma } from "@/components/FormGomma";
import Movimenta from "@/components/Movimenta";
import Foto from "@/components/Foto";
import BadgeGomma from "@/components/BadgeGomma";

export default function SchedaGomma({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { admin } = useProfilo();
  const router = useRouter();
  const marche = useMarche();
  const dotAnni = useDotAnni();
  const [g, setG] = useState<Gomma | null>(null);
  const [costo, setCosto] = useState<number | null>(null);
  const [deposito, setDeposito] = useState<Deposito | null>(null);
  const [movimenti, setMovimenti] = useState<Movimento[]>([]);
  const [modifica, setModifica] = useState(false);
  const [errore, setErrore] = useState("");
  const [nonTrovata, setNonTrovata] = useState(false);
  const [ok, setOk] = useState("");

  const carica = useCallback(async () => {
    const sb = supabase();
    const { data, error } = await sb.from("tyres").select(CAMPI_LISTA).eq("id", id).maybeSingle();
    if (error) return setErrore(erroreIt(error));
    if (!data) return setNonTrovata(true);
    const gomma = data as unknown as Gomma;
    setG(gomma);
    if (gomma.tipo === "deposito") {
      const { data: d } = await sb.from("deposits").select("*").eq("tyre_id", id).maybeSingle();
      setDeposito(d as Deposito | null);
    }
    if (admin) {
      const [{ data: c }, { data: m }] = await Promise.all([
        sb.from("tyre_costs").select("prezzo_acquisto").eq("tyre_id", id).maybeSingle(),
        sb.from("movements").select("*").eq("tyre_id", id).order("created_at", { ascending: false }).limit(20),
      ]);
      setCosto(c?.prezzo_acquisto ?? null);
      setMovimenti((m as Movimento[]) ?? []);
    }
  }, [id, admin]);

  useEffect(() => { carica(); }, [carica]);

  async function salva(d: DatiGomma, pa: number | null) {
    const sb = supabase();
    const { error } = await sb.from("tyres").update(d).eq("id", id);
    if (error) throw new Error(erroreIt(error));
    if (admin) {
      const r = pa === null
        ? await sb.from("tyre_costs").delete().eq("tyre_id", id)
        : await sb.from("tyre_costs").upsert({ tyre_id: id, prezzo_acquisto: pa });
      if (r.error) throw new Error(erroreIt(r.error));
    }
    setModifica(false);
    setOk("Salvato");
    setTimeout(() => setOk(""), 2500);
    carica();
  }

  async function elimina() {
    if (!g || !confirm(`Eliminare definitivamente ${formatMisura(g)} ${g.marca}? Lo storico resta.`)) return;
    const { error } = await supabase().from("tyres").delete().eq("id", id);
    if (error) return setErrore(erroreIt(error));
    router.replace("/");
  }

  if (nonTrovata) return (<><Testata titolo="Gomma" indietro /><Vuoto>Gomma non trovata (forse è stata eliminata).</Vuoto></>);
  if (!g) return (<><Testata titolo="Gomma" indietro />{errore ? <div className="p-3"><Messaggio>{errore}</Messaggio></div> : <Caricamento />}</>);

  const eta = etaDot(g.dot_settimana, g.dot_anno);

  return (
    <main>
      <Testata titolo={formatMisura(g)} indietro
        azione={<button className="min-h-12 px-3 font-bold text-brand" onClick={() => setModifica(!modifica)}>{modifica ? "Chiudi" : "Modifica"}</button>} />
      <div className="space-y-3 p-3">
        {errore && <Messaggio>{errore}</Messaggio>}
        {ok && <Messaggio tipo="ok">{ok}</Messaggio>}

        <section className="card space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-3xl font-black leading-tight">{formatMisura(g)}</p>
              <p className="text-xl font-bold">{g.marca} <span className="text-gray-600">{g.modello}</span></p>
            </div>
            <div className="text-right">
              <p className={`text-5xl font-black leading-none ${g.quantita === 0 ? "text-ko" : ""}`}>{g.quantita}</p>
              <p className="text-sm font-bold text-gray-500">PEZZI</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-brand px-4 py-3">
            <span className="font-bold uppercase">Posizione</span>
            {g.scaffale
              ? <Link href={`/scaffali/${encodeURIComponent(g.scaffale)}`} className="text-3xl font-black underline-offset-4 active:underline">{g.posizione}</Link>
              : <span className="text-2xl font-black text-gray-700">non assegnata</span>}
          </div>
          <BadgeGomma g={g} dotAnni={dotAnni} />
          <Movimenta tyreId={g.id} quantita={g.quantita} onFatto={(q) => { setG({ ...g, quantita: q }); if (admin) carica(); }} />
        </section>

        {deposito && (
          <Link href={`/depositi/${deposito.id}`} className="card block border-2 border-purple-300 bg-purple-50">
            <p className="text-sm font-bold uppercase text-purple-900">Deposito cliente</p>
            <p className="text-2xl font-black">{deposito.targa}</p>
            <p className="font-semibold">{deposito.cliente_nome} · dal {dataIt(deposito.data_deposito)}{deposito.con_cerchi ? " · con cerchi" : ""}</p>
          </Link>
        )}

        {modifica ? (
          <section className="card">
            <FormGomma iniziale={g} admin={admin} prezzoAcquisto={costo} marche={marche} onSalva={salva} nascondiTipo={g.tipo === "deposito"} />
          </section>
        ) : (
          <section className="card">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-lg">
              <Riga t="Larghezza" v={g.larghezza} />
              <Riga t="Serie" v={g.serie} />
              <Riga t="Diametro" v={`R${Number(g.diametro)}`} />
              <Riga t="Carico / velocità" v={[g.indice_carico, g.codice_velocita].filter(Boolean).join(" ") || "—"} />
              <Riga t="Stagione" v={STAGIONI[g.stagione]} />
              <Riga t="Tipo" v={TIPI[g.tipo]} />
              <Riga t="DOT" v={g.dot_anno ? `${formatDot(g.dot_settimana, g.dot_anno)} (${eta?.toFixed(1)} anni)` : "—"} rosso={eta !== null && eta > dotAnni} />
              {g.tipo !== "nuova" && <Riga t="Battistrada" v={g.battistrada_mm != null ? `${Number(g.battistrada_mm)} mm` : "—"} />}
              <Riga t="Runflat" v={g.runflat ? "Sì" : "No"} />
              <Riga t="XL" v={g.xl ? "Sì" : "No"} />
              <Riga t="EAN" v={g.ean ?? "—"} mono />
              {g.tipo !== "deposito" && <Riga t="Prezzo vendita" v={euro(g.prezzo_vendita)} />}
              {admin && g.tipo !== "deposito" && <Riga t="Prezzo acquisto" v={euro(costo)} />}
            </dl>
            {g.note && <p className="mt-3 rounded-xl bg-gray-100 p-3">{g.note}</p>}
          </section>
        )}

        <section className="card">
          <Foto tyreId={g.id} path={g.foto_path} onCambiata={(p) => setG({ ...g, foto_path: p })} />
        </section>

        {admin && (
          <section className="card space-y-2">
            <h2 className="text-lg font-extrabold">Ultimi movimenti</h2>
            {movimenti.length === 0 && <p className="text-gray-500">Nessun movimento.</p>}
            <ul className="divide-y">
              {movimenti.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <p className="font-bold">{MOTIVI[m.motivo]}{m.motivo === "spostamento" && ` ${m.da_posizione ?? "—"} → ${m.a_posizione ?? "—"}`}</p>
                    <p className="text-sm text-gray-600">{dataOraIt(m.created_at)} · {m.user_nome ?? "?"}</p>
                  </div>
                  {m.delta !== 0 && <span className={`text-xl font-black ${m.delta > 0 ? "text-ok" : "text-ko"}`}>{m.delta > 0 ? "+" : ""}{m.delta}</span>}
                </li>
              ))}
            </ul>
            <button className="btn-danger w-full" onClick={elimina}>Elimina gomma</button>
          </section>
        )}
      </div>
    </main>
  );
}

function Riga({ t, v, mono, rosso }: { t: string; v: React.ReactNode; mono?: boolean; rosso?: boolean }) {
  return (
    <div>
      <dt className="text-sm font-bold uppercase text-gray-500">{t}</dt>
      <dd className={`font-bold ${mono ? "font-mono" : ""} ${rosso ? "text-ko" : ""}`}>{v}</dd>
    </div>
  );
}
