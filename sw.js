const CACHE = 'mh-v1';
const STATIC = ['/', '/index.html', '/styles.css', '/app.js', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // API requests — network only
  if (url.pathname.startsWith('/api/') || url.hostname !== location.hostname) {
    return;
  }
  // Static assets — cache first, fallback network
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
