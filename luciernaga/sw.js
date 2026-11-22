/* Alma de Luciérnaga · primero busca la versión nueva en internet; si no hay conexión, usa la guardada */
const C = 'luciernaga-v3';
const F = ['./index.html', './manifest.webmanifest', './icono-192.png', './icono-512.png', './apple-touch-icon.png', './favicon.png', './logo-redondo.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(F))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const copia = r.clone(); caches.open(C).then(c => c.put(e.request, copia)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
