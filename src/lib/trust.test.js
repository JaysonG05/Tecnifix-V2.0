// Tests de la lógica de confianza/matching (pura, sin backend).
// Correr con: npm test
import { describe, it, expect } from 'vitest'
import {
  detectServiceIntent,
  getCategoryMeta,
  computeTrustScore,
  computeMatchScore,
  getTrustTier,
  technicianInsights,
  getTrustSignals,
  CATEGORIES,
  PROVINCE_LIST,
} from './trust.js'

describe('detectServiceIntent', () => {
  it('detecta el oficio por palabras clave (con y sin acento)', () => {
    const intent = detectServiceIntent('se me dañó el aire acondicionado')
    expect(intent.slug).toBe('climatizacion')
    expect(intent.confidence).toBeGreaterThan(48)
  })

  it('detecta provincia y urgencia', () => {
    const intent = detectServiceIntent('fuga de agua urgente en Chiriquí')
    expect(intent.slug).toBe('plomeria')
    expect(intent.province).toBe('Chiriquí')
    expect(intent.emergency).toBe(true)
  })

  it('texto vacío → sin oficio y confianza 0', () => {
    const intent = detectServiceIntent('')
    expect(intent.slug).toBeNull()
    expect(intent.confidence).toBe(0)
    expect(intent.icon).toBe('🔎')
  })

  it('texto sin match conocido → confianza baja pero no nula', () => {
    const intent = detectServiceIntent('hola qué tal')
    expect(intent.slug).toBeNull()
    expect(intent.confidence).toBe(28)
  })

  it('la confianza nunca supera 98', () => {
    const intent = detectServiceIntent('luz electricidad breaker panel tablero cable corto urgente Panamá')
    expect(intent.confidence).toBeLessThanOrEqual(98)
  })
})

describe('getCategoryMeta', () => {
  it('devuelve metadata de un slug válido', () => {
    expect(getCategoryMeta('electricidad')?.label).toBe('Electricidad')
  })
  it('devuelve undefined para slug inexistente', () => {
    expect(getCategoryMeta('inexistente')).toBeUndefined()
  })
})

describe('computeTrustScore', () => {
  it('un técnico verificado y activo puntúa más que uno sin verificar', () => {
    const base = { average_rating: 4.8, total_reviews: 40, total_jobs: 100, years_experience: 8, is_available: true, response_time_minutes: 20 }
    const verified = computeTrustScore({ ...base, verification_status: 'verified' })
    const unverified = computeTrustScore({ ...base, verification_status: 'unverified' })
    expect(verified).toBeGreaterThan(unverified)
  })

  it('queda acotado a 0-100', () => {
    const max = computeTrustScore({
      verification_status: 'verified', average_rating: 5, total_reviews: 999,
      total_jobs: 9999, years_experience: 99, is_available: true,
      response_time_minutes: 1, avatar_url: 'x', bio: 'y', is_featured: true,
    }, 5)
    expect(max).toBeGreaterThan(0)
    expect(max).toBeLessThanOrEqual(100)
  })

  it('técnico vacío puntúa muy bajo (solo la base de disponibilidad)', () => {
    // is_available falsy aporta 2; el resto de señales son 0.
    expect(computeTrustScore({})).toBe(2)
  })
})

describe('computeMatchScore', () => {
  const tech = {
    verification_status: 'verified', average_rating: 4.9, total_reviews: 60,
    total_jobs: 120, years_experience: 6, is_available: true,
    response_time_minutes: 25, category_slug: 'plomeria', province: 'Panamá',
  }

  it('sube cuando el oficio coincide con la intención', () => {
    const match = computeMatchScore(tech, { slug: 'plomeria', label: 'Plomería' })
    const noMatch = computeMatchScore(tech, { slug: 'pintura', label: 'Pintura' })
    expect(match.score).toBeGreaterThan(noMatch.score)
    expect(match.reasons.length).toBeGreaterThan(0)
  })

  it('premia disponibilidad y respuesta rápida en emergencias', () => {
    const urgent = computeMatchScore(tech, { slug: 'plomeria', emergency: true })
    const calm = computeMatchScore(tech, { slug: 'plomeria', emergency: false })
    expect(urgent.score).toBeGreaterThanOrEqual(calm.score)
  })

  it('score acotado 0-100 y máximo 2 razones', () => {
    const m = computeMatchScore(tech, { slug: 'plomeria', label: 'Plomería', province: 'Panamá', emergency: true })
    expect(m.score).toBeLessThanOrEqual(100)
    expect(m.reasons.length).toBeLessThanOrEqual(2)
  })
})

describe('getTrustTier', () => {
  it('mapea rangos a niveles', () => {
    expect(getTrustTier(95).label).toBe('Elite')
    expect(getTrustTier(80).label).toBe('Oro')
    expect(getTrustTier(65).label).toBe('Plata')
    expect(getTrustTier(10).label).toBe('Bronce')
  })
})

describe('technicianInsights', () => {
  it('marca perfil incompleto como severidad alta y ordena alta→ok', () => {
    const insights = technicianInsights({ verification_status: 'unverified' }, {}, 0)
    expect(insights[0].severity).toBe('alta')
    const severities = insights.map(i => i.severity)
    const order = { alta: 0, media: 1, ok: 2 }
    const sorted = [...severities].sort((a, b) => order[a] - order[b])
    expect(severities).toEqual(sorted)
  })

  it('detecta precio por encima del mercado', () => {
    const insights = technicianInsights(
      { min_price: 200, avatar_url: 'x', bio: 'una bio suficientemente larga para pasar el umbral', verification_status: 'verified', total_reviews: 10, average_rating: 4.8 },
      { avgPrice: 100 }, 2,
    )
    expect(insights.some(i => i.title === 'Precio por encima del mercado')).toBe(true)
  })
})

describe('getTrustSignals', () => {
  it('siempre devuelve 5 señales', () => {
    expect(getTrustSignals({ verification_status: 'verified' }, 3)).toHaveLength(5)
    expect(getTrustSignals({})).toHaveLength(5)
  })
})

describe('listas exportadas', () => {
  it('CATEGORIES tiene los 8 oficios con slug/label/icon', () => {
    expect(CATEGORIES).toHaveLength(8)
    for (const c of CATEGORIES) {
      expect(c.slug).toBeTruthy()
      expect(c.label).toBeTruthy()
      expect(c.icon).toBeTruthy()
    }
  })
  it('PROVINCE_LIST incluye las provincias clave', () => {
    expect(PROVINCE_LIST).toContain('Panamá')
    expect(PROVINCE_LIST).toContain('Chiriquí')
  })
})
