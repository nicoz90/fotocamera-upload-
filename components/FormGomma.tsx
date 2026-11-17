"use client";
import { useState } from "react";
import { formatDot, parseDot, parseMisura, parsePosizione, eanValido, formatMisura } from "@/lib/misura";
import { STAGIONI, TIPI, type Gomma, type Stagione, type TipoGomma } from "@/lib/types";
import { Chip, Messaggio } from "./ui";

export interface DatiGomma {
  larghezza: number; serie: number; diametro: number;
  indice_carico: string | null; codice_velocita: string | null;
  marca: string; modello: string | null; stagione: Stagione; tipo: TipoGomma;
  dot_settimana: number | null; dot_anno: number | null; battistrada_mm: number | null;
  runflat: boolean; xl: boolean; ean: string | null;
  scaffale: string | null; ripiano: string | null; posto: string | null;
  prezzo_vendita: number | null; note: string | null;
  quantita?: number;
}

interface Props {
  iniziale?: Partial<Gomma>;
  nuova?: boolean;
  admin: boolean;
  prezzoAcquisto?: number | null;
  nascondiTipo?: boolean;
  marche?: string[];
  onSalva: (d: DatiGomma, prezzoAcquisto: number | null) => Promise<void>;
  etichettaSalva?: string;
}

const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

export default function FormGomma({ iniziale = {}, nuova, admin, prezzoAcquisto, nascondiTipo, marche = [], onSalva, etichettaSalva }: Props) {
  const [misura, setMisura] = useState(iniziale.larghezza ? formatMisura(iniziale as Gomma) : "");
  const [marca, setMarca] = useState(iniziale.marca ?? "");
  const [modello, setModello] = useState(iniziale.modello ?? "");
  const [ic, setIc] = useState(iniziale.indice_carico ?? "");
  const [cv, setCv] = useState(iniziale.codice_velocita ?? "");
  const [stagione, setStagione] = useState<Stagione>(iniziale.stagione ?? "estiva");
  const [tipo, setTipo] = useState<TipoGomma>(iniziale.tipo ?? "nuova");
  const [dot, setDot] = useState(formatDot(iniziale.dot_settimana, iniziale.dot_anno));
  const [mm, setMm] = useState(iniziale.battistrada_mm != null ? String(iniziale.battistrada_mm) : "");
  const [runflat, setRunflat] = useState(iniziale.runflat ?? false);
  const [xl, setXl] = useState(iniziale.xl ?? false);
  const [ean, setEan] = useState(iniziale.ean ?? "");
  const [quantita, setQuantita] = useState(String(iniziale.quantita ?? (iniziale.tipo === "deposito" ? 4 : 1)));
  const [posizione, setPosizione] = useState(iniziale.posizione ?? "");
  const [pv, setPv] = useState(iniziale.prezzo_vendita != null ? String(iniziale.prezzo_vendita) : "");
  const [pa, setPa] = useState(prezzoAcquisto != null ? String(prezzoAcquisto) : "");
  const [note, setNote] = useState(iniziale.note ?? "");
  const [errori, setErrori] = useState<string[]>([]);
  const [attesa, setAttesa] = useState(false);

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    const err: string[] = [];
    const m = parseMisura(misura);
    if (!m) err.push("Misura non valida (es. 205/55 R16)");
    if (!marca.trim()) err.push("Manca la marca");
    const d = dot.trim() ? parseDot(dot) : null;
    if (dot.trim() && !d) err.push("DOT non valido: 4 cifre settimana+anno, es. 2419");
    const pos = parsePosizione(posizione);
    if (!pos) err.push("Posizione non valida (es. A-3-2)");
    const e13 = ean.replace(/\s/g, "");
    if (e13 && !eanValido(e13)) err.push("EAN non valido (8-14 cifre)");
    const q = Number(quantita);
    if (nuova && (!Number.isInteger(q) || q < 0 || q > 1000)) err.push("Quantità non valida");
    const mmN = num(mm), pvN = num(pv), paN = num(pa);
    if (mmN !== null && (Number.isNaN(mmN) || mmN < 0 || mmN > 20)) err.push("Battistrada non valido (0-20 mm)");
    if (pvN !== null && (Number.isNaN(pvN) || pvN < 0)) err.push("Prezzo di vendita non valido");
    if (paN !== null && (Number.isNaN(paN) || paN < 0)) err.push("Prezzo d'acquisto non valido");
    setErrori(err);
    if (err.length || !m || !pos) return;

    setAttesa(true);
    try {
      await onSalva({
        ...m,
        marca: marca.trim(), modello: modello.trim() || null,
        indice_carico: ic.trim() || null, codice_velocita: cv.trim().toUpperCase() || null,
        stagione, tipo,
        dot_settimana: d?.settimana ?? null, dot_anno: d?.anno ?? null,
        battistrada_mm: tipo === "nuova" ? null : mmN,
        runflat, xl, ean: e13 || null,
        ...pos,
        prezzo_vendita: pvN, note: note.trim() || null,
        ...(nuova ? { quantita: q } : {}),
      }, paN);
    } catch (ex) {
      setErrori([(ex as Error).message]);
    } finally {
      setAttesa(false);
    }
  }

  return (
    <form onSubmit={invia} className="space-y-4" noValidate>
      {errori.length > 0 && <Messaggio><ul className="list-disc pl-5">{errori.map((e) => <li key={e}>{e}</li>)}</ul></Messaggio>}

      <div className="grid grid-cols-3 gap-3">
        <label className="col-span-3 block">
          <span className="etichetta">Misura *</span>
          <input className="campo text-2xl font-bold" inputMode="text" placeholder="205/55 R16" required
            value={misura} onChange={(e) => setMisura(e.target.value)} />
        </label>
        <label className="block">
          <span className="etichetta">Ind. carico</span>
          <input className="campo" inputMode="numeric" placeholder="91" value={ic} onChange={(e) => setIc(e.target.value)} />
        </label>
        <label className="block">
          <span className="etichetta">Velocità</span>
          <input className="campo uppercase" maxLength={2} placeholder="V" value={cv} onChange={(e) => setCv(e.target.value)} />
        </label>
        <label className="block">
          <span className="etichetta">DOT</span>
          <input className="campo" inputMode="numeric" maxLength={5} placeholder="2419" value={dot} onChange={(e) => setDot(e.target.value)} />
        </label>
      </div>

      <label className="block">
        <span className="etichetta">Marca *</span>
        <input className="campo" list="marche" autoCapitalize="words" required value={marca} onChange={(e) => setMarca(e.target.value)} />
        <datalist id="marche">{marche.map((m) => <option key={m} value={m} />)}</datalist>
      </label>
      <label className="block">
        <span className="etichetta">Modello</span>
        <input className="campo" value={modello} onChange={(e) => setModello(e.target.value)} />
      </label>

      <div>
        <p className="etichetta">Stagione</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STAGIONI) as Stagione[]).map((s) => <Chip key={s} attivo={stagione === s} onClick={() => setStagione(s)}>{STAGIONI[s]}</Chip>)}
        </div>
      </div>
      {!nascondiTipo && (
        <div>
          <p className="etichetta">Tipo</p>
          <div className="flex flex-wrap gap-2">
            {(["nuova", "usata"] as TipoGomma[]).map((t) => <Chip key={t} attivo={tipo === t} onClick={() => setTipo(t)}>{TIPI[t]}</Chip>)}
            {tipo === "deposito" && <Chip attivo onClick={() => {}}>Deposito</Chip>}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Chip attivo={xl} onClick={() => setXl(!xl)}>XL</Chip>
        <Chip attivo={runflat} onClick={() => setRunflat(!runflat)}>Runflat</Chip>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="etichetta">Posizione</span>
          <input className="campo text-xl font-bold uppercase" placeholder="A-3-2" autoCapitalize="characters"
            value={posizione} onChange={(e) => setPosizione(e.target.value)} />
        </label>
        {nuova ? (
          <label className="block">
            <span className="etichetta">Quantità</span>
            <input className="campo text-xl font-bold" inputMode="numeric" value={quantita} onChange={(e) => setQuantita(e.target.value)} />
          </label>
        ) : tipo !== "nuova" ? (
          <label className="block">
            <span className="etichetta">Battistrada mm</span>
            <input className="campo" inputMode="decimal" value={mm} onChange={(e) => setMm(e.target.value)} />
          </label>
        ) : <div />}
        {nuova && tipo !== "nuova" && (
          <label className="block">
            <span className="etichetta">Battistrada mm</span>
            <input className="campo" inputMode="decimal" value={mm} onChange={(e) => setMm(e.target.value)} />
          </label>
        )}
      </div>

      {tipo !== "deposito" && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="etichetta">Prezzo vendita €</span>
            <input className="campo" inputMode="decimal" value={pv} onChange={(e) => setPv(e.target.value)} />
          </label>
          {admin && (
            <label className="block">
              <span className="etichetta">Prezzo acquisto €</span>
              <input className="campo" inputMode="decimal" value={pa} onChange={(e) => setPa(e.target.value)} />
            </label>
          )}
        </div>
      )}

      <label className="block">
        <span className="etichetta">EAN</span>
        <input className="campo font-mono" inputMode="numeric" value={ean} onChange={(e) => setEan(e.target.value)} />
      </label>
      <label className="block">
        <span className="etichetta">Note</span>
        <textarea className="campo" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      <button className="btn-brand w-full text-lg" disabled={attesa}>{attesa ? "Salvataggio…" : etichettaSalva ?? "Salva"}</button>
    </form>
  );
}
