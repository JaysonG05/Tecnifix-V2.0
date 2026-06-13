// ============================================================
//  sw.js — Service Worker de Changuinola Pro
//  Maneja notificaciones push y permite mostrarlas
//  incluso si la pestaña está en segundo plano.
// ============================================================

self.addEventListener('install', (event) => {
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim())
})

// Recibe un mensaje desde la app (postMessage) para mostrar
// una notificación local del sistema operativo.
self.addEventListener('message', (event) => {
    const data = event.data || {}
    if (data.type !== 'SHOW_NOTIFICATION') return

    const { title, body, tag, url } = data.payload || {}

    self.registration.showNotification(title || 'Changuinola Pro', {
        body: body || '',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: tag || 'changuinola-pro',
        data: { url: url || '/' },
        vibrate: [100, 50, 100],
    })
})

// Al hacer clic en la notificación, enfocar o abrir la app
self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const targetUrl = (event.notification.data && event.notification.data.url) || '/'

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
            const existing = clientsArr.find((c) => 'focus' in c)
            if (existing) {
                existing.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl })
                return existing.focus()
            }
            return self.clients.openWindow(targetUrl)
        })
    )
})

// Soporte real de Web Push (si en el futuro se agrega un backend
// que envíe push con VAPID, este handler ya está listo)
self.addEventListener('push', (event) => {
    let data = {}
    try { data = event.data ? event.data.json() : {} } catch { data = {} }

    const title = data.title || 'Changuinola Pro'
    const options = {
        body: data.body || '',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: data.tag || 'changuinola-pro',
        data: { url: data.url || '/' },
        vibrate: [100, 50, 100],
    }

    event.waitUntil(self.registration.showNotification(title, options))
})