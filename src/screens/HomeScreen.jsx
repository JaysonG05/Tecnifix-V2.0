import { useState, useCallback, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { TechnicianCard } from '../components/TechnicianCard.jsx'
import { SkeletonCard } from '../components/UI.jsx'
import { supabase, technicians, serviceRequests } from '../lib/supabase.js'
import { T } from '../i18n/translations.js'

const CATEGORIES = [
  { slug: 'climatizacion', nameEs: 'Climatización', nameEn: 'A/C', icon: '❄️', color: '#dbeafe' },
  { slug: 'electricidad', nameEs: 'Electricidad', nameEn: 'Electrical', icon: '⚡', color: '#fef9c3' },
  { slug: 'plomeria', nameEs: 'Plomería', nameEn: 'Plumbing', icon: '🔧', color: '#e0f2fe' },
  { slug: 'albanileria', nameEs: 'Albañilería', nameEn: 'Masonry', icon: '🧱', color: '#fef3c7' },
  { slug: 'limpieza', nameEs: 'Limpieza', nameEn: 'Cleaning', icon: '🧹', color: '#d1fae5' },
  { slug: 'cerrajeria', nameEs: 'Cerrajería', nameEn: 'Locksmith', icon: '🔐', color: '#ede9fe' },
  { slug: 'pintura', nameEs: 'Pintura', nameEn: 'Painting', icon: '🎨', color: '#fce7f3' },
  { slug: 'tecnologia', nameEs: 'Técnico PC', nameEn: 'PC Tech', icon: '💻', color: '#e0f2fe' },
]

const STATUS_COLORS = {
  pending: { bg: '#fef3c7', text: '#92400e', label: 'Enviada' },
  accepted: { bg: '#dbeafe', text: '#1e40af', label: 'Aceptada' },
  in_progress: { bg: '#ede9fe', text: '#5b21b6', label: 'En progreso' },
  pending_payment: { bg: '#fce7f3', text: '#9d174d', label: 'Pend. pago' },
  completed: { bg: '#dcfce7', text: '#166534', label: 'Completada' },
  cancelled: { bg: '#fee2e2', text: '#991b1b', label: 'Cancelada' },
  disputed: { bg: '#fff7ed', text: '#9a3412', label: 'En disputa' },
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
      <p style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 800, color: color || th.text }}>{val}</p>
      <p style={{ margin: 0, fontSize: 10, color: th.textSec, lineHeight: 1.3 }}>{label}</p>
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

      {/* HERO */}
      <div style={{
        background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
        padding: '20px 20px 40px', color: '#fff'
      }}>
        <p style={{ margin: '0 0 2px', fontSize: 13, opacity: 0.9 }}>
          {greeting}{user ? `, ${firstName}` : ''}! 👋
        </p>
        <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 900 }}>
          {t.whatNeedToday}
        </h2>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%',
            transform: 'translateY(-50%)', fontSize: 18, zIndex: 1
          }}>🔍</span>
          <input value={search} onChange={e => handleSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.97)', border: 'none',
              borderRadius: 14, padding: '13px 40px 13px 44px',
              fontSize: 15, outline: 'none', color: '#0f172a', fontFamily: 'inherit'
            }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setSearchResults(null) }}
              style={{
                position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b'
              }}>×</button>
          )}
        </div>
      </div>

      <div style={{
        background: th.bg, borderRadius: '20px 20px 0 0',
        marginTop: -16, minHeight: '100vh', paddingBottom: 90
      }}>
        <div style={{ padding: '0 16px' }}>

          {/* RESULTADOS */}
          {search && (
            <div style={{ paddingTop: 20 }}>
              {searching ? (
                [1, 2].map(i => <SkeletonCard key={i} />)
              ) : searchResults?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: th.textSec }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
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
                    label={lang === 'en' ? 'active techs' : 'técnicos activos'}
                    color={th.primary} th={th} />
                  <StatCard val={stats.avgRating}
                    label={lang === 'en' ? 'avg. rating' : 'calificación prom.'}
                    color="#f59e0b" th={th} />
                  <StatCard val={`~${stats.avgResp}m`}
                    label={lang === 'en' ? 'avg. response' : 'respuesta prom.'}
                    color={th.blue} th={th} />
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
                  <span style={{ fontSize: 28, flexShrink: 0 }}>📍</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14, color: '#1e40af' }}>
                      {nearbyCount} técnico{nearbyCount !== 1 ? 's' : ''} disponible{nearbyCount !== 1 ? 's' : ''} cerca de ti
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: '#3b82f6' }}>
                      A menos de 5 km · Toca para ver en el mapa
                    </p>
                  </div>
                  <span style={{ color: '#3b82f6', fontSize: 20 }}>›</span>
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
                  <span style={{ fontSize: 26, flexShrink: 0 }}>📋</span>
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
                    background: STATUS_COLORS[lastRequest.status]?.bg ?? '#f1f5f9',
                    color: STATUS_COLORS[lastRequest.status]?.text ?? '#64748b'
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
                        background: cat.color, border: `1.5px solid ${th.border}`,
                        borderRadius: 14, padding: '12px 4px 10px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 5, transition: 'transform 0.15s', fontFamily: 'inherit'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span style={{ fontSize: 26 }}>{cat.icon}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: '#0f172a',
                        textAlign: 'center', lineHeight: 1.2
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
                        <p style={{ fontSize: 32, margin: '0 0 8px' }}>🛠️</p>
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
                  background: `linear-gradient(135deg, #16a34a22, #22c55e11)`,
                  borderRadius: 16, padding: 16, border: `1px solid #22c55e44`,
                  marginBottom: 20, display: 'flex', gap: 14, alignItems: 'center'
                }}>
                  <span style={{ fontSize: 36, flexShrink: 0 }}>🛠️</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 15, color: th.text }}>
                      {lang === 'en' ? 'Are you a technician?' : '¿Eres técnico?'}
                    </p>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: th.textSec, lineHeight: 1.5 }}>
                      {lang === 'en'
                        ? 'Create your profile and start receiving clients.'
                        : 'Crea tu perfil y empieza a recibir clientes en Changuinola.'}
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