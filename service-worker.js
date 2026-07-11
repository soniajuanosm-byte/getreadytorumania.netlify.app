const CACHE_NAME = 'ruta-rumania-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Source+Sans+3:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap'
];

// Instalar SW y cachear archivos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache).catch(err => {
          console.log('Error cacheando archivos:', err);
          // Continuar incluso si alguno falla
          return Promise.resolve();
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activar SW y limpiar cachés viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia: Network First, fallback a Cache
// Si falla la red, usa lo cacheado. Perfecto para apps que necesitan datos frescos
self.addEventListener('fetch', event => {
  // Skip no-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Network first para archivos locales
  if (event.request.url.includes(self.location.origin)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Solo cachear respuestas válidas
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(response => response || new Response('No disponible', {status: 503}));
        })
    );
    return;
  }

  // Para recursos externos (CDN, Google Fonts), cache first
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
      .catch(() => new Response('No disponible', {status: 503}))
  );
});
