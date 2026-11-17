// Normalizzazione misure, DOT e posizioni. Pura logica: testata in lib/misura.test.ts

export interface Misura {
  larghezza: number;
  serie: number;
  diametro: number;
}

/** Chiave di ricerca identica a quella generata nel DB: 205/55 R16 -> "2055516", R17.5 -> "175". */
export function sizeKey(m: Misura): string {
  return `${m.larghezza}${m.serie}${String(m.diametro).replace(".", "")}`;
}

export function formatMisura(m: Misura): string {
  return `${m.larghezza}/${m.serie} R${Number(m.diametro)}`;
}

const PAROLE_MISURA = new Set(["R", "ZR", "RF", "C", "XL"]);

/**
 * Divide quello che l'utente scrive in cifre (prefisso della misura) e parole (marca/modello).
 * "205/55 R16", "2055516", "205 55 16" -> cifre "2055516".
 */
export function analizzaRicerca(input: string): { cifre: string; parole: string[] } {
  const cifre = input.replace(/[^0-9]/g, "");
  const parole = input
    .replace(/[0-9]+([.,][0-9]+)?/g, " ")
    .split(/[^A-Za-zÀ-ÿ]+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2 && !PAROLE_MISURA.has(p.toUpperCase()));
  return { cifre, parole };
}

/** Riconosce una misura completa: "205/55R16", "205 55 16", "2055516", "215/75 R17,5". */
export function parseMisura(input: string): Misura | null {
  const s = String(input ?? "").trim().toUpperCase();
  const conSeparatori = s.match(/^(\d{3})\s*[\/\s-]\s*(\d{2})\s*(?:Z?R|-|\s)?\s*F?\s*(\d{2}(?:[.,]5)?)\s*C?$/);
  const compatta = s.replace(/[\s\/R-]/g, "").match(/^(\d{3})(\d{2})(\d{2}(?:[.,]5)?)C?$/);
  const m = conSeparatori ?? compatta;
  if (!m) return null;
  const misura = {
    larghezza: Number(m[1]),
    serie: Number(m[2]),
    diametro: Number(m[3].replace(",", ".")),
  };
  return misuraValida(misura) ? misura : null;
}

export function misuraValida(m: Misura): boolean {
  return (
    m.larghezza >= 100 && m.larghezza <= 400 &&
    m.serie >= 20 && m.serie <= 100 &&
    m.diametro >= 10 && m.diametro <= 24
  );
}

/** DOT: "2419" -> settimana 24, anno 2019. Accetta anche "24/19", "24 2019". */
export function parseDot(input: string): { settimana: number; anno: number } | null {
  const s = String(input ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\s*[\/\s.-]?\s*(\d{2}|\d{4})$/) ?? s.match(/^(\d{2})(\d{2})$/);
  if (!m) return null;
  const settimana = Number(m[1]);
  let anno = Number(m[2]);
  if (anno < 100) anno += 2000;
  if (settimana < 1 || settimana > 53 || anno < 1990 || anno > new Date().getFullYear() + 1) return null;
  return { settimana, anno };
}

export function formatDot(settimana?: number | null, anno?: number | null): string {
  if (!anno) return "";
  const ss = settimana ? String(settimana).padStart(2, "0") : "??";
  return `${ss}${String(anno).slice(-2)}`;
}

/** Età in anni dal DOT (decimali). */
export function etaDot(settimana: number | null | undefined, anno: number | null | undefined, oggi = new Date()): number | null {
  if (!anno) return null;
  const prod = new Date(anno, 0, 1 + ((settimana ?? 1) - 1) * 7);
  return (oggi.getTime() - prod.getTime()) / (365.25 * 24 * 3600 * 1000);
}

/** Posizione "A-3-2", "a 3 2", "A/3/2" -> { scaffale: "A", ripiano: "3", posto: "2" } */
export function parsePosizione(input: string): { scaffale: string | null; ripiano: string | null; posto: string | null } | null {
  const s = String(input ?? "").trim().toUpperCase();
  if (!s) return { scaffale: null, ripiano: null, posto: null };
  const parti = s.split(/[\s\/.,-]+/).filter(Boolean);
  if (parti.length > 3 || parti.some((p) => !/^[A-Z0-9]{1,4}$/.test(p))) {
    // "A32" -> A-3-2
    const c = s.match(/^([A-Z]{1,2})(\d)(\d)$/);
    if (c) return { scaffale: c[1], ripiano: c[2], posto: c[3] };
    return null;
  }
  if (parti.length === 1) {
    const c = parti[0].match(/^([A-Z]{1,2})(\d)(\d)$/);
    if (c) return { scaffale: c[1], ripiano: c[2], posto: c[3] };
  }
  return { scaffale: parti[0] ?? null, ripiano: parti[1] ?? null, posto: parti[2] ?? null };
}

/** Targa: maiuscolo, senza spazi e trattini. */
export function normalizzaTarga(input: string): string {
  return String(input ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function eanValido(ean: string): boolean {
  return /^[0-9]{8,14}$/.test(ean);
}
