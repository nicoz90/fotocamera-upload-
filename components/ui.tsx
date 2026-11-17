"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IcoIndietro } from "./Icone";

export function Testata({ titolo, indietro, azione }: { titolo: string; indietro?: string | true; azione?: React.ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex min-h-14 items-center gap-2 bg-ink px-2 text-white"
      style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {indietro && (
        typeof indietro === "string"
          ? <Link href={indietro} className="flex h-12 w-12 items-center justify-center" aria-label="Indietro"><IcoIndietro /></Link>
          : <button onClick={() => router.back()} className="flex h-12 w-12 items-center justify-center" aria-label="Indietro"><IcoIndietro /></button>
      )}
      <h1 className={`flex-1 truncate text-xl font-extrabold ${indietro ? "" : "pl-2"}`}>{titolo}</h1>
      {azione}
    </header>
  );
}

export function Chip({ attivo, onClick, children }: { attivo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={attivo}
      className={`min-h-12 shrink-0 rounded-full border-2 px-4 text-base font-bold ${attivo ? "border-ink bg-ink text-white" : "border-gray-300 bg-white text-ink"}`}>
      {children}
    </button>
  );
}

export function Messaggio({ tipo = "errore", children }: { tipo?: "errore" | "ok" | "info"; children: React.ReactNode }) {
  const c = tipo === "errore" ? "bg-red-50 text-ko border-ko" : tipo === "ok" ? "bg-green-50 text-ok border-ok" : "bg-yellow-50 text-ink border-brand";
  return <div role={tipo === "errore" ? "alert" : "status"} className={`rounded-xl border-2 px-4 py-3 font-semibold ${c}`}>{children}</div>;
}

export function Vuoto({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-lg text-gray-500">{children}</p>;
}

export function Caricamento() {
  return <p className="py-10 text-center text-lg text-gray-500">Caricamento…</p>;
}
