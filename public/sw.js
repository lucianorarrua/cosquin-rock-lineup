/**
 * Service Worker para Cosquín Rock® 2026
 * Estrategia: Stale-While-Revalidate (Cache-First con actualización en segundo plano)
 *
 * Objetivo: Funcionar en entornos con redes muy limitadas o sin conexión.
 * - Si hay caché disponible, se sirve inmediatamente (instantáneo)
 * - En paralelo, se intenta obtener la versión fresca de la red
 * - Si la red responde, se actualiza el caché para la próxima vez
 */

const CACHE_NAME = 'cosquin-rock-v1';

// Archivos críticos que siempre deben estar en caché (pre-cache)
const PRECACHE_ASSETS = [
  '/',
  '/faq',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/logo.webp',
];

// Extensiones de archivos que definitivamente queremos cachear
const CACHEABLE_EXTENSIONS = [
  '.html',
  '.css',
  '.js',
  '.json',
  '.webp',
  '.png',
  '.ico',
  '.svg',
  '.woff2',
  '.woff',
];

/**
 * Evento: INSTALL
 * Se ejecuta cuando el SW se instala por primera vez.
 * Pre-cachea los recursos críticos para funcionamiento offline.
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching critical assets...');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Pre-cache complete. Activating immediately.');
        // Forzar activación inmediata sin esperar a que se cierren otras pestañas
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Pre-cache failed:', error);
      })
  );
});

/**
 * Evento: ACTIVATE
 * Se ejecuta cuando el SW toma control.
 * Limpia cachés antiguos de versiones previas.
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Now controlling all clients.');
        // Tomar control inmediato de todas las pestañas abiertas
        return self.clients.claim();
      })
  );
});

/**
 * Determina si una request debe ser cacheada.
 */
function shouldCache(request) {
  const url = new URL(request.url);

  // Solo cachear requests GET
  if (request.method !== 'GET') {
    return false;
  }

  // Solo cachear requests del mismo origen
  if (url.origin !== self.location.origin) {
    return false;
  }

  // Cachear navegación (páginas HTML)
  if (request.mode === 'navigate') {
    return true;
  }

  // Cachear archivos con extensiones conocidas
  const pathname = url.pathname;
  if (CACHEABLE_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return true;
  }

  // Cachear archivos de Astro (assets con hash)
  if (pathname.includes('/_astro/')) {
    return true;
  }

  return false;
}

/**
 * Estrategia: Stale-While-Revalidate
 * 1. Devuelve inmediatamente desde caché si está disponible
 * 2. En paralelo, intenta obtener de la red
 * 3. Si la red responde, actualiza el caché
 * 4. Si no hay caché y la red falla, retorna error offline
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Crear promesa de fetch de red (no await inmediato)
  const networkFetchPromise = fetch(request)
    .then((networkResponse) => {
      // Solo cachear responses válidas (status 200)
      if (networkResponse && networkResponse.ok) {
        // Clonar porque el body solo puede consumirse una vez
        cache.put(request, networkResponse.clone());
        console.log('[SW] Updated cache for:', request.url);
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log('[SW] Network fetch failed for:', request.url, error.message);
      return null;
    });

  // Si hay versión cacheada, devolverla inmediatamente
  if (cachedResponse) {
    console.log('[SW] Serving from cache:', request.url);
    // El fetch de red sigue ejecutándose en segundo plano para actualizar el caché
    return cachedResponse;
  }

  // Si no hay caché, esperar a la respuesta de red
  console.log('[SW] No cache, fetching from network:', request.url);
  const networkResponse = await networkFetchPromise;

  if (networkResponse) {
    return networkResponse;
  }

  // Si todo falla, retornar una página de error offline simple
  return new Response(
    `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sin conexión — Cosquín Rock® 2026</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #0a0a0f;
      color: #e4e4e7;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 2rem;
      text-align: center;
    }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #f59e0b; }
    p { color: #a1a1aa; max-width: 400px; line-height: 1.6; }
    .icon { font-size: 4rem; margin-bottom: 1rem; opacity: 0.7; }
    button {
      margin-top: 1.5rem;
      padding: 0.75rem 1.5rem;
      background: #f59e0b;
      color: #0a0a0f;
      border: none;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, background 0.2s;
    }
    button:hover { background: #fbbf24; transform: scale(1.05); }
    button:active { transform: scale(0.98); }
  </style>
</head>
<body>
  <div class="icon">📡</div>
  <h1>Sin conexión a Internet</h1>
  <p>Parece que no tenés conexión. Asegurate de tener datos o WiFi y volvé a intentar.</p>
  <button onclick="location.reload()">Reintentar</button>
</body>
</html>`,
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  );
}

/**
 * Evento: FETCH
 * Intercepta todas las requests y aplica la estrategia de caché.
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Solo manejar requests que debemos cachear
  if (!shouldCache(request)) {
    return; // Dejar que el navegador maneje normalmente
  }

  event.respondWith(staleWhileRevalidate(request));
});

/**
 * Evento: MESSAGE
 * Permite comunicación con la página para actualizaciones forzadas.
 */
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data === 'clearCache') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[SW] Cache cleared by user request.');
    });
  }
});
