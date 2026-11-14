/* Alma de Luciérnaga · guarda solo la portada y los iconos (los recursos siguen en la app) */
const C = 'luciernaga-v1';
const F = ['./index.html', './manifest.webmanifest', './icono-192.png', './icono-512.png', './apple-touch-icon.png', './favicon.png', './logo-redondo.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(F))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
