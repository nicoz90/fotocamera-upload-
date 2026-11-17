// Interpretazione righe Excel/CSV del magazzino attuale. Nessun accesso al DB qui.
import { parseDot, parseMisura, parsePosizione, eanValido } from "./misura";
import type { Stagione, TipoGomma } from "./types";

export interface RigaImport {
  riga: number; // numero di riga nel file (1 = intestazione)
  dati?: {
    larghezza: number; serie: number; diametro: number;
    marca: string; modello: string | null;
    stagione: Stagione; tipo: TipoGomma;
    indice_carico: string | null; codice_velocita: string | null;
    dot_settimana: number | null; dot_anno: number | null;
    battistrada_mm: number | null; runflat: boolean; xl: boolean;
    ean: string | null; quantita: number;
    scaffale: string | null; ripiano: string | null; posto: string | null;
    prezzo_vendita: number | null; note: string | null;
  };
  prezzo_acquisto: number | null;
  errori: string[];
  originale: Record<string, string>;
}

const ALIAS: Record<string, string[]> = {
  misura: ["misura", "dimensione", "size", "taglia"],
  larghezza: ["larghezza", "largh"],
  serie: ["serie", "altezza", "spalla"],
  diametro: ["diametro", "cerchio", "pollici"],
  marca: ["marca", "brand", "produttore"],
  modello: ["modello", "model", "disegno"],
  stagione: ["stagione", "season", "tipo stagione"],
  tipo: ["tipo", "condizione", "stato"],
  indice_carico: ["indice carico", "indice di carico", "ic", "carico", "load index"],
  codice_velocita: ["codice velocita", "velocita", "cv", "speed"],
  dot: ["dot", "data produzione"],
  battistrada: ["battistrada", "battistrada mm", "mm", "profondita"],
  runflat: ["runflat", "run flat", "rf", "rft"],
  xl: ["xl", "rinforzata", "extra load"],
  ean: ["ean", "barcode", "codice a barre", "codice ean"],
  quantita: ["quantita", "qta", "qty", "pezzi", "giacenza", "q.ta"],
  posizione: ["posizione", "ubicazione", "collocazione", "scaffale"],
  prezzo_vendita: ["prezzo vendita", "prezzo", "vendita", "prezzo di vendita", "listino"],
  prezzo_acquisto: ["prezzo acquisto", "acquisto", "costo", "prezzo di acquisto"],
  note: ["note", "annotazioni", "commento"],
};

export const INTESTAZIONI_MODELLO = [
  "Misura", "Marca", "Modello", "Stagione", "Tipo", "Indice carico", "Velocità", "DOT",
  "Battistrada mm", "Runflat", "XL", "EAN", "Quantità", "Posizione", "Prezzo vendita", "Prezzo acquisto", "Note",
];

function pulisci(h: string): string {
  return String(h ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9. ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Mappa colonna del file -> campo. Restituisce anche le intestazioni non riconosciute. */
export function mappaIntestazioni(intestazioni: string[]): { mappa: Record<string, number>; ignorate: string[] } {
  const mappa: Record<string, number> = {};
  const ignorate: string[] = [];
  intestazioni.forEach((h, i) => {
    const p = pulisci(h);
    const campo = Object.entries(ALIAS).find(([, alias]) => alias.includes(p))?.[0];
    if (campo && mappa[campo] === undefined) mappa[campo] = i;
    else if (p) ignorate.push(String(h));
  });
  return { mappa, ignorate };
}

function stagione(v: string): Stagione | null {
  const p = pulisci(v);
  if (!p) return "estiva";
  if (/^(e|est|estiva|estivo|estate|summer|s)$/.test(p)) return "estiva";
  if (/^(i|inv|invernale|inverno|winter|w|m s|ms|m\+s)$/.test(p)) return "invernale";
  if (/^(4s|4 s|4 stagioni|quattro stagioni|all season|allseason|as|a s)$/.test(p)) return "quattro_stagioni";
  return null;
}

function tipo(v: string): TipoGomma | null {
  const p = pulisci(v);
  if (!p || /^(n|nuova|nuovo|new)$/.test(p)) return "nuova";
  if (/^(u|usata|usato|used)$/.test(p)) return "usata";
  return null;
}

function bool(v: string): boolean {
  return /^(s|si|sì|x|1|true|yes|y|vero)$/i.test(String(v ?? "").trim());
}

function numero(v: string): number | null {
  const s = String(v ?? "").trim().replace(/€/g, "").replace(/\s/g, "");
  if (!s) return null;
  // 1.234,56 -> 1234.56 ; 12,5 -> 12.5
  const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return Number.isFinite(n) ? n : NaN;
}

export function interpretaRighe(righe: unknown[][]): { righe: RigaImport[]; ignorate: string[]; mancanti: string[] } {
  if (righe.length === 0) return { righe: [], ignorate: [], mancanti: ["intestazione"] };
  const [intest, ...corpo] = righe;
  const { mappa, ignorate } = mappaIntestazioni(intest.map((c) => String(c ?? "")));
  const mancanti: string[] = [];
  if (mappa.misura === undefined && (mappa.larghezza === undefined || mappa.serie === undefined || mappa.diametro === undefined))
    mancanti.push("Misura");
  if (mappa.marca === undefined) mancanti.push("Marca");
  if (mappa.quantita === undefined) mancanti.push("Quantità");

  const out: RigaImport[] = [];
  corpo.forEach((r, idx) => {
    const cella = (campo: string) => (mappa[campo] === undefined ? "" : String(r[mappa[campo]] ?? "").trim());
    if (r.every((c) => String(c ?? "").trim() === "")) return; // riga vuota
    const originale: Record<string, string> = {};
    intest.forEach((h, i) => (originale[String(h)] = String(r[i] ?? "")));
    const errori: string[] = [];

    const misura = mappa.misura !== undefined
      ? parseMisura(cella("misura"))
      : parseMisura(`${cella("larghezza")}/${cella("serie")} R${cella("diametro")}`);
    if (!misura) errori.push(`Misura non valida: "${cella("misura") || [cella("larghezza"), cella("serie"), cella("diametro")].join(" ")}"`);

    const marca = cella("marca");
    if (!marca) errori.push("Marca mancante");

    const st = stagione(cella("stagione"));
    if (!st) errori.push(`Stagione non riconosciuta: "${cella("stagione")}"`);
    const tp = tipo(cella("tipo"));
    if (!tp) errori.push(`Tipo non valido: "${cella("tipo")}" (nuova/usata; i depositi si inseriscono dalla sezione Depositi)`);

    const q = numero(cella("quantita"));
    if (q === null || Number.isNaN(q) || !Number.isInteger(q) || q < 0 || q > 10000) errori.push(`Quantità non valida: "${cella("quantita")}"`);

    let dot: { settimana: number; anno: number } | null = null;
    if (cella("dot")) {
      dot = parseDot(cella("dot"));
      if (!dot) errori.push(`DOT non valido: "${cella("dot")}" (formato SSAA, es. 2419)`);
    }

    const ean = cella("ean").replace(/\s/g, "") || null;
    if (ean && !eanValido(ean)) errori.push(`EAN non valido: "${ean}"`);

    const pos = parsePosizione(cella("posizione"));
    if (!pos) errori.push(`Posizione non valida: "${cella("posizione")}" (es. A-3-2)`);

    const bt = numero(cella("battistrada"));
    if (Number.isNaN(bt) || (bt !== null && (bt < 0 || bt > 20))) errori.push(`Battistrada non valido: "${cella("battistrada")}"`);
    const pv = numero(cella("prezzo_vendita"));
    if (Number.isNaN(pv) || (pv !== null && pv < 0)) errori.push(`Prezzo vendita non valido: "${cella("prezzo_vendita")}"`);
    const pa = numero(cella("prezzo_acquisto"));
    if (Number.isNaN(pa) || (pa !== null && pa < 0)) errori.push(`Prezzo acquisto non valido: "${cella("prezzo_acquisto")}"`);

    const riga: RigaImport = { riga: idx + 2, errori, originale, prezzo_acquisto: errori.length ? null : pa };
    if (errori.length === 0 && misura && st && tp && pos && q !== null) {
      riga.dati = {
        ...misura,
        marca,
        modello: cella("modello") || null,
        stagione: st,
        tipo: tp,
        indice_carico: cella("indice_carico") || null,
        codice_velocita: cella("codice_velocita").toUpperCase() || null,
        dot_settimana: dot?.settimana ?? null,
        dot_anno: dot?.anno ?? null,
        battistrada_mm: bt,
        runflat: bool(cella("runflat")),
        xl: bool(cella("xl")),
        ean,
        quantita: q,
        ...pos,
        prezzo_vendita: pv,
        note: cella("note") || null,
      };
    }
    out.push(riga);
  });
  return { righe: out, ignorate, mancanti };
}
