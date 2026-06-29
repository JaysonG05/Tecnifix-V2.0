import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Avatar, StarRating, Badge, Btn, Spinner, Modal, Input, Toast, StatusBadge } from '../components/UI.jsx'
import { reviews as reviewsApi, technicians, contracts, serviceRequests, payments, certificatesApi, serviceCatalog, gamificationApi } from '../lib/supabase.js'
import { T } from '../i18n/translations.js'
import { computeTrustScore, getTrustSignals, getTrustTier } from '../lib/trust.js'
import { summarizeReviews } from '../lib/aiExotic.js'

/* Paleta del perfil (azul/blanco/marino, estilo referencia) */
const BLUE = '#1d4ed8'
const BLUE_DEEP = '#13348f'
const NAVY = '#0c1f4a'
const INK = '#0f1b3d'
const DEFAULT_TECH_IMAGE = '/hero-tecnifix.webp?v=20260613-224946'

/* Especialidad por oficio (ícono + título + descripción) para las tarjetas. */
const CAT_INFO = {
  electricidad: { icon: '⚡', title: 'Electricidad', desc: 'Instalaciones, tableros, cableado, iluminación y reparaciones eléctricas seguras para hogar y negocio.' },
  climatizacion: { icon: '❄️', title: 'Climatización y A/C', desc: 'Instalación, recarga, limpieza y mantenimiento de aires acondicionados para máximo confort.' },
  plomeria: { icon: '🔧', title: 'Plomería', desc: 'Fugas, tuberías, sanitarios, calentadores y mantenimiento; soluciones rápidas y limpias.' },
  albanileria: { icon: '🧱', title: 'Albañilería', desc: 'Reparaciones, remodelaciones y acabados sólidos para mejorar tu propiedad.' },
  limpieza: { icon: '🧹', title: 'Limpieza', desc: 'Limpieza profunda y mantenimiento para hogares, oficinas y locales.' },
  cerrajeria: { icon: '🔐', title: 'Cerrajería', desc: 'Aperturas, cambio de cerraduras y asistencia de emergencia cuando más lo necesitas.' },
  pintura: { icon: '🎨', title: 'Pintura', desc: 'Pintura interior y exterior con acabados profesionales y duraderos.' },
  tecnologia: { icon: '💻', title: 'Tecnología', desc: 'Soporte de computadoras, redes, cámaras y automatización del hogar.' },
}

export function TechProfileScreen() {
  const { th, selectedTech: tech, navigate, goBack, favoriteIds, toggleFavorite, user, lang } = useApp()
  const t = T[lang]
  if (!tech) { navigate('home'); return null }

  const [reviewList, setReviewList] = useState([])
  const [gallery, setGallery] = useState([])
  const [lightboxIdx, setLightboxIdx] = useState(null) // índice de foto abierta en pantalla completa
  const [loadingRevs, setLoadingRevs] = useState(false)
  const [loadingGal, setLoadingGal] = useState(false)
  const [showRequest, setShowRequest] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [certList, setCertList] = useState([])
  const [catalog, setCatalog] = useState([])
  const [toast, setToast] = useState(null)
  const [aiSummary, setAiSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  const genSummary = async () => {
    setLoadingSummary(true)
    try {
      const res = await summarizeReviews({ name: tech.full_name, reviews: reviewList })
      setAiSummary(res)
    } catch { setAiSummary(null) }
    finally { setLoadingSummary(false) }
  }

  const isFav = favoriteIds.includes(tech.user_id)
  const title = lang === 'en' ? (tech.professional_title_en || tech.professional_title) : tech.professional_title
  const bio = lang === 'en' ? (tech.bio_en || tech.bio) : tech.bio

  // Cargamos todo al entrar (la página ahora es un scroll continuo, sin pestañas).
  useEffect(() => {
    certificatesApi.list(tech.user_id)
      .then(d => setCertList(d.filter(c => c.is_public)))
      .catch(() => { })
    serviceCatalog.listActive(tech.user_id)
      .then(setCatalog)
      .catch(() => { })
    setLoadingRevs(true)
    reviewsApi.listForTechnician(tech.user_id)
      .then(setReviewList).catch(() => { }).finally(() => setLoadingRevs(false))
    setLoadingGal(true)
    technicians.getGallery(tech.user_id)
      .then(setGallery).catch(() => { }).finally(() => setLoadingGal(false))
  }, [tech.user_id])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const share = () => {
    const url = `${window.location.origin}/?tech=${tech.user_id}`
    const shareText = `${tech.full_name} — ${tech.professional_title || 'Técnico'} en Tecnifix ⭐ ${Number(tech.average_rating || 0).toFixed(1)}`
    if (navigator.share) navigator.share({ title: shareText, url }).catch(() => { })
    else { navigator.clipboard?.writeText(`${shareText}\n${url}`); showToast(lang === 'en' ? 'Link copied!' : '¡Enlace copiado!') }
  }

  const agendar = () => { if (!user) { navigate('login'); return } setShowRequest(true) }

  // ── Datos derivados para el layout ──
  const credential = tech.license_number || tech.document_id || ('ID ' + String(tech.user_id || '').slice(0, 8).toUpperCase())
  const categoryName = tech.category_name_es || title || 'Técnico'
  const slugs = (tech.category_slugs?.length ? tech.category_slugs : (tech.category_slug ? [tech.category_slug] : []))
  const specs = slugs.map(s => CAT_INFO[s]).filter(Boolean)
  const place = `${tech.city || 'Panamá'}${tech.province ? ', ' + tech.province : ''}`
  const firstName = tech.full_name?.split(' ')[0] || ''
  const tagline = tech.slogan || bio || 'Soluciones técnicas confiables, rápidas y con precios claros.'
  const profileImage = tech.avatar_url || gallery[0]?.image_url || DEFAULT_TECH_IMAGE
  const trustScore = computeTrustScore(tech, certList.length)
  const trustTier = getTrustTier(trustScore)
  const trustSignals = getTrustSignals(tech, certList.length)
  
  const techLevel = tech.level || 1
  const techXp = tech.xp || 0

  // Visibilidad elegida por el técnico (panel del vendedor). Falta o true = visible.
  const vis = tech.profile_visibility || {}
  const showPrices = vis.prices !== false
  const showCerts = vis.certificates !== false
  const showGallery = vis.gallery !== false
  const showReviews = vis.reviews !== false
  const showContact = vis.contact !== false
  const showSocial = vis.social !== false

  const eduList = [
    ...(tech.years_experience ? [`${tech.years_experience}+ años de experiencia`] : []),
    ...(tech.verification_status === 'verified' ? ['Identidad y experiencia verificadas'] : []),
    `Atiende en ${place}`,
    `Responde en ~${tech.response_time_minutes || 60} min`,
    ...(showCerts ? certList.map(c => c.name + (c.issuer ? ` — ${c.issuer}` : '')) : []),
  ]

  const expList = [
    `${tech.total_jobs || 0} trabajos completados`,
    `${tech.total_reviews || 0} reseñas de clientes`,
    `★ ${Number(tech.average_rating || 0).toFixed(1)} de calificación promedio`,
    `Disponibilidad: ${tech.is_available ? 'disponible ahora' : 'según agenda'}`,
    `Cobertura de servicio: ~${tech.service_radius_km || 15} km en ${place}`,
  ]
  const skillList = [
    ...specs.map(s => s.title),
    ...(tech.years_experience ? [`${tech.years_experience}+ años de experiencia`] : []),
    ...(tech.company_name ? [tech.company_name] : []),
  ].slice(0, 6)
  const profileWork = [
    { title: title || categoryName, badge: 'Principal', lines: [place, `${tech.total_jobs || 0} trabajos completados`] },
    ...(showPrices && tech.min_price ? [{ title: `Desde $${tech.min_price}`, badge: 'Precio', lines: [tech.price_unit || 'por visita', tech.max_price ? `Hasta $${tech.max_price}` : 'Presupuesto claro'] }] : []),
  ]

  return (
    <div className="tp-page">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <style>{`
        .tp-page{ background:#fff; color:${INK}; min-height:100vh; padding:0 0 96px; font-family:'Inter Tight',Inter,system-ui,sans-serif; }
        .tp-page *{ box-sizing:border-box; }
        .tp-shell{ width:100%; margin:0; background:#fff; border-radius:0; overflow:hidden; box-shadow:none; }
        .tp-wrap{ width:min(calc(100% - 96px),1480px); margin:0 auto; }
        .tp-eyebrow{ display:inline-block; border:1px solid #c7d2fe; color:${BLUE}; font-size:13px; font-weight:700; padding:5px 14px; border-radius:999px; background:#eef2ff; }
        .tp-btn{ display:inline-flex; align-items:center; gap:9px; background:${BLUE}; color:#fff; border:none; border-radius:999px; padding:14px 26px; font:700 15px/1 inherit; cursor:pointer; box-shadow:0 10px 24px rgba(29,78,216,.3); }
        .tp-btn:hover{ background:${BLUE_DEEP}; }
        .tp-btn.ghost{ background:#fff; color:${BLUE}; border:1.5px solid ${BLUE}; box-shadow:none; }
        .tp-topbar{ position:relative; z-index:3; display:flex; justify-content:space-between; padding:16px; }
        .tp-iconbtn{ width:40px; height:40px; border-radius:50%; border:1px solid #e2e8f0; background:#fff; color:${INK}; font-size:17px; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.06); }
        .tp-profile-stage{ background:#2696e6; padding:42px 16px 58px; }
        .tp-profile-card{ width:min(1060px,100%); margin:0 auto; background:#fff; border-radius:8px; box-shadow:0 28px 70px rgba(10,44,90,.18); overflow:hidden; }
        .tp-profile-nav{ display:flex; align-items:center; justify-content:space-between; gap:18px; padding:24px 34px; border-bottom:1px solid #eef2f7; }
        .tp-brand{ display:flex; align-items:center; gap:10px; color:#425466; font-weight:900; }
        .tp-brand-mark{ width:34px; height:34px; border-radius:50%; background:#2b9de8; position:relative; display:inline-block; }
        .tp-brand-mark::after{ content:''; position:absolute; inset:10px; border-radius:50%; background:#fff; }
        .tp-mini-search{ width:min(260px,34vw); border:1px solid #e5eaf1; color:#9aa5b1; border-radius:0; padding:10px 13px; font-size:12px; }
        .tp-nav-links{ display:flex; align-items:center; gap:26px; color:#425466; font-size:12px; font-weight:800; white-space:nowrap; }
        .tp-profile-main{ display:grid; grid-template-columns:300px 1fr; gap:44px; padding:36px 54px 54px; }
        .tp-side-photo{ width:100%; aspect-ratio:1; background:#edf4ff; overflow:hidden; margin-bottom:26px; }
        .tp-side-photo img{ width:100%; height:100%; object-fit:cover; display:block; }
        .tp-side-section{ border-top:1px solid #e6ebf2; padding-top:18px; margin-top:18px; }
        .tp-side-kicker,.tp-info-kicker{ margin:0 0 14px; color:#a4afbd; font-size:10px; letter-spacing:.12em; text-transform:uppercase; font-weight:900; }
        .tp-work-item{ margin-bottom:18px; }
        .tp-work-title{ display:flex; align-items:center; gap:8px; margin:0 0 7px; color:#27364a; font-size:14px; font-weight:900; }
        .tp-work-badge{ background:#e6f3ff; color:#1d75bd; border-radius:3px; padding:3px 8px; font-size:10px; font-weight:900; }
        .tp-work-lines{ margin:0; color:#8a96a6; font-size:12px; line-height:1.55; }
        .tp-skill-list{ display:grid; gap:6px; color:#27364a; font-size:12px; font-weight:700; line-height:1.35; }
        .tp-profile-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:18px; }
        .tp-profile-name{ margin:0 0 4px; color:#26384d; font-size:26px; line-height:1.1; font-weight:900; }
        .tp-profile-place{ margin:0; color:#8a96a6; font-size:11px; font-weight:800; }
        .tp-profile-role{ margin:0 0 20px; color:#1f8ee5; font-size:13px; font-weight:900; }
        .tp-rating-row{ display:flex; align-items:center; gap:10px; margin-bottom:22px; }
        .tp-rating-num{ color:#26384d; font-size:18px; font-weight:900; }
        .tp-profile-actions{ display:flex; flex-wrap:wrap; gap:10px; margin-bottom:22px; }
        .tp-slim-btn{ border:0; border-radius:0; padding:11px 15px; cursor:pointer; font:900 12px/1 inherit; background:#f5f8fb; color:#607086; }
        .tp-slim-btn.primary{ background:#26384d; color:#fff; }
        .tp-slim-btn.blue{ background:#e6f3ff; color:#1f8ee5; }
        .tp-tabline{ display:flex; gap:26px; border-bottom:1px solid #e6ebf2; margin:2px 0 26px; }
        .tp-tabline span{ padding:13px 0; color:#8a96a6; font-size:12px; font-weight:900; }
        .tp-tabline .active{ color:#26384d; border-bottom:2px solid #1f8ee5; margin-bottom:-1px; }
        .tp-info-grid{ display:grid; grid-template-columns:1fr; gap:28px; }
        .tp-info-row{ display:grid; grid-template-columns:120px 1fr; gap:24px; padding:5px 0; color:#26384d; font-size:12px; }
        .tp-info-row b{ color:#425466; font-weight:900; }
        .tp-info-row span,.tp-info-row a{ color:#1f8ee5; text-decoration:none; font-weight:800; }
        .tp-basic-row span{ color:#26384d; }

        .tp-hero{ background:radial-gradient(circle at 80% 20%,#edf4ff 0,#fff 42%,#f7faff 100%); }
        .tp-hero-grid{ display:grid; grid-template-columns:.92fr 1.08fr; gap:52px; align-items:center; padding:24px 0 56px; min-height:560px; }
        .tp-hero h1{ margin:8px 0 8px; font-size:clamp(38px,4.7vw,66px); font-weight:800; line-height:1.02; color:${INK}; }
        .tp-role{ margin:0; font-size:clamp(18px,1.5vw,24px); color:#64748b; font-weight:500; }
        .tp-tag{ margin:18px 0 26px; font-size:16px; line-height:1.6; color:#475569; max-width:480px; }
        .tp-trust{ max-width:560px; margin:18px 0 24px; background:rgba(255,255,255,.84); border:1px solid #dbe3ee; border-radius:20px; padding:18px; box-shadow:0 18px 40px rgba(15,27,61,.08); backdrop-filter:blur(10px); }
        .tp-trust-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:14px; }
        .tp-trust-kicker{ margin:0 0 5px; color:#64748b; font-size:12px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
        .tp-trust-title{ margin:0; color:${INK}; font-size:24px; font-weight:900; line-height:1; }
        .tp-trust-score{ display:grid; place-items:center; min-width:86px; height:68px; border-radius:18px; background:${trustTier.bg}; color:${trustTier.color}; font-size:26px; font-weight:900; }
        .tp-trust-score small{ display:block; margin-top:2px; font-size:10px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
        .tp-trust-bar{ height:9px; border-radius:999px; overflow:hidden; background:#e2e8f0; }
        .tp-trust-bar span{ display:block; height:100%; width:${trustScore}%; background:linear-gradient(90deg,${trustTier.color},#f8db13); border-radius:999px; }
        .tp-trust-signals{ display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
        .tp-trust-signal{ color:#334155; background:#f8fafc; border:1px solid #e2e8f0; border-radius:999px; padding:7px 10px; font-size:12px; font-weight:800; }
        .tp-hero-photo{ position:relative; border-radius:26px; overflow:hidden; aspect-ratio:1.03/1; min-height:420px; background:#edf4ff; box-shadow:0 30px 60px rgba(15,27,61,.18); }
        .tp-hero-photo::after{ content:''; position:absolute; inset:0; pointer-events:none; background:linear-gradient(90deg,rgba(255,255,255,.16),rgba(255,255,255,0) 42%); }
        .tp-hero-photo img{ width:100%; height:100%; object-fit:cover; object-position:center; display:block; }
        .tp-round-photo{ position:relative; aspect-ratio:1; border-radius:50%; max-width:280px; margin:0 auto; overflow:hidden; box-shadow:0 24px 50px rgba(0,0,0,.22); background:#0a1838; }
        .tp-round-photo img{ width:100%; height:100%; object-fit:cover; object-position:center; display:block; }
        .tp-float{ position:absolute; background:rgba(255,255,255,.95); backdrop-filter:blur(6px); border-radius:14px; padding:10px 14px; font-size:14px; font-weight:700; color:${INK}; box-shadow:0 8px 22px rgba(0,0,0,.18); display:flex; align-items:center; gap:7px; }
        .tp-float small{ font-weight:500; color:#64748b; }
        .tp-float.rate{ top:16px; left:16px; color:#b45309; }
        .tp-float.cat{ bottom:16px; right:16px; color:${BLUE}; }

        .tp-intro{ background:linear-gradient(120deg,${BLUE_DEEP},${BLUE}); color:#fff; }
        .tp-intro-in{ display:grid; grid-template-columns:1fr 1.3fr; gap:40px; align-items:center; padding:64px 0; }
        .tp-kick{ color:#bfdbfe; font-size:15px; font-weight:600; margin:0 0 8px; }
        .tp-intro h2{ margin:0 0 18px; font-size:clamp(28px,3vw,44px); font-weight:800; line-height:1.05; }
        .tp-intro p{ margin:0 0 24px; font-size:16px; line-height:1.7; color:rgba(255,255,255,.92); }
        .tp-intro .tp-btn{ background:#fff; color:${BLUE_DEEP}; box-shadow:none; }

        .tp-section{ padding:70px 0; }
        .tp-h2{ font-size:clamp(28px,3vw,44px); font-weight:800; color:${INK}; line-height:1.05; margin:0; }
        .tp-h2 u{ text-decoration-color:${BLUE}; text-underline-offset:6px; }
        .tp-sec-head{ display:flex; flex-wrap:wrap; align-items:center; gap:14px; justify-content:space-between; margin-bottom:36px; }
        .tp-chips{ display:flex; gap:10px; flex-wrap:wrap; }

        .tp-spec-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:22px; }
        .tp-card{ border:1px solid #e6eaf2; border-radius:18px; padding:30px 26px; background:#fff; transition:transform .2s, box-shadow .2s, border-color .2s; }
        .tp-card:hover{ transform:translateY(-6px); box-shadow:0 18px 40px rgba(15,27,61,.1); border-color:${BLUE}; }
        .tp-card-ic{ width:56px; height:56px; border-radius:14px; background:#eef2ff; display:grid; place-items:center; font-size:26px; margin-bottom:18px; }
        .tp-card h3{ margin:0 0 10px; font-size:21px; color:${BLUE}; font-weight:800; }
        .tp-card p{ margin:0; font-size:15px; line-height:1.6; color:#475569; }

        .tp-edu{ background:${NAVY}; color:#fff; }
        .tp-edu-in{ display:grid; grid-template-columns:1fr 1fr; gap:54px; align-items:center; padding:70px 0; }
        .tp-edu .tp-h2{ color:#fff; }
        .tp-list{ list-style:none; padding:0; margin:22px 0 0; display:grid; gap:14px; }
        .tp-list li{ display:flex; gap:12px; align-items:flex-start; font-size:16px; color:rgba(255,255,255,.9); }
        .tp-list li::before{ content:'✓'; flex:0 0 auto; width:24px; height:24px; border-radius:50%; background:${BLUE}; color:#fff; font-size:13px; font-weight:800; display:grid; place-items:center; margin-top:1px; }
        .tp-edu-photo{ position:relative; border-radius:22px; overflow:hidden; aspect-ratio:4/3; background:#0a1838; box-shadow:0 24px 50px rgba(0,0,0,.4); }
        .tp-edu-photo img{ width:100%; height:100%; object-fit:cover; }
        .tp-edu-initial{ position:absolute; inset:0; display:grid; place-items:center; font-size:90px; font-weight:800; color:rgba(255,255,255,.6); }

        .tp-exp .tp-list li{ color:#334155; }

        .tp-rev{ background:#f6f8fd; }
        .tp-rev-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:18px; }
        .tp-rev-card{ background:#fff; border:1px solid #e6eaf2; border-radius:16px; padding:20px; }
        .tp-gal-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        .tp-gal-grid button{ aspect-ratio:1; border-radius:14px; overflow:hidden; border:1px solid #e6eaf2; padding:0; cursor:pointer; background:none; }
        .tp-gal-grid img{ width:100%; height:100%; object-fit:cover; }

        .tp-actionbar{ position:fixed; left:0; right:0; bottom:0; z-index:40; background:rgba(255,255,255,.92); backdrop-filter:blur(10px); border-top:1px solid #e6eaf2; padding:12px 16px; display:flex; gap:10px; justify-content:center; }

        @media (max-width:860px){
          .tp-wrap{ width:calc(100% - 32px); }
          .tp-hero-grid, .tp-intro-in, .tp-edu-in{ grid-template-columns:1fr; gap:30px; }
          .tp-spec-grid{ grid-template-columns:1fr; }
          .tp-rev-grid, .tp-gal-grid{ grid-template-columns:1fr 1fr; }
          .tp-section, .tp-intro-in, .tp-edu-in{ padding:46px 0; }
          .tp-hero-grid{ padding:18px 0 34px; min-height:auto; }
          .tp-hero h1{ font-size:38px; }
          .tp-hero-photo{ max-width:360px; min-height:300px; margin:0 auto; }
          .tp-profile-stage{ padding:18px 10px 34px; }
          .tp-profile-nav{ padding:16px; flex-wrap:wrap; }
          .tp-mini-search{ order:3; width:100%; }
          .tp-nav-links{ gap:12px; font-size:11px; overflow:auto; width:100%; }
          .tp-profile-main{ grid-template-columns:1fr; gap:24px; padding:20px 18px 28px; }
          .tp-profile-head{ flex-direction:column; }
          .tp-info-row{ grid-template-columns:1fr; gap:4px; }
        }
      `}</style>

      <div className="tp-shell">
        {/* Topbar */}
        <div className="tp-topbar">
          <button className="tp-iconbtn" onClick={goBack}>←</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="tp-iconbtn" onClick={share}>📤</button>
            <button className="tp-iconbtn" onClick={() => toggleFavorite(tech.user_id)}>{isFav ? '⭐' : '☆'}</button>
          </div>
        </div>

        {/* FICHA TIPO PERFIL DE VENDEDOR */}
        <section className="tp-profile-stage">
          <div className="tp-profile-card">
            <div className="tp-profile-nav">
              <div className="tp-brand">
                <span className="tp-brand-mark" />
                <span>Tecnifix</span>
              </div>
              <input className="tp-mini-search" value="Buscar vendedor o técnico" readOnly aria-label="Buscar vendedor o técnico" />
              <div className="tp-nav-links">
                <span>Buscar técnicos</span>
                <span>Mensajes</span>
                <span>Mis contactos</span>
                <Avatar photo={user?.avatar_url} name={user?.full_name || 'Yo'} size={34} online />
              </div>
            </div>

            <div className="tp-profile-main">
              <aside>
                <div className="tp-side-photo">
                  <img src={profileImage} alt={tech.full_name} />
                </div>

                <div className="tp-side-section">
                  <p className="tp-side-kicker">Trabajo</p>
                  {profileWork.map((item) => (
                    <div className="tp-work-item" key={item.title}>
                      <p className="tp-work-title">
                        {item.title}
                        <span className="tp-work-badge">{item.badge}</span>
                      </p>
                      <p className="tp-work-lines">{item.lines.filter(Boolean).join(' · ')}</p>
                    </div>
                  ))}
                </div>

                <div className="tp-side-section">
                  <p className="tp-side-kicker">Habilidades</p>
                  <div className="tp-skill-list">
                    {(skillList.length ? skillList : [categoryName]).map((skill) => <span key={skill}>{skill}</span>)}
                  </div>
                </div>
              </aside>

              <main>
                <div className="tp-profile-head">
                  <div>
                    <h1 className="tp-profile-name">{tech.full_name}</h1>
                    <p className="tp-profile-place">📍 {place}</p>
                  </div>
                  <span className="tp-info-kicker">{isFav ? 'Guardado' : 'Bookmark'}</span>
                </div>

                <p className="tp-profile-role">{title || categoryName}</p>
                <div className="tp-rating-row">
                  <span className="tp-rating-num">{Number(tech.average_rating || 0).toFixed(1).replace('.', ',')}</span>
                  <StarRating rating={tech.average_rating} size={18} />
                  <span style={{ color: '#8a96a6', fontSize: 12, fontWeight: 800 }}>
                    {tech.total_reviews || 0} reseñas
                  </span>
                </div>

                <div className="tp-profile-actions">
                  <button className="tp-slim-btn primary" onClick={() => window.open(`https://wa.me/${(tech.public_whatsapp || '').replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(tech.full_name)},%20vi%20tu%20perfil%20en%20Tecnifix`, '_blank')}>
                    Enviar mensaje
                  </button>
                  <button className="tp-slim-btn blue" onClick={agendar}>Contactar</button>
                  <button className="tp-slim-btn" onClick={share}>Compartir perfil</button>
                </div>

                <div className="tp-tabline">
                  <span>Timeline</span>
                  <span className="active">About</span>
                </div>

                <div className="tp-info-grid">
                  <section>
                    <p className="tp-info-kicker">Información de contacto</p>
                    {showContact ? (
                      <>
                        <div className="tp-info-row"><b>Teléfono:</b><span>{tech.public_phone || tech.public_whatsapp || 'No publicado'}</span></div>
                        <div className="tp-info-row"><b>Dirección:</b><span>{tech.address_text || place}</span></div>
                        <div className="tp-info-row"><b>E-mail:</b><span>{tech.public_email || 'No publicado'}</span></div>
                        {showSocial && <div className="tp-info-row"><b>Sitio:</b><a href={tech.website || '#'} target="_blank" rel="noreferrer">{tech.website || tech.instagram || tech.facebook || 'No publicado'}</a></div>}
                      </>
                    ) : (
                      <p style={{ margin: 0, color: '#8a96a6', fontSize: 13 }}>El vendedor ocultó sus datos de contacto público.</p>
                    )}
                  </section>

                  <section>
                    <p className="tp-info-kicker">Información básica</p>
                    <div className="tp-info-row tp-basic-row"><b>Experiencia:</b><span>{tech.years_experience ? `${tech.years_experience} años` : 'No indicada'}</span></div>
                    <div className="tp-info-row tp-basic-row"><b>Respuesta:</b><span>{tech.response_time_minutes || 60} minutos aprox.</span></div>
                    <div className="tp-info-row tp-basic-row"><b>Estado:</b><span>{tech.is_available ? 'Disponible' : 'No disponible'}</span></div>
                    <div className="tp-info-row tp-basic-row"><b>Verificación:</b><span>{tech.verification_status === 'verified' ? 'Admitido por Tecnifix' : 'En revisión'}</span></div>
                  </section>
                </div>

                <div style={{ marginTop: 28, borderTop: '1px solid #e6ebf2', paddingTop: 20 }}>
                  <p style={{ margin: '0 0 8px', color: '#425466', fontSize: 13, fontWeight: 900 }}>Confianza Tecnifix</p>
                  <div className="tp-trust-bar"><span /></div>
                  <div className="tp-trust-signals">
                    {trustSignals.slice(0, 4).map((signal) => <span className="tp-trust-signal" key={signal}>{signal}</span>)}
                  </div>
                </div>
              </main>
            </div>
          </div>
        </section>

        {/* HERO */}
        <section className="tp-hero">
          <div className="tp-wrap tp-hero-grid">
            <div>
              <span className="tp-eyebrow">{credential}</span>
              <p className="tp-role" style={{ marginTop: 14 }}>{categoryName}</p>
              <h1>{tech.full_name}</h1>
              <p className="tp-tag">{tagline}</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                {tech.verification_status === 'verified' && <Badge color="#dcfce7" textColor="#166534">✓ Verificado</Badge>}
                <Badge color={trustTier.bg} textColor={trustTier.color}>Trust {trustScore} · {trustTier.label}</Badge>
                <Badge color={tech.is_available ? '#dbeafe' : '#f1f5f9'} textColor={tech.is_available ? '#1e40af' : '#64748b'}>{tech.is_available ? '● Disponible' : '○ Ocupado'}</Badge>
                <Badge color="#fef08a" textColor="#854d0e">🏆 Nivel {techLevel}</Badge>
              </div>
              <div className="tp-trust">
                <div className="tp-trust-head">
                  <div>
                    <p className="tp-trust-kicker">Tecnifix Trust Score</p>
                    <p className="tp-trust-title">Nivel {trustTier.label}</p>
                    <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 13, fontWeight: 700 }}>{trustTier.guarantee}</p>
                  </div>
                  <div className="tp-trust-score">
                    {trustScore}
                    <small>/100</small>
                  </div>
                </div>
                <div className="tp-trust-bar"><span /></div>
                <div className="tp-trust-signals">
                  {trustSignals.map((signal) => <span className="tp-trust-signal" key={signal}>{signal}</span>)}
                </div>
                <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: INK, marginBottom: 8 }}>
                    <span>🏆 {gamificationApi.getRankName(techLevel)}</span>
                    <span style={{ color: '#64748b' }}>{techXp} / {Math.pow(techLevel, 2) * 100} XP</span>
                  </div>
                  <div className="tp-trust-bar"><span style={{ width: `${Math.min(100, Math.max(0, ((techXp - Math.pow(techLevel - 1, 2) * 100) / (Math.pow(techLevel, 2) * 100 - Math.pow(techLevel - 1, 2) * 100)) * 100))}%`, background: 'linear-gradient(90deg, #fef08a, #eab308)' }} /></div>
                </div>
              </div>
              <button className="tp-btn" onClick={agendar}>📅 Agendar servicio</button>
            </div>
            <div className="tp-hero-photo">
              <img src={profileImage} alt={tech.full_name} />
              <div className="tp-float rate">★ {Number(tech.average_rating || 0).toFixed(1)} <small>{tech.total_reviews || 0} reseñas</small></div>
              <div className="tp-float cat">{specs[0]?.icon || '🔧'} {categoryName}</div>
            </div>
          </div>
        </section>

        {/* INTRO */}
        <section className="tp-intro">
          <div className="tp-wrap tp-intro-in">
            <div className="tp-round-photo">
              <img src={profileImage} alt="" />
            </div>
            <div>
              <p className="tp-kick">Hola, soy {firstName}</p>
              <h2>{title || categoryName} con resultados que se notan.</h2>
              <p>{bio || `Te ayudo a resolver lo que necesitas en ${categoryName.toLowerCase()} de forma rápida, segura y con precios claros. Atención personalizada en ${place}.`}</p>
              <button className="tp-btn" onClick={agendar}>Agendar servicio →</button>
            </div>
          </div>
        </section>

      {/* ESPECIALIDADES */}
      {specs.length > 0 && (
        <section className="tp-section">
          <div className="tp-wrap">
            <div className="tp-sec-head">
              <h2 className="tp-h2">Mis <u>especialidades</u></h2>
              <div className="tp-chips">{specs.map(s => <span key={s.title} className="tp-eyebrow">+ {s.title}</span>)}</div>
            </div>
            <div className="tp-spec-grid">
              {specs.slice(0, 3).map(s => (
                <article className="tp-card" key={s.title}>
                  <div className="tp-card-ic">{s.icon}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FORMACIÓN Y CARRERA */}
      <section className="tp-edu">
        <div className="tp-wrap tp-edu-in">
          <div>
            <span className="tp-eyebrow" style={{ background: 'rgba(255,255,255,.1)', borderColor: 'rgba(255,255,255,.25)', color: '#bfdbfe' }}>{credential}</span>
            <h2 className="tp-h2" style={{ marginTop: 14 }}>Formación y carrera</h2>
            <ul className="tp-list">
              {eduList.map((it, i) => <li key={i}>{it}</li>)}
            </ul>
            <button className="tp-btn" style={{ marginTop: 28 }} onClick={agendar}>📅 Agendar servicio</button>
          </div>
          <div className="tp-edu-photo">
            <img src={profileImage} alt="" />
          </div>
        </div>
      </section>

      {/* EXPERIENCIA Y RESULTADOS */}
      <section className="tp-section tp-exp">
        <div className="tp-wrap">
          <h2 className="tp-h2" style={{ marginBottom: 28 }}>Experiencia y resultados:</h2>
          <ul className="tp-list" style={{ maxWidth: 660 }}>
            {expList.map((it, i) => <li key={i}>{it}</li>)}
          </ul>
          {showPrices && catalog.length > 0 && (
            <div style={{ marginTop: 44 }}>
              <h3 style={{ fontSize: 22, color: INK, margin: '0 0 18px', fontWeight: 800 }}>Servicios y precios</h3>
              <div className="tp-rev-grid">
                {catalog.map(item => (
                  <div className="tp-rev-card" key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div><p style={{ margin: '0 0 3px', fontWeight: 700, color: INK }}>{item.name}</p>{item.description && <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{item.description}</p>}</div>
                    <p style={{ margin: 0, fontWeight: 800, color: BLUE, fontSize: 19, whiteSpace: 'nowrap' }}>${Number(item.price).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* GALERÍA */}
      {showGallery && gallery.length > 0 && (
        <section className="tp-section" style={{ paddingTop: 0 }}>
          <div className="tp-wrap">
            <h2 className="tp-h2" style={{ marginBottom: 24 }}>Trabajos realizados</h2>
            <div className="tp-gal-grid">
              {gallery.map((img, idx) => (
                <button key={img.id} onClick={() => setLightboxIdx(idx)}><img src={img.image_url} alt={img.caption || 'Trabajo'} /></button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* RESEÑAS */}
      {showReviews && (
      <section className="tp-section tp-rev">
        <div className="tp-wrap">
          <div className="tp-sec-head">
            <h2 className="tp-h2">Lo que dicen los <u>clientes</u></h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 44, fontWeight: 800, color: INK, lineHeight: 1 }}>{Number(tech.average_rating || 0).toFixed(1)}</span>
              <div><StarRating rating={tech.average_rating} size={18} /><p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{tech.total_reviews || 0} reseñas</p></div>
            </div>
          </div>
          {user && user.role !== 'technician' && (
            <button className="tp-btn ghost" style={{ marginBottom: 22 }} onClick={() => setShowReview(true)}>✍️ Escribir reseña</button>
          )}

          {/* Resumen IA de reseñas */}
          {reviewList.length >= 2 && (
            <div style={{ marginBottom: 22 }}>
              {!aiSummary && (
                <Btn variant="outline" onClick={genSummary} loading={loadingSummary} style={{ maxWidth: 280 }}>
                  🤖 Resumir reseñas con IA
                </Btn>
              )}
              {aiSummary && (
                <div style={{ border: `1px solid ${BLUE}33`, background: `${BLUE}0a`, borderRadius: 16, padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>🤖</span>
                    <strong style={{ color: INK, fontSize: 16 }}>{aiSummary.verdict}</strong>
                    {aiSummary.source === 'demo' && <span style={{ fontSize: 10, color: '#64748b', background: '#e2e8f0', padding: '2px 7px', borderRadius: 10 }}>resumen local</span>}
                  </div>
                  <p style={{ margin: '0 0 12px', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>{aiSummary.summary}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: aiSummary.cons?.length ? '1fr 1fr' : '1fr', gap: 14 }}>
                    {aiSummary.pros?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#16a34a', marginBottom: 4 }}>👍 A favor</div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                          {aiSummary.pros.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                    )}
                    {aiSummary.cons?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', marginBottom: 4 }}>👎 A considerar</div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                          {aiSummary.cons.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                  {aiSummary.highlights?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                      {aiSummary.highlights.map((h, i) => (
                        <span key={i} style={{ fontSize: 12, fontWeight: 600, color: BLUE_DEEP, background: `${BLUE}1a`, padding: '4px 10px', borderRadius: 20 }}>{h}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {loadingRevs
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
            : reviewList.length === 0
              ? <p style={{ color: '#64748b' }}>Aún no hay reseñas. ¡Sé el primero en dejar una!</p>
              : (
                <div className="tp-rev-grid">
                  {reviewList.map(r => (
                    <div className="tp-rev-card" key={r.id}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                        <Avatar photo={r.reviewer?.avatar_url} name={r.reviewer?.full_name} size={36} />
                        <div style={{ flex: 1 }}><p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: INK }}>{r.reviewer?.full_name || 'Usuario'}</p><StarRating rating={r.rating} size={12} /></div>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      {r.comment && <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.6 }}>{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
        </div>
      </section>
      )}
      </div>

      {/* ── LIGHTBOX ── */}
      {lightboxIdx !== null && gallery[lightboxIdx] && (
        <div onClick={() => setLightboxIdx(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <button onClick={() => setLightboxIdx(null)}
            style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>×</button>
          {gallery.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => (i - 1 + gallery.length) % gallery.length) }}
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>‹</button>
          )}
          <img src={gallery[lightboxIdx].image_url} alt={gallery[lightboxIdx].caption || 'Trabajo'} onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '78vh', borderRadius: 12, objectFit: 'contain' }} />
          {gallery.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => (i + 1) % gallery.length) }}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>›</button>
          )}
          <div style={{ marginTop: 14, textAlign: 'center' }}>
            {gallery[lightboxIdx].caption && <p style={{ color: '#fff', fontSize: 14, margin: '0 0 4px' }}>{gallery[lightboxIdx].caption}</p>}
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0 }}>{lightboxIdx + 1} / {gallery.length}</p>
          </div>
        </div>
      )}

      {/* Barra de acción fija */}
      <div className="tp-actionbar">
        <button className="tp-btn" style={{ background: '#25d366', boxShadow: '0 10px 24px rgba(37,211,102,.3)' }}
          onClick={() => window.open(`https://wa.me/${(tech.public_whatsapp || '').replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(tech.full_name)},%20vi%20tu%20perfil%20en%20Tecnifix`, '_blank')}>
          📱 WhatsApp
        </button>
        <button className="tp-btn" onClick={agendar}>{t.requestService}</button>
      </div>

      {/* ── MODALES ── */}
      {showRequest && (
        <RequestModal tech={tech} catalog={catalog} onClose={() => setShowRequest(false)}
          onSuccess={() => { setShowRequest(false); showToast(t.requestSent) }}
          t={t} th={th} user={user}
        />
      )}
      {showPayment && (
        <YappyModal tech={tech} onClose={() => setShowPayment(false)}
          onSuccess={() => { setShowPayment(false); showToast(t.paymentRecorded) }}
          t={t} th={th} user={user}
        />
      )}
      {showReview && (
        <ReviewModal tech={tech} onClose={() => setShowReview(false)}
          onSuccess={() => {
            setShowReview(false)
            // Las reseñas pasan por moderación: no aparecen al instante.
            showToast('✅ ¡Gracias! Tu reseña se publicará tras una breve revisión.')
            reviewsApi.listForTechnician(tech.user_id).then(setReviewList).catch(() => { })
          }}
          t={t} th={th} user={user}
        />
      )}
    </div>
  )
}

// ── Sub-componentes ──────────────────────────────────────────

function Card({ title, children }) {
  const { th } = useApp()
  return (
    <div style={{ background: th.surface, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${th.border}` }}>
      <p style={{ fontWeight: 700, fontSize: 15, color: th.text, margin: '0 0 12px' }}>{title}</p>
      {children}
    </div>
  )
}

function Row({ label, val }) {
  const { th } = useApp()
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${th.border}` }}>
      <span style={{ fontSize: 13, color: th.textSec }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{val}</span>
    </div>
  )
}

function SocialLink({ icon, label, href, val }) {
  const { th } = useApp()
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${th.border}`, textDecoration: 'none' }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 13, color: th.primary, fontWeight: 500 }}>{val}</span>
    </a>
  )
}

function RequestModal({ tech, catalog, onClose, onSuccess, t, th, user }) {
  const [step, setStep] = useState(1) // 1=form, 2=contract, 3=done
  const [selectedItem, setSelectedItem] = useState(null) // item del catálogo
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [address, setAddress] = useState('')
  const [price, setPrice] = useState(String(tech.min_price || ''))
  const [payMethod, setPayMethod] = useState('yappy')
  const [loading, setLoading] = useState(false)
  const [request, setRequest] = useState(null)
  const [contractAccepted, setContractAccepted] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  const submitRequest = async () => {
    setErrMsg('')
    if (!user?.id) { setErrMsg('Debes iniciar sesión para enviar una solicitud.'); return }
    if (!title.trim()) { setErrMsg('Escribe un título para el servicio.'); return }
    setLoading(true)
    try {
      const req = await serviceRequests.create({
        client_id: user.id,
        technician_id: tech.user_id,
        title: title.trim(),
        description: desc.trim(),
        address: address.trim(),
        agreed_price: parseFloat(price) || null,
        payment_method: payMethod,
        status: 'pending',
        catalog_item_id: selectedItem?.id ?? null,
      })
      setRequest(req)
      setStep(2)
    } catch (e) {
      // Mostrar el error real (RLS, columna faltante, etc.) en vez de ocultarlo.
      console.error('Error creando solicitud:', e)
      setErrMsg(e?.message ? `No se pudo enviar: ${e.message}` : (t.requestError || 'No se pudo enviar la solicitud.'))
    } finally {
      setLoading(false)
    }
  }

  const signContract = async () => {
    setLoading(true)
    try {
      await contracts.create({
        serviceRequestId: request.id,
        clientId: user.id,
        technicianId: tech.user_id,
        clientIp: null,
      })
      setContractAccepted(true)
      setStep(3)
    } catch (e) {
      alert('Error al firmar contrato.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={step === 1 ? t.newRequest : step === 2 ? `📄 ${t.serviceContract}` : '✅'} onClose={onClose}>
      {step === 1 && (
        <>
          {/* Selector de catálogo de servicios */}
          {catalog && catalog.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: th.text, margin: '0 0 8px' }}>
                📋 Elegir del catálogo (opcional)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {/* Opción "otro servicio" */}
                <button onClick={() => { setSelectedItem(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    border: `2px solid ${!selectedItem ? th.primary : th.border}`,
                    background: !selectedItem ? th.primaryLight : 'transparent'
                  }}>
                  <span style={{ fontSize: 20 }}>✏️</span>
                  <span style={{
                    fontSize: 13, fontWeight: !selectedItem ? 700 : 500,
                    color: !selectedItem ? th.primaryText : th.text
                  }}>
                    Describir mi propio servicio
                  </span>
                </button>
                {catalog.map(item => (
                  <button key={item.id}
                    onClick={() => {
                      setSelectedItem(item)
                      setTitle(item.name)
                      setDesc(item.description || '')
                      setPrice(String(item.price))
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      border: `2px solid ${selectedItem?.id === item.id ? th.primary : th.border}`,
                      background: selectedItem?.id === item.id ? th.primaryLight : 'transparent'
                    }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: '0 0 1px', fontSize: 13, fontWeight: 600,
                        color: selectedItem?.id === item.id ? th.primaryText : th.text
                      }}>
                        {item.name}
                      </p>
                      {item.description && (
                        <p style={{ margin: 0, fontSize: 11, color: th.textSec }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{
                        margin: 0, fontSize: 15, fontWeight: 900,
                        color: th.primaryText
                      }}>${Number(item.price).toFixed(2)}</p>
                      <p style={{ margin: 0, fontSize: 10, color: th.textSec }}>
                        {item.price_unit}
                      </p>
                    </div>
                    {selectedItem?.id === item.id && (
                      <span style={{ color: th.primary, fontSize: 18, flexShrink: 0 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Input label={t.requestTitle} value={title} onChange={setTitle} placeholder="Ej: Reparación eléctrica en sala" />
          <Input label={t.requestDesc} value={desc} onChange={setDesc} placeholder="Describe el problema..." rows={3} />
          <Input label={t.requestAddress} value={address} onChange={setAddress} placeholder="Calle, barrio..." />
          <Input label={t.agreedPrice} value={price} onChange={setPrice} type="number" icon="💲" />
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: th.text, marginBottom: 6 }}>{t.paymentMethod}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['yappy', '💚 Yappy'], ['cash', '💵 ' + t.cash], ['transfer', '🏦 ' + t.transfer]].map(([v, label]) => (
                <button key={v} onClick={() => setPayMethod(v)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: `1.5px solid ${payMethod === v ? th.primary : th.border}`, background: payMethod === v ? th.primaryLight : 'transparent', color: payMethod === v ? th.primaryText : th.textSec, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {errMsg && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#991b1b', background: '#fef2f2', border: '1px solid #fca5a5', padding: '10px 12px', borderRadius: 10, lineHeight: 1.5 }}>
              ⚠️ {errMsg}
            </p>
          )}
          {errMsg && (
            <p style={{ color: th.red, fontSize: 13, margin: '0 0 12px', background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 12px', borderRadius: 10, lineHeight: 1.5 }}>
              ⚠️ {errMsg}
            </p>
          )}
          <Btn onClick={submitRequest} loading={loading} disabled={!title.trim()}>{t.sendRequest} →</Btn>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ background: th.surface2, borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 13, color: th.textSec, lineHeight: 1.8, maxHeight: 260, overflowY: 'auto' }}>
            <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap', fontSize: 12 }}>
              {contracts.TERMS_TEXT}
            </pre>
          </div>
          <Btn onClick={signContract} loading={loading}>{t.acceptTerms}</Btn>
        </>
      )}

      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
          <p style={{ fontWeight: 800, fontSize: 18, color: th.primary, margin: '0 0 6px' }}>{t.contractAccepted}</p>
          <p style={{ fontSize: 14, color: th.textSec, marginBottom: 24 }}>{t.nowContact}</p>
          <Btn variant="whatsapp"
            onClick={() => window.open(`https://wa.me/${(tech.public_whatsapp || '').replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(tech.full_name)},%20firmé%20el%20contrato%20en%20Tecnifix.%20Necesito%20tu%20servicio.`, '_blank')}>
            {t.openWhatsApp}
          </Btn>
          <div style={{ height: 10 }} />
          <Btn variant="ghost" onClick={onSuccess}>{t.cancel === 'Cancel' ? 'Close' : 'Cerrar'}</Btn>
        </div>
      )}
    </Modal>
  )
}

function YappyModal({ tech, onClose, onSuccess, t, th, user }) {
  const [amount, setAmount] = useState(String(tech.min_price || ''))
  const [desc, setDesc] = useState(`Servicio de ${tech.professional_title || 'técnico'} - Tecnifix`)
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [paid, setPaid] = useState(false)

  const yappyPhone = (tech.public_whatsapp || '').replace(/\D/g, '')
  const deepLink = `yappy://pay?phone=${yappyPhone}&amount=${amount}&description=${encodeURIComponent(desc.slice(0, 80))}`
  const webLink = `https://yappy.com.pa/pay?phone=${yappyPhone}&amount=${amount}&description=${encodeURIComponent(desc.slice(0, 80))}`

  const confirmPayment = async () => {
    setLoading(true)
    try {
      await payments.record({
        serviceRequestId: null,
        payerId: user.id,
        technicianId: tech.user_id,
        amount: parseFloat(amount),
        yappyPhone,
        yappyReference: reference || null,
      })
      setPaid(true)
    } catch {
      alert('Error al registrar pago.')
    } finally {
      setLoading(false)
    }
  }

  if (paid) return (
    <Modal title={t.paymentTitle} onClose={onSuccess}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>💚</div>
        <p style={{ fontWeight: 800, fontSize: 18, color: th.primary }}>{t.paymentRecorded}</p>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: th.textSec }}>
          El técnico debe confirmar que recibió el dinero en su cuenta Yappy.
        </p>
        <Btn onClick={onSuccess} style={{ marginTop: 20 }}>Cerrar</Btn>
      </div>
    </Modal>
  )

  return (
    <Modal title={`💳 ${t.payWithYappy}`} onClose={onClose}>
      <div style={{ background: '#f0fdf4', borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid #bbf7d0' }}>
        <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#1e40af', fontSize: 14 }}>💚 Pago por Yappy</p>
        <p style={{ margin: 0, fontSize: 12, color: '#1e40af' }}>
          Yappy es la billetera digital más usada en Panamá. El pago va directo al técnico.
        </p>
      </div>
      <Input label={t.paymentAmount} value={amount} onChange={setAmount} type="number" icon="💲" />
      <Input label={t.paymentDesc} value={desc} onChange={setDesc} placeholder="Descripción del servicio" />
      <Input label="Número Yappy del técnico" value={yappyPhone} onChange={() => { }} placeholder="+507..." />
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <Btn variant="whatsapp" onClick={() => { window.location.href = deepLink; setTimeout(() => window.open(webLink, '_blank'), 1500) }}>
          💚 {t.openYappy}
        </Btn>
      </div>
      <div style={{ height: 1, background: th.border, margin: '16px 0' }} />
      <p style={{ fontSize: 13, color: th.textSec, margin: '0 0 10px' }}>
        ¿Ya pagaste? Confirma aquí para registrar el pago y notificar al técnico.
      </p>
      <Input label="Referencia de pago Yappy (opcional)" value={reference} onChange={setReference} placeholder="Ej: YAP-123456" />
      <Btn onClick={confirmPayment} loading={loading}>{t.confirmPayment}</Btn>
    </Modal>
  )
}

function ReviewModal({ tech, onClose, onSuccess, t, th, user }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      await reviewsApi.create({
        reviewerId: user.id,
        technicianId: tech.user_id,
        rating,
        comment: comment.trim(),
      })

      try {
        let xp = rating >= 5 ? 30 : (rating === 4 ? 15 : 5);
        await gamificationApi.addXp(tech.user_id, xp);
      } catch (e) {
        console.warn('Could not add gamification XP', e);
      }

      onSuccess()
    } catch {
      alert('Error al publicar reseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`✍️ ${t.writeReview}`} onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: th.text, margin: '0 0 10px' }}>{t.yourRating}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <button key={i} onClick={() => setRating(i)}
              style={{ background: 'none', border: 'none', fontSize: 36, cursor: 'pointer', transition: 'transform 0.1s', transform: i <= rating ? 'scale(1.1)' : 'scale(1)', color: i <= rating ? '#fbbf24' : '#d1d5db' }}>
              ★
            </button>
          ))}
        </div>
      </div>
      <Input label={t.yourComment} value={comment} onChange={setComment} placeholder="Cuéntanos tu experiencia..." rows={4} />
      <Btn onClick={submit} loading={loading} disabled={!comment.trim()}>{t.submitReview}</Btn>
    </Modal>
  )
}
