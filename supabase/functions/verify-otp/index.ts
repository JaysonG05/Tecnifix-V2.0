// ─────────────────────────────────────────────────────────────
// Tecnifix — Edge Function: verify-otp
// Verifica el código de teléfono que el usuario recibió por SMS.
//
// Seguridad:
//   • Requiere usuario autenticado (verifica su propio teléfono).
//   • Compara contra el hash guardado (nunca contra texto en claro).
//   • Vencimiento (10 min) y límite de intentos (5) por OTP.
//   • Rate limit por usuario (guard) para frenar fuerza bruta.
//
// Al verificar, marca el paso 'phone_verification' como 'approved' y guarda el
// teléfono confirmado en el perfil del técnico.
//
// Desplegar:
//   supabase functions deploy verify-otp
// ─────────────────────────────────────────────────────────────
import { createClient } from 'npm:@supabase/supabase-js'
import { json, handleMethod, GuardError, enforceRateLimit } from '../_shared/guard.ts'

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
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !caller) return json({ error: 'Sesión inválida.' }, 401)

    await enforceRateLimit({ id: caller.id, kind: 'user' }, 'verify-otp', { user: 20, ip: 20 })

    const { phone, code } = await req.json().catch(() => ({}))
    const e164 = toE164Panama(phone || '')
    const clean = String(code || '').replace(/\D/g, '')
    if (!e164) return json({ error: 'Teléfono no válido.' }, 400)
    if (clean.length !== 6) return json({ error: 'El código debe tener 6 dígitos.' }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

    // OTP más reciente de este usuario+teléfono, aún no verificado.
    const { data: otp, error: getErr } = await admin
      .from('phone_otps')
      .select('*')
      .eq('user_id', caller.id)
      .eq('phone', e164)
      .is('verified_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (getErr) throw getErr
    if (!otp) return json({ error: 'No hay un código pendiente. Pide uno nuevo.' }, 400)

    if (new Date(otp.expires_at).getTime() < Date.now()) {
      return json({ error: 'El código venció. Pide uno nuevo.' }, 400)
    }
    if ((otp.attempts ?? 0) >= (otp.max_attempts ?? 5)) {
      return json({ error: 'Demasiados intentos. Pide un código nuevo.' }, 429)
    }

    const candidate = await sha256Hex(otp.salt + clean)
    if (candidate !== otp.code_hash) {
      await admin.from('phone_otps').update({ attempts: (otp.attempts ?? 0) + 1 }).eq('id', otp.id)
      const left = (otp.max_attempts ?? 5) - ((otp.attempts ?? 0) + 1)
      return json({ error: `Código incorrecto. Intentos restantes: ${Math.max(left, 0)}.` }, 400)
    }

    // ✓ Correcto: marcar OTP usado.
    await admin.from('phone_otps').update({ verified_at: new Date().toISOString() }).eq('id', otp.id)

    // Guardar el teléfono confirmado en el perfil del técnico (best-effort).
    await admin.from('technician_profiles')
      .update({ phone_verified: true, verified_phone: e164 })
      .eq('user_id', caller.id)
      .then(() => {}, () => {})
    await admin.from('profiles')
      .update({ phone: e164 })
      .eq('id', caller.id)
      .then(() => {}, () => {})

    // Marcar el paso de verificación como aprobado.
    const { error: stepErr } = await admin.from('technician_verification_steps').upsert({
      technician_id: caller.id,
      step_key: 'phone_verification',
      step_name: 'Verificación de teléfono',
      required: true,
      status: 'approved',
      submitted_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
      payload: { phone: e164, provider: 'sms_otp', verified_at: new Date().toISOString() },
    }, { onConflict: 'technician_id,step_key' })
    if (stepErr) console.error('verify-otp step upsert:', stepErr)

    return json({ ok: true, verified: true, phone: e164 })
  } catch (err) {
    if (err instanceof GuardError) return json({ error: err.message }, err.status)
    console.error('verify-otp error:', err)
    return json({ error: (err as Error)?.message ?? 'Error verificando el código.' }, 500)
  }
})
