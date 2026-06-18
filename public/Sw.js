// ============================================================
//  sw.js — Service Worker TECNIFIX
//  Solo maneja notificaciones push — NO intercepta fetch para
//  evitar devolver text/html con rutas incorrectas en producción.
// ============================================================

const VERSION = 'tecnifix-sw-v1'

self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()) })

// IMPORTANTE: No hay listener de 'fetch' deliberadamente.
// Esto previene que el SW devuelva 'text/html' para rutas de
// assets estáticos con MIME type incorrecto (octet-stream) en Netlify.

// ── Notificaciones locales (postMessage desde la app) ──────
self.addEventListener('message', event => {
    const data = event.data || {}
    if (data.type !== 'SHOW_NOTIFICATION') return
    const { title, body, tag, url } = data.payload || {}
    self.registration.showNotification(title || 'TECNIFIX', {
        body: body || '',
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: tag || 'tecnifix-notif',
        data: { url: url || '/' },
        vibrate: [100, 50, 100],
    })
})

// ── Clic en notificación → enfocar o abrir la app ──────────
self.addEventListener('notificationclick', event => {
    event.notification.close()
    const targetUrl = event.notification?.data?.url || '/'
    event.waitUntil(
        self.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then(clients => {
                const existing = clients.find(c => 'focus' in c)
                if (existing) {
                    existing.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl })
                    return existing.focus()
                }
                return self.clients.openWindow(targetUrl)
            })
    )
})

// ── Push real vía VAPID (futuro) ────────────────────────────
self.addEventListener('push', event => {
    let data = {}
    try { data = event.data ? event.data.json() : {} } catch { data = {} }
    const title = data.title || 'TECNIFIX'
    const options = {
        body: data.body || '',
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: data.tag || 'tecnifix-notif',
        data: { url: data.url || '/' },
        vibrate: [100, 50, 100],
    }
    event.waitUntil(self.registration.showNotification(title, options))
})