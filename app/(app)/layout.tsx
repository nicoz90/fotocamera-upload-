import { redirect } from "next/navigation";
import { profiloCorrente, supabaseServer } from "@/lib/supabase/server";
import { ProfiloProvider } from "@/components/Profilo";
import Nav from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profilo = await profiloCorrente();
  if (!profilo) redirect("/login");
  if (!profilo.attivo) {
    const sb = await supabaseServer();
    await sb.auth.signOut();
    redirect("/login?disattivato=1");
  }
  return (
    <ProfiloProvider profilo={profilo}>
      <div className="pb-nav mx-auto min-h-dvh max-w-xl">{children}</div>
      <Nav />
    </ProfiloProvider>
  );
}
