// ─────────────────────────────────────────────────────────────
// Tecnifix — Edge Function: triage-chat
// Agente conversacional de triage. Recibe el historial de la
// conversación y decide, con razonamiento real (Claude), si hacer
// una pregunta de seguimiento o emitir el diagnóstico final.
//
// Reemplaza/mejora el motor por reglas local (que queda de fallback).
//
// Desplegar:
//   supabase functions deploy triage-chat
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// ─────────────────────────────────────────────────────────────
import Anthropic from 'npm:@anthropic-ai/sdk'
import { json, handleMethod, guardAI, GuardError } from '../_shared/guard.ts'

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply: { type: 'string' },
    done: { type: 'boolean' },
    ask: {
      type: ['object', 'null'],
      additionalProperties: false,
      properties: {
        field: { type: 'string' },
        options: { type: 'array', items: { type: 'string' }, maxItems: 5 },
      },
      required: ['field', 'options'],
    },
    decision: {
      type: ['object', 'null'],
      additionalProperties: false,
      properties: {
        slug: { type: ['string', 'null'], enum: ['climatizacion', 'electricidad', 'plomeria', 'cerrajeria', 'pintura', 'limpieza', 'albanileria', 'tecnologia', null] },
        label: { type: 'string' },
        icon: { type: 'string' },
        province: { type: ['string', 'null'] },
        emergency: { type: 'boolean' },
        onlyVerified: { type: 'boolean' },
        safetyTip: { type: ['string', 'null'] },
        query: { type: 'string' },
        confidence: { type: 'number' },
      },
      required: ['slug', 'label', 'icon', 'province', 'emergency', 'onlyVerified', 'safetyTip', 'query', 'confidence'],
    },
  },
  required: ['reply', 'done', 'ask', 'decision'],
}

const SYSTEM = `Eres el asistente de triage de Tecnifix, un marketplace de técnicos en Panamá (marca azul, cercano y confiable).
Tu meta: en pocas interacciones entender el problema del usuario y derivarlo al técnico correcto.

Oficios válidos (slug): climatizacion, electricidad, plomeria, cerrajeria, pintura, limpieza, albanileria, tecnologia.
Provincias de Panamá: Panamá, Panamá Oeste, Chiriquí, Bocas del Toro, Colón, Coclé, Veraguas, Herrera, Los Santos, Darién.

Cómo respondes (SIEMPRE en el JSON del esquema):
- "reply": tu mensaje al usuario, en español de Panamá, cálido y breve (máx 2 oraciones). Puedes usar 1 emoji.
- Si aún te falta información clave (oficio, urgencia o provincia), pon "done": false y rellena "ask" con:
    - "field": un id corto del dato que pides (ej. "urgency", "province", "detalle").
    - "options": 2-5 botones de respuesta rápida (vacío [] si es texto libre).
  En ese caso "decision" = null.
- Cuando tengas lo suficiente (normalmente tras 2-3 turnos), pon "done": true, "ask": null y rellena "decision":
    - slug/label/icon del oficio (icon = emoji). province (o null).
    - emergency: true si hay riesgo inmediato (gas, humo, chispas, cable pelado, inundación) o el usuario dice que es urgente.
    - onlyVerified: true si emergency o si conviene priorizar verificados.
    - safetyTip: si hay riesgo, un consejo breve y SEGURO mientras llega el técnico (ej. cerrar llave de gas/agua, bajar el breaker). Si no, null.
    - query: texto de búsqueda si no hay slug claro; si hay slug, "".
    - confidence: 0-100.

Reglas:
- Sé eficiente: no hagas más de 3 preguntas. Si el primer mensaje ya trae oficio + urgencia + provincia, puedes cerrar de una.
- Detecta peligro y priorízalo: si hay riesgo, marca emergency y da safetyTip aunque falten otros datos.
- No inventes precios ni diagnósticos técnicos detallados; eso lo hace el técnico en sitio.
- Nunca des consejos peligrosos.`

Deno.serve(async (req) => {
  const pre = handleMethod(req)
  if (pre) return pre

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'Falta ANTHROPIC_API_KEY en los secrets de Supabase.' }, 500)

  try {
    await guardAI(req, 'triage-chat', { user: 40, ip: 12 })
    const { messages = [] } = await req.json()
    // Normaliza a roles user/assistant con content string.
    const history = (Array.isArray(messages) ? messages : [])
      .filter((m) => m && m.content)
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) }))

    if (!history.length) return json({ error: 'Sin mensajes.' }, 400)

    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: 'claude-opus-4-8', // Para abaratar/acelerar: 'claude-haiku-4-5'
      max_tokens: 700,
      system: SYSTEM,
      messages: history,
      // effort 'medium': debe detectar peligro de forma fiable; protejo esa lógica antes que recortar latencia.
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    })

    const block = msg.content.find((b) => b.type === 'text')
    const data = JSON.parse(block?.text ?? '{}')

    return json(data)
  } catch (err) {
    if (err instanceof GuardError) return json({ error: err.message }, err.status)
    console.error('triage-chat error:', err)
    return json({ error: err?.message ?? 'Error en el triage.' }, 500)
  }
})
