// ─────────────────────────────────────────────────────────────
// Tecnifix — Edge Function: price-intelligence ("Gemelo de precios")
// Le dice al CLIENTE cuánto cuesta de verdad un trabajo de cierto
// oficio en su provincia, a partir de las tarifas REALES que cobran
// los técnicos del marketplace. Mata la asimetría de información.
//
// Por qué server-side: agregamos tarifas cross-técnico con la
// SERVICE ROLE KEY (solo vive aquí) para tener una muestra robusta,
// y luego Claude redacta el rango justo + señales de alerta.
//
// La API key de Anthropic vive SOLO aquí (secret del servidor).
//
// Desplegar:
//   supabase functions deploy price-intelligence
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

const CATEGORY_LABELS: Record<string, string> = {
  climatizacion: 'Climatización', electricidad: 'Electricidad', plomeria: 'Plomería',
  cerrajeria: 'Cerrajería', pintura: 'Pintura', limpieza: 'Limpieza',
  albanileria: 'Albañilería', tecnologia: 'Tecnología',
}

// Percentil simple sobre un arreglo ya ordenado ascendentemente.
function percentile(sorted: number[], p: number) {
  if (!sorted.length) return null
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))))
  return sorted[idx]
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    headline: { type: 'string' },
    fair_min: { type: 'number' },
    fair_max: { type: 'number' },
    reasoning: { type: 'string' },
    red_flags: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    tips: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    confidence: { type: 'string', enum: ['baja', 'media', 'alta'] },
  },
  required: ['headline', 'fair_min', 'fair_max', 'reasoning', 'red_flags', 'tips', 'confidence'],
}

const SYSTEM = `Eres un analista de precios para Tecnifix, un marketplace de técnicos en Panamá.
A partir de tarifas REALES que cobran los técnicos, le dices a un CLIENTE cuánto debería costar de forma justa el trabajo que necesita, en su provincia.

Reglas:
- Básate SOLO en los agregados que recibes (cuántos técnicos, mínimo, percentiles, máximo de las tarifas). No inventes cifras.
- fair_min / fair_max definen una BANDA JUSTA central (típicamente entre el percentil 25 y el 75), no los extremos. Es lo que un cliente razonable debería esperar pagar.
- Moneda: balboas/dólares (B/. = USD, 1:1 en Panamá). Devuelve fair_min y fair_max como números enteros en USD.
- confidence según tamaño de muestra: 'baja' si hay menos de 5 técnicos, 'media' si 5–15, 'alta' si más de 15. Si la muestra es pequeña, dilo con honestidad en reasoning y complementa con criterio general prudente del oficio (sin presentarlo como dato duro).
- red_flags: 1-3 señales de alerta concretas (precios sospechosamente bajos = posible mala calidad/sin garantía; cobros muy por encima sin justificar piezas).
- tips: 2-4 consejos accionables para contratar bien (desglosar mano de obra vs materiales, confirmar costo de visita, comparar verificados).
- Considera la nota del cliente para matizar (un trabajo complejo justifica acercarse al tope de la banda).
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
    // 1. Validar la sesión del cliente que llama (cualquier usuario logueado).
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !caller) return json({ error: 'Sesión inválida.' }, 401)
    await enforceRateLimit({ id: caller.id, kind: 'user' }, 'price-intelligence', { user: 20, ip: 6 })

    const body = await req.json().catch(() => ({}))
    const category: string | null = body.category || null
    const province: string | null = body.province || null
    const note: string = (body.note || '').toString().slice(0, 400)
    if (!category) return json({ error: 'Falta el oficio (category).' }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)

    // 2. Traer técnicos del oficio (y, si se indicó, de la provincia) con sus tarifas.
    let query = admin
      .from('technicians_full')
      .select('user_id, category_slug, category_slugs, province, min_price, max_price')
      .limit(500)
    const { data: techs, error: techErr } = await query
    if (techErr) throw techErr

    const matchesCategory = (t: { category_slug?: string; category_slugs?: string[] }) =>
      t.category_slug === category || (Array.isArray(t.category_slugs) && t.category_slugs.includes(category))

    // 3. Filtrar por oficio (+provincia si hay) y recolectar tarifas válidas.
    const inProvince = (t: { province?: string }) => !province || t.province === province
    let scope = (techs ?? []).filter((t) => matchesCategory(t) && inProvince(t))
    let scopeNote = province ? `en ${province}` : 'en todo Panamá'
    // Si la provincia deja muy poca muestra, ampliamos a todo el país.
    if (province && scope.length < 3) {
      scope = (techs ?? []).filter((t) => matchesCategory(t))
      scopeNote = `en todo Panamá (pocos técnicos en ${province})`
    }

    const mins = scope.map((t) => Number(t.min_price)).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b)
    const maxs = scope.map((t) => Number(t.max_price)).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b)
    const sample = scope.length

    const aggregates = {
      category: CATEGORY_LABELS[category] || category,
      scope: scopeNote,
      technicians: sample,
      min_price_floor: mins[0] ?? null,
      min_price_p25: percentile(mins, 25),
      min_price_median: percentile(mins, 50),
      min_price_p75: percentile(mins, 75),
      max_price_median: percentile(maxs, 50),
      max_price_ceiling: maxs[maxs.length - 1] ?? null,
    }

    // 4. Claude redacta el rango justo + señales de alerta.
    const userPrompt = [
      `Oficio: ${aggregates.category}`,
      `Cobertura de la muestra: ${aggregates.scope}`,
      `Técnicos en la muestra: ${aggregates.technicians}`,
      `Tarifas mínimas (B/.): piso=${aggregates.min_price_floor}, p25=${aggregates.min_price_p25}, mediana=${aggregates.min_price_median}, p75=${aggregates.min_price_p75}`,
      `Tarifas máximas (B/.): mediana=${aggregates.max_price_median}, techo=${aggregates.max_price_ceiling}`,
      note ? `Nota del cliente sobre el trabajo: "${note}"` : 'El cliente no dio detalles del trabajo.',
    ].join('\n')

    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: 'claude-opus-4-8', // Para abaratar/acelerar: 'claude-haiku-4-5'
      max_tokens: 900,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    })

    const block = msg.content.find((b) => b.type === 'text')
    const data = JSON.parse(block?.text ?? '{}')

    return json({
      ...data,
      category_slug: category,
      category_label: aggregates.category,
      province: province || 'Panamá',
      sample_size: sample,
      market_min: aggregates.min_price_floor,
      market_max: aggregates.max_price_ceiling,
      currency: 'USD',
      disclaimer: 'Rango referencial basado en tarifas reales del marketplace. El precio final lo define el técnico tras revisar el trabajo.',
    })
  } catch (err) {
    if (err instanceof GuardError) return json({ error: err.message }, err.status)
    console.error('price-intelligence error:', err)
    return json({ error: (err as Error)?.message ?? 'Error calculando el precio justo.' }, 500)
  }
})
