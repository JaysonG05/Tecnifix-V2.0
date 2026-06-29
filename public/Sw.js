// Service Worker — Changuinola Pro PWA
// Estrategia: network-first para navegación (HTML), cache-first para assets.
// Permite que la app cargue offline tras la primera visita.
// Además recibe Web Push (notificaciones con la app cerrada).
const CACHE = 'cp-cache-v2'
const APP_SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/icon-512-maskable.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  // Solo GET; nunca interceptamos peticiones a Supabase u otras APIs.
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navegación (documentos HTML): red primero, cache de respaldo.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/index.html')))
    )
    return
  }

  // Assets estáticos: cache primero, luego red.
  e.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(request, copy))
        return res
      }).catch(() => cached)
    )
  )
})

// ─── Web Push: notificaciones con la app cerrada ──────────────
self.addEventListener('push', (e) => {
  let payload = {}
  try { payload = e.data ? e.data.json() : {} } catch { payload = { body: e.data && e.data.text() } }
  const title = payload.title || 'Tecnifix'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'tecnifix',
    data: { url: payload.url || '/', ...(payload.data || {}) },
    vibrate: [80, 40, 80],
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

// Al tocar la notificación: enfocar una pestaña abierta o abrir la app.
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const target = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) { client.navigate(target); return client.focus() }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })
  )
})
