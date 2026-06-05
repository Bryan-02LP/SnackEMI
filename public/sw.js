// ════════════════════════════════════════════════════════════
// SnackEMI — Service Worker (PWA)
// ════════════════════════════════════════════════════════════

const CACHE_NAME = 'snackemi-v1';

// Archivos que se guardan para acceso rápido
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
];

// Instalar — guardar archivos en caché
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activar — limpiar caché viejo
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — red primero, caché como respaldo
self.addEventListener('fetch', e => {
  // Las llamadas a la API siempre van a la red
  if (e.request.url.includes('/api/')) {
    e.respondWith(fetch(e.request).catch(() =>
      new Response(JSON.stringify({ error: 'Sin conexión' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    ));
    return;
  }

  // Para el resto: red primero, caché si falla
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Guardar copia fresca en caché
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
