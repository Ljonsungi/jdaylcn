const CACHE_NAME = 'jdaylcn-v3';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // CDN
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  // Google Fonts CSS
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,600&family=Outfit:wght@300;400;500;600;700&display=swap'
];

// ── INSTALL : cache tous les assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          ASSETS.map(url =>
            cache.add(url)
              .catch(() => {})
          )
        );
      })
      .then(() => {
        return self.skipWaiting(); // dans le waitUntil
      })
  );
});

// ── ACTIVATE : supprime les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            return caches.delete(k);
          })
      ))
      .then(() => {
        return self.clients.claim();
      })
  );
});

// ── FETCH : cache d'abord, réseau en fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // Ne pas intercepter les appels API météo (toujours réseau)
  const url = event.request.url;
  if (
    url.includes('open-meteo.com') ||
    url.includes('archive-api.open-meteo.com') ||
    url.includes('meteofrance.fr') ||
    url.includes('geocoding-api')
  ) {
    return; // laisse passer directement au réseau
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          return cached;
        }

        return fetch(event.request)
          .then(response => {
            if (response && response.status === 200 && response.type !== 'opaque') {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => {
            // Hors ligne : retourne l'app principale pour les navigations
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
});
