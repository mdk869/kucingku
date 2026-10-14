// Service worker Kucingku: app boleh dibuka tanpa internet.
// Tukar CACHE pada setiap keluaran supaya telefon memuat turun versi baharu.
const CACHE = 'kucingku-1.8.4';
const SHELL = [
  './',
  'index.html',
  'app.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/qr.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('kucingku-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Fon, pustaka PDF dan Vercel Analytics tidak diurus di sini.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/_vercel/')) return;

  if (request.mode === 'navigate') {
    // Halaman app sentiasa dari cache (abaikan ?utm_source, ?dev); versi baharu tiba bila service worker dikemas kini.
    event.respondWith(
      caches.match('index.html', { cacheName: CACHE })
        .then(cached => cached || fetch(request))
        .catch(() => fetch(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request, { cacheName: CACHE, ignoreSearch: true })
      .then(cached => cached || fetch(request))
  );
});
