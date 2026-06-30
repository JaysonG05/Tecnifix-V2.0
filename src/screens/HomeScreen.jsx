import { useState, useCallback, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { TechnicianCard } from '../components/TechnicianCard.jsx'
import { SkeletonCard } from '../components/UI.jsx'
import { supabase, technicians, serviceRequests } from '../lib/supabase.js'
import { T } from '../i18n/translations.js'

// Íconos SVG para categorías (Heroicons empaquetados en <svg>)
const CAT_ICONS_SVG = {
  climatizacion: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
    </svg>
  ),
  electricidad: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  plomeria: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M12 22V12m0 0a4 4 0 100-8 4 4 0 000 8z" />
      <path strokeLinecap="round" d="M6 12H2M22 12h-4M6 18l-2 2M20 4l-2 2" />
    </svg>
  ),
  albanileria: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  limpieza: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
    </svg>
  ),
  cerrajeria: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  ),
  pintura: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  ),
  tecnologia: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" strokeLinejoin="round" />
      <path strokeLinecap="round" d="M8 21h8M12 17v4" />
    </svg>
  ),
}

const CATEGORIES = [
  { slug: 'climatizacion', nameEs: 'Clima', nameEn: 'A/C' },
  { slug: 'electricidad', nameEs: 'Eléctrico', nameEn: 'Electrical' },
  { slug: 'plomeria', nameEs: 'Plomería', nameEn: 'Plumbing' },
  { slug: 'albanileria', nameEs: 'Albañilería', nameEn: 'Masonry' },
  { slug: 'limpieza', nameEs: 'Limpieza', nameEn: 'Cleaning' },
  { slug: 'cerrajeria', nameEs: 'Cerrajería', nameEn: 'Locksmith' },
  { slug: 'pintura', nameEs: 'Pintura', nameEn: 'Painting' },
  { slug: 'tecnologia', nameEs: 'Tech PC', nameEn: 'IT Support' },
]

const STATUS_COLORS = {
  pending: { bg: '#FFF8E0', text: '#7A5E00', label: 'Enviada', emoji: '⏳' },
  accepted: { bg: '#DDEEFF', text: '#00214D', label: 'Aceptada', emoji: '✅' },
  in_progress: { bg: '#E8F0FF', text: '#0053A0', label: 'En progreso', emoji: '⚡' },
  pending_payment: { bg: '#FFF0D6', text: '#7A4500', label: 'Pend. pago', emoji: '💳' },
  completed: { bg: '#DFF7ED', text: '#00704A', label: 'Completada', emoji: '✅' },
  cancelled: { bg: '#FFE8E8', text: '#B00020', label: 'Cancelada', emoji: '✖️' },
  disputed: { bg: '#FFF0D6', text: '#7A4500', label: 'En disputa', emoji: '🚨' },
  pending_confirmation: { bg: '#E8F0FF', text: '#0053A0', label: 'Confirmando', emoji: '⏳' },
}

function getGreeting(lang) {
  const h = new Date().getHours()
  if (lang === 'en') return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'
}

function StatCard({ val, label, color, th }) {
  return (
    <div style={{
      background: th.surface, border: `1px solid ${th.border}`,
      borderRadius: 12, padding: '10px 8px', textAlign: 'center', flex: 1
    }}>
      <p style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, fontFamily: th.fontMono, color: color || th.text }}>{val}</p>
      <p style={{ margin: 0, fontSize: 10, color: th.textSec, lineHeight: 1.3, fontFamily: th.fontDisplay }}>{label}</p>
    </div>
  )
}

export function HomeScreen() {
  const { th, navigate, setSelectedTech, setSelectedCategory,
    setSelectedRequest, user, lang } = useApp()
  const t = T[lang]

  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [featured, setFeatured] = useState([])
  const [loadingFeatured, setLoadingFeatured] = useState(true)
  const [stats, setStats] = useState(null)
  const [lastRequest, setLastRequest] = useState(null)
  const [nearbyCount, setNearbyCount] = useState(null)

  // Cargar destacados y stats
  useEffect(() => {
    supabase.from('technicians_full').select('*')
      .eq('is_featured', true)
      .order('average_rating', { ascending: false })
      .limit(4)
      .then(({ data }) => setFeatured(data ?? []))
      .catch(() => { })
      .finally(() => setLoadingFeatured(false))

    supabase.from('technicians_full')
      .select('average_rating, is_available, response_time_minutes')
      .then(({ data }) => {
        if (!data?.length) return
        const active = data.filter(x => x.is_available).length
        const avgRating = (data.reduce((s, x) => s + Number(x.average_rating), 0) / data.length).toFixed(1)
        const avgResp = Math.round(data.reduce((s, x) => s + (x.response_time_minutes || 60), 0) / data.length)
        setStats({ active, avgRating, avgResp })
      }).catch(() => { })
  }, [])

  // Cargar última solicitud
  useEffect(() => {
    if (!user) { setLastRequest(null); return }
    serviceRequests.listForUser(user.id)
      .then(list => setLastRequest(list[0] ?? null))
      .catch(() => { })
  }, [user])

  // Geolocalización para banner de cercanía
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords
      supabase.rpc('technicians_near', { lat, lng, radius_km: 5 })
        .then(({ data }) => setNearbyCount(data?.filter(x => x.is_available).length ?? 0))
        .catch(() => { })
    }, () => { })
  }, [])

  const handleSearch = useCallback((q) => {
    setSearch(q)
    if (!q.trim()) { setSearchResults(null); return }
    setSearching(true)
    technicians.list().then(all => {
      const ql = q.toLowerCase()
      setSearchResults(all.filter(tech =>
        tech.full_name?.toLowerCase().includes(ql) ||
        tech.professional_title?.toLowerCase().includes(ql) ||
        tech.professional_title_en?.toLowerCase().includes(ql) ||
        tech.category_name_es?.toLowerCase().includes(ql) ||
        tech.category_name_en?.toLowerCase().includes(ql) ||
        tech.city?.toLowerCase().includes(ql)
      ))
    }).catch(() => setSearchResults([]))
      .finally(() => setSearching(false))
  }, [])

  const openTech = (tech) => { setSelectedTech(tech); navigate('tech-profile') }
  const firstName = user?.full_name?.split(' ')[0] ?? ''
  const greeting = getGreeting(lang)

  return (
    <div style={{ background: th.bg, minHeight: '100vh' }}>

      {/* HERO — dark navy con headline grande estilo TECNIFIX */}
      <div style={{
        background: `linear-gradient(145deg, #00214D 0%, #00369A 100%)`,
        padding: '28px 20px 32px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Círculos decorativos de fondo */}
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 160, height: 160,
          borderRadius: '50%', background: 'rgba(255,214,0,0.07)', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: -20, left: -20, width: 100, height: 100,
          borderRadius: '50%', background: 'rgba(0,196,125,0.09)', pointerEvents: 'none'
        }} />

        <p style={{
          margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.55)',
          fontFamily: th.fontDisplay, letterSpacing: 1.5, textTransform: 'uppercase'
        }}>
          {greeting}{user ? `, ${firstName}` : ''}
        </p>
        <h1 style={{
          margin: '0 0 6px', fontSize: 26, fontWeight: 700,
          fontFamily: th.fontDisplay, color: '#FFFFFF', lineHeight: 1.2, letterSpacing: -0.5
        }}>
          Encuentra técnicos
        </h1>
        <h1 style={{
          margin: '0 0 18px', fontSize: 26, fontWeight: 700,
          fontFamily: th.fontDisplay, color: th.yellow, lineHeight: 1.2, letterSpacing: -0.5
        }}>
          en todo Panamá
        </h1>

        {/* Barra de búsqueda con icono SVG */}
        <div style={{ position: 'relative' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="rgba(0,33,77,0.5)" strokeWidth="2" strokeLinecap="round"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 1, pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar técnico, servicio, provincia..."
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.97)', border: '2px solid transparent',
              borderRadius: 100, padding: '13px 44px 13px 46px',
              fontSize: 14, outline: 'none', color: '#00214D', fontFamily: th.fontBody,
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              transition: 'border-color 160ms var(--ease-out)'
            }}
            onFocus={e => e.target.style.borderColor = th.yellow}
            onBlur={e => e.target.style.borderColor = 'transparent'}
          />
          {search && (
            <button onClick={() => { setSearch(''); setSearchResults(null) }}
              style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,33,77,0.1)', border: 'none', borderRadius: 50,
                width: 24, height: 24, cursor: 'pointer', color: '#00214D',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
              }}>×</button>
          )}
        </div>
      </div>

      <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 90 }}>
        <div style={{ padding: '0 16px' }}>

          {/* RESULTADOS */}
          {search && (
            <div style={{ paddingTop: 20 }}>
              {searching ? (
                [1, 2].map(i => <SkeletonCard key={i} />)
              ) : searchResults?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: th.textSec }}>

                  <p style={{ fontSize: 15 }}>{t.noResults}</p>
                </div>
              ) : (
                <>
                  <p style={{ fontWeight: 700, fontSize: 14, color: th.textSec, margin: '0 0 14px' }}>
                    {searchResults?.length} {t.searchResults} "{search}"
                  </p>
                  {searchResults?.map(tech =>
                    <TechnicianCard key={tech.user_id} tech={tech} onPress={openTech} />
                  )}
                </>
              )}
            </div>
          )}

          {/* CONTENIDO PRINCIPAL */}
          {!search && (
            <>
              {/* STATS */}
              {stats && (
                <div style={{ display: 'flex', gap: 8, paddingTop: 20, marginBottom: 4 }}>
                  <StatCard val={stats.active}
                    label={lang === 'en' ? 'Active techs' : 'Técnicos activos'}
                    color={th.verified} th={th} />
                  <StatCard val={stats.avgRating}
                    label={lang === 'en' ? 'Avg. rating' : 'Calificación prom.'}
                    color={th.yellow} th={th} />
                  <StatCard val={`~${stats.avgResp}m`}
                    label={lang === 'en' ? 'Avg. response' : 'Respuesta prom.'}
                    color={th.primary} th={th} />
                </div>
              )}

              {/* BANNER: técnicos cercanos */}
              {nearbyCount !== null && nearbyCount > 0 && (
                <div onClick={() => navigate('map')}
                  style={{
                    marginTop: 14, background: '#eff6ff', borderRadius: 14,
                    padding: '12px 14px', border: '1px solid #bfdbfe',
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer'
                  }}>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <span style={{ fontSize: 16 }}>📍</span>
                      <div>
                        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14, color: th.primary }}>
                          {nearbyCount} técnico{nearbyCount !== 1 ? 's' : ''} disponible{nearbyCount !== 1 ? 's' : ''} cerca de ti
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: th.blue }}>
                          Cerca de ti · Toca para ver en el mapa
                        </p>
                      </div>
                    </div>
                    <span style={{ color: th.blue, fontSize: 20, marginLeft: '16px' }}>›</span>
                  </div>
                </div>
              )}

              {/* BANNER: última solicitud */}
              {user && lastRequest && (
                <div onClick={() => { setSelectedRequest(lastRequest); navigate('request-detail') }}
                  style={{
                    marginTop: 10, background: th.surface, borderRadius: 14,
                    padding: '12px 14px', border: `1px solid ${th.border}`,
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer'
                  }}>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: '0 0 2px', fontWeight: 700, fontSize: 13,
                      color: th.text, overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>{lastRequest.title}</p>
                    <p style={{ margin: 0, fontSize: 11, color: th.textSec }}>
                      {lastRequest.technician_name ?? 'Técnico'} ·{' '}
                      {new Date(lastRequest.created_at).toLocaleDateString('es-PA')}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px',
                    borderRadius: 20, flexShrink: 0,
                    background: STATUS_COLORS[lastRequest.status]?.bg ?? th.surface2,
                    color: STATUS_COLORS[lastRequest.status]?.text ?? th.textSec
                  }}>
                    {STATUS_COLORS[lastRequest.status]?.label ?? lastRequest.status}
                  </span>
                </div>
              )}

              {/* CATEGORÍAS */}
              <div style={{ paddingTop: 22 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 4
                }}>
                  <p style={{ fontWeight: 800, fontSize: 17, color: th.text, margin: 0 }}>
                    {t.identifyService}
                  </p>
                  <button onClick={() => navigate('search')}
                    style={{
                      background: 'none', border: 'none', color: th.primary,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                    }}>
                    {lang === 'en' ? 'See all →' : 'Ver todos →'}
                  </button>
                </div>
                <p style={{ fontSize: 12, color: th.textSec, margin: '0 0 12px' }}>{t.tapIcon}</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat.slug}
                      onClick={() => { setSelectedCategory(cat); navigate('search') }}
                      style={{
                        background: th.surface, border: `1.5px solid ${th.border}`,
                        borderRadius: 14, padding: '12px 4px 10px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        transition: 'all 160ms var(--ease-out)', fontFamily: 'inherit'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)'
                        e.currentTarget.style.borderColor = th.primary
                        e.currentTarget.style.background = th.primaryLight
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'none'
                        e.currentTarget.style.borderColor = th.border
                        e.currentTarget.style.background = th.surface
                      }}
                    >
                      <span style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: th.primaryLight, display: 'flex', alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                          stroke={th.primary} strokeWidth="1.8">
                          {CAT_ICONS_SVG[cat.slug]}
                        </svg>
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, fontFamily: th.fontDisplay,
                        color: th.text, textAlign: 'center', lineHeight: 1.2
                      }}>
                        {lang === 'en' ? cat.nameEn : cat.nameEs}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* TÉCNICOS DESTACADOS */}
              <div style={{ paddingTop: 24, paddingBottom: 10 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 4
                }}>
                  <p style={{ fontWeight: 800, fontSize: 17, color: th.text, margin: 0 }}>
                    {t.featuredTechs}
                  </p>
                  <button onClick={() => navigate('search')}
                    style={{
                      background: 'none', border: 'none', color: th.primary,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                    }}>
                    {lang === 'en' ? 'See all →' : 'Ver todos →'}
                  </button>
                </div>
                <p style={{ fontSize: 12, color: th.textSec, margin: '0 0 16px' }}>{t.bestRated}</p>

                {loadingFeatured
                  ? [1, 2].map(i => <SkeletonCard key={i} />)
                  : featured.length === 0
                    ? (
                      <div style={{
                        background: th.surface, borderRadius: 14,
                        padding: '20px 16px', textAlign: 'center',
                        border: `1px dashed ${th.border}`
                      }}>

                        <p style={{ fontSize: 14, color: th.textSec, margin: 0 }}>
                          {lang === 'en'
                            ? 'No featured technicians yet.'
                            : 'Aún no hay técnicos destacados. El admin puede marcarlos desde el panel.'}
                        </p>
                      </div>
                    )
                    : featured.map(tech =>
                      <TechnicianCard key={tech.user_id} tech={tech} onPress={openTech} />
                    )
                }
              </div>

              {/* BANNER: registrarse como técnico */}
              {(!user || user.role === 'user') && (
                <div style={{
                  background: th.primaryLight,
                  borderRadius: 16, padding: 16, border: `1.5px solid ${th.primary}33`,
                  marginBottom: 20, display: 'flex', gap: 14, alignItems: 'center'
                }}>

                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 15, color: th.text }}>
                      {lang === 'en' ? 'Are you a technician?' : '¿Eres técnico?'}
                    </p>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: th.textSec, lineHeight: 1.5 }}>
                      {lang === 'en'
                        ? 'Create your profile and start receiving clients.'
                        : 'Crea tu perfil y empieza a recibir clientes en Panamá.'}
                    </p>
                    <button onClick={() => navigate(user ? 'edit-tech-profile' : 'register')}
                      style={{
                        background: th.primary, color: '#fff', border: 'none',
                        borderRadius: 10, padding: '8px 16px', fontSize: 13,
                        fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                      }}>
                      {lang === 'en' ? 'Register as technician →' : 'Registrarme como técnico →'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}