/* ════════════════════════════════════════════════════════════════════════
   HERO  ·  Tecni Fix
   Rediseño tipo "órbita" (referencia visual: Payoneer) adaptado a Tecni Fix.
   - Fondo blanco limpio + gran curva con gradiente de marca.
   - Avatares de TÉCNICOS flotando sobre la curva (no usuarios financieros):
     cada uno con un chip de oficio (⚡❄️🔧📱💻📷) y un badge flotante.
   - Tarjetas pequeñas (verificado, calificación, ubicación, 24/7…).
   - Navbar superior propia (logo, menú, iniciar sesión + Regístrate).
   - Listo para datos reales: usa `technicians` (avatar_url desde Supabase)
     y, si no hay, cae a datos mock con imágenes locales en /images/technicians.
   ════════════════════════════════════════════════════════════════════════ */
import { DiaText } from './ui/dia-text.jsx'

const NAVY = '#102840'
const NAVY_2 = '#1c3a5e'
const GOLD = '#FFD400'
const INK = '#0f172a'
const GRAY = '#4b5563'

const NAV_LINKS = [
  { label: 'Servicios', section: 'services' },
  { label: 'Técnicos', screen: 'search' },
  { label: 'Cómo funciona', section: 'about' },
  { label: 'Verificación', section: 'guarantee' },
  { label: 'Soporte', section: 'contact' },
]

/* Oficios + colores de chip. El orden define la posición sobre la curva (A→F). */
const TRADES = [
  { key: 'electricidad', role: 'Electricista',   glyph: '⚡', chip: '#facc15', img: '/images/technicians/electrician.jpg',   badge: 'Verificado', badgeIcon: 'shield' },
  { key: 'climatizacion', role: 'Técnico en A/C', glyph: '❄️', chip: '#38bdf8', img: '/images/technicians/ac-technician.jpg', badge: '4.9 ★',      badgeIcon: 'star' },
  { key: 'plomeria',      role: 'Plomero',        glyph: '🔧', chip: '#34d399', img: '/images/technicians/plumber.jpg',       badge: 'Disponible', badgeIcon: 'dot' },
]

/* 3 asientos sobre el arco INFERIOR de la curva (cubic Bézier U), en % del lienzo.
   Calculados sobre la curva real (t=0.30 / 0.50 / 0.70) para que los avatares
   queden "sentados" en la banda, centrados-abajo y nunca en las esquinas. */
const SEATS = [
  { x: 23.5, y: 80.5, side: 'left',  cls: 'a1' }, // lado izquierdo (subiendo)
  { x: 50.0, y: 92.6, side: 'top',   cls: 'a2' }, // base del óvalo
  { x: 76.5, y: 80.5, side: 'right', cls: 'a3' }, // lado derecho (subiendo)
]

/* Dos tarjetas pequeñas (solo escritorio amplio), nítidas, en la zona superior. */
const INFO_CARDS = [
  { icon: 'shield', text: 'Técnico verificado', x: 12, y: 26, cls: 'c1' },
  { icon: 'star',   text: '4.9 promedio',       x: 88, y: 23, cls: 'c2' },
]

function MiniIcon({ kind }) {
  const common = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (kind === 'shield') return <svg {...common}><path d="M12 3 4 6v6c0 5 3.4 7.7 8 9 4.6-1.3 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>
  if (kind === 'star')   return <svg {...common} fill="currentColor" stroke="none"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.6L12 18.9 6.1 21.6l1.2-6.6L2.5 9.4l6.6-.9 2.9-6Z" /></svg>
  if (kind === 'pin')    return <svg {...common}><path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
  if (kind === 'clock')  return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  if (kind === 'wrench') return <svg {...common}><path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.3 2.3-2-2 2.3-2.3Z" /></svg>
  if (kind === 'bolt')   return <svg {...common} fill="currentColor" stroke="none"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></svg>
  return <span style={{ width: 6, height: 6, borderRadius: 6, background: '#22c55e', display: 'inline-block' }} />
}

/* Avatar de respaldo (nunca se ve roto): SVG con inicial sobre fondo de marca. */
function initialsAvatar(name = 'T') {
  const i = (name.trim()[0] || 'T').toUpperCase()
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='120' height='120' fill='%23102840'/><text x='50%25' y='52%25' font-size='54' fill='%23FFD400' text-anchor='middle' dominant-baseline='central' font-family='Inter,Arial,sans-serif' font-weight='800'>${i}</text></svg>`
  return `data:image/svg+xml,${svg}`
}

export function HeroSection({ navigate, user }) {
  // 3 avatares fijos y nítidos (sin carga asíncrona = sin parpadeo al entrar).
  // Las imágenes viven en /public/images/technicians y pueden reemplazarse por
  // fotos reales/desde la base de datos cuando se desee.
  const avatars = TRADES
  const userName = user?.full_name || user?.email || 'Mi cuenta'
  const userInitial = (userName.trim()[0] || 'U').toUpperCase()
  const userRoleLabel = user?.role === 'technician'
    ? 'Técnico'
    : user?.role === 'admin'
      ? 'Dueño'
      : 'Cliente'

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const goLink = (item) => {
    if (item.screen) { navigate(item.screen); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    else scrollToSection(item.section)
  }
  const goRegister = () => { navigate('register'); window.scrollTo({ top: 0 }) }
  const goTechRegister = () => { navigate(user ? 'edit-tech-profile' : 'register'); window.scrollTo({ top: 0 }) }
  const goAccount = () => {
    navigate(user?.role === 'admin' ? 'admin' : 'profile')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className="tf-hero">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .tf-hero{ --navy:${NAVY}; --gold:${GOLD}; --ink:${INK}; --gray:${GRAY};
          position:relative; isolation:isolate; overflow:hidden;
          background:radial-gradient(120% 80% at 50% -10%, #f4f9ff 0%, #ffffff 46%, #f8fbff 100%);
          font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif; color:var(--ink);
          min-height:clamp(640px,92vh,1000px); display:flex; flex-direction:column; }
        .tf-hero *{ box-sizing:border-box; }

        /* ── Navbar ───────────────────────────────────────────── */
        .tf-nav{ position:relative; z-index:6; width:min(94vw,1240px); margin:0 auto;
          display:flex; align-items:center; gap:24px; padding:22px 4px 6px; }
        .tf-brand{ display:flex; align-items:center; gap:11px; border:0; background:none; cursor:pointer; padding:0; }
        .tf-brand-badge{ width:40px; height:40px; border-radius:12px; flex:0 0 auto;
          background:linear-gradient(140deg,var(--navy),#1c3a5e); display:grid; place-items:center;
          box-shadow:0 6px 16px rgba(16,40,64,.28); color:var(--gold); }
        .tf-brand-badge svg{ width:22px; height:22px; }
        .tf-brand-word{ font-size:23px; font-weight:800; letter-spacing:-.5px; line-height:1; color:var(--navy); }
        .tf-brand-word b{ color:var(--gold); -webkit-text-stroke:.6px #e3b800; font-weight:800; }
        .tf-nav-menu{ display:flex; align-items:center; gap:6px; margin:0 auto; }
        .tf-nav-link{ border:0; background:transparent; color:#334155; font-size:15px; font-weight:600;
          padding:9px 14px; border-radius:10px; cursor:pointer; line-height:1; transition:.18s; white-space:nowrap; }
        .tf-nav-link:hover{ background:#eef4ff; color:var(--navy); }
        .tf-nav-actions{ display:flex; align-items:center; gap:10px; }
        .tf-login{ border:0; background:transparent; color:var(--navy); font-size:15px; font-weight:700; cursor:pointer; padding:10px 12px; border-radius:10px; }
        .tf-login:hover{ background:#eef4ff; }
        .tf-pill{ border:0; background:var(--navy); color:#fff; font-size:15px; font-weight:700; cursor:pointer;
          padding:12px 22px; border-radius:999px; display:inline-flex; align-items:center; gap:8px;
          box-shadow:0 8px 20px rgba(16,40,64,.26); transition:.18s; }
        .tf-pill:hover{ transform:translateY(-1px); box-shadow:0 12px 26px rgba(16,40,64,.34); }
        .tf-pill svg{ width:16px; height:16px; }
        .tf-user-chip{ border:1px solid #dbe7f5; background:#fff; color:var(--navy); cursor:pointer;
          min-height:48px; border-radius:999px; padding:6px 14px 6px 7px; display:inline-flex;
          align-items:center; gap:10px; box-shadow:0 10px 24px rgba(16,40,64,.10); }
        .tf-user-avatar{ width:34px; height:34px; border-radius:50%; display:grid; place-items:center;
          overflow:hidden; flex:0 0 auto; color:var(--navy); background:linear-gradient(135deg,var(--gold),#fff0a3);
          font-size:14px; font-weight:900; box-shadow:inset 0 0 0 2px #fff; }
        .tf-user-avatar img{ width:100%; height:100%; object-fit:cover; display:block; }
        .tf-user-meta{ display:flex; flex-direction:column; align-items:flex-start; min-width:0; line-height:1.05; }
        .tf-user-meta strong{ max-width:145px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
          font-size:13px; font-weight:900; color:var(--navy); }
        .tf-user-meta span{ margin-top:4px; font-size:11px; font-weight:800; color:#64748b; }

        /* ── Lienzo de la órbita (curva + avatares + tarjetas) ── */
        .tf-canvas{ position:absolute; inset:0; z-index:1; pointer-events:none; }
        .tf-arc{ position:absolute; inset:0; width:100%; height:100%;
          filter:drop-shadow(0 24px 40px rgba(16,40,64,.18)); }

        /* avatar técnico animado sobre la curva */
        .tf-av{ position:absolute; transform:translate(-50%,-50%); width:var(--s,52px); height:var(--s,52px); }
        .tf-av-img{ width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;
          border:2px solid #fff; background:#e8eef6; box-shadow:0 14px 30px rgba(16,40,64,.26); }
        .tf-av-chip{ position:absolute; right:-6px; bottom:-6px; width:24px; height:24px; border-radius:50%;
          display:grid; place-items:center; font-size:12px; background:#fff; border:1.5px solid #fff;
          box-shadow:0 6px 14px rgba(16,40,64,.25); }
        .tf-av-badge{ position:absolute; display:inline-flex; align-items:center; gap:5px; white-space:nowrap;
          background:#fff; color:var(--navy); font-size:12px; font-weight:700; line-height:1;
          padding:7px 10px; border-radius:999px; box-shadow:0 8px 18px rgba(16,40,64,.18); }
        .tf-av-badge svg{ color:#16a34a; }
        .tf-av-badge .st{ color:var(--gold); }
        .tf-av-badge.right{ left:calc(100% + 8px); top:50%; transform:translateY(-50%); }
        .tf-av-badge.left{ right:calc(100% + 8px); top:50%; transform:translateY(-50%); }
        .tf-av-badge.top{ left:50%; bottom:calc(100% + 8px); transform:translateX(-50%); }
        .tf-av-badge.bottom{ left:50%; top:calc(100% + 8px); transform:translateX(-50%); }

        /* tarjeta pequeña (nítida, sin desenfoque ni animación) */
        .tf-card{ position:absolute; transform:translate(-50%,-50%);
          display:inline-flex; align-items:center; gap:9px; background:#fff;
          border:1px solid #eef2f8; border-radius:14px; padding:10px 14px;
          box-shadow:0 16px 36px rgba(16,40,64,.14); }
        .tf-card-ic{ width:30px; height:30px; border-radius:9px; display:grid; place-items:center; flex:0 0 auto; color:#fff; }
        .tf-card span{ font-size:13.5px; font-weight:700; color:var(--navy); white-space:nowrap; }
        .tf-card.c1 .tf-card-ic{ background:linear-gradient(135deg,#16a34a,#22c55e); }
        .tf-card.c2 .tf-card-ic{ background:linear-gradient(135deg,#f59e0b,var(--gold)); }

        /* ── Contenido central ────────────────────────────────── */
        .tf-inner{ position:relative; z-index:4; width:min(92vw,900px); text-align:center;
          margin:clamp(24px,6vh,72px) auto auto; padding:0 0 clamp(80px,12vh,140px); animation:tfRise .7s ease both; }
        .tf-eyebrow{ display:inline-flex; align-items:center; gap:8px; background:#fff; border:1px solid #e6edf6;
          color:var(--navy); font-size:13px; font-weight:700; padding:7px 14px; border-radius:999px;
          box-shadow:0 6px 16px rgba(16,40,64,.08); margin-bottom:22px; }
        .tf-eyebrow b{ color:#16a34a; display:inline-flex; }
        .tf-h1{ margin:0; font-weight:800; letter-spacing:-1.5px; line-height:1.04; color:var(--ink);
          font-size:clamp(34px,5.4vw,68px); }
        .tf-h1 .g{ position:relative; color:var(--navy); white-space:nowrap; }
        .tf-h1 .g::after{ content:''; position:absolute; left:0; right:0; bottom:.08em; height:.34em; z-index:-1;
          background:linear-gradient(90deg,rgba(255,212,0,.55),rgba(255,212,0,.9)); border-radius:6px; }
        .tf-sub{ margin:22px auto 0; max-width:660px; color:var(--gray); font-size:clamp(16px,1.5vw,20px); line-height:1.55; }
        .tf-cta{ margin:34px 0 0; display:flex; align-items:center; justify-content:center; gap:14px; flex-wrap:wrap; }
        .tf-btn{ border:0; cursor:pointer; font-size:16px; font-weight:700; border-radius:999px;
          padding:16px 30px; display:inline-flex; align-items:center; gap:9px; transition:.18s; line-height:1; }
        .tf-btn svg{ width:18px; height:18px; }
        .tf-btn-primary{ background:var(--gold); color:var(--navy); box-shadow:0 12px 26px rgba(255,212,0,.45); }
        .tf-btn-primary:hover{ transform:translateY(-2px); box-shadow:0 16px 32px rgba(255,212,0,.55); }
        .tf-btn-ghost{ background:#fff; color:var(--navy); border:1.5px solid #d7e0ee; box-shadow:0 8px 20px rgba(16,40,64,.08); }
        .tf-btn-ghost:hover{ border-color:var(--navy); transform:translateY(-2px); }
        .tf-trust{ margin:16px 0 0; display:inline-flex; align-items:center; gap:14px; flex-wrap:wrap; justify-content:center;
          color:#64748b; font-size:13.5px; font-weight:600; }
        .tf-trust i{ width:5px; height:5px; border-radius:5px; background:var(--gold); display:inline-block; }
        .tf-trust span{ display:inline-flex; align-items:center; gap:8px; }

        /* ── Animación (solo una entrada suave del texto, una sola vez) ── */
        @keyframes tfRise{ from{ opacity:0; transform:translateY(20px) } to{ opacity:1; transform:none } }

        /* ── Animaciones Nuevas (Gradient y Avatares) ── */
        @keyframes colorCycle {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
        .tf-color-line {
          animation: colorCycle 6s linear infinite;
        }

        @keyframes popNormal {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.5); filter: blur(8px); }
          10%  { opacity: 1; transform: translate(-50%, -50%) scale(1.1); filter: blur(0px); }
          15%  { opacity: 1; transform: translate(-50%, -50%) scale(1); filter: blur(0px); }
          80%  { opacity: 1; transform: translate(-50%, -50%) scale(1); filter: blur(0px); }
          85%  { opacity: 1; transform: translate(-50%, -50%) scale(1.05); filter: blur(2px); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); filter: blur(10px); }
        }

        @keyframes popBlurry {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.8); filter: blur(12px); }
          20%  { opacity: 0.8; transform: translate(-50%, -50%) scale(1); filter: blur(4px); }
          40%  { opacity: 1; transform: translate(-50%, -50%) scale(1.05); filter: blur(0px); }
          60%  { opacity: 0.9; transform: translate(-50%, -50%) scale(1); filter: blur(6px); }
          80%  { opacity: 0; transform: translate(-50%, -50%) scale(0.9); filter: blur(12px); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); filter: blur(15px); }
        }

        @keyframes floatOrb {
          0% { transform: translateY(0) translateX(0) scale(1); }
          100% { transform: translateY(-40px) translateX(20px) scale(1.1); }
        }
        .tf-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(28px);
          opacity: 0.7;
          z-index: 0;
          animation: floatOrb 8s ease-in-out infinite alternate;
          pointer-events: none;
        }
        .orb-1 { width: 140px; height: 140px; background: #FF3300; left: 10%; top: 30%; animation-delay: 0s; }
        .orb-2 { width: 180px; height: 180px; background: #FFCC00; left: 45%; top: 55%; animation-delay: -2s; animation-duration: 9s; }
        .orb-3 { width: 120px; height: 120px; background: #00B366; right: 15%; top: 25%; animation-delay: -4s; animation-duration: 11s; }
        .orb-4 { width: 160px; height: 160px; background: #0080FF; right: 35%; top: 60%; animation-delay: -1s; animation-duration: 7s; }

        /* ── Responsive ───────────────────────────────────────── */
        @media (max-width:1080px){
          .tf-av{ --s:64px; }
          /* las tarjetas se reservan para escritorio amplio; en pantallas medias
             los badges de cada avatar ya comunican verificado/calificación. */
          .tf-card{ display:none; }
        }
        @media (max-width:760px){
          .tf-nav-menu{ display:none; }
          .tf-nav{ padding:16px 4px 4px; }
          .tf-login{ display:none; }
          .tf-user-chip{ padding:6px; min-height:44px; }
          .tf-user-meta{ display:none; }
          /* Ensancha el lienzo para que los lados de la curva salgan de pantalla
             y solo el arco inferior quede DETRÁS/DEBAJO del contenido (más limpio). */
          .tf-canvas{ left:-16%; right:-16%; width:132%; }
          .tf-av{ --s:58px; }
          .tf-av .tf-av-badge{ display:none; }
          .tf-av.hide-sm{ display:none; }                     /* deja 2-3 avatares en móvil */
          /* el título móvil es alto: se oculta la línea de confianza para que
             los avatares del arco no queden tapados por el texto (el eyebrow
             ya dice "Técnicos verificados en todo Panamá"). */
          .tf-trust{ display:none; }
          .tf-inner{ width:92vw; padding-top:8px; }
          .tf-btn{ width:100%; max-width:340px; justify-content:center; }
        }
        @media (prefers-reduced-motion:reduce){
          .tf-inner{ animation:none !important; }
        }
      `}</style>

      {/* ── NAVBAR ───────────────────────────────────────────── */}
      <header className="tf-nav">
        <button className="tf-brand" onClick={() => navigate('home')} aria-label="Tecni Fix inicio">
          <span className="tf-brand-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.3 2.3-2-2 2.3-2.3Z" />
            </svg>
          </span>
          <span className="tf-brand-word">Tecni<b>Fix</b></span>
        </button>

        <nav className="tf-nav-menu">
          {NAV_LINKS.map((item) => (
            <button key={item.label} className="tf-nav-link" onClick={() => goLink(item)}>{item.label}</button>
          ))}
        </nav>

        <div className="tf-nav-actions">
          {user ? (
            <button className="tf-user-chip" onClick={goAccount} title="Ir a mi cuenta">
              <span className="tf-user-avatar">
                {user.avatar_url ? <img src={user.avatar_url} alt="" /> : userInitial}
              </span>
              <span className="tf-user-meta">
                <strong>{userName}</strong>
                <span>Sesión activa · {userRoleLabel}</span>
              </span>
            </button>
          ) : (
            <>
              <button className="tf-login" onClick={() => navigate('login')}>Iniciar sesión</button>
              <button className="tf-pill" onClick={goRegister}>
                Regístrate
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── LIENZO: curva + avatares + tarjetas (decorativo) ── */}
      <div className="tf-canvas" aria-hidden="true">
        <svg className="tf-arc" viewBox="0 0 1180 560" preserveAspectRatio="none">
          <defs>
            {/* Degradado tipo espectro que recorre el óvalo al estilo Payoneer */}
            <linearGradient id="tfSpectrum" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#FF3300" />
              <stop offset="20%"  stopColor="#FF8800" />
              <stop offset="40%"  stopColor="#FFCC00" />
              <stop offset="60%"  stopColor="#99CC00" />
              <stop offset="80%"  stopColor="#00B366" />
              <stop offset="100%" stopColor="#0080FF" />
            </linearGradient>
            <linearGradient id="orbGrad1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00B366" />
              <stop offset="100%" stopColor="#0080FF" />
            </linearGradient>
            <linearGradient id="orbGrad2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFD400" />
              <stop offset="100%" stopColor="#FF4D00" />
            </linearGradient>
            <linearGradient id="orbGrad3" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#99CC00" />
              <stop offset="100%" stopColor="#00B366" />
            </linearGradient>
          </defs>
          {/* aros tenues de fondo → sensación de órbita */}
          <path id="orbitPath1" d="M16 20 C 16 740, 1164 740, 1164 20" fill="none" stroke="#e8eef6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <path id="orbitPath2" d="M74 20 C 74 540, 1106 540, 1106 20" fill="none" stroke="#eef3fa" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          {/* banda principal: óvalo grueso con degradado que va cambiando de color */}
          <path className="tf-color-line" d="M-50 -20 C 40 720, 1140 720, 1230 -20" fill="none" stroke="url(#tfSpectrum)" strokeWidth="60" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          
          {/* Bolitas tren animadas sobre las líneas grises (más lentas) */}
          <circle r="16" fill="url(#orbGrad1)">
            <animateMotion dur="60s" repeatCount="indefinite" begin="-5s">
              <mpath href="#orbitPath1" />
            </animateMotion>
          </circle>
          <circle r="12" fill="url(#orbGrad2)">
            <animateMotion dur="75s" repeatCount="indefinite" begin="-20s">
              <mpath href="#orbitPath2" />
            </animateMotion>
          </circle>
        </svg>

        {/* Orbes borrosos flotantes (desenfocados) */}
        <div className="tf-orb orb-1" />
        <div className="tf-orb orb-2" />
        <div className="tf-orb orb-3" />
        <div className="tf-orb orb-4" />

        {/* avatares dinámicos sobre la curva */}
        {(() => {
          const DYNAMIC_AVATARS = [
            { ...TRADES[0], x: 12, y: 46, side: 'right', delay: '0s', dur: '12s', anim: 'popNormal', badge: 'Electricidad' },
            { ...TRADES[1], x: 23.5, y: 80.5, side: 'left', delay: '3s', dur: '15s', anim: 'popBlurry', badge: 'Verificado' },
            { ...TRADES[2], x: 50.0, y: 92.6, side: 'top', delay: '1s', dur: '10s', anim: 'popNormal', badge: '4.9 ★' },
            { ...TRADES[0], role: 'Computadoras', glyph: '💻', img: '/images/technicians/electrician.jpg', x: 76.5, y: 80.5, side: 'right', delay: '5s', dur: '14s', anim: 'popNormal', badge: 'Cerca de ti' },
            { ...TRADES[1], role: 'Cámaras', glyph: '📷', img: '/images/technicians/ac-technician.jpg', x: 88, y: 46, side: 'left', delay: '2s', dur: '13s', anim: 'popBlurry', badge: '24/7' },
          ]
          return DYNAMIC_AVATARS.map((a, i) => (
            <div key={i} className={`tf-av ${i > 2 ? 'hide-sm' : ''}`} style={{ left: `${a.x}%`, top: `${a.y}%`, opacity: 0, animation: `${a.anim} ${a.dur} infinite ${a.delay}` }}>
              <img
                className="tf-av-img"
                src={a.img}
                alt={a.role}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = initialsAvatar(a.role) }}
              />
              <span className="tf-av-chip" style={{ background: a.chip }}>{a.glyph}</span>
              <span className={`tf-av-badge ${a.side}`}>
                {a.badgeIcon === 'star'
                  ? <span className="st"><MiniIcon kind="star" /></span>
                  : <MiniIcon kind={a.badgeIcon} />}
                {a.badge}
              </span>
            </div>
          ))
        })()}

      </div>

      {/* ── CONTENIDO ────────────────────────────────────────── */}
      <div className="tf-inner">
        <h1 className="tf-h1">
          Encuentra técnicos <span className="g"><DiaText text="verificados" repeat={false} once={false} textColor="#102840" /></span> en todo Panamá desde un solo lugar
        </h1>
        <p className="tf-sub">
          Con Tecni Fix puedes buscar, comparar y contactar técnicos confiables según tu ubicación,
          servicio, calificación y disponibilidad.
        </p>
        <div className="tf-cta">
          <button className="tf-btn tf-btn-primary" onClick={() => navigate('search')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
            Buscar técnico
          </button>
          <button className="tf-btn tf-btn-ghost" onClick={goTechRegister}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.3 2.3-2-2 2.3-2.3Z" /></svg>
            Registrarme como técnico
          </button>
        </div>
      </div>
    </section>
  )
}
