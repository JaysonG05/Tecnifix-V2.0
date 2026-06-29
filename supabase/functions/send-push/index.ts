// ─────────────────────────────────────────────────────────────
// Tecnifix — Edge Function: send-push
// Envía notificaciones Web Push a los dispositivos de un usuario
// (funciona con la app cerrada). Pensada para llamarse desde un
// trigger de la tabla `notifications` (vía pg_net), pero también
// se puede invocar directamente.
//
// Seguridad:
//  - Usa SERVICE ROLE KEY (solo aquí) para leer push_subscriptions.
//  - Exige el header `x-push-secret` == PUSH_WEBHOOK_SECRET para que
//    solo el trigger/servidor pueda disparar envíos.
//
// Secrets a configurar:
//   supabase secrets set VAPID_PUBLIC_KEY=...  VAPID_PRIVATE_KEY=...
//   supabase secrets set VAPID_SUBJECT=mailto:soporte@tecnifix.com
//   supabase secrets set PUSH_WEBHOOK_SECRET=una-cadena-larga-secreta
//   (genera las VAPID con: npx web-push generate-vapid-keys)
//
// Desplegar:
//   supabase functions deploy send-push
// ─────────────────────────────────────────────────────────────
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-push-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')
  const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')
  const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:soporte@tecnifix.com'
  const SECRET = Deno.env.get('PUSH_WEBHOOK_SECRET')
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Faltan variables de Supabase en la función.' }, 500)
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ error: 'Faltan las VAPID keys en los secrets.' }, 500)

  // Solo el trigger/servidor con el secreto puede disparar envíos.
  if (SECRET && req.headers.get('x-push-secret') !== SECRET) {
    return json({ error: 'No autorizado.' }, 401)
  }

  try {
    const payload = await req.json()
    // Acepta llamada directa { user_id, title, body, url, data }
    // o el formato de Database Webhook { type, record }.
    const rec = payload.record || payload
    const user_id = rec.user_id
    const title = rec.title || 'Tecnifix'
    const body = rec.body || ''
    const data = rec.data || {}
    const url = rec.url || data.url || (data.request_id ? `/?request=${data.request_id}` : '/')
    if (!user_id) return json({ error: 'Falta user_id.' }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: subs, error } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id)
    if (error) throw error
    if (!subs || subs.length === 0) return json({ sent: 0, note: 'Sin suscripciones para este usuario.' })

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
    const notif = JSON.stringify({ title, body, url, data, tag: data.request_id ? `req-${data.request_id}` : 'tecnifix' })

    let sent = 0
    const expired: string[] = []
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          notif,
        )
        sent++
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode
        if (code === 404 || code === 410) expired.push(s.endpoint) // suscripción muerta
        else console.error('push fallo:', code, (err as Error)?.message)
      }
    }))

    // Limpiar suscripciones expiradas.
    if (expired.length) await admin.from('push_subscriptions').delete().in('endpoint', expired)

    return json({ sent, removed: expired.length })
  } catch (err) {
    console.error('send-push error:', err)
    return json({ error: (err as Error)?.message ?? 'Error enviando push.' }, 500)
  }
})
