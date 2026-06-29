// ─────────────────────────────────────────────────────────────
// Tecnifix — Edge Function: business-pulse ("Pulso del negocio")
// Coaching semanal para el técnico: recibe agregados de SUS propios
// datos (el cliente los computa, porque por RLS el técnico ya ve lo
// suyo) y Claude redacta un resumen accionable y motivador.
//
// La API key de Anthropic vive SOLO aquí (secret del servidor).
//
// Desplegar:
//   supabase functions deploy business-pulse
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// ─────────────────────────────────────────────────────────────
import Anthropic from 'npm:@anthropic-ai/sdk'
import { guardAI, GuardError } from '../_shared/guard.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    greeting: { type: 'string' },
    summary: { type: 'string' },
    trend: { type: 'string', enum: ['up', 'flat', 'down'] },
    highlight: { type: 'string' },
    actions: { type: 'array', items: { type: 'string' }, maxItems: 3 },
  },
  required: ['greeting', 'summary', 'trend', 'highlight', 'actions'],
}

const SYSTEM = `Eres un coach de negocio para técnicos de Tecnifix, un marketplace de oficios en Panamá.
Recibes agregados reales de la semana de UN técnico y le escribes un resumen breve, claro y motivador con próximos pasos concretos.

Reglas:
- Básate SOLO en los números que recibes. No inventes cifras ni zonas.
- trend: 'up' si los ingresos subieron de forma clara vs la semana previa, 'down' si bajaron claramente, 'flat' si parecidos.
- greeting: una frase con el dato más importante de la semana (trabajos cerrados e ingresos).
- summary: 2-3 frases interpretando la tendencia (ingresos, trabajos, solicitudes pendientes, zona).
- highlight: una cosa positiva real para reforzar.
- actions: 2-3 acciones concretas y accionables (responder solicitudes pendientes, pedir reseñas, ampliar radio/zona, ajustar disponibilidad). Si una semana fue floja, sé honesto pero constructivo, sin regañar.
- Moneda en balboas (B/.). Español de Panamá, cálido y directo. Sin emojis. Sin exagerar ni prometer resultados.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'Falta ANTHROPIC_API_KEY en los secrets de Supabase.' }, 500)

  try {
    await guardAI(req, 'business-pulse', { user: 20, ip: 6 })
    const { stats } = await req.json().catch(() => ({ stats: {} }))
    const s = stats || {}

    const userPrompt = [
      `Periodo: últimos ${s.period_days ?? 7} días (comparado con los ${s.period_days ?? 7} días previos)`,
      `Oficio: ${s.category || 'no especificado'}`,
      `Trabajos completados: ${s.jobs_done ?? 0} (semana previa: ${s.jobs_done_prev ?? 0})`,
      `Ingresos (B/.): ${s.earnings ?? 0} (semana previa: ${s.earnings_prev ?? 0})`,
      `Solicitudes pendientes/sin cerrar: ${s.pending ?? 0}`,
      `Calificación promedio: ${s.avg_rating ?? 'sin datos'} en ${s.total_reviews ?? 0} reseñas`,
      `Zona más activa: ${s.top_zone || 'sin datos'}`,
    ].join('\n')

    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: 'claude-opus-4-8', // Para abaratar/acelerar: 'claude-haiku-4-5'
      max_tokens: 700,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
      // effort 'low': es redacción guiada por números ya dados → rápido y barato.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    })

    const block = msg.content.find((b) => b.type === 'text')
    const data = JSON.parse(block?.text ?? '{}')
    return json(data)
  } catch (err) {
    if (err instanceof GuardError) return json({ error: err.message }, err.status)
    console.error('business-pulse error:', err)
    return json({ error: (err as Error)?.message ?? 'Error generando el pulso del negocio.' }, 500)
  }
})
