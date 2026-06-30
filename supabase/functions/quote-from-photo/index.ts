// ─────────────────────────────────────────────────────────────
// Tecnifix — Edge Function: quote-from-photo
// El cliente sube una foto del problema (fuga, panel, equipo dañado)
// + una nota opcional, y Claude (visión) estima oficio, posibles causas,
// materiales y un rango de precio referencial en USD para Panamá.
//
// La API key de Anthropic vive SOLO aquí (secret del servidor).
//
// Desplegar:
//   supabase functions deploy quote-from-photo
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// ─────────────────────────────────────────────────────────────
import Anthropic from 'npm:@anthropic-ai/sdk'
import { json, handleMethod, guardAI, GuardError } from '../_shared/guard.ts'

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    category_slug: {
      type: ['string', 'null'],
      enum: ['climatizacion', 'electricidad', 'plomeria', 'cerrajeria', 'pintura', 'limpieza', 'albanileria', 'tecnologia', null],
    },
    category_label: { type: 'string' },
    icon: { type: 'string' },
    problem_summary: { type: 'string' },
    severity: { type: 'string', enum: ['baja', 'media', 'alta'] },
    likely_causes: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    materials: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    price_min: { type: 'number' },
    price_max: { type: 'number' },
    currency: { type: 'string' },
    confidence: { type: 'number' },
    disclaimer: { type: 'string' },
  },
  required: ['category_label', 'problem_summary', 'severity', 'likely_causes', 'materials', 'price_min', 'price_max', 'currency', 'confidence', 'disclaimer'],
}

const SYSTEM = `Eres un perito técnico de Tecnifix, un marketplace de técnicos en Panamá (marca azul, tono confiable y honesto).
A partir de una FOTO de un problema en un hogar/negocio y una nota opcional del cliente, estima un presupuesto referencial.

Reglas:
- Identifica el oficio (category_slug) entre: climatizacion, electricidad, plomeria, cerrajeria, pintura, limpieza, albanileria, tecnologia. Si no estás seguro, usa null y explica en problem_summary.
- icon: un emoji acorde al oficio.
- problem_summary: 1-2 oraciones describiendo lo que se ve en la foto.
- likely_causes: 1-4 causas probables, en lenguaje claro.
- materials: materiales/repuestos típicos para el arreglo.
- price_min / price_max: rango realista en USD para Panamá (mano de obra + materiales básicos). currency: "USD".
- severity: "alta" si hay riesgo (agua sobre electricidad, gas, cables expuestos), si no "media"/"baja".
- confidence: 0-100 según qué tan clara sea la foto.
- disclaimer: recuerda que es una estimación referencial y que el precio final lo confirma el técnico tras revisar en sitio.
- NUNCA inventes datos que no se ven. Si la foto es ambigua, baja la confianza y dilo. No des consejos de seguridad peligrosos.`

Deno.serve(async (req) => {
  const pre = handleMethod(req)
  if (pre) return pre

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'Falta ANTHROPIC_API_KEY en los secrets de Supabase.' }, 500)

  try {
    // Visión es la función más cara: límite por IP/usuario más estricto.
    await guardAI(req, 'quote-from-photo', { user: 15, ip: 4 })
    const { image_base64 = '', mime_type = 'image/jpeg', note = '' } = await req.json()
    if (!image_base64) return json({ error: 'Falta la imagen (image_base64).' }, 400)

    const client = new Anthropic({ apiKey })

    const msg = await client.messages.create({
      model: 'claude-opus-4-8', // Para abaratar/acelerar: 'claude-haiku-4-5'
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mime_type, data: image_base64 } },
          { type: 'text', text: `Nota del cliente: ${note || '(sin nota)'}\n\nEstima el presupuesto.` },
        ],
      }],
      // effort 'medium': visión + estimación; requiere percepción y criterio → balance calidad/costo.
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    })

    const block = msg.content.find((b) => b.type === 'text')
    const data = JSON.parse(block?.text ?? '{}')

    return json(data)
  } catch (err) {
    if (err instanceof GuardError) return json({ error: err.message }, err.status)
    console.error('quote-from-photo error:', err)
    return json({ error: err?.message ?? 'Error generando la cotización.' }, 500)
  }
})
