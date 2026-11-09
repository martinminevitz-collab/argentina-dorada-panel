// Permite instalar el panel como app y abrirlo aunque no haya señal (muestra lo último que bajó).
const CACHE = "ad-panel-v1";
const BASE = ["./", "index.html", "estilos.css", "app.js", "manifest.webmanifest", "iconos/icono.svg"];

self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
// Primero internet (datos frescos); si no hay, lo guardado.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request).then((r) => {
      const copia = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request.url.split("?")[0], copia));
      return r;
    }).catch(() => caches.match(e.request.url.split("?")[0]))
  );
});
