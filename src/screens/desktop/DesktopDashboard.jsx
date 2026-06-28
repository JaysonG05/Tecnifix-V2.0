// ============================================================
//  DesktopDashboard.jsx
//  Pantalla principal del dashboard de escritorio TECNIFIX.
//  Bento grid con stats, técnicos destacados, solicitudes
//  recientes y feed de actividad.
// ============================================================
import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { supabase, technicians, serviceRequests } from '../../lib/supabase.js'
import { T } from '../../i18n/translations.js'

// ── Utilidades ────────────────────────────────────────────────
function getGreeting(lang) {
  const h = new Date().getHours()
  if (lang === 'en') return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-PA', { day: '2-digit', month: 'short' })
}

const STATUS_META = {
  pending:         { label: 'Enviada',    cls: 'd-badge--blue',   dot: '#0053A0' },
  accepted:        { label: 'Aceptada',   cls: 'd-badge--green',  dot: '#00C47D' },
  in_progress:     { label: 'En progreso',cls: 'd-badge--yellow', dot: '#FFD600' },
  pending_payment: { label: 'Pend. pago', cls: 'd-badge--yellow', dot: '#f59e0b' },
  completed:       { label: 'Completada', cls: 'd-badge--green',  dot: '#00C47D' },
  cancelled:       { label: 'Cancelada',  cls: 'd-badge--red',    dot: '#E5282D' },
  disputed:        { label: 'En disputa', cls: 'd-badge--red',    dot: '#f97316' },
}

// ── Skeleton de carga ────────────────────────────────────────
function DashboardSkeleton() {
  const p = { animation: 'd-pulse 1.4s ease-in-out infinite', background: '#D1E0ED', borderRadius: 12 }
  return (
    <div>
      {/* Welcome banner skeleton */}
      <div style={{ ...p, height: 100, marginBottom: 24, borderRadius: 20 }} />
      {/* Stats */}
      <div className="d-skeleton-stats">
        {[1,2,3,4].map(i => <div key={i} className="d-skeleton-stat d-skeleton-pulse" />)}
      </div>
      {/* Grid */}
      <div className="d-skeleton-grid">
        <div className="d-skeleton-main d-skeleton-pulse" />
        <div className="d-skeleton-side d-skeleton-pulse" />
      </div>
    </div>
  )
}

// ── Stat Card ────────────────────────────────────────────────
function StatCard({ icon, iconBg, iconColor, value, label, trend, trendDir = 'up', accent }) {
  return (
    <div className="d-stat-card" style={{ '--card-accent': accent }}>
      <div className="d-stat-card__icon" style={{ background: iconBg }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div className="d-stat-card__value">{value}</div>
      <div className="d-stat-card__label">{label}</div>
      {trend && (
        <span className={`d-stat-card__trend ${trendDir}`}>
          {trendDir === 'up' ? '↑' : trendDir === 'down' ? '↓' : '•'} {trend}
        </span>
      )}
    </div>
  )
}

// ── Avatar inline ────────────────────────────────────────────
function MiniAvatar({ photo, name, size = 42, online }) {
  const [err, setErr] = useState(false)
  const initial = (name || '?').charAt(0).toUpperCase()
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {photo && !err ? (
        <img src={photo} alt={name} onError={() => setErr(true)}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover',
            border: '2px solid #D1E0ED' }} />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: '#DDEEFF', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: Math.floor(size * 0.38),
          fontWeight: 700, color: '#0053A0', border: '2px solid #D1E0ED'
        }}>
          {initial}
        </div>
      )}
      {online !== undefined && (
        <div style={{
          position: 'absolute', bottom: 1, right: 1,
          width: Math.max(size * 0.22, 8), height: Math.max(size * 0.22, 8),
          background: online ? '#00C47D' : '#9CA3AF',
          borderRadius: '50%', border: '2px solid #fff'
        }} />
      )}
    </div>
  )
}

// ── Tabla de solicitudes ────────────────────────────────────
function RequestsTable({ requests, navigate, setSelectedRequest, lang }) {
  const cols = [
    { key: 'title', label: lang === 'en' ? 'Service' : 'Servicio' },
    { key: 'tech', label: lang === 'en' ? 'Technician' : 'Técnico' },
    { key: 'date', label: lang === 'en' ? 'Date' : 'Fecha' },
    { key: 'price', label: lang === 'en' ? 'Amount' : 'Monto' },
    { key: 'status', label: lang === 'en' ? 'Status' : 'Estado' },
  ]

  if (!requests.length) return (
    <div className="d-empty">
      <div className="d-empty__icon">📋</div>
      <div className="d-empty__title">
        {lang === 'en' ? 'No requests yet' : 'Sin solicitudes aún'}
      </div>
      <div className="d-empty__sub">
        {lang === 'en' ? 'Your service requests will appear here.' : 'Tus solicitudes de servicio aparecerán aquí.'}
      </div>
    </div>
  )

  return (
    <table className="d-table">
      <thead>
        <tr>
          {cols.map(c => <th key={c.key}>{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {requests.slice(0, 8).map(r => {
          const meta = STATUS_META[r.status] ?? { label: r.status, cls: 'd-badge--gray', dot: '#9CA3AF' }
          return (
            <tr key={r.id} onClick={() => { setSelectedRequest(r); navigate('request-detail') }}>
              <td>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#00214D', maxWidth: 220,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.title}
                </div>
                {r.description && (
                  <div style={{ fontSize: 11, color: '#4A6A8A', marginTop: 2, maxWidth: 220,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.description}
                  </div>
                )}
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MiniAvatar photo={r.technician_avatar} name={r.technician_name} size={28} />
                  <span style={{ fontSize: 12.5, color: '#00214D', fontWeight: 500 }}>
                    {r.technician_name}
                  </span>
                </div>
              </td>
              <td style={{ fontSize: 12.5, color: '#4A6A8A', whiteSpace: 'nowrap' }}>
                {fmtDate(r.created_at)}
              </td>
              <td>
                {r.agreed_price ? (
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
                    fontSize: 13, color: '#0053A0' }}>
                    ${Number(r.agreed_price).toFixed(2)}
                  </span>
                ) : <span style={{ color: '#8FAFC5', fontSize: 12 }}>—</span>}
              </td>
              <td>
                <span className={`d-badge ${meta.cls}`}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%',
                    background: meta.dot, flexShrink: 0, display: 'inline-block' }} />
                  {meta.label}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Panel lateral derecho ────────────────────────────────────
function RightPanel({ stats, featured, navigate, setSelectedTech, lang }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Mini stats rápidas */}
      <div className="d-card">
        <div className="d-card__header">
          <div>
            <div className="d-card__title">
              {lang === 'en' ? 'Quick Overview' : 'Resumen rápido'}
            </div>
          </div>
        </div>
        <div>
          {[
            { label: lang === 'en' ? 'Active techs' : 'Técnicos activos', value: stats.activeTechs, dot: '#00C47D' },
            { label: lang === 'en' ? 'Avg. rating' : 'Calificación prom.', value: `⭐ ${stats.avgRating}`, dot: '#FFD600' },
            { label: lang === 'en' ? 'Avg. response' : 'Resp. promedio', value: `~${stats.avgResp}m`, dot: '#0053A0' },
            { label: lang === 'en' ? 'Total techs' : 'Total técnicos', value: stats.totalTechs, dot: '#8FAFC5' },
          ].map((s, i) => (
            <div key={i} className="d-mini-stat">
              <div className="d-mini-stat__dot" style={{ background: s.dot }} />
              <span className="d-mini-stat__label">{s.label}</span>
              <span className="d-mini-stat__value">{s.value ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Técnicos disponibles */}
      <div className="d-card">
        <div className="d-card__header">
          <div>
            <div className="d-card__title">
              {lang === 'en' ? 'Top Technicians' : 'Técnicos destacados'}
            </div>
            <div className="d-card__subtitle">
              {lang === 'en' ? 'Highest rated' : 'Mejor calificados'}
            </div>
          </div>
          <button className="d-card__action" onClick={() => navigate('search')}>
            {lang === 'en' ? 'See all' : 'Ver todos'} →
          </button>
        </div>
        <div>
          {featured.slice(0, 5).map(tech => (
            <div key={tech.user_id} className="d-tech-row"
              onClick={() => { setSelectedTech(tech); navigate('tech-profile') }}>
              <div className="d-tech-row__avatar">
                <MiniAvatar photo={tech.avatar_url} name={tech.full_name} size={42} online={tech.is_available} />
              </div>
              <div className="d-tech-row__info">
                <div className="d-tech-row__name">{tech.full_name}</div>
                <div className="d-tech-row__title">{tech.professional_title}</div>
              </div>
              <div className="d-tech-row__meta">
                <span className="d-tech-row__price">${tech.min_price}</span>
                <div className="d-tech-row__rating">
                  ⭐ {Number(tech.average_rating).toFixed(1)}
                  <span style={{ color: '#8FAFC5' }}>({tech.total_reviews})</span>
                </div>
              </div>
            </div>
          ))}
          {!featured.length && (
            <div className="d-empty" style={{ padding: '24px 16px' }}>
              <div className="d-empty__icon">🛠</div>
              <div className="d-empty__sub">
                {lang === 'en' ? 'No featured technicians yet.' : 'Sin técnicos destacados aún.'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA para técnicos */}
      <div style={{
        background: 'linear-gradient(135deg, #00214D 0%, #0053A0 100%)',
        borderRadius: 16, padding: '18px 20px',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6,
          fontFamily: "'Space Grotesk',sans-serif" }}>
          {lang === 'en' ? 'Are you a technician?' : '¿Eres técnico?'}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 14, lineHeight: 1.5 }}>
          {lang === 'en'
            ? 'Create your profile and receive clients across Panama.'
            : 'Crea tu perfil y recibe clientes en todo Panamá.'}
        </div>
        <button className="d-btn d-btn--yellow" style={{ maxWidth: '100%', width: '100%', fontSize: 12, padding: '8px 14px' }}
          onClick={() => navigate('register')}>
          {lang === 'en' ? 'Register as technician →' : 'Registrarme →'}
        </button>
      </div>
    </div>
  )
}

// ── DASHBOARD PRINCIPAL ──────────────────────────────────────
export function DesktopDashboard() {
  const { user, lang, navigate, setSelectedTech, setSelectedRequest } = useApp()
  const t = T[lang]

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ activeTechs: 0, avgRating: '—', avgResp: 0, totalTechs: 0 })
  const [featured, setFeatured] = useState([])
  const [requests, setRequests] = useState([])
  const [counters, setCounters] = useState({ total: 0, active: 0, completed: 0, revenue: 0 })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        // Técnicos destacados + stats
        const [techData, featuredData] = await Promise.all([
          supabase.from('technicians_full')
            .select('average_rating, is_available, response_time_minutes')
            .then(r => r.data ?? []),
          supabase.from('technicians_full').select('*')
            .eq('is_featured', true)
            .order('average_rating', { ascending: false })
            .limit(6)
            .then(r => r.data ?? []),
        ])

        if (!cancelled) {
          const active = techData.filter(x => x.is_available).length
          const avgR = techData.length
            ? (techData.reduce((s, x) => s + Number(x.average_rating), 0) / techData.length).toFixed(1)
            : '—'
          const avgResp = techData.length
            ? Math.round(techData.reduce((s, x) => s + (x.response_time_minutes || 60), 0) / techData.length)
            : 0
          setStats({ activeTechs: active, avgRating: avgR, avgResp, totalTechs: techData.length })
          setFeatured(featuredData)
        }

        // Solicitudes del usuario
        if (user) {
          const reqs = await serviceRequests.listForUser(user.id)
          if (!cancelled) {
            setRequests(reqs)
            const active = reqs.filter(r => !['completed', 'cancelled'].includes(r.status)).length
            const completed = reqs.filter(r => r.status === 'completed').length
            const revenue = reqs.filter(r => r.payment_status === 'paid')
              .reduce((s, r) => s + Number(r.agreed_price ?? 0), 0)
            setCounters({ total: reqs.length, active, completed, revenue })
          }
        }
      } catch (err) {
        console.warn('[DesktopDashboard] load error:', err?.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  const firstName = user?.full_name?.split(' ')[0] ?? ''
  const greeting = getGreeting(lang)

  if (loading) return <DashboardSkeleton />

  return (
    <div>
      {/* ── Welcome Banner ── */}
      <div className="d-welcome">
        <div>
          <div className="d-welcome__greeting">
            {greeting}{user ? `, ${firstName}` : ''}
          </div>
          <div className="d-welcome__title">
            {lang === 'en' ? 'Find reliable technicians' : 'Encuentra técnicos confiables'}
          </div>
          <div className="d-welcome__sub">
            {lang === 'en'
              ? `${stats.activeTechs} technicians available across Panama`
              : `${stats.activeTechs} técnicos disponibles en todo Panamá`}
          </div>
        </div>
        <div className="d-welcome__cta">
          <button className="d-btn d-btn--yellow" onClick={() => navigate('search')}>
            🔍 {lang === 'en' ? 'Find Technician' : 'Buscar técnico'}
          </button>
          <button className="d-btn d-btn--ghost"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff',
              borderColor: 'rgba(255,255,255,0.2)' }}
            onClick={() => navigate('map')}>
            🗺 {lang === 'en' ? 'View Map' : 'Ver mapa'}
          </button>
        </div>
      </div>

      {/* ── Stat Cards (Bento Grid) ── */}
      <div className="d-stats-grid">
        <StatCard
          icon="🛠"
          iconBg="#DDEEFF"
          value={stats.totalTechs}
          label={lang === 'en' ? 'Registered technicians' : 'Técnicos registrados'}
          trend={lang === 'en' ? 'In Panama' : 'En Panamá'}
          trendDir="neutral"
          accent="#0053A0"
        />
        <StatCard
          icon="⚡"
          iconBg="#d1fae5"
          value={stats.activeTechs}
          label={lang === 'en' ? 'Available now' : 'Disponibles ahora'}
          trend={lang === 'en' ? 'Ready to work' : 'Listos para trabajar'}
          trendDir="up"
          accent="#00C47D"
        />
        {user ? (
          <>
            <StatCard
              icon="📋"
              iconBg="#ede9fe"
              value={counters.active}
              label={lang === 'en' ? 'Active requests' : 'Solicitudes activas'}
              trend={`${counters.total} ${lang === 'en' ? 'total' : 'total'}`}
              trendDir="neutral"
              accent="#7c3aed"
            />
            <StatCard
              icon="💰"
              iconBg="#fef9c3"
              value={`$${counters.revenue.toFixed(2)}`}
              label={lang === 'en' ? 'Paid services' : 'Servicios pagados'}
              trend={`${counters.completed} ${lang === 'en' ? 'completed' : 'completados'}`}
              trendDir="up"
              accent="#FFD600"
            />
          </>
        ) : (
          <>
            <StatCard
              icon="⭐"
              iconBg="#fef9c3"
              value={stats.avgRating}
              label={lang === 'en' ? 'Average rating' : 'Calificación promedio'}
              trend={lang === 'en' ? 'Across all techs' : 'Todos los técnicos'}
              trendDir="up"
              accent="#FFD600"
            />
            <StatCard
              icon="⏱"
              iconBg="#fce7f3"
              value={`~${stats.avgResp}m`}
              label={lang === 'en' ? 'Avg. response time' : 'Tiempo de respuesta prom.'}
              trend={lang === 'en' ? 'Typically fast' : 'Generalmente rápido'}
              trendDir="neutral"
              accent="#db2777"
            />
          </>
        )}
      </div>

      {/* ── Main Grid ── */}
      <div className="d-content-grid">

        {/* Columna izquierda — solicitudes o técnicos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {user ? (
            /* Tabla de solicitudes del usuario */
            <div className="d-card">
              <div className="d-card__header">
                <div>
                  <div className="d-card__title">
                    {user.role === 'technician'
                      ? (lang === 'en' ? 'Received Requests' : 'Solicitudes recibidas')
                      : (lang === 'en' ? 'My Service Requests' : 'Mis solicitudes de servicio')}
                  </div>
                  <div className="d-card__subtitle">
                    {counters.active} {lang === 'en' ? 'active' : 'activas'} · {counters.completed} {lang === 'en' ? 'completed' : 'completadas'}
                  </div>
                </div>
                <button className="d-card__action" onClick={() => navigate('profile')}>
                  {lang === 'en' ? 'View all →' : 'Ver todas →'}
                </button>
              </div>
              <RequestsTable
                requests={requests}
                navigate={navigate}
                setSelectedRequest={setSelectedRequest}
                lang={lang}
              />
            </div>
          ) : (
            /* Sin sesión: grid de técnicos destacados */
            <div className="d-card">
              <div className="d-card__header">
                <div>
                  <div className="d-card__title">{t.featuredTechs}</div>
                  <div className="d-card__subtitle">{t.bestRated}</div>
                </div>
                <button className="d-card__action" onClick={() => navigate('search')}>
                  {lang === 'en' ? 'See all →' : 'Ver todos →'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {featured.slice(0, 6).map(tech => (
                  <div key={tech.user_id} className="d-tech-row"
                    onClick={() => { setSelectedTech(tech); navigate('tech-profile') }}>
                    <MiniAvatar photo={tech.avatar_url} name={tech.full_name} size={42} online={tech.is_available} />
                    <div className="d-tech-row__info">
                      <div className="d-tech-row__name">{tech.full_name}</div>
                      <div className="d-tech-row__title">{tech.professional_title}</div>
                      <div className="d-tech-row__rating">
                        ⭐ {Number(tech.average_rating).toFixed(1)} · Desde ${tech.min_price}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categorías rápidas */}
          <div className="d-card">
            <div className="d-card__header">
              <div className="d-card__title">
                {lang === 'en' ? 'Browse by Service' : 'Explorar por servicio'}
              </div>
            </div>
            <div className="d-card__body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { slug: 'electricidad', icon: '⚡', es: 'Electricidad', en: 'Electrical' },
                  { slug: 'plomeria', icon: '🔧', es: 'Plomería', en: 'Plumbing' },
                  { slug: 'climatizacion', icon: '❄️', es: 'Climatización', en: 'A/C' },
                  { slug: 'albanileria', icon: '🧱', es: 'Albañilería', en: 'Masonry' },
                  { slug: 'limpieza', icon: '🧹', es: 'Limpieza', en: 'Cleaning' },
                  { slug: 'cerrajeria', icon: '🔐', es: 'Cerrajería', en: 'Locksmith' },
                  { slug: 'pintura', icon: '🎨', es: 'Pintura', en: 'Painting' },
                  { slug: 'tecnologia', icon: '💻', es: 'Técnico PC', en: 'IT Support' },
                ].map(cat => (
                  <button key={cat.slug}
                    onClick={() => navigate('search')}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 8, padding: '14px 10px', borderRadius: 12, cursor: 'pointer',
                      border: '1.5px solid #D1E0ED', background: '#F0F5FA',
                      transition: 'all 150ms cubic-bezier(0.23,1,0.32,1)',
                      fontFamily: "'Inter',sans-serif"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#DDEEFF'
                      e.currentTarget.style.borderColor = '#0053A0'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#F0F5FA'
                      e.currentTarget.style.borderColor = '#D1E0ED'
                      e.currentTarget.style.transform = 'none'
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{cat.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#00214D', textAlign: 'center', lineHeight: 1.3 }}>
                      {lang === 'en' ? cat.en : cat.es}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <RightPanel
          stats={stats}
          featured={featured}
          navigate={navigate}
          setSelectedTech={setSelectedTech}
          lang={lang}
        />
      </div>
    </div>
  )
}