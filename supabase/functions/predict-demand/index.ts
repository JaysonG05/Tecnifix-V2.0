// ─────────────────────────────────────────────────────────────
// Tecnifix — Edge Function: predict-demand
// Predicción de demanda por zona para el técnico: ¿cuándo y dónde
// hay más solicitudes en su oficio? Ayuda a planificar disponibilidad
// y radio de servicio.
//
// Por qué server-side: por RLS un técnico solo ve SUS solicitudes.
// La demanda por zona es cross-técnico, así que agregamos con la
// SERVICE ROLE KEY (solo vive aquí) y luego Claude redacta el análisis.
//
// La API key de Anthropic vive SOLO aquí (secret del servidor).
//
// Desplegar:
//   supabase functions deploy predict-demand
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   (SUPABASE_URL / SERVICE_ROLE_KEY / ANON_KEY las inyecta Supabase.)
// ─────────────────────────────────────────────────────────────
import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'
import { enforceRateLimit, GuardError } from '../_shared/guard.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const HOUR_BUCKETS = [
  { label: '6am–12pm (mañana)', from: 6, to: 12 },
  { label: '12pm–6pm (tarde)', from: 12, to: 18 },
  { label: '6pm–11pm (noche)', from: 18, to: 23 },
  { label: '11pm–6am (madrugada)', from: 23, to: 6 },
]

// Hora local de Panamá (UTC-5, sin horario de verano).
function toPanama(iso: string) {
  const d = new Date(new Date(iso).getTime() - 5 * 3600 * 1000)
  return { weekday: d.getUTCDay(), hour: d.getUTCHours() }
}
function bucketFor(hour: number) {
  for (const b of HOUR_BUCKETS) {
    if (b.from < b.to) { if (hour >= b.from && hour < b.to) return b.label }
    else { if (hour >= b.from || hour < b.to) return b.label } // cruza medianoche
  }
  return HOUR_BUCKETS[0].label
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    headline: { type: 'string' },
    best_days: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    best_hours: { type: 'array', items: { type: 'string' }, maxItems: 2 },
    hot_zones: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { name: { type: 'string' }, note: { type: 'string' } },
        required: ['name', 'note'],
      },
    },
    reasoning: { type: 'string' },
    tips: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    confidence: { type: 'string', enum: ['baja', 'media', 'alta'] },
  },
  required: ['headline', 'best_days', 'best_hours', 'hot_zones', 'reasoning', 'tips', 'confidence'],
}

const SYSTEM = `Eres un analista de demanda para Tecnifix, un marketplace de técnicos en Panamá.
A partir de datos REALES de solicitudes agregadas, le dices a un técnico cuándo y dónde conviene estar disponible para conseguir más trabajos.

Reglas:
- Básate SOLO en los agregados que recibes (conteos por día, franja horaria y zona). No inventes cifras ni nombres de zonas que no aparezcan.
- confidence refleja el tamaño de muestra: 'baja' si hay menos de 10 solicitudes, 'media' si 10–40, 'alta' si más de 40.
- Si la muestra es pequeña, dilo en reasoning con honestidad y complementa con patrones generales y prudentes del oficio en Panamá (sin presentarlos como datos duros).
- best_days / best_hours: usa los picos reales de los agregados.
- hot_zones: zonas con más solicitudes; en 'note' explica brevemente por qué (volumen, cercanía). Si solo hay una zona, devuelve solo esa.
- tips: 2-4 acciones concretas (ej. activar disponibilidad en cierta franja, ampliar radio hacia una zona, preparar materiales del problema más común).
- Español de Panamá, claro y directo. Sin emojis. Sin exagerar.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) return json({ error: 'Faltan variables de entorno de Supabase en la función.' }, 500)
  if (!apiKey) return json({ error: 'Falta ANTHROPIC_API_KEY en los secrets de Supabase.' }, 500)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'No autenticado.' }, 401)

  try {
    // 1. Identificar al técnico que llama con su propio JWT.
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !caller) return json({ error: 'Sesión inválida.' }, 401)
    await enforceRateLimit({ id: caller.id, kind: 'user' }, 'predict-demand', { user: 20, ip: 6 })

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)

    // 2. Perfil del técnico (su oficio y zona). El body puede sobrescribir.
    const body = await req.json().catch(() => ({}))
    const { data: me } = await admin
      .from('technicians_full')
      .select('user_id, category_slug, category_slugs, province, city')
      .eq('user_id', caller.id)
      .maybeSingle()

    const category = body.category || me?.category_slug || null
    const province = body.province || me?.province || null

    // 3. Traer solicitudes recientes (últimos ~180 días) y los técnicos que las atienden.
    const since = new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString()
    const { data: reqs, error: reqErr } = await admin
      .from('service_requests')
      .select('created_at, technician_id, title, status')
      .gte('created_at', since)
      .limit(2000)
    if (reqErr) throw reqErr

    const techIds = [...new Set((reqs ?? []).map((r) => r.technician_id).filter(Boolean))]
    const techMap: Record<string, { category_slug?: string; category_slugs?: string[]; province?: string; city?: string }> = {}
    if (techIds.length) {
      const { data: techs } = await admin
        .from('technicians_full')
        .select('user_id, category_slug, category_slugs, province, city')
        .in('user_id', techIds)
      for (const t of techs ?? []) techMap[t.user_id] = t
    }

    // 4. Filtrar a la categoría del técnico (mismo oficio) y agregar.
    const matchesCategory = (t?: { category_slug?: string; category_slugs?: string[] }) => {
      if (!category) return true
      if (!t) return false
      return t.category_slug === category || (Array.isArray(t.category_slugs) && t.category_slugs.includes(category))
    }

    const byDay: Record<string, number> = {}
    const byBucket: Record<string, number> = {}
    const byZone: Record<string, number> = {}
    const titles: string[] = []
    let sample = 0

    for (const r of reqs ?? []) {
      const t = r.technician_id ? techMap[r.technician_id] : undefined
      if (!matchesCategory(t)) continue
      sample++
      const { weekday, hour } = toPanama(r.created_at)
      byDay[WEEKDAYS[weekday]] = (byDay[WEEKDAYS[weekday]] || 0) + 1
      byBucket[bucketFor(hour)] = (byBucket[bucketFor(hour)] || 0) + 1
      const zone = t?.city || t?.province || 'Sin zona'
      byZone[zone] = (byZone[zone] || 0) + 1
      if (r.title && titles.length < 25) titles.push(String(r.title))
    }

    const sortDesc = (obj: Record<string, number>) =>
      Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))

    const aggregates = {
      category: category || '(todos los oficios)',
      province: province || '(todo Panamá)',
      sample_size: sample,
      by_weekday: sortDesc(byDay),
      by_hour_bucket: sortDesc(byBucket),
      by_zone: sortDesc(byZone).slice(0, 8),
      common_requests: titles.slice(0, 15),
    }

    // 5. Claude redacta la predicción a partir de los agregados.
    const userPrompt = [
      `Oficio del técnico: ${aggregates.category}`,
      `Provincia base: ${aggregates.province}`,
      `Total de solicitudes en la muestra (180 días): ${aggregates.sample_size}`,
      `Solicitudes por día de la semana: ${JSON.stringify(aggregates.by_weekday)}`,
      `Solicitudes por franja horaria: ${JSON.stringify(aggregates.by_hour_bucket)}`,
      `Solicitudes por zona: ${JSON.stringify(aggregates.by_zone)}`,
      `Títulos de solicitudes recientes (para detectar el trabajo más común): ${JSON.stringify(aggregates.common_requests)}`,
    ].join('\n')

    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: 'claude-opus-4-8', // Para abaratar/acelerar: 'claude-haiku-4-5'
      max_tokens: 900,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
      // effort 'medium': sí razona sobre los agregados → balance calidad/costo.
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    })

    const block = msg.content.find((b) => b.type === 'text')
    const data = JSON.parse(block?.text ?? '{}')

    return json({ ...data, sample_size: sample })
  } catch (err) {
    if (err instanceof GuardError) return json({ error: err.message }, err.status)
    console.error('predict-demand error:', err)
    return json({ error: (err as Error)?.message ?? 'Error prediciendo la demanda.' }, 500)
  }
})
