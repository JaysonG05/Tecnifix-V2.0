import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { TechnicianCard } from '../../components/TechnicianCard.jsx'
import {
  Avatar, StarRating, Badge, Btn, Input, Toggle, SkeletonCard,
  EmptyState, Modal, Toast, PageHeader, SettingsRow, StatusBadge, Spinner
} from '../../components/UI.jsx'
import {
  supabase, auth, profiles, technicians, techCategories, certificatesApi, serviceCatalog, favorites as favApi,
  serviceRequests, archiveApi, receiptsApi, admin, notifications
} from '../../lib/supabase.js'
import { T } from '../../i18n/translations.js'
import { receiptActions, disputeActions } from '../../lib/payments.js'

const TECH_PANEL_BLUE = '#1950bb'
const TECH_PANEL_YELLOW = '#ffd23f'

export function ProfileScreen() {
  const { th, user, setUser, navigate, lang, unreadCount, setSelectedRequest, setSelectedTech } = useApp()
  const t = T[lang]
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [techLoading, setTechLoading] = useState(false)
  const [myTech, setMyTech] = useState(null)
  const [openingPublicProfile, setOpeningPublicProfile] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    serviceRequests.listForUser(user.id)
      .then(setRequests).catch(() => { }).finally(() => setLoading(false))
    if (user.role === 'technician') {
      setTechLoading(true)
      technicians.getOne(user.id)
        .then(setMyTech)
        .catch(() => setMyTech(null))
        .finally(() => setTechLoading(false))
    } else {
      setTechLoading(false)
    }
  }, [user])

  if (!user) return (
    <div style={{ background: th.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>👤</div>
      <p style={{ fontSize: 20, fontWeight: 800, color: th.text, margin: '0 0 8px' }}>{t.login}</p>
      <p style={{ fontSize: 14, color: th.textSec, margin: '0 0 28px', textAlign: 'center' }}>{t.loginRequired}</p>
      <Btn onClick={() => navigate('login')}>{t.login}</Btn>
      <div style={{ height: 12 }} />
      <Btn variant="outline" onClick={() => navigate('register')}>{t.register}</Btn>
    </div>
  )

  const handleLogout = async () => {
    await auth.signOut()
    setUser(null)
    navigate('home')
  }

  const roleLabel = user.role === 'admin' ? t.admin : user.role === 'technician' ? t.techRole : t.clientRole
  const roleIcon = user.role === 'admin' ? '🔧' : user.role === 'technician' ? '🛠️' : '👤'
  const techStatus = myTech?.verification_status
  const techProgress = Math.max(0, Math.min(100, Number(myTech?.verification_progress || 0)))
  const needsVerification = user.role === 'technician' && techStatus !== 'verified'
  const techStatusLabel = techStatus === 'verified'
    ? 'Admitido y visible en el sitio'
    : techStatus === 'under_review'
      ? 'En revisión por el dueño'
      : techStatus === 'pending_review'
        ? 'Enviado para aprobación'
        : techStatus === 'needs_correction'
          ? 'Necesita correcciones'
    : techStatus === 'rejected'
      ? 'Postulación rechazada'
      : myTech
        ? 'Pendiente de aprobación'
        : 'Completa tu postulación'

  const openPublicProfile = async () => {
    setOpeningPublicProfile(true)
    try {
      const tech = myTech || await technicians.getOne(user.id)
      setSelectedTech({
        ...tech,
        full_name: tech.full_name || user.full_name,
        avatar_url: tech.avatar_url || user.avatar_url,
      })
      navigate('tech-profile')
    } catch {
      navigate('verification-center')
    } finally {
      setOpeningPublicProfile(false)
    }
  }

  if (user.role === 'technician' && techLoading) {
    return (
      <div style={{ minHeight: 'calc(100dvh - 82px)', display: 'grid', placeItems: 'center', background: '#f4f6fb' }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 28, boxShadow: '0 20px 50px rgba(0,0,0,.18)' }}>
          <Spinner />
        </div>
      </div>
    )
  }

  if (user.role === 'technician' && techStatus === 'verified') {
    return (
      <VerifiedTechnicianPanel
        user={user}
        th={th}
        t={t}
        myTech={myTech}
        requests={requests}
        unreadCount={unreadCount}
        openingPublicProfile={openingPublicProfile}
        navigate={navigate}
        setSelectedRequest={setSelectedRequest}
        openPublicProfile={openPublicProfile}
        handleLogout={handleLogout}
      />
    )
  }

  if (user.role === 'technician') {
    return (
      <TechnicianPendingPanel
        user={user}
        th={th}
        myTech={myTech}
        techStatusLabel={techStatusLabel}
        navigate={navigate}
        handleLogout={handleLogout}
      />
    )
  }

  return (
    <div style={{ background: th.bg, minHeight: '100dvh', paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', padding: '28px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar photo={user.avatar_url} name={user.full_name} size={72} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 3px', fontWeight: 800, fontSize: 18, color: '#fff' }}>{user.full_name}</p>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{user.email}</p>
            <Badge color="rgba(255,255,255,0.25)" textColor="#fff">{roleIcon} {roleLabel}</Badge>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('notifications')} style={{ position: 'relative', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 20, width: 38, height: 38, fontSize: 20, cursor: 'pointer' }}>
              🔔
              {unreadCount > 0 && <div style={{ position: 'absolute', top: 4, right: 4, width: 14, height: 14, background: '#ef4444', borderRadius: 7, fontSize: 9, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{unreadCount > 9 ? '9+' : unreadCount}</div>}
            </button>
            <button onClick={() => navigate('settings')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 20, width: 38, height: 38, fontSize: 20, cursor: 'pointer' }}>⚙️</button>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {needsVerification && (
          <div style={{
            background: 'linear-gradient(135deg,#0f2a47 0%,#1d4ed8 62%,#2563eb 100%)',
            border: '1px solid rgba(248,219,19,.38)',
            borderRadius: 22,
            padding: 18,
            marginBottom: 14,
            boxShadow: '0 18px 42px rgba(37,99,235,.22)',
            color: '#fff',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', right: -26, top: -34, width: 124, height: 124, borderRadius: '50%', background: 'rgba(248,219,19,.18)' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 50,
                height: 50,
                borderRadius: 16,
                background: '#f8db13',
                color: '#10233e',
                display: 'grid',
                placeItems: 'center',
                fontSize: 24,
                boxShadow: '0 12px 24px rgba(0,0,0,.14)',
                flexShrink: 0,
              }}>
                🛡️
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 950 }}>
                  Completa tu verificación
                </p>
                <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,.84)', fontWeight: 700 }}>
                  El dueño revisa tus datos y documentos antes de que aparezcas como técnico verificado.
                </p>
                <div style={{ height: 9, borderRadius: 999, background: 'rgba(255,255,255,.22)', overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ width: `${techProgress}%`, height: '100%', borderRadius: 999, background: '#f8db13' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#f8db13' }}>{techStatusLabel} · {techProgress}%</span>
                  <button onClick={() => navigate('verification-center')} style={{
                    border: 0,
                    borderRadius: 12,
                    background: '#f8db13',
                    color: '#10233e',
                    padding: '11px 14px',
                    fontWeight: 950,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}>
                    Ir a verificación
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {user.role === 'technician' && (
          <div style={{
            background: th.surface,
            border: `1px solid ${th.border}`,
            borderRadius: 18,
            padding: 16,
            marginBottom: 14,
            boxShadow: th.shadow,
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 16,
                background: '#dbeafe', color: '#1e40af',
                display: 'grid', placeItems: 'center', fontSize: 22,
              }}>
                👁️
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 3px', color: th.text, fontSize: 15, fontWeight: 900 }}>
                  Perfil público del vendedor
                </p>
                <p style={{
                  margin: 0,
                  color: techStatus === 'verified' ? '#1e40af' : techStatus === 'rejected' ? '#991b1b' : '#92400e',
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  {techStatusLabel}
                </p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={openPublicProfile} disabled={openingPublicProfile} style={{
                padding: '11px 10px',
                borderRadius: 12,
                border: '1px solid #bfdbfe',
                background: '#2563eb',
                color: '#fff',
                fontSize: 13,
                fontWeight: 800,
                cursor: openingPublicProfile ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}>
                {openingPublicProfile ? 'Abriendo...' : 'Ver mi perfil público'}
              </button>
              <button onClick={() => navigate('verification-center')} style={{
                padding: '11px 10px',
                borderRadius: 12,
                border: `1px solid ${th.border}`,
                background: th.surface2,
                color: th.text,
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
                Centro de verificación
              </button>
            </div>
          </div>
        )}

        {/* Acciones rápidas */}
        <div style={{ background: th.surface, borderRadius: 16, border: `1px solid ${th.border}`, marginBottom: 14, overflow: 'hidden' }}>
          {[
            { icon: '✏️', label: t.editProfile, screen: 'edit-profile' },
            { icon: '🧾', label: 'Mis recibos', screen: 'my-receipts' },
            ...(user.role === 'technician' ? [
              { icon: '🛡️', label: 'Centro de Verificación', screen: 'verification-center' },
              { icon: '👁️', label: 'Ver mi perfil público', onClick: openPublicProfile },
              { icon: '📈', label: 'Insights IA de mi perfil', screen: 'tech-insights' },
              { icon: '🛠️', label: t.editProfProfile, screen: 'edit-tech-profile' },
              { icon: '💰', label: 'Catálogo de servicios', screen: 'service-catalog' },
              { icon: '📜', label: 'Mis certificados y títulos', screen: 'certificates' },
            ] : []),
            ...(user.role === 'admin' ? [{ icon: '🔧', label: t.adminPanel, screen: 'admin' }] : []),
          ].map(item => (
            <button key={item.screen || item.label} onClick={() => item.onClick ? item.onClick() : navigate(item.screen)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'none', border: 'none', borderBottom: `1px solid ${th.border}`, cursor: 'pointer', fontSize: 14, color: th.text, fontFamily: 'inherit' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>{item.label}
              </span>
              <span style={{ color: th.textSec }}>›</span>
            </button>
          ))}
        </div>

        {/* Solicitudes — 3 tabs */}
        <RequestsTabs user={user} th={th} t={t} navigate={navigate} setSelectedRequest={setSelectedRequest} />

        <Btn variant="danger" onClick={handleLogout}>{t.logout}</Btn>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PANEL TECNICO
// ─────────────────────────────────────────────────────────────

function VerifiedTechnicianPanel({ user, th, t, myTech, requests, unreadCount, openingPublicProfile, navigate, setSelectedRequest, openPublicProfile, handleLogout }) {
  const activeCount = requests.filter(r => !['completed', 'cancelled'].includes(r.status)).length
  const completedCount = requests.filter(r => r.status === 'completed').length
  const rating = Number(myTech?.average_rating || 0)
  const miniCards = [
    { label: 'Solicitudes activas', value: activeCount, action: null },
    { label: 'Trabajos completados', value: myTech?.total_jobs || completedCount || 0, action: null },
    { label: 'Reseñas', value: myTech?.total_reviews || 0, action: null },
    { label: 'Radio de servicio', value: `${myTech?.service_radius_km || 15} km`, action: null },
  ]
  const actionCards = [
    { title: 'Solicitudes', sub: 'Clientes que necesitan tu servicio', mark: activeCount, onClick: null },
    { title: 'Catálogo', sub: 'Precios y servicios publicados', mark: '$', onClick: () => navigate('service-catalog') },
    { title: 'Recibos', sub: 'Comprobantes y pagos', mark: 'PDF', onClick: () => navigate('my-receipts') },
    { title: 'Perfil público', sub: 'Así te ven los clientes', mark: '✓', onClick: openPublicProfile },
    { title: 'Certificados', sub: 'Títulos y documentos visibles', mark: 'Doc', onClick: () => navigate('certificates') },
    { title: 'Insights', sub: 'Mejora tu perfil con IA', mark: 'IA', onClick: () => navigate('tech-insights') },
  ]

  return (
    <div className="tf-techdash-page">
      <style>{techDashboardCss}</style>
      <div className="tf-techdash-shell">
        <aside className="tf-techdash-side" aria-label="Panel técnico">
          <button className="tf-side-icon top" onClick={() => navigate('home')}>☰</button>
          <button className="tf-side-icon">▲</button>
          <button className="tf-side-icon">▥</button>
          <button className="tf-side-icon">★</button>
          <button className="tf-side-icon active">▦</button>
          <button className="tf-side-icon">○</button>
          <button className="tf-side-icon bottom" onClick={() => navigate('settings')}>⚙</button>
        </aside>

        <main className="tf-techdash-main">
          <header className="tf-techdash-head">
            <div>
              <p className="tf-techdash-kicker">Tecnifix Pro</p>
              <h1>Panel Técnico</h1>
              <span>Acceso aprobado por los dueños</span>
            </div>
            <button className="tf-search-pill" onClick={() => navigate('notifications')}>
              <span /> Notificaciones {unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
          </header>

          <div className="tf-techdash-tabs">
            <span />
            <span />
            <span className="active" />
            <span />
          </div>

          <section className="tf-workbench-card">
            <div className="tf-card-head">
              <strong>Área de trabajo</strong>
              <span>Verificado</span>
            </div>
            <div className="tf-card-tabs">
              <span />
              <span className="active" />
              <span />
              <span />
              <span />
            </div>
            <div className="tf-action-grid">
              {actionCards.map((card) => (
                <button key={card.title} onClick={card.onClick || (() => {})} className="tf-action-card">
                  <span className="bookmark">{card.mark}</span>
                  <span className="thumb" />
                  <strong>{card.title}</strong>
                  <small>{card.sub}</small>
                  <i />
                </button>
              ))}
            </div>
          </section>

          <div className="tf-mini-grid">
            {miniCards.map(card => (
              <article key={card.label} className="tf-mini-card">
                <span />
                <strong>{card.value}</strong>
                <small>{card.label}</small>
              </article>
            ))}
          </div>

          <section className="tf-techdash-requests">
            <RequestsTabs user={user} th={th} t={t} navigate={navigate} setSelectedRequest={setSelectedRequest} />
          </section>
        </main>

        <aside className="tf-techdash-detail">
          <div className="tf-profile-plate">
            <Avatar photo={user.avatar_url} name={user.full_name} size={82} />
          </div>
          <div className="tf-detail-bars">
            <span className="active" />
            <span />
            <span />
          </div>
          <h2>{user.full_name}</h2>
          <p>{myTech?.professional_title || 'Técnico Tecnifix'}</p>
          <div className="tf-stars">{[1, 2, 3, 4, 5].map(i => <span key={i} className={i <= Math.round(rating || 5) ? 'on' : ''}>★</span>)}</div>
          <div className="tf-detail-lines">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="tf-detail-actions">
            <button onClick={openPublicProfile} disabled={openingPublicProfile}>
              {openingPublicProfile ? 'Abriendo...' : 'Ver perfil'}
            </button>
            <button onClick={() => navigate('verification-center')}>Verificación</button>
          </div>
          <button className="tf-logout-link" onClick={handleLogout}>Cerrar sesión</button>
        </aside>
      </div>
    </div>
  )
}

function TechnicianPendingPanel({ user, th, myTech, techStatusLabel, navigate, handleLogout }) {
  const status = myTech?.verification_status || 'sin_postulacion'
  const statusText = status === 'rejected'
    ? 'Tu postulación fue rechazada. Corrige tus datos y vuelve a enviarla.'
    : ['pending', 'pending_review', 'under_review'].includes(status)
      ? 'Tu cuenta ya está marcada como técnico. La verificación queda pendiente hasta que el dueño/admin apruebe tu postulación.'
      : 'Tu cuenta es de técnico, pero falta completar el Centro de Verificación para que los dueños puedan revisarte.'
  const steps = [
    {
      n: '1',
      title: 'Postulación',
      text: myTech ? 'Tus datos técnicos ya existen en Tecnifix.' : 'Completa tus datos profesionales.',
      state: myTech ? 'done' : 'active',
    },
    {
      n: '2',
      title: 'Revisión del dueño',
      text: 'El equipo revisa documentos, oficio, zona y datos de contacto.',
      state: ['pending', 'pending_review', 'under_review'].includes(status) ? 'active' : myTech ? 'ready' : 'locked',
    },
    {
      n: '3',
      title: 'Acceso al panel',
      text: `El panel azul ${TECH_PANEL_BLUE} se abre cuando seas aprobado.`,
      state: 'locked',
    },
  ]

  return (
    <div className="tf-techdash-page pending">
      <style>{techDashboardCss}</style>
      <div className="tf-pending-shell">
        <aside className="tf-techdash-side" aria-label="Acceso técnico pendiente">
          <button className="tf-side-icon top" onClick={() => navigate('home')}>☰</button>
          <button className="tf-side-icon">▲</button>
          <button className="tf-side-icon">▥</button>
          <button className="tf-side-icon">★</button>
          <button className="tf-side-icon active">▦</button>
          <button className="tf-side-icon bottom" onClick={() => navigate('settings')}>⚙</button>
        </aside>
        <main className="tf-pending-main">
          <section className="tf-pending-hero">
            <div>
              <p className="tf-techdash-kicker">Tecnifix Pro</p>
              <h1>Panel técnico pendiente de aprobación</h1>
              <p>{statusText}</p>
            </div>
            <div className="tf-pending-status-stack">
              <div className="tf-pending-status">
                <span>Tipo de cuenta</span>
                <strong>Técnico</strong>
              </div>
              <div className="tf-pending-status">
                <span>Estado actual</span>
                <strong>{techStatusLabel}</strong>
              </div>
            </div>
          </section>

          <section className="tf-pending-steps" aria-label="Proceso de aprobación">
            {steps.map(step => (
              <article key={step.n} className={`tf-step-card ${step.state}`}>
                <span>{step.n}</span>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </article>
            ))}
          </section>

          <section className="tf-pending-actions-card">
            <div>
              <strong>¿Dónde se verifica?</strong>
              <p>
                Tú completas o editas tus datos en el Centro de Verificación. Después el dueño entra al Panel Admin,
                abre Postulaciones y presiona Admitir en el sitio.
              </p>
            </div>
            <div className="tf-pending-actions">
              <button onClick={() => navigate('verification-center')}>{myTech ? 'Abrir centro de verificación' : 'Completar verificación'}</button>
              <button onClick={() => window.location.reload()}>Actualizar estado</button>
            </div>
          </section>
        </main>
        <aside className="tf-pending-card">
          <Avatar photo={user.avatar_url} name={user.full_name} size={86} />
          <h2>{user.full_name}</h2>
          <p>{user.email}</p>
          <div className="tf-pending-card-status">
            <span>Cuenta</span>
            <strong>Técnico</strong>
          </div>
          <div className="tf-pending-card-status">
            <span>Verificación</span>
            <strong>Pendiente</strong>
          </div>
          <button onClick={handleLogout}>Cerrar sesión</button>
        </aside>
      </div>
    </div>
  )
}

const techDashboardCss = `
  .tf-techdash-page{
    min-height:calc(100dvh - 82px);
    width:100%;
    background:#f4f6fb;
    padding:0;
    font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
    color:#111827;
  }
  .tf-techdash-shell,
  .tf-pending-shell{
    width:100%;
    min-height:calc(100dvh - 82px);
    background:#f4f6fb;
    border-radius:0;
    box-shadow:none;
    display:grid;
    grid-template-columns:92px minmax(0,1fr) minmax(290px,360px);
    gap:22px;
    padding:22px clamp(18px,2.4vw,34px);
    overflow:visible;
  }
  .tf-techdash-side{
    background:${TECH_PANEL_BLUE};
    border-radius:30px;
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:18px;
    padding:24px 0;
    box-shadow:0 22px 54px rgba(25,80,187,.24);
    position:sticky;
    top:22px;
    height:calc(100dvh - 126px);
    min-height:620px;
  }
  .tf-side-icon{
    width:52px;
    height:52px;
    border:0;
    border-radius:17px;
    background:transparent;
    color:rgba(255,255,255,.62);
    font-size:23px;
    font-weight:900;
    cursor:pointer;
    display:grid;
    place-items:center;
  }
  .tf-side-icon.top{ color:#fff; font-size:30px; }
  .tf-side-icon.active{
    background:rgba(255,255,255,.18);
    color:#fff;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);
  }
  .tf-side-icon.bottom{ margin-top:auto; }
  .tf-techdash-main{
    min-width:0;
    display:flex;
    flex-direction:column;
    gap:18px;
  }
  .tf-techdash-head{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap:20px;
    background:#fff;
    border:1px solid #e6edf7;
    border-radius:26px;
    padding:24px 26px;
    box-shadow:0 18px 46px rgba(15,23,42,.06);
  }
  .tf-techdash-kicker{
    margin:0 0 6px;
    color:#6b7890;
    font-size:12px;
    font-weight:900;
    text-transform:uppercase;
    letter-spacing:.12em;
  }
  .tf-techdash-head h1,
  .tf-pending-main h1{
    margin:0 0 8px;
    color:${TECH_PANEL_BLUE};
    font-size:clamp(28px,3.5vw,46px);
    line-height:1.02;
    font-weight:950;
  }
  .tf-techdash-head span{ color:#64748b; font-size:14px; font-weight:800; }
  .tf-search-pill{
    min-width:220px;
    height:42px;
    border:1px solid #e5edf8;
    border-radius:999px;
    background:#f8fbff;
    color:#334155;
    font-weight:900;
    cursor:pointer;
    box-shadow:none;
  }
  .tf-search-pill span{
    display:inline-block;
    width:46px;
    height:8px;
    border-radius:99px;
    background:${TECH_PANEL_BLUE};
    margin-right:10px;
    vertical-align:middle;
  }
  .tf-techdash-tabs{
    display:flex;
    gap:42px;
    padding:0 8px;
  }
  .tf-techdash-tabs span{
    width:70px;
    height:14px;
    border-radius:3px;
    background:#c7d0dd;
  }
  .tf-techdash-tabs span.active{ background:${TECH_PANEL_YELLOW}; }
  .tf-workbench-card{
    background:#fff;
    border:1px solid #e6edf7;
    border-radius:28px;
    padding:26px;
    box-shadow:0 18px 46px rgba(15,23,42,.06);
  }
  .tf-card-head{ display:flex; align-items:center; gap:12px; margin-bottom:22px; }
  .tf-card-head strong{
    color:#111827;
    font-size:18px;
    font-weight:950;
  }
  .tf-card-head span{
    border-radius:999px;
    background:#eaf2ff;
    color:${TECH_PANEL_BLUE};
    padding:7px 12px;
    font-size:12px;
    font-weight:950;
  }
  .tf-card-tabs{ display:flex; gap:26px; margin-bottom:26px; }
  .tf-card-tabs span{
    width:48px;
    height:8px;
    border-radius:99px;
    background:#d5d5d5;
  }
  .tf-card-tabs .active{ background:${TECH_PANEL_YELLOW}; width:66px; }
  .tf-action-grid{
    display:grid;
    grid-template-columns:repeat(3,minmax(170px,1fr));
    gap:18px;
  }
  .tf-action-card{
    border:1px solid #edf2f8;
    background:#fbfdff;
    border-radius:22px;
    padding:14px;
    text-align:left;
    position:relative;
    cursor:pointer;
    font-family:inherit;
    min-width:0;
    min-height:176px;
    box-shadow:0 10px 24px rgba(15,23,42,.04);
    transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease;
  }
  .tf-action-card:hover{
    transform:translateY(-3px);
    border-color:#cfe0f7;
    box-shadow:0 16px 34px rgba(25,80,187,.11);
  }
  .tf-action-card .thumb{
    display:block;
    height:82px;
    border-radius:16px;
    background:linear-gradient(135deg,#eef4ff,#dfeaff);
    margin-bottom:12px;
    position:relative;
    overflow:hidden;
  }
  .tf-action-card .thumb::after{
    content:'';
    position:absolute;
    width:56px;
    height:56px;
    border-radius:18px;
    right:18px;
    top:14px;
    background:${TECH_PANEL_YELLOW};
    transform:rotate(10deg);
    box-shadow:0 14px 26px rgba(255,210,63,.30);
  }
  .tf-action-card .bookmark{
    position:absolute;
    right:14px;
    top:12px;
    min-width:32px;
    height:24px;
    border-radius:999px;
    background:${TECH_PANEL_YELLOW};
    color:${TECH_PANEL_BLUE};
    font-size:10px;
    font-weight:950;
    display:grid;
    place-items:center;
    padding:0 7px;
    z-index:2;
  }
  .tf-action-card strong{
    display:block;
    color:#1f2937;
    font-size:15px;
    line-height:1.15;
    font-weight:950;
    margin-bottom:5px;
  }
  .tf-action-card small{
    display:block;
    color:#64748b;
    font-size:12px;
    line-height:1.35;
    font-weight:800;
  }
  .tf-action-card i{
    position:absolute;
    right:18px;
    bottom:18px;
    width:14px;
    height:8px;
    border-radius:99px;
    background:${TECH_PANEL_YELLOW};
  }
  .tf-mini-grid{
    display:grid;
    grid-template-columns:repeat(4,minmax(0,1fr));
    gap:16px;
  }
  .tf-mini-card{
    background:#fff;
    border:1px solid #e6edf7;
    border-radius:22px;
    padding:18px;
    box-shadow:0 14px 34px rgba(15,23,42,.05);
  }
  .tf-mini-card span{
    width:24px;
    height:24px;
    border-radius:50%;
    background:#efefef;
    display:block;
    margin-bottom:12px;
  }
  .tf-mini-card strong{ display:block; color:#555; font-size:18px; margin-bottom:6px; }
  .tf-mini-card small{ color:#9b9b9b; font-size:11px; font-weight:800; }
  .tf-techdash-requests > div{
    border-radius:22px !important;
    box-shadow:0 14px 34px rgba(15,23,42,.05);
  }
  .tf-techdash-detail{
    align-self:start;
    position:sticky;
    top:22px;
    background:#fff;
    border:1px solid #e6edf7;
    border-radius:30px;
    padding:22px;
    box-shadow:0 18px 46px rgba(15,23,42,.06);
  }
  .tf-profile-plate{
    height:210px;
    border-radius:24px;
    background:linear-gradient(135deg,#eef4ff,#d8e6ff);
    display:grid;
    place-items:center;
    margin-bottom:20px;
  }
  .tf-detail-bars{ display:flex; justify-content:center; gap:10px; margin-bottom:18px; }
  .tf-detail-bars span{ width:42px; height:6px; border-radius:99px; background:#d2d2d2; }
  .tf-detail-bars .active{ background:${TECH_PANEL_YELLOW}; }
  .tf-techdash-detail h2{ margin:0 0 6px; color:#606060; font-size:18px; }
  .tf-techdash-detail p{ margin:0 0 16px; color:#8f8f8f; font-size:13px; font-weight:800; }
  .tf-stars{ margin-bottom:22px; color:#b5b5b5; }
  .tf-stars .on{ color:${TECH_PANEL_YELLOW}; }
  .tf-detail-lines{ display:grid; gap:9px; margin-bottom:28px; }
  .tf-detail-lines span{ height:10px; border-radius:99px; background:#bcbcbc; }
  .tf-detail-lines span:nth-child(1){ width:86%; }
  .tf-detail-lines span:nth-child(2){ width:70%; }
  .tf-detail-lines span:nth-child(3){ width:92%; }
  .tf-detail-lines span:nth-child(4){ width:62%; }
  .tf-detail-lines span:nth-child(5){ width:42%; }
  .tf-detail-actions{
    background:${TECH_PANEL_BLUE};
    border-radius:16px;
    padding:12px;
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:10px;
    margin-bottom:18px;
  }
  .tf-detail-actions button{
    border:0;
    border-radius:8px;
    background:#fff;
    color:${TECH_PANEL_BLUE};
    font-weight:950;
    padding:10px 8px;
    cursor:pointer;
  }
  .tf-logout-link,
  .tf-pending-card button{
    width:100%;
    border:1px solid #fecaca;
    background:#fff;
    color:#b91c1c;
    border-radius:12px;
    padding:12px;
    font-weight:900;
    cursor:pointer;
  }
  .tf-pending-shell{
    grid-template-columns:92px minmax(0,1fr) minmax(280px,360px);
  }
  .tf-pending-main{
    min-width:0;
    display:flex;
    flex-direction:column;
    gap:18px;
  }
  .tf-pending-hero,
  .tf-pending-actions-card,
  .tf-pending-card{
    background:#fff;
    border:1px solid #e6edf7;
    border-radius:30px;
    box-shadow:0 18px 46px rgba(15,23,42,.06);
  }
  .tf-pending-hero{
    min-height:310px;
    padding:clamp(28px,4vw,52px);
    display:grid;
    grid-template-columns:minmax(0,1fr) minmax(220px,300px);
    align-items:end;
    gap:28px;
    position:relative;
    overflow:hidden;
  }
  .tf-pending-hero::after{
    content:'';
    position:absolute;
    width:320px;
    height:320px;
    border-radius:50%;
    right:-92px;
    top:-120px;
    background:rgba(25,80,187,.08);
  }
  .tf-pending-main h1{ color:${TECH_PANEL_BLUE}; font-size:32px; }
  .tf-pending-main p{ color:#64748b; line-height:1.6; font-weight:800; margin:0 0 22px; }
  .tf-pending-status-stack{
    position:relative;
    z-index:1;
    display:grid;
    gap:12px;
  }
  .tf-pending-status{
    position:relative;
    z-index:1;
    border:1px solid #dbeafe;
    background:#eff6ff;
    border-radius:22px;
    padding:18px;
  }
  .tf-pending-status span{ display:block; color:#64748b; font-size:12px; font-weight:900; margin-bottom:6px; }
  .tf-pending-status strong{ color:${TECH_PANEL_BLUE}; }
  .tf-pending-steps{
    display:grid;
    grid-template-columns:repeat(3,minmax(0,1fr));
    gap:16px;
  }
  .tf-step-card{
    background:#fff;
    border:1px solid #e6edf7;
    border-radius:24px;
    padding:20px;
    box-shadow:0 14px 34px rgba(15,23,42,.05);
  }
  .tf-step-card span{
    width:38px;
    height:38px;
    border-radius:50%;
    display:grid;
    place-items:center;
    margin-bottom:16px;
    background:#eef2f7;
    color:#64748b;
    font-weight:950;
  }
  .tf-step-card.done span{ background:#dcfce7; color:#166534; }
  .tf-step-card.active span{ background:${TECH_PANEL_BLUE}; color:#fff; box-shadow:0 10px 24px rgba(25,80,187,.25); }
  .tf-step-card.ready span{ background:${TECH_PANEL_YELLOW}; color:${TECH_PANEL_BLUE}; }
  .tf-step-card strong{ display:block; color:#111827; font-size:16px; font-weight:950; margin-bottom:8px; }
  .tf-step-card p{ margin:0; color:#64748b; font-size:13px; line-height:1.45; font-weight:800; }
  .tf-pending-actions-card{
    padding:22px;
    display:grid;
    grid-template-columns:minmax(0,1fr) minmax(260px,360px);
    gap:18px;
    align-items:center;
  }
  .tf-pending-actions-card strong{ display:block; color:#111827; font-size:18px; font-weight:950; margin-bottom:6px; }
  .tf-pending-actions-card p{ margin:0; color:#64748b; font-size:13px; line-height:1.45; font-weight:800; }
  .tf-pending-actions{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .tf-pending-actions button{
    border:0;
    border-radius:14px;
    background:${TECH_PANEL_BLUE};
    color:#fff;
    padding:14px;
    font-weight:950;
    cursor:pointer;
  }
  .tf-pending-actions button:last-child{ background:#eef2f7; color:#334155; }
  .tf-pending-main small{ color:#94a3b8; font-weight:800; }
  .tf-pending-card{
    align-self:start;
    position:sticky;
    top:22px;
    text-align:center;
    padding:28px;
  }
  .tf-pending-card h2{ margin:14px 0 6px; color:#334155; }
  .tf-pending-card p{ margin:0 0 22px; color:#64748b; font-size:13px; font-weight:800; word-break:break-word; }
  .tf-pending-card-status{
    border:1px solid #dbeafe;
    background:#eff6ff;
    border-radius:18px;
    padding:14px;
    margin-bottom:18px;
    text-align:left;
  }
  .tf-pending-card-status span{ display:block; color:#64748b; font-size:12px; font-weight:900; margin-bottom:4px; }
  .tf-pending-card-status strong{ color:${TECH_PANEL_BLUE}; font-weight:950; }
  @media (max-width:1180px){
    .tf-techdash-shell,.tf-pending-shell{
      grid-template-columns:84px minmax(0,1fr);
    }
    .tf-techdash-detail,.tf-pending-card{
      position:static;
      grid-column:2;
    }
    .tf-action-grid{ grid-template-columns:repeat(2,minmax(0,1fr)); }
    .tf-mini-grid,.tf-pending-steps{ grid-template-columns:repeat(2,minmax(0,1fr)); }
    .tf-pending-actions-card,.tf-pending-hero{ grid-template-columns:1fr; }
  }
  @media (max-width:760px){
    .tf-techdash-page{ min-height:100dvh; padding-bottom:80px; }
    .tf-techdash-shell,.tf-pending-shell{
      min-height:100dvh;
      border-radius:0;
      grid-template-columns:1fr;
      gap:18px;
      padding:14px;
    }
    .tf-techdash-side{
      position:static;
      height:74px;
      min-height:0;
      border-radius:22px;
      flex-direction:row;
      padding:10px;
      overflow:auto;
    }
    .tf-side-icon.bottom{ margin-top:0; margin-left:auto; }
    .tf-techdash-detail{ grid-column:auto; padding:18px; position:static; }
    .tf-techdash-head{ flex-direction:column; padding:20px; }
    .tf-search-pill{ width:100%; }
    .tf-action-grid,.tf-mini-grid,.tf-pending-steps,.tf-pending-actions-card,.tf-pending-actions{ grid-template-columns:1fr; }
    .tf-pending-card{ grid-column:auto; }
    .tf-pending-hero{ min-height:auto; padding:24px; }
  }
  @media (max-width:560px){
    .tf-action-grid{ grid-template-columns:1fr; }
    .tf-pending-main h1,.tf-techdash-head h1{ font-size:30px; }
    .tf-side-icon{ width:48px; height:48px; }
  }
`

function RequestsTabs({ user, th, t, navigate, setSelectedRequest }) {
  const [tab, setTab] = useState('active')
  const [lists, setLists] = useState({ active: [], completed: [], archived: [] })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [archiving, setArchiving] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      archiveApi.listByStatus(user.id, 'active'),
      archiveApi.listByStatus(user.id, 'archived'),
    ]).then(([active, archived]) => {
      const inProgress = active.filter(r => r.status !== 'completed')
      const completed = active.filter(r => r.status === 'completed')
      setLists({ active: inProgress, completed, archived })
    }).catch(() => showToast('Error al cargar solicitudes', 'error'))
      .finally(() => setLoading(false))
  }, [user])

  const handleArchive = async (r) => {
    setArchiving(r.id)
    try {
      await archiveApi.archiveRequest(r.id, user.id)
      setLists(prev => ({
        ...prev,
        completed: prev.completed.filter(x => x.id !== r.id),
        archived: [{ ...r, archive_status: 'archived' }, ...prev.archived],
      }))
      showToast('Solicitud archivada')
    } catch (err) {
      showToast(err?.message ?? 'Error al archivar', 'error')
    } finally { setArchiving(null) }
  }

  const handleDelete = async (r) => {
    if (!window.confirm(`¿Eliminar definitivamente "${r.title}"?
Se descargará el recibo automáticamente.`)) return
    setDeleting(r.id)
    try {
      // Descargar recibo antes de borrar
      const { data: receipt } = await supabase
        .from('receipts').select('*').eq('service_request_id', r.id).single()
      if (receipt) {
        try {
          await receiptActions.downloadPDF(receipt)
          await new Promise(res => setTimeout(res, 1200))
        } catch { }
      }
      await archiveApi.deleteArchivedRequest(r.id, user.id)
      setLists(prev => ({ ...prev, archived: prev.archived.filter(x => x.id !== r.id) }))
      showToast('Solicitud eliminada definitivamente')
    } catch (err) {
      showToast(err?.message ?? 'Error al eliminar', 'error')
    } finally { setDeleting(null) }
  }

  const downloadReceipt = async (req) => {
    // req puede venir como string (id) o como objeto completo de la solicitud
    const requestId = typeof req === 'string' ? req : req.id
    try {
      let { data: receipt } = await supabase
        .from('receipts').select('*').eq('service_request_id', requestId).single()

      // Si no existe el recibo (p.ej. servicio completado sin pago confirmado
      // en la app, pago en efectivo acordado fuera de línea, etc.), generarlo
      // ahora mismo con los datos disponibles de la solicitud.
      if (!receipt) {
        const full = typeof req === 'object' ? req : null
        const { data: r } = await supabase
          .from('service_requests').select('*').eq('id', requestId).single()
        const sr = full ?? r
        if (!sr) { showToast('Solicitud no encontrada.', 'error'); return }

        receipt = await receiptActions.generate({
          requestId: sr.id,
          clientId: sr.client_id,
          technicianId: sr.technician_id,
          serviceTitle: sr.title,
          serviceDescription: sr.description,
          amount: sr.agreed_price ?? 0,
          paymentMethod: sr.payment_method || 'cash',
          paymentReference: sr.payment_ref || null,
          clientName: sr.client_name ?? 'Cliente',
          technicianName: sr.technician_name ?? 'Técnico',
        })
      }

      await receiptActions.downloadPDF(receipt)
      showToast('Recibo descargado')
    } catch (err) {
      showToast('Error al descargar: ' + (err?.message ?? ''), 'error')
    }
  }

  const STATUS_COLORS = {
    pending: { bg: '#fef3c7', text: '#92400e' },
    accepted: { bg: '#dbeafe', text: '#1e40af' },
    in_progress: { bg: '#ede9fe', text: '#5b21b6' },
    pending_payment: { bg: '#fce7f3', text: '#9d174d' },
    completed: { bg: '#dbeafe', text: '#1e40af' },
    cancelled: { bg: '#fee2e2', text: '#991b1b' },
    disputed: { bg: '#fff7ed', text: '#9a3412' },
  }
  const STATUS_LABEL = {
    pending: 'Enviada', accepted: 'Aceptada', in_progress: 'En progreso',
    pending_payment: 'Pend. pago', completed: 'Completada',
    cancelled: 'Cancelada', disputed: 'En disputa',
  }

  const TABS = [
    { id: 'active', emoji: '⚡', label: 'Activas', list: lists.active },
    { id: 'completed', emoji: '✅', label: 'Completadas', list: lists.completed },
    { id: 'archived', emoji: '📦', label: 'Archivadas', list: lists.archived },
  ]
  const currentList = TABS.find(tb => tb.id === tab)?.list ?? []

  return (
    <div style={{
      background: th.surface, borderRadius: 16,
      border: `1px solid ${th.border}`, marginBottom: 16, overflow: 'hidden'
    }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header con tabs */}
      <div style={{ padding: '14px 16px 0', borderBottom: `1px solid ${th.border}` }}>
        <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 15, color: th.text }}>
          {user.role === 'technician' ? 'Solicitudes recibidas' : 'Mis solicitudes'}
        </p>
        <div style={{ display: 'flex' }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              style={{
                flex: 1, padding: '8px 2px', background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
                fontWeight: tab === tb.id ? 700 : 400,
                color: tab === tb.id ? th.primary : th.textSec,
                borderBottom: tab === tb.id
                  ? `2.5px solid ${th.primary}` : '2.5px solid transparent',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 4
              }}>
              {tb.emoji} {tb.label}
              {tb.list.length > 0 && (
                <span style={{
                  background: tab === tb.id ? th.primary : th.border,
                  color: tab === tb.id ? '#fff' : th.textSec,
                  fontSize: 10, fontWeight: 700, padding: '1px 5px',
                  borderRadius: 20
                }}>
                  {tb.list.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Info de archivo automático */}
      {tab === 'completed' && lists.completed.length > 0 && (
        <div style={{
          padding: '8px 16px', background: '#fef9c3',
          borderBottom: `1px solid #fde68a`
        }}>
          <p style={{ margin: 0, fontSize: 11, color: '#92400e' }}>
            ⏰ Las solicitudes completadas se archivan automáticamente a los 30 días.
            Descarga el recibo antes de archivar para guardar evidencia.
          </p>
        </div>
      )}

      {/* Contenido */}
      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <Spinner />
          </div>
        ) : currentList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '22px 0', color: th.textSec }}>
            <p style={{ fontSize: 28, margin: '0 0 6px' }}>
              {tab === 'active' ? '📋' : tab === 'completed' ? '✅' : '📦'}
            </p>
            <p style={{ fontSize: 13, margin: 0 }}>
              {tab === 'active' ? 'Sin solicitudes activas'
                : tab === 'completed' ? 'Sin solicitudes completadas'
                  : 'Sin solicitudes archivadas'}
            </p>
          </div>
        ) : currentList.map((r, i) => {
          const isArchiving_ = archiving === r.id
          const isDeleting_ = deleting === r.id
          const sc = STATUS_COLORS[r.status] ?? { bg: '#f1f5f9', text: '#64748b' }
          const isLast = i === currentList.length - 1

          return (
            <div key={r.id} style={{
              padding: '12px 0',
              borderBottom: isLast ? 'none' : `1px solid ${th.border}`,
              opacity: (isArchiving_ || isDeleting_) ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}>
              {/* Fila principal clickeable */}
              <div onClick={() => { setSelectedRequest(r); navigate('request-detail') }}
                style={{ cursor: 'pointer', marginBottom: 8 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', gap: 8, marginBottom: 3
                }}>
                  <p style={{
                    margin: 0, fontWeight: 700, fontSize: 14,
                    color: th.text, flex: 1
                  }}>{r.title}</p>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px',
                    borderRadius: 20, flexShrink: 0,
                    background: sc.bg, color: sc.text
                  }}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                {r.description && (
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: th.textSec }}>
                    {r.description.slice(0, 55)}{r.description.length > 55 ? '…' : ''}
                  </p>
                )}
                <div style={{
                  display: 'flex', gap: 8, flexWrap: 'wrap',
                  alignItems: 'center', marginBottom: 4
                }}>
                  <span style={{ fontSize: 11, color: th.textSec }}>
                    📅 {new Date(r.created_at).toLocaleDateString('es-PA')}
                  </span>
                  {r.agreed_price && (
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: th.primaryText
                    }}>
                      💲{r.agreed_price}
                    </span>
                  )}
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    background: r.payment_status === 'paid' ? '#dbeafe'
                      : r.payment_status === 'pending_confirmation' ? '#ecfccb' : '#f1f5f9',
                    color: r.payment_status === 'paid' ? '#1e40af'
                      : r.payment_status === 'pending_confirmation' ? '#3f6212' : '#64748b',
                    padding: '1px 6px', borderRadius: 20
                  }}>
                    {r.payment_status === 'paid' ? '✓ Pagado'
                      : r.payment_status === 'pending_confirmation' ? '⏳ Por confirmar' : 'Sin pagar'}
                  </span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 11,
                    color: th.primary, fontWeight: 600
                  }}>
                    Ver →
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar
                    photo={user.role === 'technician' ? r.client_avatar : r.technician_avatar}
                    name={user.role === 'technician' ? r.client_name : r.technician_name}
                    size={20}
                  />
                  <span style={{ fontSize: 11, color: th.textSec }}>
                    {user.role === 'technician'
                      ? `Cliente: ${r.client_name}`
                      : `Técnico: ${r.technician_name}`}
                  </span>
                </div>
              </div>

              {/* Botones según tab */}
              {tab === 'active' && r.status === 'cancelled' && (
                <button onClick={async () => {
                  if (!window.confirm('¿Eliminar esta solicitud cancelada?')) return
                  try {
                    await supabase.from('service_requests')
                      .update({ archive_status: 'deleted' }).eq('id', r.id)
                    setLists(prev => ({
                      ...prev, active: prev.active.filter(x => x.id !== r.id)
                    }))
                  } catch { showToast('Error', 'error') }
                }} style={{
                  width: '100%', padding: '8px', background: '#fee2e2',
                  color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 10,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  🗑️ Eliminar solicitud cancelada
                </button>
              )}

              {tab === 'completed' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => downloadReceipt(r)}
                    style={{
                      flex: 2, padding: '8px', background: th.primaryLight,
                      color: th.primaryText, border: `1px solid ${th.primary}`,
                      borderRadius: 10, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit'
                    }}>
                    ⬇️ Recibo PDF
                  </button>
                  <button onClick={() => handleArchive(r)} disabled={isArchiving_}
                    style={{
                      flex: 1, padding: '8px', background: th.surface2,
                      color: th.textSec, border: `1px solid ${th.border}`,
                      borderRadius: 10, fontSize: 12, fontWeight: 600,
                      cursor: isArchiving_ ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit'
                    }}>
                    {isArchiving_ ? '…' : '📦 Archivar'}
                  </button>
                </div>
              )}

              {tab === 'archived' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => downloadReceipt(r)}
                    style={{
                      flex: 2, padding: '8px', background: th.primaryLight,
                      color: th.primaryText, border: `1px solid ${th.primary}`,
                      borderRadius: 10, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit'
                    }}>
                    ⬇️ Ver recibo
                  </button>
                  <button onClick={() => handleDelete(r)} disabled={isDeleting_}
                    style={{
                      flex: 1, padding: '8px', background: '#fee2e2',
                      color: '#991b1b', border: '1px solid #fca5a5',
                      borderRadius: 10, fontSize: 12, fontWeight: 700,
                      cursor: isDeleting_ ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit'
                    }}>
                    {isDeleting_ ? '…' : '🗑️'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
