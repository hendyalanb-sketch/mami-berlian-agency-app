const CACHE = "mba-content-shell-v1";
const SAFE_ASSETS = ["/", "/manifest.webmanifest", "/icon.svg"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SAFE_ASSETS))));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/pekerja/")) return;
  if (["document", "script", "style", "font", "image"].includes(request.destination)) {
    event.respondWith(fetch(request).then((response) => { const clone=response.clone(); caches.open(CACHE).then((cache)=>cache.put(request,clone)); return response; }).catch(()=>caches.match(request)));
  }
});
