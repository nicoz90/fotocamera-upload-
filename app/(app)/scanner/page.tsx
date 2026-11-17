"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { IScannerControls } from "@zxing/browser";
import { erroreIt, supabase } from "@/lib/supabase/client";
import { eanValido } from "@/lib/misura";
import { CAMPI_LISTA, type Gomma } from "@/lib/types";
import CardGomma from "@/components/CardGomma";
import { Messaggio, Testata } from "@/components/ui";

export default function Scanner() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const controlli = useRef<IScannerControls | null>(null);
  const [stato, setStato] = useState<"avvio" | "attivo" | "cerco" | "errore">("avvio");
  const [errore, setErrore] = useState("");
  const [manuale, setManuale] = useState("");
  const [multipli, setMultipli] = useState<Gomma[] | null>(null);
  const [letto, setLetto] = useState("");
  const [torcia, setTorcia] = useState(false);

  async function apri(ean: string) {
    controlli.current?.stop();
    setLetto(ean);
    setStato("cerco");
    const { data, error } = await supabase().from("tyres").select(CAMPI_LISTA).eq("ean", ean).order("quantita", { ascending: false });
    if (error) { setErrore(erroreIt(error)); setStato("errore"); return; }
    const lista = (data ?? []) as unknown as Gomma[];
    if (lista.length === 0) router.replace(`/gomma/nuova?ean=${ean}`);
    else if (lista.length === 1) router.replace(`/gomma/${lista[0].id}`);
    else setMultipli(lista);
  }

  async function avvia() {
    setErrore("");
    setMultipli(null);
    setStato("avvio");
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A]);
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
      let fatto = false;
      controlli.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        video.current!,
        (res) => {
          if (!res || fatto) return;
          const testo = res.getText();
          if (!eanValido(testo)) return;
          fatto = true;
          navigator.vibrate?.(60);
          apri(testo);
        },
      );
      setStato("attivo");
    } catch (e) {
      const nome = (e as Error).name;
      setErrore(nome === "NotAllowedError"
        ? "Permesso fotocamera negato. Abilitalo nelle impostazioni del browser per questo sito."
        : nome === "NotFoundError" ? "Nessuna fotocamera trovata." : "Impossibile avviare la fotocamera.");
      setStato("errore");
    }
  }

  useEffect(() => {
    avvia();
    return () => controlli.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function accendiTorcia() {
    try {
      await controlli.current?.switchTorch?.(!torcia);
      setTorcia(!torcia);
    } catch {
      setErrore("Torcia non disponibile su questo telefono.");
    }
  }

  return (
    <main>
      <Testata titolo="Scanner EAN" indietro="/" />
      <div className="space-y-3 p-3">
        {!multipli && (
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={video} className="aspect-[3/4] w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-x-6 top-1/2 h-28 -translate-y-1/2 rounded-xl border-4 border-brand/90" />
            <p className="absolute inset-x-0 bottom-3 text-center text-lg font-bold text-white drop-shadow">
              {stato === "avvio" && "Avvio fotocamera…"}
              {stato === "attivo" && "Inquadra il codice a barre dell'etichetta"}
              {stato === "cerco" && `Letto ${letto}, cerco…`}
            </p>
          </div>
        )}
        {errore && <Messaggio>{errore}</Messaggio>}
        {stato === "attivo" && controlli.current?.switchTorch && (
          <button className="btn-ghost w-full" onClick={accendiTorcia}>{torcia ? "Spegni torcia" : "Accendi torcia"}</button>
        )}
        {stato === "errore" && <button className="btn-primary w-full" onClick={avvia}>Riprova</button>}

        {multipli && (
          <>
            <Messaggio tipo="info">EAN {letto}: {multipli.length} schede (DOT o posizioni diverse). Scegli:</Messaggio>
            {multipli.map((g) => <CardGomma key={g.id} g={g} />)}
            <button className="btn-ghost w-full" onClick={() => router.push(`/gomma/nuova?ean=${letto}`)}>Nuova scheda con questo EAN</button>
            <button className="btn-primary w-full" onClick={avvia}>Scansiona un altro</button>
          </>
        )}

        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = manuale.replace(/\s/g, ""); if (eanValido(v)) apri(v); else setErrore("EAN non valido (8-14 cifre)"); }}>
          <input className="campo font-mono text-xl" inputMode="numeric" placeholder="EAN a mano" value={manuale} onChange={(e) => setManuale(e.target.value)} />
          <button className="btn-primary">Cerca</button>
        </form>
      </div>
    </main>
  );
}
