"use client";
import { useEffect, useState } from "react";
import { supabase } from "./supabase/client";

export function useMarche(): string[] {
  const [marche, setMarche] = useState<string[]>([]);
  useEffect(() => {
    supabase().from("tyres").select("marca").limit(5000).then(({ data }) => {
      if (data) setMarche([...new Set(data.map((r) => r.marca as string))].sort((a, b) => a.localeCompare(b, "it")));
    });
  }, []);
  return marche;
}

export function useDotAnni(): number {
  const [n, setN] = useState(5);
  useEffect(() => {
    supabase().from("impostazioni").select("dot_anni").single().then(({ data }) => data && setN(data.dot_anni));
  }, []);
  return n;
}

export const euro = (n: number | null | undefined) =>
  n == null ? "—" : Number(n).toLocaleString("it-IT", { style: "currency", currency: "EUR" });

export const dataIt = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

export const dataOraIt = (s: string) =>
  new Date(s).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
