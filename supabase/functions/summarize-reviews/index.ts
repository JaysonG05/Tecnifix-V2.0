// ─────────────────────────────────────────────────────────────
// Tecnifix — Edge Function: summarize-reviews
// Resume las reseñas de un técnico en un veredicto claro con
// pros, contras y aspectos destacados, para ayudar a decidir.
//
// Desplegar:
//   supabase functions deploy summarize-reviews
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// ─────────────────────────────────────────────────────────────
import Anthropic from 'npm:@anthropic-ai/sdk'
import { json, handleMethod, guardAI, GuardError } from '../_shared/guard.ts'

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: { type: 'string' },        // titular corto (ej. "Muy recomendado")
    summary: { type: 'string' },        // 2-3 oraciones
    pros: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    cons: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    highlights: { type: 'array', items: { type: 'string' }, maxItems: 4 },  // temas frecuentes
  },
  required: ['verdict', 'summary', 'pros', 'cons', 'highlights'],
}

const SYSTEM = `Eres un analista de reputación de Tecnifix (marketplace de técnicos en Panamá).
A partir de reseñas reales de clientes sobre un técnico, redacta un resumen honesto y útil para que otro cliente decida.

Reglas:
- verdict: titular breve y honesto (ej. "Muy recomendado", "Sólido con reservas", "Opiniones mixtas").
- summary: 2-3 oraciones en español neutral, basadas SOLO en las reseñas.
- pros / cons: puntos concretos mencionados por clientes. Si no hay contras claras, deja cons como [].
- highlights: temas que se repiten (puntualidad, precio, limpieza, garantía, trato...).
- No inventes nada que no esté en las reseñas. No exageres. Sé equilibrado: refleja también lo negativo si existe.`

// Ejemplo few-shot: enseña el estilo de resumen por ejemplo (turnos previos
// user→assistant, no prefill del último turno → válido en Opus 4.8). Usa reseñas
// MIXTAS para enseñar a reflejar contras con honestidad, no solo lo positivo.
const FEWSHOT = [
  {
    role: 'user',
    content: [
      'Técnico: (ejemplo)',
      'Reseñas (4):',
      '1. [5★] Llegó puntual y dejó todo limpio, muy recomendado.',
      '2. [5★] Excelente trabajo, precio justo y dio garantía.',
      '3. [4★] Buen trabajo, aunque tardó un poco en llegar.',
      '4. [3★] Resolvió el problema, pero el precio fue más alto de lo que esperaba.',
    ].join('\n'),
  },
  {
    role: 'assistant',
    content: JSON.stringify({
      verdict: 'Bien valorado',
      summary: 'Los clientes destacan la puntualidad, la limpieza del trabajo y la garantía ofrecida. Algunos mencionan demoras en la llegada y un precio por encima de lo esperado.',
      pros: ['Puntualidad y trabajo limpio', 'Precio justo y garantía', 'Resuelve el problema'],
      cons: ['Algún cliente reportó demora en la llegada', 'Para algunos el precio resultó más alto de lo esperado'],
      highlights: ['Puntualidad', 'Garantía', 'Limpieza'],
    }),
  },
]

Deno.serve(async (req) => {
  const pre = handleMethod(req)
  if (pre) return pre

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'Falta ANTHROPIC_API_KEY en los secrets de Supabase.' }, 500)

  try {
    await guardAI(req, 'summarize-reviews', { user: 30, ip: 8 })
    const { technician_name = '', reviews = [] } = await req.json()
    const list = (Array.isArray(reviews) ? reviews : [])
      .filter((r) => r && (r.comment || r.rating))
      .slice(0, 40)

    if (list.length < 2) return json({ error: 'Pocas reseñas para resumir.' }, 400)

    const userPrompt = [
      `Técnico: ${technician_name || '(sin nombre)'}`,
      `Reseñas (${list.length}):`,
      ...list.map((r, i) => `${i + 1}. [${r.rating ?? '?'}★] ${r.comment || '(sin comentario)'}`),
    ].join('\n')

    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: 'claude-opus-4-8', // Para abaratar/acelerar: 'claude-haiku-4-5'
      max_tokens: 800,
      system: SYSTEM,
      messages: [...FEWSHOT, { role: 'user', content: userPrompt }],
      // effort 'low': resumen acotado de reseñas → más rápido y barato sin perder calidad.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    })

    const block = msg.content.find((b) => b.type === 'text')
    const data = JSON.parse(block?.text ?? '{}')

    return json(data)
  } catch (err) {
    if (err instanceof GuardError) return json({ error: err.message }, err.status)
    console.error('summarize-reviews error:', err)
    return json({ error: err?.message ?? 'Error resumiendo reseñas.' }, 500)
  }
})
