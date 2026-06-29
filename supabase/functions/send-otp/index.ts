// ─────────────────────────────────────────────────────────────
// Tecnifix — Edge Function: send-otp
// Genera y envía un código de verificación de teléfono (6 dígitos) por SMS.
//
// Seguridad:
//   • Requiere usuario autenticado (el OTP es para su propia cuenta).
//   • Rate limit por usuario (reusa el guard): frena spam y cooldown de reenvío.
//   • El código se guarda HASHEADO (SHA-256 + sal) en phone_otps, nunca en claro.
//
// Proveedor SMS (pluggable, por secrets):
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y (TWILIO_FROM o
//   TWILIO_MESSAGING_SERVICE_SID). Si no hay proveedor configurado, la función
//   igual almacena el OTP y, si OTP_DEV_MODE=true, lo devuelve en la respuesta
//   para pruebas; en producción sin proveedor responde delivery:'none' y el
//   cliente cae a revisión manual.
//
// Desplegar:
//   supabase functions deploy send-otp
//   supabase secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM=+1...
//   (opcional) supabase secrets set OTP_DEV_MODE=true
// ─────────────────────────────────────────────────────────────
import { createClient } from 'npm:@supabase/supabase-js'
import { json, handleMethod, GuardError, enforceRateLimit } from '../_shared/guard.ts'

const OTP_TTL_SECONDS = 10 * 60
const RESEND_COOLDOWN_SECONDS = 60

/** Normaliza a E.164 para Panamá (+507). */
function toE164Panama(raw: string): string | null {
  const digits = String(raw).replace(/\D/g, '')
  if (!/^(507)?[0-9]{7,8}$/.test(digits)) return null
  const local = digits.startsWith('507') ? digits.slice(3) : digits
  return `+507${local}`
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Envía el SMS por Twilio. Devuelve true si se envió, false si no hay proveedor. */
async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_FROM')
  const msgService = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID')
  if (!sid || !token || (!from && !msgService)) return false

  const params = new URLSearchParams({ To: to, Body: body })
  if (msgService) params.set('MessagingServiceSid', msgService)
  else params.set('From', from as string)

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${sid}:${token}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Twilio ${res.status}: ${txt.slice(0, 200)}`)
  }
  return true
}

Deno.serve(async (req) => {
  const pre = handleMethod(req)
  if (pre) return pre

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    return json({ error: 'Faltan variables de entorno de Supabase en la función.' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'No autenticado.' }, 401)

  try {
    // 1. Identificar al usuario (el OTP es para su propia cuenta).
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !caller) return json({ error: 'Sesión inválida.' }, 401)

    // 2. Rate limit: máx 5 envíos/hora por usuario.
    await enforceRateLimit({ id: caller.id, kind: 'user' }, 'send-otp', { user: 5, ip: 5 })

    // 3. Validar teléfono.
    const { phone } = await req.json().catch(() => ({}))
    const e164 = toE164Panama(phone || '')
    if (!e164) return json({ error: 'Teléfono no válido para Panamá.' }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

    // 4. Cooldown de reenvío (último OTP no vencido de este usuario).
    const { data: last } = await admin
      .from('phone_otps')
      .select('created_at')
      .eq('user_id', caller.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (last?.created_at) {
      const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        return json({ error: 'Espera un momento antes de pedir otro código.', retryInSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed) }, 429)
      }
    }

    // 5. Generar y guardar (hasheado).
    const code = String(Math.floor(100000 + Math.random() * 900000)) // 6 dígitos
    const salt = crypto.randomUUID()
    const code_hash = await sha256Hex(salt + code)
    const expires_at = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString()

    const { error: insErr } = await admin.from('phone_otps').insert({
      user_id: caller.id, phone: e164, code_hash, salt, expires_at,
    })
    if (insErr) throw insErr

    // 6. Enviar.
    let delivery: 'sms' | 'none' = 'none'
    try {
      const sent = await sendSms(e164, `Tecnifix: tu código de verificación es ${code}. Vence en 10 minutos.`)
      delivery = sent ? 'sms' : 'none'
    } catch (smsErr) {
      console.error('send-otp SMS error:', smsErr)
      // No revelamos el detalle al cliente; el OTP quedó guardado.
    }

    const devMode = Deno.env.get('OTP_DEV_MODE') === 'true'
    return json({
      ok: true,
      delivery,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      expiresInSeconds: OTP_TTL_SECONDS,
      // Solo en modo dev: permite probar el flujo sin proveedor SMS.
      ...(devMode ? { devCode: code } : {}),
    })
  } catch (err) {
    if (err instanceof GuardError) return json({ error: err.message }, err.status)
    console.error('send-otp error:', err)
    return json({ error: (err as Error)?.message ?? 'Error enviando el código.' }, 500)
  }
})
