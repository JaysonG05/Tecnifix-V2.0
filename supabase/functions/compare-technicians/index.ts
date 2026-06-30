// ─────────────────────────────────────────────────────────────
// Tecnifix — Edge Function: compare-technicians
// Compara 2-3 técnicos (opcionalmente para un problema concreto) y
// recomienda cuál conviene y por qué, en una tabla clara.
//
// Desplegar:
//   supabase functions deploy compare-technicians
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// ─────────────────────────────────────────────────────────────
import Anthropic from 'npm:@anthropic-ai/sdk'
import { json, handleMethod, guardAI, GuardError } from '../_shared/guard.ts'

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    recommendation: {
      type: 'object',
      additionalProperties: false,
      properties: { name: { type: 'string' }, why: { type: 'string' } },
      required: ['name', 'why'],
    },
    summary: { type: 'string' },
    table: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          verdict: { type: 'string' },     // titular corto
          best_for: { type: 'string' },    // para qué es mejor
          watch_out: { type: 'string' },   // a qué prestar atención
        },
        required: ['name', 'verdict', 'best_for', 'watch_out'],
      },
      maxItems: 3,
    },
  },
  required: ['recommendation', 'summary', 'table'],
}

const SYSTEM = `Eres un asesor imparcial de Tecnifix (marketplace de técnicos en Panamá).
Comparas 2-3 técnicos con sus datos (rating, reseñas, trabajos, años, precio, tiempo de respuesta, verificación, provincia) y, si se da, un problema concreto del cliente.

Reglas:
- recommendation: elige UN técnico recomendado y explica en 1-2 oraciones por qué, ponderando confianza, precio, encaje con el problema y disponibilidad.
- summary: 1-2 oraciones de contexto general de la comparación.
- table: una fila por técnico con verdict (titular), best_for (para qué destaca) y watch_out (qué considerar, honesto).
- Sé equilibrado y honesto: menciona trade-offs reales (ej. mejor precio pero menos reseñas). No inventes datos que no estén. Español de Panamá, claro y conciso.`

Deno.serve(async (req) => {
  const pre = handleMethod(req)
  if (pre) return pre

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'Falta ANTHROPIC_API_KEY en los secrets de Supabase.' }, 500)

  try {
    await guardAI(req, 'compare-technicians', { user: 30, ip: 8 })
    const { problem = '', technicians = [] } = await req.json()
    const list = (Array.isArray(technicians) ? technicians : []).slice(0, 3)
    if (list.length < 2) return json({ error: 'Se necesitan al menos 2 técnicos.' }, 400)

    const userPrompt = [
      problem ? `Problema del cliente: ${problem}` : 'Sin problema específico (comparación general).',
      '',
      'Técnicos a comparar:',
      ...list.map((t, i) => `${i + 1}. ${t.name} — ${t.title || 'técnico'} · ${t.rating ?? '?'}★ (${t.reviews ?? 0} reseñas) · ${t.jobs ?? 0} trabajos · ${t.years ?? '?'} años · $${t.price_min ?? '?'}-${t.price_max ?? '?'} · responde ~${t.response_time ?? '?'}min · ${t.verified ? 'verificado' : 'no verificado'} · ${t.province || 's/provincia'}`),
    ].join('\n')

    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: 'claude-opus-4-8', // Para abaratar/acelerar: 'claude-haiku-4-5'
      max_tokens: 900,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
      // effort 'medium': pondera trade-offs entre técnicos → balance calidad/costo.
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    })

    const block = msg.content.find((b) => b.type === 'text')
    const data = JSON.parse(block?.text ?? '{}')

    return json(data)
  } catch (err) {
    if (err instanceof GuardError) return json({ error: err.message }, err.status)
    console.error('compare-technicians error:', err)
    return json({ error: err?.message ?? 'Error comparando técnicos.' }, 500)
  }
})
