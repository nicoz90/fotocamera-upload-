import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lupi Gomme – Magazzino",
    short_name: "Magazzino",
    description: "Magazzino gomme dell'officina",
    lang: "it",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#111418",
    theme_color: "#111418",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Scanner", url: "/scanner", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Depositi", url: "/depositi", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
