// ─────────────────────────────────────────────────────────────
// Tecnifix — Guard compartido para las Edge Functions de IA
//
// Resuelve dos riesgos de las funciones que llaman a Anthropic (cuestan
// dinero por invocación):
//   1) Identidad   → quién llama (usuario logueado o, si es anónimo, su IP).
//   2) Rate limit  → cuántas veces puede llamar en una ventana de tiempo.
//
// Diseño "failsafe", coherente con el resto de la app:
//   • La identidad/limite usan la tabla `ai_usage` (ver migración
//     20260629_ai_usage.sql). Si la tabla aún no existe (no desplegada),
//     el rate limit NO rompe la función: deja pasar y avisa en consola.
//   • Las funciones siguen funcionando para anónimos; solo se les aplica
//     un límite por IP más estricto que a los usuarios autenticados.
// ─────────────────────────────────────────────────────────────
import { createClient } from 'npm:@supabase/supabase-js'

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Respuesta JSON con CORS ya aplicado. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

/** Maneja preflight OPTIONS y método no permitido. Devuelve Response o null. */
export function handleMethod(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  return null
}

/** Error con código HTTP asociado, para cortar el flujo de forma limpia. */
export class GuardError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

type Caller = { id: string; kind: 'user' | 'ip' }

/** Cliente admin (service-role) para escribir en `ai_usage` saltando RLS. */
function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

/** IP del cliente a partir de las cabeceras del proxy de Supabase. */
function callerIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || ''
  const first = fwd.split(',')[0].trim()
  return first || req.headers.get('cf-connecting-ip') || 'ip:unknown'
}

/**
 * Identifica quién llama. Si trae un access_token de usuario válido, devuelve
 * su id; si no (anónimo o solo anon key), cae a la IP. Nunca lanza: la
 * identidad sirve para el rate limit, no para bloquear el acceso.
 */
export async function identifyCaller(req: Request): Promise<Caller> {
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    const url = Deno.env.get('SUPABASE_URL')
    const anon = Deno.env.get('SUPABASE_ANON_KEY')
    // El anon key también llega como token cuando el usuario NO está logueado;
    // getUser() devolverá null en ese caso y caemos a IP.
    if (token && url && anon) {
      const client = createClient(url, anon, { auth: { persistSession: false } })
      const { data } = await client.auth.getUser(token)
      if (data?.user?.id) return { id: data.user.id, kind: 'user' }
    }
  } catch { /* cae a IP */ }
  return { id: callerIp(req), kind: 'ip' }
}

type Limits = { user: number; ip: number; windowSeconds?: number }

/**
 * Aplica un límite de llamadas en una ventana deslizante. Registra cada
 * llamada en `ai_usage`. Lanza GuardError(429) si se supera.
 * Failsafe: si la tabla no existe o hay error de infra, deja pasar.
 */
export async function enforceRateLimit(
  caller: Caller,
  fnName: string,
  limits: Limits,
): Promise<void> {
  const admin = adminClient()
  if (!admin) return // sin service-role no podemos contar; no bloqueamos
  const windowSeconds = limits.windowSeconds ?? 3600
  const max = caller.kind === 'user' ? limits.user : limits.ip
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString()

  try {
    const { count, error } = await admin
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('caller_id', caller.id)
      .eq('function_name', fnName)
      .gte('created_at', since)
    if (error) { console.warn('rate-limit count skipped:', error.message); return }
    if ((count ?? 0) >= max) {
      throw new GuardError(
        'Has alcanzado el límite de uso por ahora. Intenta de nuevo en unos minutos.',
        429,
      )
    }
    await admin.from('ai_usage').insert({
      caller_id: caller.id,
      caller_kind: caller.kind,
      function_name: fnName,
    })
  } catch (err) {
    if (err instanceof GuardError) throw err
    console.warn('rate-limit skipped (infra):', (err as Error)?.message)
  }
}

/**
 * Atajo: identifica + aplica rate limit en un paso. Devuelve el Caller por si
 * la función lo quiere usar. Lanza GuardError(429) si excede.
 */
export async function guardAI(req: Request, fnName: string, limits: Limits): Promise<Caller> {
  const caller = await identifyCaller(req)
  await enforceRateLimit(caller, fnName, limits)
  return caller
}
