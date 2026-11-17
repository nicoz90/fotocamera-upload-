"use client";
import { createContext, useContext } from "react";
import type { Profilo } from "@/lib/types";

const Ctx = createContext<Profilo | null>(null);

export function ProfiloProvider({ profilo, children }: { profilo: Profilo; children: React.ReactNode }) {
  return <Ctx.Provider value={profilo}>{children}</Ctx.Provider>;
}

export function useProfilo(): Profilo & { admin: boolean } {
  const p = useContext(Ctx);
  if (!p) throw new Error("ProfiloProvider mancante");
  return { ...p, admin: p.ruolo === "admin" };
}
