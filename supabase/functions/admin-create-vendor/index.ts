// ─────────────────────────────────────────────────────────────
// Tecnifix — Edge Function: admin-create-vendor
// Permite que el DUEÑO (rol admin) cree una cuenta de vendedor (técnico)
// y reciba las credenciales para entregárselas.
//
// Seguridad:
//  - Usa la SERVICE ROLE KEY, que SOLO vive aquí (Supabase la inyecta como
//    variable de entorno en la función; nunca en el cliente Vite).
//  - Verifica que quien llama tenga rol 'admin' antes de crear nada.
//
// Desplegar:
//   supabase functions deploy admin-create-vendor
//   (SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY ya las
//    inyecta Supabase automáticamente — no hay que setear secrets.)
// ─────────────────────────────────────────────────────────────
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// Genera una contraseña temporal legible si el admin no escribe una.
function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let p = ''
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)]
  return p + '#7'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    return json({ error: 'Faltan variables de entorno de Supabase en la función.' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'No autenticado.' }, 401)

  try {
    // 1. Identificar a quien llama con su propio JWT
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !caller) return json({ error: 'Sesión inválida.' }, 401)

    // 2. Cliente con permisos de servicio para verificar rol y crear usuarios
    const admin = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: profile } = await admin.from('profiles').select('role').eq('id', caller.id).single()
    if (profile?.role !== 'admin') return json({ error: 'Solo un administrador puede crear vendedores.' }, 403)

    // 3. Validar entrada
    const { email = '', password = '', full_name = '' } = await req.json()
    if (!email.includes('@')) return json({ error: 'Email inválido.' }, 400)
    if (!full_name.trim()) return json({ error: 'Escribe el nombre del vendedor.' }, 400)
    const finalPassword = password.trim() || genPassword()
    if (finalPassword.length < 6) return json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, 400)

    // 4. Crear el usuario (email confirmado para que pueda entrar de inmediato)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: finalPassword,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim(), role: 'technician' },
    })
    if (createErr) return json({ error: createErr.message }, 400)

    // 5. Asegurar la fila de perfil con rol técnico (por si no hay trigger)
    await admin.from('profiles')
      .upsert({ id: created.user.id, full_name: full_name.trim(), role: 'technician' }, { onConflict: 'id' })

    // 6. Devolver las credenciales para que el dueño se las entregue al vendedor
    return json({ user_id: created.user.id, email: email.trim(), password: finalPassword })
  } catch (err) {
    console.error('admin-create-vendor error:', err)
    return json({ error: (err as Error)?.message ?? 'Error creando la cuenta.' }, 500)
  }
})
