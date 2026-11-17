import { redirect } from "next/navigation";
import { profiloCorrente } from "@/lib/supabase/server";

// Pagine solo titolare. La protezione vera è la RLS nel database; qui evitiamo di mostrare pagine inutili.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const p = await profiloCorrente();
  if (p?.ruolo !== "admin" || !p.attivo) redirect("/");
  return children;
}
