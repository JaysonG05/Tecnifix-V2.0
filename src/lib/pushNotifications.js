// ============================================================
//  pushNotifications.js
//  Gestiona el registro del Service Worker, el permiso de
//  notificaciones del navegador y el disparo de notificaciones
//  locales del sistema operativo cuando llega algo nuevo.
// ============================================================

let swRegistration = null

/** Registrar el Service Worker (llamar una vez al iniciar la app) */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    swRegistration = await navigator.serviceWorker.register('./sw.js')
    return swRegistration
  } catch (err) {
    console.warn('No se pudo registrar el Service Worker:', err)
    return null
  }
}

/** Estado actual del permiso: 'default' | 'granted' | 'denied' */
export function getPermissionStatus() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

/** Pedir permiso al usuario (debe llamarse desde una interacción, ej. un botón) */
export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported'
  try {
    const result = await Notification.requestPermission()
    return result
  } catch {
    return 'denied'
  }
}

/**
 * Mostrar una notificación del sistema operativo.
 * Usa el Service Worker si está disponible (funciona aunque la
 * pestaña esté en segundo plano); si no, usa la Notification API directa.
 */
export function showLocalNotification({ title, body, tag, url }) {
  if (getPermissionStatus() !== 'granted') return

  // No mostrar si la pestaña está activa y visible — evita duplicar
  // con el toast/campana interna mientras el usuario está mirando la app.
  if (document.visibilityState === 'visible') return

  if (swRegistration) {
    swRegistration.active?.postMessage({
      type: 'SHOW_NOTIFICATION',
      payload: { title, body, tag, url },
    })
  } else if ('Notification' in window) {
    new Notification(title, {
      body, icon: '/favicon.svg', tag, vibrate: [100, 50, 100],
    })
  }
}

/** Escuchar clics en notificaciones para navegar dentro de la app */
export function listenNotificationClicks(onClick) {
  if (!('serviceWorker' in navigator)) return () => { }
  const handler = (event) => {
    if (event.data?.type === 'NOTIFICATION_CLICK') onClick(event.data.url)
  }
  navigator.serviceWorker.addEventListener('message', handler)
  return () => navigator.serviceWorker.removeEventListener('message', handler)
}