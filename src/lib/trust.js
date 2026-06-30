const CATEGORY_RULES = [
  { slug: 'climatizacion', label: 'Climatización', icon: '❄️', words: ['aire', 'ac', 'a/c', 'clima', 'split', 'evaporador', 'compresor', 'frio', 'frío'] },
  { slug: 'electricidad', label: 'Electricidad', icon: '⚡', words: ['luz', 'luces', 'electric', 'electricidad', 'breaker', 'panel', 'tablero', 'cable', 'corto', 'tomacorriente'] },
  { slug: 'plomeria', label: 'Plomería', icon: '🔧', words: ['agua', 'fuga', 'tuberia', 'tubería', 'plomero', 'baño', 'bano', 'inodoro', 'lavamanos', 'grifo', 'desague', 'desagüe'] },
  { slug: 'cerrajeria', label: 'Cerrajería', icon: '🔐', words: ['cerradura', 'llave', 'puerta', 'cerrajero', 'candado', 'bloqueada'] },
  { slug: 'pintura', label: 'Pintura', icon: '🎨', words: ['pintar', 'pintura', 'pared', 'color', 'impermeabilizar', 'acabado'] },
  { slug: 'limpieza', label: 'Limpieza', icon: '🧹', words: ['limpieza', 'limpiar', 'profunda', 'oficina', 'casa sucia'] },
  { slug: 'albanileria', label: 'Albañilería', icon: '🧱', words: ['pared', 'bloque', 'cemento', 'albañil', 'albanil', 'piso', 'remodelar', 'construir'] },
  { slug: 'tecnologia', label: 'Tecnología', icon: '💻', words: ['pc', 'computadora', 'laptop', 'internet', 'wifi', 'red', 'camara', 'cámara', 'software'] },
]

const PROVINCES = [
  'Bocas del Toro', 'Coclé', 'Colón', 'Chiriquí', 'Darién',
  'Herrera', 'Los Santos', 'Panamá', 'Panamá Oeste', 'Veraguas',
]

const URGENT_WORDS = ['urgente', 'emergencia', 'ahora', 'ya', 'rapido', 'rápido', 'hoy', 'inmediato', '24/7']

function normalize(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

// Listas reutilizables por la UI (selectores de oficio/provincia).
export const CATEGORIES = CATEGORY_RULES.map(({ slug, label, icon }) => ({ slug, label, icon }))
export const PROVINCE_LIST = PROVINCES

export function getCategoryMeta(slug) {
  return CATEGORY_RULES.find((rule) => rule.slug === slug)
}

export function detectServiceIntent(text = '') {
  const hay = normalize(text)
  const categoryMatches = CATEGORY_RULES.map((rule) => {
    const hits = rule.words.filter((word) => hay.includes(normalize(word))).length
    return { ...rule, hits }
  }).sort((a, b) => b.hits - a.hits)

  const top = categoryMatches[0]
  const province = PROVINCES.find((p) => hay.includes(normalize(p)))
  const emergency = URGENT_WORDS.some((word) => hay.includes(normalize(word)))
  const confidence = top?.hits
    ? clamp(48 + top.hits * 18 + (province ? 10 : 0) + (emergency ? 10 : 0), 0, 98)
    : (hay.trim() ? 28 : 0)

  return {
    slug: top?.hits ? top.slug : null,
    label: top?.hits ? top.label : null,
    icon: top?.hits ? top.icon : '🔎',
    province: province || null,
    emergency,
    confidence,
    suggestions: categoryMatches.filter((rule) => rule.hits > 0).slice(0, 3),
  }
}

/**
 * Match score 0-100 entre un técnico y la intención de búsqueda detectada.
 * Combina confianza (computeTrustScore) + afinidad de oficio, provincia,
 * urgencia y disponibilidad. Devuelve también razones legibles para la UI.
 */
export function computeMatchScore(tech = {}, intent = {}) {
  const reasons = []
  let score = computeTrustScore(tech) * 0.42  // base de confianza (~0-42)

  const slugs = [tech.category_slug, ...(Array.isArray(tech.category_slugs) ? tech.category_slugs : [])].filter(Boolean)
  if (intent.slug && slugs.includes(intent.slug)) {
    score += 24
    reasons.push(`Especialista en ${intent.label || intent.slug}`)
  }
  if (intent.province && (tech.province || '') === intent.province) {
    score += 12
    reasons.push(`Está en ${intent.province}`)
  }
  if (intent.emergency) {
    if (tech.is_available) { score += 10; reasons.push('Disponible ahora') }
    if (Number(tech.response_time_minutes || 999) <= 45) { score += 6; reasons.push('Respuesta rápida') }
  } else if (tech.is_available) {
    score += 4
  }
  const rating = Number(tech.average_rating || 0)
  if (rating >= 4.7) reasons.push(`${rating.toFixed(1)}★ destacado`)
  if (!reasons.length && tech.verification_status === 'verified') reasons.push('Identidad verificada')

  return { score: Math.round(clamp(score, 0, 100)), reasons: reasons.slice(0, 2) }
}

export function computeTrustScore(tech = {}, certCount = 0) {
  const rating = Number(tech.average_rating || 0)
  const reviews = Number(tech.total_reviews || 0)
  const jobs = Number(tech.total_jobs || 0)
  const years = Number(tech.years_experience || 0)
  const response = Number(tech.response_time_minutes || 999)

  const inReview = ['pending', 'pending_review', 'under_review', 'needs_correction', 'incomplete'].includes(tech.verification_status)
  const verified = tech.verification_status === 'verified' ? 24 : inReview ? 8 : 0
  const ratingScore = clamp((rating / 5) * 18, 0, 18)
  const reviewScore = clamp((reviews / 50) * 14, 0, 14)
  const jobScore = clamp((jobs / 150) * 14, 0, 14)
  const yearsScore = clamp((years / 10) * 9, 0, 9)
  const availabilityScore = tech.is_available ? 7 : 2
  const responseScore = response <= 30 ? 6 : response <= 60 ? 4 : response <= 120 ? 2 : 0
  const profileScore = (tech.avatar_url ? 3 : 0) + (tech.bio ? 2 : 0) + (certCount > 0 ? 4 : 0)
  const featuredScore = tech.is_featured ? 2 : 0

  return Math.round(clamp(
    verified + ratingScore + reviewScore + jobScore + yearsScore + availabilityScore + responseScore + profileScore + featuredScore
  ))
}

export function getTrustTier(score = 0) {
  if (score >= 90) return { label: 'Elite', color: '#0f766e', bg: '#ccfbf1', guarantee: 'Garantía sugerida 30 días' }
  if (score >= 78) return { label: 'Oro', color: '#92400e', bg: '#fef3c7', guarantee: 'Garantía sugerida 15 días' }
  if (score >= 62) return { label: 'Plata', color: '#1e40af', bg: '#dbeafe', guarantee: 'Garantía sugerida 7 días' }
  return { label: 'Bronce', color: '#475569', bg: '#f1f5f9', guarantee: 'Revisión básica recomendada' }
}

/**
 * Insights accionables para el técnico: completitud de perfil, precio vs
 * mercado y palancas de confianza. Local e instantáneo.
 * @param {object} tech perfil (technicians_full)
 * @param {object} market { avgPrice, avgRating, count } de su categoría
 * @param {number} certCount número de certificados públicos
 */
export function technicianInsights(tech = {}, market = {}, certCount = 0) {
  const insights = []
  const add = (severity, icon, title, detail, actionScreen = null) =>
    insights.push({ severity, icon, title, detail, actionScreen })

  // 1) Completitud del perfil
  const missing = []
  if (!tech.avatar_url) missing.push('foto de perfil')
  if (!tech.bio || tech.bio.length < 40) missing.push('biografía')
  if (certCount === 0) missing.push('certificados')
  if (missing.length) {
    add('alta', '📝', 'Completa tu perfil', `Te falta: ${missing.join(', ')}. Los perfiles completos reciben más solicitudes.`, 'edit-tech-profile')
  } else {
    add('ok', '✅', 'Perfil completo', 'Tu perfil tiene los elementos clave que generan confianza.')
  }

  // 2) Precio vs mercado
  const myPrice = Number(tech.min_price || 0)
  const avg = Number(market.avgPrice || 0)
  if (myPrice && avg) {
    const diff = Math.round(((myPrice - avg) / avg) * 100)
    if (diff > 25) add('media', '💰', 'Precio por encima del mercado', `Tu precio base ($${myPrice}) está ~${diff}% sobre el promedio de tu categoría ($${Math.round(avg)}). Justifícalo con reseñas/certificados o ajústalo.`, 'service-catalog')
    else if (diff < -25) add('media', '💰', 'Estás dejando dinero en la mesa', `Cobras ~${Math.abs(diff)}% bajo el promedio ($${Math.round(avg)}). Podrías subir tu precio sin perder competitividad.`, 'service-catalog')
    else add('ok', '💰', 'Precio competitivo', `Tu precio base está alineado con el promedio de tu categoría ($${Math.round(avg)}).`)
  }

  // 3) Reseñas / reputación
  const reviews = Number(tech.total_reviews || 0)
  if (reviews < 5) add('alta', '⭐', 'Consigue tus primeras reseñas', 'Con menos de 5 reseñas es difícil destacar. Pide reseña a clientes recientes tras cada trabajo.')
  else if (Number(tech.average_rating || 0) >= 4.7) add('ok', '⭐', 'Reputación sólida', `${Number(tech.average_rating).toFixed(1)}★ con ${reviews} reseñas. Síguelo así.`)

  // 4) Respuesta / disponibilidad
  if (Number(tech.response_time_minutes || 999) > 60) add('media', '⚡', 'Mejora tu tiempo de respuesta', 'Responder en menos de 1 hora aumenta mucho la conversión. Activa notificaciones.')
  if (!tech.is_available) add('media', '🟢', 'Actívate como disponible', 'Apareces como no disponible; los clientes priorizan a quien puede ir pronto.')

  // 5) Verificación
  if (tech.verification_status !== 'verified') add('alta', '🛡️', 'Verifica tu identidad', 'Los técnicos verificados aparecen primero en emergencias y búsquedas priorizadas.', 'certificates')

  const order = { alta: 0, media: 1, ok: 2 }
  return insights.sort((a, b) => order[a.severity] - order[b.severity])
}

export function getTrustSignals(tech = {}, certCount = 0) {
  return [
    tech.verification_status === 'verified' ? 'Identidad verificada' : 'Identidad pendiente',
    `${Number(tech.total_reviews || 0)} reseñas`,
    `${Number(tech.total_jobs || 0)} trabajos`,
    tech.is_available ? 'Disponible ahora' : 'Agenda disponible',
    certCount > 0 ? `${certCount} documento(s)` : 'Sin documentos públicos',
  ]
}
