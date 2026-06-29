// ─────────────────────────────────────────────────────────────
// Tecnifix — Helpers de features IA "exóticas" (cliente)
//   1) quoteFromPhoto  → foto del problema ⇒ cotización estimada
//   2) triageReply     → motor de triage conversacional
//
// Patrón de degradación elegante (igual que el resto de la app):
//   • Si la Edge Function existe/responde → usa IA real (Claude).
//   • Si falla o estamos en modo demo → heurística local, marcada
//     como "estimación demo" para no engañar al usuario.
// ─────────────────────────────────────────────────────────────
import { supabase, isSupabaseConfigured } from './supabase.js'
import { detectServiceIntent, getCategoryMeta, computeTrustScore, computeMatchScore } from './trust.js'

// Rangos referenciales en USD (Panamá) por oficio, para el fallback.
const PRICE_TABLE = {
  climatizacion: { min: 35, max: 350, materials: ['Gas refrigerante', 'Filtros', 'Capacitor'] },
  electricidad:  { min: 25, max: 500, materials: ['Breaker', 'Cableado', 'Tomacorrientes'] },
  plomeria:      { min: 30, max: 300, materials: ['Tubería PVC', 'Empaques', 'Sellador'] },
  cerrajeria:    { min: 20, max: 150, materials: ['Cerradura', 'Cilindro', 'Llaves'] },
  pintura:       { min: 80, max: 1200, materials: ['Pintura', 'Sellador', 'Rodillos'] },
  limpieza:      { min: 30, max: 200, materials: ['Productos de limpieza', 'Insumos'] },
  albanileria:   { min: 100, max: 2500, materials: ['Cemento', 'Bloques', 'Arena'] },
  tecnologia:    { min: 25, max: 400, materials: ['Repuestos', 'Cableado de red'] },
}
const DEFAULT_PRICE = { min: 25, max: 300, materials: ['Materiales según diagnóstico'] }

/** Lee un File y devuelve { base64, mimeType }. */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const base64 = result.split(',')[1] ?? ''
      resolve({ base64, mimeType: file.type || 'image/jpeg' })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function fallbackQuote(note = '') {
  const intent = detectServiceIntent(note)
  const slug = intent.slug || 'tecnologia'
  const meta = getCategoryMeta(slug)
  const price = PRICE_TABLE[slug] || DEFAULT_PRICE
  return {
    source: 'demo',
    category_slug: intent.slug,
    category_label: intent.label || 'Por confirmar',
    icon: intent.icon || '🔎',
    problem_summary: note?.trim()
      ? `Posible trabajo de ${(meta?.label || 'servicio').toLowerCase()} según tu descripción.`
      : 'Sube una foto y añade una nota para una estimación más precisa.',
    severity: intent.emergency ? 'alta' : 'media',
    likely_causes: ['Diagnóstico requerido en sitio para confirmar la causa exacta.'],
    materials: price.materials,
    price_min: price.min,
    price_max: price.max,
    currency: 'USD',
    confidence: intent.confidence,
    disclaimer: 'Estimación referencial generada localmente (modo demo). El precio final lo define el técnico tras revisar.',
  }
}

/**
 * Foto del problema → cotización estimada.
 * @param {{ imageBase64?: string, mimeType?: string, note?: string }} input
 */
export async function quoteFromPhoto({ imageBase64, mimeType, note = '' } = {}) {
  if (!isSupabaseConfigured || !imageBase64) {
    return fallbackQuote(note)
  }
  try {
    const { data, error } = await supabase.functions.invoke('quote-from-photo', {
      body: { image_base64: imageBase64, mime_type: mimeType, note },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return { source: 'ai', icon: data.icon || '🔧', ...data }
  } catch (err) {
    console.warn('quote-from-photo no disponible, usando estimación local:', err?.message)
    return fallbackQuote(note)
  }
}

// ─────────────────────────────────────────────────────────────
// TRIAGE — motor conversacional por reglas (local, sin backend).
// Hace hasta 3 preguntas y entrega una recomendación accionable.
// Cada paso recibe el historial de respuestas del usuario.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// COMPARADOR — Edge Function `compare-technicians` con fallback
// local basado en trust/match score.
// ─────────────────────────────────────────────────────────────
function fallbackCompare(problem, techs = []) {
  const intent = detectServiceIntent(problem || '')
  const scored = techs.map((t) => ({
    t,
    trust: computeTrustScore(t),
    match: computeMatchScore(t, intent).score,
  }))
  const ordered = scored.slice().sort((a, b) => (b.match + b.trust) - (a.match + a.trust))
  const winner = ordered[0]

  const cheapest = scored.slice().sort((a, b) => Number(a.t.price_min ?? 9999) - Number(b.t.price_min ?? 9999))[0]
  const mostReviews = scored.slice().sort((a, b) => Number(b.t.total_reviews ?? 0) - Number(a.t.total_reviews ?? 0))[0]

  return {
    source: 'demo',
    recommendation: {
      name: winner.t.full_name,
      why: `Mejor balance de confianza (${winner.trust}/100) y encaje con tu necesidad${intent.label ? ` de ${intent.label.toLowerCase()}` : ''}.`,
    },
    summary: `Comparación de ${techs.length} técnicos por confianza, precio y reseñas${intent.label ? ` para ${intent.label.toLowerCase()}` : ''}.`,
    table: scored.map(({ t, trust }) => ({
      name: t.full_name,
      verdict: trust >= 78 ? 'Muy confiable' : trust >= 60 ? 'Confiable' : 'Opción básica',
      best_for: t.user_id === cheapest.t.user_id ? 'Mejor precio'
        : t.user_id === mostReviews.t.user_id ? 'Más reseñas/experiencia'
        : `${Number(t.average_rating || 0).toFixed(1)}★ · ${t.is_available ? 'disponible' : 'agenda'}`,
      watch_out: t.verification_status === 'verified' ? 'Identidad verificada'
        : 'Identidad no verificada aún',
    })),
  }
}

export async function compareTechnicians({ problem = '', technicians = [] } = {}) {
  const techs = (technicians || []).slice(0, 3)
  if (techs.length < 2) return null
  if (!isSupabaseConfigured) return fallbackCompare(problem, techs)
  try {
    const payload = techs.map((t) => ({
      name: t.full_name,
      title: t.professional_title,
      rating: t.average_rating,
      reviews: t.total_reviews,
      jobs: t.total_jobs,
      years: t.years_experience,
      price_min: t.min_price,
      price_max: t.max_price,
      response_time: t.response_time_minutes,
      verified: t.verification_status === 'verified',
      province: t.province,
    }))
    const { data, error } = await supabase.functions.invoke('compare-technicians', {
      body: { problem, technicians: payload },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return { source: 'ai', ...data }
  } catch (err) {
    console.warn('compare-technicians no disponible, usando comparación local:', err?.message)
    return fallbackCompare(problem, techs)
  }
}

// ─────────────────────────────────────────────────────────────
// RESUMEN DE RESEÑAS — Edge Function `summarize-reviews` con
// fallback local extractivo (sin IA) basado en rating + keywords.
// ─────────────────────────────────────────────────────────────
const POS_HINTS = [
  ['puntual', 'Puntualidad'], ['rápid', 'Rapidez'], ['precio', 'Precio justo'],
  ['limpi', 'Trabajo limpio'], ['amable', 'Buen trato'], ['profesional', 'Profesionalismo'],
  ['recomend', 'Recomendado'], ['garant', 'Garantía'], ['honest', 'Honestidad'],
]

function fallbackReviewSummary(reviews = []) {
  const list = reviews.filter((r) => r && (r.comment || r.rating))
  const n = list.length
  const avg = n ? list.reduce((s, r) => s + Number(r.rating || 0), 0) / n : 0
  const verdict = avg >= 4.6 ? 'Muy recomendado' : avg >= 4 ? 'Bien valorado' : avg >= 3 ? 'Opiniones mixtas' : 'Con reservas'

  const text = list.map((r) => (r.comment || '').toLowerCase()).join(' ')
  const highlights = POS_HINTS.filter(([k]) => text.includes(k)).map(([, label]) => label).slice(0, 4)
  const pros = highlights.slice(0, 3)
  const cons = avg < 4 ? ['Algunos clientes reportan experiencias dispares.'] : []

  return {
    source: 'demo',
    verdict,
    summary: `Promedio de ${avg.toFixed(1)}★ en ${n} reseña${n === 1 ? '' : 's'}. ${highlights.length ? `Los clientes destacan: ${highlights.join(', ').toLowerCase()}.` : 'Los comentarios son en general positivos.'}`,
    pros: pros.length ? pros : ['Valoración general positiva'],
    cons,
    highlights,
  }
}

export async function summarizeReviews({ name = '', reviews = [] } = {}) {
  const list = (reviews || []).filter((r) => r && (r.comment || r.rating))
  if (list.length < 2) return null
  if (!isSupabaseConfigured) return fallbackReviewSummary(list)
  try {
    const { data, error } = await supabase.functions.invoke('summarize-reviews', {
      body: { technician_name: name, reviews: list.map((r) => ({ rating: r.rating, comment: r.comment })) },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return { source: 'ai', ...data }
  } catch (err) {
    console.warn('summarize-reviews no disponible, usando resumen local:', err?.message)
    return fallbackReviewSummary(list)
  }
}

/**
 * Agente IA de triage (Edge Function `triage-chat`).
 * Recibe el historial [{role:'user'|'assistant', content}] y devuelve
 * { reply, done, ask:{field,options}|null, decision:{...}|null }.
 * Devuelve null si no hay backend o falla → el caller usa el motor local.
 */
export async function triageChat(messages) {
  if (!isSupabaseConfigured) return null
  try {
    const { data, error } = await supabase.functions.invoke('triage-chat', { body: { messages } })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return data
  } catch (err) {
    console.warn('triage-chat no disponible, usando motor local:', err?.message)
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// PREDICCIÓN DE DEMANDA POR ZONA — Edge Function `predict-demand`
// (agrega solicitudes cross-técnico con service role) + fallback
// local que usa SOLO las solicitudes propias del técnico (RLS) más
// patrones generales del oficio en Panamá, marcado como estimación.
// ─────────────────────────────────────────────────────────────
const WEEKDAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const HOUR_LABELS = ['6am–12pm (mañana)', '12pm–6pm (tarde)', '6pm–11pm (noche)', '11pm–6am (madrugada)']

function panamaParts(iso) {
  const d = new Date(new Date(iso).getTime() - 5 * 3600 * 1000)
  return { weekday: d.getUTCDay(), hour: d.getUTCHours() }
}
function hourLabel(h) {
  if (h >= 6 && h < 12) return HOUR_LABELS[0]
  if (h >= 12 && h < 18) return HOUR_LABELS[1]
  if (h >= 18 && h < 23) return HOUR_LABELS[2]
  return HOUR_LABELS[3]
}

// Patrones referenciales por oficio cuando hay poca o ninguna data real.
const DEMAND_HINTS = {
  climatizacion: { days: ['Sábado', 'Domingo'], hours: ['12pm–6pm (tarde)'], tip: 'El calor dispara solicitudes de A/C los fines de semana y en la tarde.' },
  electricidad:  { days: ['Lunes', 'Martes'], hours: ['6am–12pm (mañana)'], tip: 'Las fallas eléctricas suelen reportarse temprano entre semana.' },
  plomeria:      { days: ['Sábado', 'Lunes'], hours: ['6am–12pm (mañana)'], tip: 'Las fugas se atienden temprano; el fin de semana sube el volumen residencial.' },
  cerrajeria:    { days: ['Viernes', 'Sábado'], hours: ['6pm–11pm (noche)'], tip: 'Las emergencias de cerrajería repuntan de noche y fines de semana.' },
  pintura:       { days: ['Sábado'], hours: ['6am–12pm (mañana)'], tip: 'Los trabajos de pintura se agendan para fines de semana.' },
  limpieza:      { days: ['Viernes', 'Sábado'], hours: ['6am–12pm (mañana)'], tip: 'La limpieza profunda se pide antes del fin de semana.' },
  albanileria:   { days: ['Lunes', 'Sábado'], hours: ['6am–12pm (mañana)'], tip: 'La obra arranca temprano; planifica materiales el día antes.' },
  tecnologia:    { days: ['Lunes', 'Miércoles'], hours: ['12pm–6pm (tarde)'], tip: 'El soporte técnico se concentra en horario laboral entre semana.' },
}

function fallbackDemand({ category, province, requests = [] }) {
  const byDay = {}
  const byHour = {}
  for (const r of requests) {
    if (!r?.created_at) continue
    const { weekday, hour } = panamaParts(r.created_at)
    byDay[WEEKDAYS_ES[weekday]] = (byDay[WEEKDAYS_ES[weekday]] || 0) + 1
    byHour[hourLabel(hour)] = (byHour[hourLabel(hour)] || 0) + 1
  }
  const sample = requests.length
  const topDays = Object.entries(byDay).sort((a, b) => b[1] - a[1]).map(([d]) => d)
  const topHours = Object.entries(byHour).sort((a, b) => b[1] - a[1]).map(([h]) => h)
  const hint = DEMAND_HINTS[category] || { days: ['Sábado', 'Lunes'], hours: ['6am–12pm (mañana)'], tip: 'Mantén tu disponibilidad activa para captar más solicitudes.' }

  const best_days = (topDays.length ? topDays : hint.days).slice(0, 2)
  const best_hours = (topHours.length ? topHours : hint.hours).slice(0, 1)

  return {
    source: 'demo',
    sample_size: sample,
    confidence: sample >= 10 ? 'media' : 'baja',
    headline: 'Tu mejor ventana para conseguir trabajos',
    best_days,
    best_hours,
    hot_zones: province ? [{ name: province, note: 'Tu zona base; amplía tu radio para captar zonas vecinas.' }] : [],
    reasoning: sample >= 5
      ? `Estimación basada en tus ${sample} solicitudes recientes y en patrones del oficio. Activa el análisis completo para ver la demanda de toda tu zona.`
      : 'Aún tienes pocas solicitudes propias, así que esta es una estimación basada en patrones típicos del oficio en Panamá.',
    tips: [
      `Activa tu disponibilidad ${best_days.join(' y ')} en la franja ${best_hours[0] || 'de mayor demanda'}.`,
      hint.tip,
      'Amplía tu radio de servicio para aparecer en más búsquedas de tu provincia.',
    ],
  }
}

/**
 * Predice cuándo/dónde hay más demanda para el técnico.
 * @param {{ category?: string, province?: string, ownRequests?: Array }} input
 *   ownRequests: solicitudes propias (para el fallback local).
 */
export async function predictDemand({ category = null, province = null, ownRequests = [] } = {}) {
  if (!isSupabaseConfigured) return fallbackDemand({ category, province, requests: ownRequests })
  try {
    const { data, error } = await supabase.functions.invoke('predict-demand', {
      body: { category, province },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return { source: 'ai', ...data }
  } catch (err) {
    console.warn('predict-demand no disponible, usando estimación local:', err?.message)
    return fallbackDemand({ category, province, requests: ownRequests })
  }
}

// ─────────────────────────────────────────────────────────────
// GEMELO DE PRECIOS JUSTOS — Edge Function `price-intelligence`
// (agrega tarifas reales de técnicos por oficio+provincia con
// service role) + fallback local basado en PRICE_TABLE referencial.
//
// Mata la asimetría de información: antes de contratar, el cliente
// sabe cuánto cuesta de verdad un trabajo en su zona.
// ─────────────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  climatizacion: 'Climatización', electricidad: 'Electricidad', plomeria: 'Plomería',
  cerrajeria: 'Cerrajería', pintura: 'Pintura', limpieza: 'Limpieza',
  albanileria: 'Albañilería', tecnologia: 'Tecnología',
}

function fallbackFairPrice({ category, province, note = '' }) {
  const slug = category || detectServiceIntent(note).slug || 'tecnologia'
  const price = PRICE_TABLE[slug] || DEFAULT_PRICE
  const label = CATEGORY_LABELS[slug] || 'Servicio'
  // Rango "típico" = banda central del referencial (evita los extremos).
  const fair_min = Math.round(price.min + (price.max - price.min) * 0.15)
  const fair_max = Math.round(price.min + (price.max - price.min) * 0.55)
  return {
    source: 'demo',
    category_slug: slug,
    category_label: label,
    province: province || 'Panamá',
    sample_size: 0,
    confidence: 'baja',
    fair_min,
    fair_max,
    market_min: price.min,
    market_max: price.max,
    currency: 'USD',
    headline: `Precio justo referencial de ${label.toLowerCase()}`,
    reasoning: 'Estimación basada en rangos típicos del oficio en Panamá (modo local). Cuando haya tarifas reales de técnicos en tu zona, este rango se ajusta a tu mercado.',
    red_flags: [
      `Mucho más barato que B/.${fair_min} suele significar materiales de baja calidad o sin garantía.`,
      `Cobros muy por encima de B/.${fair_max} sin justificar piezas o complejidad merecen una segunda cotización.`,
    ],
    tips: [
      'Pide siempre que el precio detalle mano de obra y materiales por separado.',
      'Confirma si la visita/diagnóstico tiene costo antes de agendar.',
      'Compara al menos 2 técnicos verificados antes de decidir.',
    ],
    disclaimer: 'Rango referencial. El precio final lo define el técnico tras revisar el trabajo.',
  }
}

/**
 * Gemelo de precios: rango justo para un trabajo por oficio+provincia.
 * @param {{ category?: string, province?: string, note?: string }} input
 */
export async function fairPrice({ category = null, province = null, note = '' } = {}) {
  if (!isSupabaseConfigured) return fallbackFairPrice({ category, province, note })
  try {
    const { data, error } = await supabase.functions.invoke('price-intelligence', {
      body: { category, province, note },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return { source: 'ai', currency: 'USD', ...data }
  } catch (err) {
    console.warn('price-intelligence no disponible, usando estimación local:', err?.message)
    return fallbackFairPrice({ category, province, note })
  }
}

// ─────────────────────────────────────────────────────────────
// PULSO DEL NEGOCIO — Edge Function `business-pulse`. El técnico
// ve sus PROPIOS datos por RLS, así que el cliente computa los
// agregados y Claude redacta un coaching semanal accionable.
// Fallback local: resumen por plantilla (sin IA).
// ─────────────────────────────────────────────────────────────
function pct(now, prev) {
  if (!prev) return now ? 100 : 0
  return Math.round(((now - prev) / prev) * 100)
}

function fallbackPulse(s = {}) {
  const earnDelta = pct(s.earnings, s.earnings_prev)
  const jobsDelta = pct(s.jobs_done, s.jobs_done_prev)
  const trend = earnDelta > 8 ? 'up' : earnDelta < -8 ? 'down' : 'flat'
  const trendWord = trend === 'up' ? 'subiendo' : trend === 'down' ? 'bajando' : 'estable'
  const greeting = s.jobs_done
    ? `Esta semana cerraste ${s.jobs_done} trabajo${s.jobs_done === 1 ? '' : 's'} por B/.${Math.round(s.earnings || 0)}.`
    : 'Esta semana no registraste trabajos completados.'
  const actions = []
  if (s.pending > 0) actions.push(`Tienes ${s.pending} solicitud${s.pending === 1 ? '' : 'es'} sin cerrar — respóndelas hoy para no perderlas.`)
  if ((s.avg_rating || 0) >= 4.6) actions.push('Tu calificación es alta: pide a tus clientes satisfechos que te dejen reseña para subir en las búsquedas.')
  else actions.push('Enfócate en puntualidad y trabajo limpio: subir tu calificación te da más visibilidad.')
  if (s.top_zone) actions.push(`Tu zona más activa es ${s.top_zone}; amplía tu radio hacia zonas vecinas para captar más.`)
  return {
    source: 'demo',
    greeting,
    summary: `Tus ingresos van ${trendWord} (${earnDelta >= 0 ? '+' : ''}${earnDelta}% vs la semana pasada) y tus trabajos ${jobsDelta >= 0 ? '+' : ''}${jobsDelta}%. ${s.top_zone ? `Tu zona caliente es ${s.top_zone}.` : ''}`,
    trend,
    highlight: (s.avg_rating || 0) >= 4.5 ? `Mantienes ${Number(s.avg_rating).toFixed(1)}★ — la confianza es tu mejor activo.` : 'Cada trabajo bien hecho suma a tu reputación.',
    actions: actions.slice(0, 3),
  }
}

/**
 * Coaching semanal del negocio del técnico.
 * @param {{ stats?: object }} input  stats: agregados ya computados (ver TechInsightsScreen).
 */
export async function businessPulse({ stats = {} } = {}) {
  if (!isSupabaseConfigured) return fallbackPulse(stats)
  try {
    const { data, error } = await supabase.functions.invoke('business-pulse', { body: { stats } })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return { source: 'ai', ...data }
  } catch (err) {
    console.warn('business-pulse no disponible, usando resumen local:', err?.message)
    return fallbackPulse(stats)
  }
}

export const TRIAGE_START = {
  reply: '¡Hola! Soy el asistente de Tecnifix 👋 Cuéntame, ¿qué problema tienes? Describe en pocas palabras qué falla y dónde.',
  field: 'problem',
  placeholder: 'Ej: se moja el techo del baño cuando llueve',
  options: [],
}

const RISK_WORDS = ['chispa', 'humo', 'quema', 'olor a gas', 'gas', 'corto', 'inunda', 'inundado', 'electrocut', 'cable pelado', 'fuego']

/**
 * Avanza el triage.
 * @param {Array<{field:string, value:string}>} answers respuestas dadas hasta ahora
 * @returns {{reply:string, field?:string, placeholder?:string, options?:string[], done?:boolean, decision?:object}}
 */
export function triageStep(answers = []) {
  const byField = Object.fromEntries(answers.map((a) => [a.field, a.value]))
  const problem = byField.problem || ''
  const intent = detectServiceIntent(problem)
  const hay = problem.toLowerCase()
  const hasRisk = RISK_WORDS.some((w) => hay.includes(w))

  // Paso 2: urgencia
  if (!('urgency' in byField)) {
    return {
      reply: hasRisk
        ? `⚠️ Detecté algo que puede ser peligroso ("${problem.slice(0, 40)}..."). ¿La situación es un riesgo inmediato (gas, humo, chispas, inundación)?`
        : `Entiendo: ${intent.label ? `parece un tema de ${intent.label.toLowerCase()}. ` : ''}¿Qué tan urgente es?`,
      field: 'urgency',
      options: ['🚨 Es una emergencia ahora', '📅 Hoy o mañana', '🗓️ Puede esperar unos días'],
    }
  }

  // Paso 3: ubicación (provincia)
  if (!('province' in byField)) {
    return {
      reply: '¿En qué provincia estás? Así priorizo técnicos cercanos.',
      field: 'province',
      options: ['Panamá', 'Panamá Oeste', 'Chiriquí', 'Bocas del Toro', 'Colón', 'Otra'],
    }
  }

  // Decisión final
  const urgency = byField.urgency || ''
  const emergency = hasRisk || urgency.includes('emergencia') || intent.emergency
  const province = byField.province && byField.province !== 'Otra' ? byField.province : (intent.province || null)

  let safetyTip = null
  if (hasRisk) {
    if (hay.includes('gas')) safetyTip = 'Cierra la llave de gas, no enciendas interruptores y ventila el área antes de que llegue el técnico.'
    else if (hay.includes('chispa') || hay.includes('corto') || hay.includes('humo')) safetyTip = 'Baja el breaker principal para cortar la corriente y no toques cables expuestos.'
    else if (hay.includes('inunda') || hay.includes('fuga')) safetyTip = 'Cierra la llave de paso del agua para limitar el daño.'
    else safetyTip = 'Aléjate de la zona de riesgo y espera al técnico.'
  }

  const decision = {
    slug: intent.slug,
    label: intent.label || 'Servicio general',
    icon: intent.icon || '🔧',
    province,
    emergency,
    onlyVerified: emergency || intent.confidence >= 60,
    query: intent.slug ? '' : problem.trim(),
    safetyTip,
    confidence: intent.confidence,
  }

  const headline = emergency
    ? '🚨 Esto requiere atención prioritaria.'
    : '✅ Listo, ya tengo tu diagnóstico inicial.'

  return {
    done: true,
    reply: `${headline}\n\nTe recomiendo buscar **${decision.label}**${province ? ` en ${province}` : ''}${decision.onlyVerified ? ', priorizando técnicos verificados' : ''}.${safetyTip ? `\n\n🛟 Mientras tanto: ${safetyTip}` : ''}`,
    decision,
  }
}
