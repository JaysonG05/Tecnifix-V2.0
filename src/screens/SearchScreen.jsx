import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { TechnicianCard } from '../components/TechnicianCard.jsx'
import { SkeletonCard, EmptyState, Btn } from '../components/UI.jsx'
import { technicians } from '../lib/supabase.js'
import { detectServiceIntent, computeMatchScore } from '../lib/trust.js'
import { T } from '../i18n/translations.js'

/* Brand Colors */
const NAVY = '#102840'
const GOLD = '#FFD400'

const CATS = [
  { slug: 'climatizacion', nameEs: 'Climatización', nameEn: 'A/C', icon: '❄️' },
  { slug: 'electricidad', nameEs: 'Electricidad', nameEn: 'Electrical', icon: '⚡' },
  { slug: 'plomeria', nameEs: 'Plomería', nameEn: 'Plumbing', icon: '🔧' },
  { slug: 'albanileria', nameEs: 'Albañilería', nameEn: 'Masonry', icon: '🧱' },
  { slug: 'limpieza', nameEs: 'Limpieza', nameEn: 'Cleaning', icon: '🧹' },
  { slug: 'cerrajeria', nameEs: 'Cerrajería', nameEn: 'Locksmith', icon: '🔐' },
  { slug: 'pintura', nameEs: 'Pintura', nameEn: 'Painting', icon: '🎨' },
  { slug: 'tecnologia', nameEs: 'Técnico PC', nameEn: 'PC Tech', icon: '💻' },
]

const PROVINCES = [
  'Bocas del Toro', 'Coclé', 'Colón', 'Chiriquí', 'Darién',
  'Herrera', 'Los Santos', 'Panamá', 'Panamá Oeste', 'Veraguas',
]

const SERVICE_EXAMPLES = [
  'Electricistas', 'Plomeros', 'Aire acondicionado', 'Pintores',
  'Cerrajeros', 'Técnico PC', 'Limpieza', 'Albañilería'
]

const MOCK_TECHNICIANS = [
  {
    user_id: 'mock1', full_name: 'Carlos Méndez', professional_title: 'Electricista Certificado',
    avatar_url: '', average_rating: 4.8, total_reviews: 124, min_price: 35, is_available: true,
    verification_status: 'verified', distance_km: 2.5, province: 'Panamá', city: 'San Francisco',
    category_slugs: ['electricidad', 'climatizacion'], is_featured: true,
  },
  {
    user_id: 'mock2', full_name: 'Luis Rodríguez', professional_title: 'Plomería y Destapes',
    avatar_url: '', average_rating: 4.5, total_reviews: 89, min_price: 25, is_available: true,
    verification_status: 'verified', distance_km: 5.1, province: 'Panamá Oeste', city: 'Arraiján',
    category_slugs: ['plomeria'],
  },
  {
    user_id: 'mock3', full_name: 'Ana Gómez', professional_title: 'Especialista en Limpieza Profunda',
    avatar_url: '', average_rating: 4.9, total_reviews: 210, min_price: 40, is_available: false,
    verification_status: 'verified', distance_km: 1.2, province: 'Panamá', city: 'Bella Vista',
    category_slugs: ['limpieza'],
  },
  {
    user_id: 'mock4', full_name: 'Jorge Batista', professional_title: 'Técnico en Refrigeración Comercial',
    avatar_url: '', average_rating: 4.7, total_reviews: 156, min_price: 50, is_available: true,
    verification_status: 'pending', distance_km: 8.4, province: 'Colón', city: 'Cristóbal',
    category_slugs: ['climatizacion'],
  },
  {
    user_id: 'mock5', full_name: 'Roberto Castillo', professional_title: 'Pintura y Acabados Finos',
    avatar_url: '', average_rating: 4.6, total_reviews: 67, min_price: 30, is_available: true,
    verification_status: 'verified', distance_km: 12.0, province: 'Chiriquí', city: 'David',
    category_slugs: ['pintura', 'albanileria'],
  },
  {
    user_id: 'mock6', full_name: 'María Fernández', professional_title: 'Mantenimiento de Computadoras',
    avatar_url: '', average_rating: 5.0, total_reviews: 312, min_price: 20, is_available: true,
    verification_status: 'verified', distance_km: 3.8, province: 'Panamá', city: 'Betania',
    category_slugs: ['tecnologia'], is_featured: true,
  },
  {
    user_id: 'mock7', full_name: 'Daniel Santos', professional_title: 'Cerrajería 24/7 Automotriz y Residencial',
    avatar_url: '', average_rating: 4.4, total_reviews: 45, min_price: 45, is_available: true,
    verification_status: 'verified', distance_km: 6.7, province: 'Panamá Oeste', city: 'La Chorrera',
    category_slugs: ['cerrajeria'],
  },
  {
    user_id: 'mock8', full_name: 'Pedro Alvarado', professional_title: 'Albañilería y Remodelaciones',
    avatar_url: '', average_rating: 4.2, total_reviews: 28, min_price: 60, is_available: false,
    verification_status: 'pending', distance_km: 15.2, province: 'Coclé', city: 'Penonomé',
    category_slugs: ['albanileria'],
  }
]

export function SearchScreen() {
  const { th, selectedCategory, navigate, setSelectedTech, lang, isDesktop } = useApp()
  const t = T[lang]

  // Global search state
  const [query, setQuery] = useState(selectedCategory?.query || '')
  
  // Filters state
  const [filter, setFilter] = useState(selectedCategory?.slug || 'all')
  const [province, setProvince] = useState(selectedCategory?.province || 'all')
  const [sort, setSort] = useState('average_rating')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [maxPrice, setMaxPrice] = useState(100)
  const [minRating, setMinRating] = useState(0)
  const [emergency, setEmergency] = useState(selectedCategory?.emergency || false)
  const [companyOnly, setCompanyOnly] = useState(false)

  // UI State
  const [showFiltersMobile, setShowFiltersMobile] = useState(false)
  
  // Data state
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    technicians.list({
      categorySlug: filter === 'all' ? undefined : filter,
      onlyAvailable: onlyAvailable || undefined,
      onlyVerified: onlyVerified || undefined,
      sortBy: sort === 'match' ? 'average_rating' : sort,
    })
      .then(data => {
        if (!data || data.length === 0) {
          setResults(MOCK_TECHNICIANS) // Fallback mock
        } else {
          setResults(data)
        }
      })
      .catch(() => setResults(MOCK_TECHNICIANS)) // Fallback mock on error
      .finally(() => setLoading(false))
  }, [filter, sort, onlyAvailable, onlyVerified])

  // Sync initial state from context
  useEffect(() => {
    if (selectedCategory?.query) setQuery(selectedCategory.query)
    if (selectedCategory?.slug) setFilter(selectedCategory.slug)
    if (selectedCategory?.province) setProvince(selectedCategory.province)
    if (selectedCategory?.emergency) { setEmergency(true); setOnlyAvailable(true) }
    if (selectedCategory?.onlyVerified) setOnlyVerified(true)
  }, [selectedCategory])

  // Client side filtering
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return results.filter(tech => {
      if (maxPrice < 100 && Number(tech.min_price ?? 0) > maxPrice) return false
      if (minRating > 0 && Number(tech.average_rating ?? 0) < minRating) return false
      if (province !== 'all' && (tech.province || '') !== province) return false
      if (companyOnly && tech.user_type !== 'company') return false
      if (emergency && !tech.is_available) return false // Basic emergency logic
      
      if (q) {
        const hay = [tech.full_name, tech.professional_title, tech.professional_title_en, tech.city, tech.province]
          .filter(Boolean).join(' ').toLowerCase()
        
        // Check slugs for search text too
        const cats = tech.category_slugs?.join(' ') || tech.category_slug || ''
        const fullHay = hay + ' ' + cats
        if (!fullHay.includes(q)) return false
      }
      return true
    })
  }, [results, query, province, maxPrice, minRating, companyOnly, emergency])

  const intent = useMemo(() => {
    const base = detectServiceIntent(query)
    return {
      slug: filter !== 'all' ? filter : base.slug,
      label: filter !== 'all' ? filter : base.label,
      province: province !== 'all' ? province : base.province,
      emergency: emergency || onlyAvailable || base.emergency,
    }
  }, [query, filter, province, onlyAvailable, emergency])

  const ranked = useMemo(() => {
    if (sort !== 'match') return visible.map(tech => ({ tech, match: null }))
    return visible
      .map(tech => ({ tech, match: computeMatchScore(tech, intent) }))
      .sort((a, b) => b.match.score - a.match.score)
  }, [visible, sort, intent])

  const openTech = (tech) => { setSelectedTech(tech); navigate('tech-profile') }
  const clearAll = () => { setFilter('all'); setOnlyAvailable(false); setOnlyVerified(false); setMaxPrice(100); setMinRating(0); setQuery(''); setProvince('all'); setEmergency(false); setCompanyOnly(false) }

  // ------------------------------------------------------------------
  // UI COMPONENTS
  // ------------------------------------------------------------------

  const AdvancedFiltersContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Ubicación */}
      <div>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: '#102840' }}>Ubicación</h4>
        <select value={province} onChange={e => setProvince(e.target.value)}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', background: '#f8fafc', fontWeight: 600 }}>
          <option value="all">Todas las provincias</option>
          {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Confianza */}
      <div>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: '#102840' }}>Confianza</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={onlyVerified} onChange={e => setOnlyVerified(e.target.checked)} style={{ width: 18, height: 18, accentColor: NAVY }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Solo verificados</span>
          </label>
        </div>
      </div>

      {/* Disponibilidad */}
      <div>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: '#102840' }}>Disponibilidad</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={onlyAvailable} onChange={e => setOnlyAvailable(e.target.checked)} style={{ width: 18, height: 18, accentColor: NAVY }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Disponible ahora</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={emergency} onChange={e => setEmergency(e.target.checked)} style={{ width: 18, height: 18, accentColor: NAVY }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Emergencias 24/7</span>
          </label>
        </div>
      </div>

      {/* Precio */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#102840' }}>Precio Máximo</h4>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{maxPrice >= 100 ? 'Sin límite' : `$${maxPrice}/hr`}</span>
        </div>
        <input type="range" min="10" max="100" step="5" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} style={{ width: '100%', accentColor: NAVY }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, color: '#64748b', fontSize: 12 }}>
          <span>$10</span>
          <span>$100+</span>
        </div>
      </div>

      {/* Calificación */}
      <div>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: '#102840' }}>Calificación</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 4, 4.5].map(r => (
            <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="radio" name="rating" checked={minRating === r} onChange={() => setMinRating(r)} style={{ width: 18, height: 18, accentColor: NAVY }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>
                {r === 0 ? 'Cualquiera' : `${r} estrellas o más`}
              </span>
            </label>
          ))}
        </div>
      </div>
      
      {/* Botón limpiar */}
      <button onClick={clearAll} style={{ marginTop: 10, background: 'transparent', border: `1px solid #cbd5e1`, color: '#475569', padding: '12px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}>
        Limpiar filtros
      </button>
    </div>
  )

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { scrollbar-width: none; }
      `}</style>

      {/* ───────── SEARCH HERO ───────── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        padding: isDesktop ? '60px 4vw' : '30px 20px',
        background: NAVY,
        borderRadius: isDesktop ? '0 0 40px 40px' : '0 0 24px 24px',
        boxShadow: '0 10px 30px rgba(16,40,64,0.15)',
        textAlign: 'center',
      }}>
        {/* Glow Effects */}
        <div style={{ position: 'absolute', top: -100, right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,212,0,0.15), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -50, left: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 999, marginBottom: 20 }}>
            🇵🇦 Búsqueda nacional
          </div>
          <h1 style={{ margin: '0 0 16px', color: '#fff', fontSize: isDesktop ? 48 : 32, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.5px' }}>
            Busca técnicos <span style={{ color: GOLD }}>de cualquier oficio</span>
          </h1>
          <p style={{ margin: '0 auto 32px', color: 'rgba(255,255,255,0.8)', fontSize: isDesktop ? 18 : 15, fontWeight: 500, maxWidth: 600, lineHeight: 1.5 }}>
            Compara técnicos verificados por oficio, provincia, precio, calificación y disponibilidad en todo Panamá.
          </p>

          {/* Search Bar Container */}
          <div style={{ position: 'relative', marginBottom: 24, display: 'flex', gap: 8, flexDirection: isDesktop ? 'row' : 'column' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', fontSize: 22, opacity: 0.9 }}>🔍</span>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Busca electricista, plomero, A/C, ciudad, provincia..."
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '20px 20px 20px 56px',
                  borderRadius: 16, border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)',
                  color: '#fff', fontSize: 16, fontWeight: 500, outline: 'none', fontFamily: 'inherit',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: 14, cursor: 'pointer', fontSize: 14 }}>✕</button>
              )}
            </div>
            {isDesktop && (
              <button style={{ background: GOLD, color: NAVY, border: 'none', borderRadius: 16, padding: '0 32px', fontSize: 16, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(255,212,0,0.3)' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                Buscar
              </button>
            )}
          </div>

          {/* Province Chips */}
          <div className="hide-scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, justifyContent: isDesktop ? 'center' : 'flex-start' }}>
            <button onClick={() => setProvince('all')} style={{
              flexShrink: 0, padding: '8px 16px', borderRadius: 99, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
              background: province === 'all' ? GOLD : 'rgba(255,255,255,0.1)', color: province === 'all' ? NAVY : '#fff', border: `1px solid ${province === 'all' ? GOLD : 'rgba(255,255,255,0.2)'}`
            }}>Todas</button>
            {PROVINCES.map(p => (
              <button key={p} onClick={() => setProvince(province === p ? 'all' : p)} style={{
                flexShrink: 0, padding: '8px 16px', borderRadius: 99, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                background: province === p ? GOLD : 'rgba(255,255,255,0.1)', color: province === p ? NAVY : '#fff', border: `1px solid ${province === p ? GOLD : 'rgba(255,255,255,0.2)'}`
              }}>{p}</button>
            ))}
          </div>

          {/* Popular Services */}
          <div className="hide-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 16, justifyContent: isDesktop ? 'center' : 'flex-start' }}>
            {SERVICE_EXAMPLES.map(item => (
              <button key={item} onClick={() => setQuery(item)} style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s'
              }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}>
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isDesktop ? '32px 4vw' : '20px' }}>
        
        {/* ───────── CATEGORÍAS ───────── */}
        <div className="hide-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, marginBottom: 24 }}>
          <button onClick={() => setFilter('all')} style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 16, cursor: 'pointer', fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
            background: filter === 'all' ? NAVY : '#fff', color: filter === 'all' ? '#fff' : '#1e293b', border: `1px solid ${filter === 'all' ? NAVY : '#e2e8f0'}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <span style={{ fontSize: 18 }}>✨</span> Todos los oficios
          </button>
          {CATS.map(c => (
            <button key={c.slug} onClick={() => setFilter(filter === c.slug ? 'all' : c.slug)} style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 16, cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
              background: filter === c.slug ? NAVY : '#fff', color: filter === c.slug ? '#fff' : '#1e293b', border: `1px solid ${filter === c.slug ? NAVY : '#e2e8f0'}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <span style={{ fontSize: 18 }}>{c.icon}</span> {lang === 'en' ? c.nameEn : c.nameEs}
            </button>
          ))}
        </div>

        {/* ───────── FILTROS SECUNDARIOS & ORDEN ───────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div className="hide-scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
            {!isDesktop && (
              <button onClick={() => setShowFiltersMobile(true)} style={{
                flexShrink: 0, padding: '8px 16px', borderRadius: 99, background: '#fff', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
              }}>
                ⚙️ Filtros avanzados
              </button>
            )}
            <button onClick={() => setSort('average_rating')} style={{
              flexShrink: 0, padding: '8px 16px', borderRadius: 99, background: sort === 'average_rating' ? '#f1f5f9' : '#fff', border: `1px solid ${sort === 'average_rating' ? '#cbd5e1' : '#e2e8f0'}`, color: sort === 'average_rating' ? '#0f172a' : '#475569', fontWeight: 600, fontSize: 14
            }}>⭐ Mejor calificados</button>
            <button onClick={() => setOnlyVerified(v => !v)} style={{
              flexShrink: 0, padding: '8px 16px', borderRadius: 99, background: onlyVerified ? '#dbeafe' : '#fff', border: `1px solid ${onlyVerified ? '#bfdbfe' : '#e2e8f0'}`, color: onlyVerified ? '#1e40af' : '#475569', fontWeight: 600, fontSize: 14
            }}>✓ Verificados</button>
            <button onClick={() => setOnlyAvailable(v => !v)} style={{
              flexShrink: 0, padding: '8px 16px', borderRadius: 99, background: onlyAvailable ? '#dcfce7' : '#fff', border: `1px solid ${onlyAvailable ? '#bbf7d0' : '#e2e8f0'}`, color: onlyAvailable ? '#166534' : '#475569', fontWeight: 600, fontSize: 14
            }}>● Disponibles</button>
          </div>
          
          {/* Contador de resultados */}
          <div style={{ color: '#475569', fontSize: 14, fontWeight: 600 }}>
            {loading ? 'Buscando...' : `${visible.length} técnicos encontrados`}
          </div>
        </div>

        {/* ───────── LAYOUT PRINCIPAL (Sidebar + Grid) ───────── */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
          
          {/* SIDEBAR (Solo Desktop) */}
          {isDesktop && (
            <div style={{ width: 280, flexShrink: 0, background: '#fff', padding: 24, borderRadius: 24, border: '1px solid #e2e8f0', position: 'sticky', top: 100 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 900, color: '#102840' }}>Filtros</h3>
              <AdvancedFiltersContent />
            </div>
          )}

          {/* DRAWER (Solo Mobile) */}
          {!isDesktop && showFiltersMobile && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,40,64,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setShowFiltersMobile(false)} />
              <div style={{ position: 'relative', background: '#fff', width: '100%', maxHeight: '90vh', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 24px 40px', overflowY: 'auto', animation: 'slideUp 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#102840' }}>Filtros Avanzados</h3>
                  <button onClick={() => setShowFiltersMobile(false)} style={{ background: '#f1f5f9', border: 'none', width: 36, height: 36, borderRadius: 18, fontSize: 18, fontWeight: 'bold', color: '#475569' }}>✕</button>
                </div>
                <AdvancedFiltersContent />
                <button onClick={() => setShowFiltersMobile(false)} style={{ width: '100%', background: NAVY, color: '#fff', border: 'none', padding: '14px', borderRadius: 14, fontSize: 16, fontWeight: 800, marginTop: 24 }}>
                  Ver {visible.length} resultados
                </button>
              </div>
            </div>
          )}

          {/* GRID DE RESULTADOS */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(auto-fill, minmax(320px, 1fr))' : '1fr', gap: 20 }}>
              {loading ? (
                [1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)
              ) : visible.length === 0 ? (
                <div style={{ gridColumn: '1 / -1' }}>
                  <EmptyState 
                    emoji="🧭" 
                    title="No encontramos técnicos con esos filtros"
                    sub="Prueba cambiando la provincia, el oficio o los filtros avanzados."
                    action={<button onClick={clearAll} style={{ background: NAVY, color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Limpiar filtros</button>} 
                  />
                </div>
              ) : (
                ranked.map(({ tech, match }) => (
                  <TechnicianCard key={tech.user_id} tech={tech} onPress={openTech} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
