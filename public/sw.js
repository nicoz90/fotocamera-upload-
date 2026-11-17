// Service worker Lupi Gomme: app utilizzabile anche con campo debole.
// - file statici (_next/static, icone): cache-first, sono versionati
// - pagine: network-first, se la rete manca si usa l'ultima copia salvata
// - dati Supabase e /api: mai in cache qui (l'ultima ricerca la tiene la pagina in localStorage)
const VERSIONE = "lupi-v1";
const STATICI = `${VERSIONE}-statici`;
const PAGINE = `${VERSIONE}-pagine`;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATICI).then((c) => c.addAll(["/icons/icon-192.png", "/manifest.webmanifest"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSIONE)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) caches.open(STATICI).then((c) => c.put(req, res.clone()));
        return res;
      })),
    );
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) caches.open(PAGINE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/")) ||
          new Response("<h1 style='font-family:sans-serif'>Nessuna connessione</h1><p>Riprova quando c'è campo.</p>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } })),
    );
  }
});
