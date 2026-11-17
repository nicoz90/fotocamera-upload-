"use client";
import { useEffect, useState } from "react";
import { erroreIt, supabase } from "@/lib/supabase/client";
import { IcoFoto } from "./Icone";
import { Messaggio } from "./ui";

const BUCKET = "foto-gomme";

/** Ridimensiona a max 1280 px JPEG: foto leggere anche con poco campo. */
async function comprimi(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scala = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scala);
  c.height = Math.round(img.height * scala);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error("Foto non leggibile"))), "image/jpeg", 0.8));
}

export default function Foto({ tyreId, path, onCambiata }: { tyreId: string; path: string | null; onCambiata: (p: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [attesa, setAttesa] = useState(false);
  const [errore, setErrore] = useState("");
  const [grande, setGrande] = useState(false);

  useEffect(() => {
    if (!path) return setUrl(null);
    supabase().storage.from(BUCKET).createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);

  async function carica(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAttesa(true);
    setErrore("");
    try {
      const blob = await comprimi(file);
      const nuovo = `${tyreId}/${Date.now()}.jpg`;
      const sb = supabase();
      const up = await sb.storage.from(BUCKET).upload(nuovo, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const { error } = await sb.from("tyres").update({ foto_path: nuovo }).eq("id", tyreId);
      if (error) throw error;
      onCambiata(nuovo);
    } catch (ex) {
      setErrore(erroreIt(ex));
    } finally {
      setAttesa(false);
    }
  }

  return (
    <div className="space-y-2">
      {errore && <Messaggio>{errore}</Messaggio>}
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Foto gomma" onClick={() => setGrande(true)} className="max-h-64 w-full rounded-xl object-cover" />
      )}
      <label className="btn-ghost w-full cursor-pointer">
        <IcoFoto />
        {attesa ? "Caricamento…" : url ? "Cambia foto" : "Scatta foto"}
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={carica} disabled={attesa} />
      </label>
      {grande && url && (
        <button className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2" onClick={() => setGrande(false)} aria-label="Chiudi">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Foto gomma" className="max-h-full max-w-full" />
        </button>
      )}
    </div>
  );
}
