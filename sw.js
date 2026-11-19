// Service worker Kucingku: app boleh dibuka tanpa internet.
// Tukar CACHE pada setiap keluaran supaya telefon memuat turun versi baharu.
const CACHE = 'kucingku-1.9.3';
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
  'changelog.json',
];
// Versi pertama yang meminta pengguna tekan Kemas kini (popup dalam app).
const ASK_FROM = '1.9.1';
const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => caches.keys())
      .then(keys => {
        // Sejak v1.9.1 versi baharu menunggu sehingga pengguna tekan Kemas kini dalam app.
        // Pemasangan pertama, atau peralihan daripada versi lama tanpa popup, dipasang terus seperti dahulu.
        const asks = keys.some(key => key !== CACHE && /^kucingku-\d/.test(key) && !newer(ASK_FROM, key.slice(9)));
        if (!asks) return self.skipWaiting();
      })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skip') self.skipWaiting();
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

  // Website rasmi (/tentang, /privasi) sentiasa dari rangkaian, bukan app.
  if (request.mode === 'navigate' && /^\/(tentang|privasi)(\.html)?\/?$/.test(url.pathname)) return;

  // Senarai perubahan: rangkaian dahulu supaya popup tunjuk perubahan versi baharu; cache bila luar talian.
  if (url.pathname.endsWith('/changelog.json')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put('changelog.json', copy)); } return response; })
        .catch(() => caches.match('changelog.json', { cacheName: CACHE }))
    );
    return;
  }

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
