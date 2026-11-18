// ELAH WARRIOR Service Worker — offline caching (supports root and /Elah/ sub-path)
const CACHE = 'elah-v2';
const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './js/game.js',
  './js/net.js',
  './vendor/three.module.min.js',
  './manifest.webmanifest'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone())).catch(() => {});
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
