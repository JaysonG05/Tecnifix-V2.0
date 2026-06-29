// ─────────────────────────────────────────────────────────────
// Tecnifix — Web Push (notificaciones con la app cerrada)
//
// Flujo:
//   1. El usuario activa el toggle de push en Ajustes.
//   2. Pedimos permiso y suscribimos vía pushManager con la VAPID
//      PUBLIC key (la PRIVATE vive solo en el servidor / Edge Function).
//   3. Guardamos la suscripción en la tabla `push_subscriptions`.
//   4. La Edge Function `send-push` envía notificaciones a esos endpoints
//      cuando se inserta una fila en `notifications` (vía trigger pg_net).
//
// Degradación elegante: si el navegador no soporta push, si falta la
// VAPID key o si no hay backend, no rompe nada — solo informa.
// ─────────────────────────────────────────────────────────────
import { supabase, isSupabaseConfigured } from './supabase.js'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

export function isPushSupported() {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
}

// La VAPID public key viene en base64url; el navegador la quiere como Uint8Array.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// El SW solo se auto-registra en producción (main.jsx); aquí lo aseguramos
// bajo demanda para que el push funcione también al probarlo.
async function ensureRegistration() {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker no disponible.')
  let reg = await navigator.serviceWorker.getRegistration()
  if (!reg) reg = await navigator.serviceWorker.register('/sw.js')
  return navigator.serviceWorker.ready
}

/** Estado actual: 'unsupported' | 'denied' | 'subscribed' | 'default' */
export async function getPushStatus() {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = reg ? await reg.pushManager.getSubscription() : null
    return sub ? 'subscribed' : 'default'
  } catch {
    return 'default'
  }
}

async function saveSubscription(userId, sub) {
  if (!isSupabaseConfigured) return
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    user_agent: navigator.userAgent,
  }, { onConflict: 'endpoint' })
  if (error) throw error
}

/** Pide permiso, suscribe y guarda la suscripción. Lanza error con mensaje claro. */
export async function enablePush(userId) {
  if (!isPushSupported()) throw new Error('Tu navegador no soporta notificaciones push.')
  if (!VAPID_PUBLIC_KEY) throw new Error('Falta configurar VITE_VAPID_PUBLIC_KEY.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permiso de notificaciones denegado.')

  const reg = await ensureRegistration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }
  await saveSubscription(userId, sub)
  return sub
}

/** Cancela la suscripción y borra la fila en la BD. */
export async function disablePush(userId) {
  if (!isPushSupported()) return
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg ? await reg.pushManager.getSubscription() : null
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe().catch(() => {})
  if (isSupabaseConfigured) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', userId)
  }
}
