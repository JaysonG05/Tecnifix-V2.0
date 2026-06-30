// ─────────────────────────────────────────────────────────────
// Tecnifix — Edge Function: generate-bio
// "✨ Escribir por mí" del panel del vendedor.
// Recibe unas notas del técnico y devuelve título, bio (ES/EN) y slogan
// profesionales, listos para su perfil público.
//
// La API key de Anthropic vive SOLO aquí (secret del servidor), nunca en el
// cliente Vite. El navegador llama a esta función vía supabase.functions.invoke.
//
// Desplegar:
//   supabase functions deploy generate-bio
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// ─────────────────────────────────────────────────────────────
import Anthropic from 'npm:@anthropic-ai/sdk'
import { json, handleMethod, guardAI, GuardError } from '../_shared/guard.ts'

// Esquema de salida estructurada: garantiza JSON válido con todos los campos.
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    professional_title: { type: 'string' },
    professional_title_en: { type: 'string' },
    slogan: { type: 'string' },
    bio: { type: 'string' },
    bio_en: { type: 'string' },
  },
  required: ['professional_title', 'professional_title_en', 'slogan', 'bio', 'bio_en'],
}

const SYSTEM = `Eres un redactor de marketing para Tecnifix, un marketplace de técnicos en Panamá (marca azul, tono confiable y cercano).
Tu trabajo: a partir de las notas y las MÉTRICAS REALES del técnico, redactar el texto de su perfil público para atraer clientes.

Reglas:
- professional_title: título profesional en español, conciso (máx ~6 palabras). professional_title_en: su traducción al inglés.
- slogan: una frase corta y memorable en español (máx ~10 palabras).
- bio: 2-3 oraciones en español que generen confianza (experiencia, especialidad, compromiso). bio_en: su traducción fiel al inglés.
- Sin emojis. Sin inventar certificaciones, premios ni datos que el técnico no mencionó.
- Español de Panamá, natural y profesional. No uses MAYÚSCULAS de énfasis ni signos de exclamación de más.
- Si las notas son escasas, redacta algo profesional y genérico para su oficio sin exagerar.

Uso de métricas reales (sección "DATOS VERIFICADOS"):
- Son cifras reales de la plataforma. Puedes mencionarlas para dar credibilidad, pero SOLO si refuerzan la confianza y son significativas.
- Calificación: menciónala solo si es 4.5 o más Y hay al menos 5 reseñas (ej. "calificación de 4.8 estrellas"). Con pocas reseñas o nota baja, NO la menciones.
- Trabajos completados: menciónalo solo si son 10 o más (ej. "más de 50 trabajos realizados"). Si son pocos, no lo menciones ni inventes una cifra.
- Tiempo de respuesta: si responde en 60 min o menos, puedes destacar su rapidez de forma natural.
- Reseñas de clientes: úsalas para detectar fortalezas REALES y recurrentes (puntualidad, limpieza, garantía, buen trato) y reflejarlas en la bio. No cites reseñas textuales ni inventes elogios.
- Si una métrica no llega al umbral o no existe, simplemente omítela. Nunca redondees hacia arriba, exageres ni inventes números.`

// Ejemplos few-shot: enseñan el estilo Tecnifix por ejemplo. Van como turnos
// previos (user→assistant); NO son prefill del último turno (eso daría 400 en
// Opus 4.8). Cubren las dos conductas clave: usar stats reales con credibilidad
// y OMITIR cifras cuando el técnico es nuevo.
const FEWSHOT = [
  {
    role: 'user',
    content: [
      'Nombre del técnico: Carlos Him',
      'Oficios / categorías: Electricidad',
      'Años de experiencia: 8',
      'Ciudad: David',
      'Notas del técnico: instalaciones residenciales y comerciales, atiendo emergencias, doy garantía',
      '',
      'DATOS VERIFICADOS (cifras reales de Tecnifix; aplica los umbrales de las reglas):',
      'Calificación promedio: 4.8 estrellas (sobre 32 reseñas)',
      'Trabajos completados en la plataforma: 64',
      'Tiempo de respuesta declarado: 45 minutos',
    ].join('\n'),
  },
  {
    role: 'assistant',
    content: JSON.stringify({
      professional_title: 'Electricista profesional certificado',
      professional_title_en: 'Certified professional electrician',
      slogan: 'Energía segura para tu hogar y negocio',
      bio: 'Electricista con 8 años de experiencia en instalaciones residenciales y comerciales en David, con una calificación de 4.8 estrellas y más de 60 trabajos realizados. Atiendo emergencias con respuesta rápida y respaldo cada trabajo con garantía.',
      bio_en: 'Electrician with 8 years of experience in residential and commercial installations in David, rated 4.8 stars with over 60 completed jobs. I handle emergencies with fast response and back every job with a warranty.',
    }),
  },
  {
    role: 'user',
    content: [
      'Nombre del técnico: María Pérez',
      'Oficios / categorías: Limpieza',
      'Años de experiencia: 3',
      'Ciudad: Changuinola',
      'Notas del técnico: limpieza profunda de hogares y oficinas',
      '',
      'DATOS VERIFICADOS (cifras reales de Tecnifix; aplica los umbrales de las reglas):',
      '(sin métricas todavía — es un técnico nuevo, no menciones cifras)',
    ].join('\n'),
  },
  {
    role: 'assistant',
    content: JSON.stringify({
      professional_title: 'Especialista en limpieza profesional',
      professional_title_en: 'Professional cleaning specialist',
      slogan: 'Espacios impecables, atención de confianza',
      bio: 'Me dedico a la limpieza profunda de hogares y oficinas en Changuinola, con atención cuidadosa y resultados que se notan. Trabajo con compromiso para dejar cada espacio impecable.',
      bio_en: 'I specialize in deep cleaning of homes and offices in Changuinola, with careful attention and noticeable results. I work with dedication to leave every space spotless.',
    }),
  },
]

Deno.serve(async (req) => {
  const pre = handleMethod(req)
  if (pre) return pre

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'Falta ANTHROPIC_API_KEY en los secrets de Supabase.' }, 500)

  try {
    await guardAI(req, 'generate-bio', { user: 20, ip: 5 })
    const {
      name = '', trades = [], years_experience = '', city = '', notes = '',
      // Métricas reales de la plataforma (opcionales).
      average_rating = null, total_reviews = null, total_jobs = null,
      response_time_minutes = null, reviews = [],
    } = await req.json()

    // Resumen de datos verificados: solo incluimos lo que existe y tiene valor.
    const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v))
    const rating = num(average_rating)
    const nReviews = num(total_reviews)
    const nJobs = num(total_jobs)
    const respMin = num(response_time_minutes)

    const verified = []
    if (rating !== null && nReviews !== null) verified.push(`Calificación promedio: ${rating.toFixed(1)} estrellas (sobre ${nReviews} reseñas)`)
    if (nJobs !== null) verified.push(`Trabajos completados en la plataforma: ${nJobs}`)
    if (respMin !== null) verified.push(`Tiempo de respuesta declarado: ${respMin} minutos`)

    const reviewLines = (Array.isArray(reviews) ? reviews : [])
      .filter((r) => r && (r.comment || r.rating))
      .slice(0, 12)
      .map((r) => `- [${r.rating ?? '?'}★] ${r.comment || '(sin comentario)'}`)

    const userPrompt = [
      `Nombre del técnico: ${name || '(sin nombre)'}`,
      `Oficios / categorías: ${Array.isArray(trades) && trades.length ? trades.join(', ') : '(sin especificar)'}`,
      `Años de experiencia: ${years_experience || '(sin especificar)'}`,
      `Ciudad: ${city || '(sin especificar)'}`,
      `Notas del técnico: ${notes || '(sin notas)'}`,
      '',
      'DATOS VERIFICADOS (cifras reales de Tecnifix; aplica los umbrales de las reglas):',
      verified.length ? verified.join('\n') : '(sin métricas todavía — es un técnico nuevo, no menciones cifras)',
      ...(reviewLines.length ? ['', `Reseñas reales de clientes (${reviewLines.length}):`, ...reviewLines] : []),
    ].join('\n')

    const client = new Anthropic({ apiKey })

    const msg = await client.messages.create({
      model: 'claude-opus-4-8', // Para abaratar/acelerar: 'claude-haiku-4-5'
      max_tokens: 1024,
      system: SYSTEM,
      messages: [...FEWSHOT, { role: 'user', content: userPrompt }],
      // effort 'low': tarea corta y acotada (no requiere razonamiento profundo) → más rápido y barato.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    })

    const block = msg.content.find((b) => b.type === 'text')
    const data = JSON.parse(block?.text ?? '{}')

    return json(data)
  } catch (err) {
    if (err instanceof GuardError) return json({ error: err.message }, err.status)
    console.error('generate-bio error:', err)
    return json({ error: err?.message ?? 'Error generando el perfil.' }, 500)
  }
})
