import { formatDot, etaDot } from "@/lib/misura";
import { STAGIONI, TIPI, type Gomma } from "@/lib/types";

/** Etichette compatte: stagione, tipo, XL, RF, DOT, mm. */
export default function BadgeGomma({ g, dotAnni = 5 }: { g: Gomma; dotAnni?: number }) {
  const eta = etaDot(g.dot_settimana, g.dot_anno);
  const b = "rounded-md px-2 py-0.5 text-sm font-bold";
  const colStag = g.stagione === "invernale" ? "bg-sky-100 text-sky-900" : g.stagione === "estiva" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900";
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`${b} ${colStag}`}>{STAGIONI[g.stagione]}</span>
      {g.tipo !== "nuova" && <span className={`${b} ${g.tipo === "deposito" ? "bg-purple-100 text-purple-900" : "bg-gray-200"}`}>{TIPI[g.tipo]}</span>}
      {g.xl && <span className={`${b} bg-gray-200`}>XL</span>}
      {g.runflat && <span className={`${b} bg-gray-200`}>Runflat</span>}
      {(g.indice_carico || g.codice_velocita) && <span className={`${b} bg-gray-100`}>{g.indice_carico}{g.codice_velocita}</span>}
      {g.dot_anno && <span className={`${b} ${eta !== null && eta > dotAnni ? "bg-red-100 text-ko" : "bg-gray-100"}`}>DOT {formatDot(g.dot_settimana, g.dot_anno)}</span>}
      {g.battistrada_mm !== null && g.tipo !== "nuova" && <span className={`${b} bg-gray-100`}>{Number(g.battistrada_mm)} mm</span>}
    </div>
  );
}
