import Link from "next/link";
import { formatMisura } from "@/lib/misura";
import type { Gomma } from "@/lib/types";
import BadgeGomma from "./BadgeGomma";

/** Un risultato: misura, marca/modello, quantità e posizione in grande. */
export default function CardGomma({ g, dotAnni }: { g: Gomma; dotAnni?: number }) {
  return (
    <Link href={`/gomma/${g.id}`} className={`card flex items-stretch gap-3 active:bg-gray-50 ${g.quantita === 0 ? "opacity-55" : ""}`}>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-2xl font-extrabold leading-tight">{formatMisura(g)}</p>
        <p className="truncate text-xl font-bold">{g.marca} <span className="font-semibold text-gray-600">{g.modello}</span></p>
        <BadgeGomma g={g} dotAnni={dotAnni} />
      </div>
      <div className="flex w-28 shrink-0 flex-col items-end justify-between text-right">
        <p className={`text-4xl font-black leading-none ${g.quantita === 0 ? "text-ko" : ""}`}>
          {g.quantita}<span className="ml-1 text-base font-bold text-gray-500">pz</span>
        </p>
        <p className={`rounded-lg px-2 py-1 text-xl font-black ${g.posizione ? "bg-brand text-ink" : "bg-gray-200 text-gray-500"}`}>
          {g.posizione ?? "—"}
        </p>
      </div>
    </Link>
  );
}
