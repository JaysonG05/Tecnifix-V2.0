import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { supabase } from '../lib/supabase.js'
import { TestimonialSlider } from '../components/ui/testimonial-slider-1.jsx'
import { HeroSection } from '../components/HeroSection.jsx'

const NAVY = '#112740'
const NAVY_DARK = '#0d2035'
const GOLD = '#f8db13'
const TEXT = '#888888'
// TODO (Task #4): reemplazar por el WhatsApp/teléfono real de Tecnifix en Panamá.
const PHONE = '+507 0000-0000'
// Imágenes auto-hospedadas en /public/dewatt (antes en CDN externo de krakenbox).
// NOTA: son imágenes de la plantilla DEWATT/Envato — reemplazar por fotos propias
// de Tecnifix o stock con licencia (Unsplash/Pexels) antes de producción.
const ASSET = '/dewatt'
const img = (name) => `${ASSET}/${name}`

const FEATURE_CARDS = [
  ['4APC6K8a.png', 'Técnicos verificados', 'Perfiles con experiencia, reseñas y disponibilidad real.'],
  ['4APC6K8b.png', 'Cobertura nacional', 'Busca ayuda por provincia, ciudad u oficio en todo Panamá.'],
  ['4APC6K8c.png', 'Oficios para todo', 'Electricidad, plomería, A/C, limpieza, pintura, tecnología y más.'],
  ['4APC6K8d.png', 'Contacto directo', 'Compara opciones y solicita asistencia sin perder tiempo.'],
]

const PROJECTS = [
  ['V9QWUW4.jpg', 'Electricidad residencial y comercial', 'Instalaciones, reparaciones, tableros, luces y emergencias.'],
  ['J6VRWH5.jpg', 'Plomería, pintura y albañilería', 'Soluciones para mantenimiento, remodelación y reparaciones del hogar.'],
  ['7J5AYZS.jpg', 'Tecnología y soporte en casa', 'Ayuda con computadoras, redes, cámaras, automatización y equipos.'],
  ['23UNG2C.jpg', 'Servicios para negocios', 'Técnicos disponibles para locales, oficinas, edificios y producción.'],
]

const SERVICES = [
  ['4APC6K8g.png', 'Electricistas', 'Instalaciones, breaker, cableado, luces y urgencias eléctricas.', 'electricidad'],
  ['4APC6K8e.png', 'Plomeros', 'Fugas, tuberías, bombas, baños, cocinas y mantenimiento.', 'plomeria'],
  ['4APC6K8f.png', 'Aire acondicionado', 'Instalación, limpieza, reparación y mantenimiento de equipos.', 'climatizacion'],
  ['4APC6K8h.png', 'Cerrajeros y emergencias', 'Aperturas, cambios de cerradura y asistencia rápida.', 'cerrajeria'],
  ['4APC6K8i.png', 'Soporte técnico', 'Computadoras, redes, cámaras, automatización y equipos inteligentes.', 'tecnologia'],
  ['4APC6K8j.png', 'Pintura y mantenimiento', 'Pintores, albañiles, limpieza y trabajos generales para tu propiedad.', 'pintura'],
]

const METRICS = [
  ['Trabajos completados', 92],
  ['Clientes satisfechos', 95],
  ['Técnicos verificados', 99],
  ['Cobertura por provincia', 87],
]

const BLOG = [
  ['L5U2T22.jpg', 'Cómo elegir un técnico confiable cerca de ti'],
  ['889XCFL.jpg', 'Señales de que necesitas mantenimiento urgente'],
  ['DNMUDV8.jpg', 'Qué revisar antes de contratar un servicio en casa'],
]

const LOGOS = ['8.png', '6.png', '4.png', '7.png', '5.png', '2.png']

const SMART_TOOLS = [
  {
    icon: '📸',
    art: 'photo',
    title: 'Foto → Cotización',
    text: 'Sube una foto del daño y la IA estima precio y materiales.',
    screen: 'ai-studio',
    aiTab: 'foto',
  },
  {
    icon: '💬',
    art: 'triage',
    title: 'Asistente de triage',
    text: 'Te hago 3 preguntas y te digo qué técnico necesitas.',
    screen: 'ai-studio',
    aiTab: 'triage',
  },
  {
    icon: '🎯',
    art: 'auction',
    badge: 'AHORRA MÁS',
    title: 'Subasta inversa',
    text: 'Publica tu trabajo y deja que los técnicos pujen a la baja.',
    screen: 'auction',
  },
  {
    icon: '🏠',
    art: 'home',
    title: 'Mi Hogar',
    text: 'Registra tus equipos y te aviso cuándo toca mantenimiento.',
    screen: 'home-memory',
  },
]

const DEFAULT_TESTIMONIALS = [
  {
    id: 'demo-review-1',
    name: 'Mario Santos',
    affiliation: 'Climatización · Panamá',
    quote: 'Me atendió rápido, explicó el problema y dejó el aire funcionando perfecto. Muy profesional.',
    imageSrc: '/hero-tecnifix.webp?v=20260613-224946',
    thumbnailSrc: '/hero-tecnifix.webp?v=20260613-224946',
    rating: 5,
    reviewerName: 'Cliente verificado',
  },
  {
    id: 'demo-review-2',
    name: 'María Batista',
    affiliation: 'Electricista certificada · Chiriquí',
    quote: 'La instalación quedó limpia y segura. Me dio precio claro antes de empezar.',
    imageSrc: img('TZNR5ND.jpg'),
    thumbnailSrc: img('TZNR5ND.jpg'),
    rating: 4.9,
    reviewerName: 'Cliente residencial',
  },
  {
    id: 'demo-review-3',
    name: 'José Rodríguez',
    affiliation: 'Plomero profesional · Colón',
    quote: 'Encontró la fuga sin romper de más y terminó el mismo día. Excelente servicio.',
    imageSrc: img('J6VRWH5.jpg'),
    thumbnailSrc: img('J6VRWH5.jpg'),
    rating: 4.8,
    reviewerName: 'Dueño de local',
  },
  {
    id: 'demo-review-4',
    name: 'Ana Gómez',
    affiliation: 'Limpieza profunda · Bocas del Toro',
    quote: 'El resultado fue impecable y cumplió con el horario acordado. La volvería a contratar.',
    imageSrc: img('4USMWKT.jpg'),
    thumbnailSrc: img('4USMWKT.jpg'),
    rating: 5,
    reviewerName: 'Cliente verificado',
  },
]

function PhoneIcon({ dark = false, kind = 'phone' }) {
  const paths = {
    phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1Z" />,
    pin: <><path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  }

  return (
    <span className={dark ? 'dw-phone dw-phone-dark' : 'dw-phone'}>
      <svg viewBox="0 0 24 24" aria-hidden="true">{paths[kind]}</svg>
    </span>
  )
}

function PlayButton() {
  return (
    <span className="dw-play">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5v14l11-7Z" />
      </svg>
    </span>
  )
}

function SectionTitle({ eyebrow, accent, center = false }) {
  return (
    <div className={center ? 'dw-title dw-title-center' : 'dw-title'}>
      <h2>{eyebrow}</h2>
      <h2 className="accent">{accent}</h2>
    </div>
  )
}

function goToCategory(slug, setSelectedCategory, navigate) {
  setSelectedCategory({ slug })
  navigate('search')
}

const CAT_ICONS = { climatizacion: '❄️', electricidad: '⚡', plomeria: '🔧', albanileria: '🧱', limpieza: '🧹', cerrajeria: '🔐', pintura: '🎨', tecnologia: '💻' }

/* Construye el feed de actividad a partir de técnicos REALES (nombres/provincias/oficios).
   Las acciones y los minutos son ilustrativos; los técnicos son reales. */
function buildActivity(techs) {
  if (!techs?.length) return []
  const out = []
  techs.forEach((tDoc, idx) => {
    const name = tDoc.full_name || 'Un cliente'
    const prov = tDoc.province || tDoc.city || 'Panamá'
    const oficio = tDoc.category_name_es || tDoc.professional_title || 'técnico'
    const mins = 2 + idx * 3
    out.push({ icon: '✅', text: `Contrataron a ${name} (${oficio}) en ${prov}`, time: `hace ${mins} min` })
    out.push({ icon: '⭐', text: `Nueva reseña ★5 para ${name} en ${prov}`, time: `hace ${mins + 1} min` })
  })
  return out
}

function buildTestimonialsFromReviews(reviewRows, techRows = []) {
  const techById = new Map(techRows.map((tech) => [tech.user_id, tech]))
  return (reviewRows || []).map((review, idx) => {
    const tech = techById.get(review.technician_id) || {}
    const fallback = DEFAULT_TESTIMONIALS[idx % DEFAULT_TESTIMONIALS.length]
    const location = [tech.city, tech.province].filter(Boolean).join(', ')
    const job = tech.professional_title || tech.category_name_es || 'Técnico Tecnifix'
    const image = tech.avatar_url || fallback.imageSrc

    return {
      id: review.id || `${review.technician_id}-${idx}`,
      name: tech.full_name || fallback.name,
      affiliation: `${job}${location ? ` · ${location}` : ''}`,
      quote: review.comment || `Servicio calificado con ${Number(review.rating || 5).toFixed(1)} estrellas.`,
      imageSrc: image,
      thumbnailSrc: image,
      rating: Number(review.rating || tech.average_rating || fallback.rating || 5),
      reviewerName: review.reviewer?.full_name || fallback.reviewerName,
    }
  })
}

function buildTestimonialsFromFeatured(techs = []) {
  const quotes = [
    'Servicio confiable, rápido y con comunicación clara desde el primer mensaje.',
    'El técnico llegó preparado, resolvió el trabajo y dejó todo ordenado.',
    'Excelente atención. Pude comparar el perfil y contratar con más confianza.',
    'Buen precio, buena explicación y resultado profesional.',
  ]

  return techs.slice(0, 5).map((tech, idx) => {
    const fallback = DEFAULT_TESTIMONIALS[idx % DEFAULT_TESTIMONIALS.length]
    const location = [tech.city, tech.province].filter(Boolean).join(', ')
    const job = tech.professional_title || tech.category_name_es || 'Técnico Tecnifix'
    const image = tech.avatar_url || fallback.imageSrc

    return {
      id: `featured-review-${tech.user_id || idx}`,
      name: tech.full_name || fallback.name,
      affiliation: `${job}${location ? ` · ${location}` : ''}`,
      quote: quotes[idx % quotes.length],
      imageSrc: image,
      thumbnailSrc: image,
      rating: Number(tech.average_rating || fallback.rating || 5),
      reviewerName: 'Clientes de Tecnifix',
    }
  })
}

/* ════════ Animación: cuenta números al entrar en pantalla ════════ */
function useInView(threshold = 0.4) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    if (!ref.current || seen) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); io.disconnect() }
    }, { threshold })
    io.observe(ref.current)
    // Fallback: si IO no dispara (entornos sin viewport), anima igual tras 1.4s.
    const fb = setTimeout(() => setSeen(true), 1400)
    return () => { io.disconnect(); clearTimeout(fb) }
  }, [seen, threshold])
  return [ref, seen]
}

/* Anima un valor tipo '+100K', '+1,000', '98%', '250+', '10' conservando prefijo/sufijo. */
function CountUp({ value, duration = 1500 }) {
  const m = String(value).match(/^(\D*)([\d.,]+)(.*)$/)
  const prefix = m ? m[1] : ''
  const suffix = m ? m[3] : ''
  const hasComma = m ? m[2].includes(',') : false
  const target = m ? parseFloat(m[2].replace(/,/g, '')) || 0 : 0
  const [ref, seen] = useInView(0.5)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!seen) return
    let raf, start
    const step = (t) => {
      if (!start) start = t
      const p = Math.min((t - start) / duration, 1)
      setN(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    // Garantía: si rAF está pausado (pestaña en segundo plano), fija el valor final.
    const done = setTimeout(() => setN(target), duration + 150)
    return () => { cancelAnimationFrame(raf); clearTimeout(done) }
  }, [seen, target, duration])
  const rounded = Math.round(n)
  const shown = hasComma ? rounded.toLocaleString('en-US') : String(rounded)
  return <span ref={ref}>{prefix}{shown}{suffix}</span>
}

/* ════════ Feed de actividad en vivo (prueba social) ════════ */
function ActivityTicker({ items }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (items.length < 2) return
    const id = setInterval(() => setI(x => (x + 1) % items.length), 3200)
    return () => clearInterval(id)
  }, [items.length])
  if (!items.length) return null
  const it = items[i]
  return (
    <div className="dw-ticker" aria-live="polite">
      <span className="dw-ticker-dot" />
      <span className="dw-ticker-tag">En vivo</span>
      <span key={i} className="dw-ticker-text">{it.icon} {it.text} <em>{it.time}</em></span>
    </div>
  )
}

function SmartToolVisual({ type }) {
  if (type === 'photo') return (
    <div className="dw-tool-art dw-art-photo" aria-hidden="true">
      <span className="dw-art-dots" />
      <div className="dw-art-camera"><span /></div>
      <div className="dw-art-phone">
        <span className="dw-phone-top" />
        <span className="dw-phone-crack" />
        <span className="dw-phone-btn" />
      </div>
      <div className="dw-art-estimate">
        <b>✦ Estimación IA</b>
        <span>Precio estimado</span>
        <strong>$2,450.000</strong>
        <i />
        <em>Materiales sugeridos</em>
        <div><span>▢</span><span>⌁</span><span>◇</span></div>
      </div>
    </div>
  )

  if (type === 'triage') return (
    <div className="dw-tool-art dw-art-triage" aria-hidden="true">
      <span className="dw-art-dots" />
      <div className="dw-art-robot">
        <span />
        <i />
      </div>
      <div className="dw-art-chat">•••</div>
      <div className="dw-art-form">
        <p><b>?</b><span /></p>
        <p><b>🔧</b><span /></p>
        <p><b>👤</b><span /></p>
      </div>
      <span className="dw-art-star" />
    </div>
  )

  if (type === 'auction') return (
    <div className="dw-tool-art dw-art-auction" aria-hidden="true">
      <span className="dw-art-dots" />
      <div className="dw-art-target">
        <span />
        <i />
      </div>
      <div className="dw-bid dw-bid-one"><span />$850</div>
      <div className="dw-bid dw-bid-two"><span />$650 ↓</div>
      <div className="dw-bid dw-bid-three"><span />$500 ↓</div>
    </div>
  )

  return (
    <div className="dw-tool-art dw-art-home" aria-hidden="true">
      <span className="dw-art-bell">⌒</span>
      <div className="dw-art-house">
        <span className="roof" />
        <span className="wall" />
        <span className="door" />
        <span className="tree" />
      </div>
      <div className="dw-art-checklist">
        <p>✓<span /></p>
        <p>✓<span /></p>
        <p>✓<span /></p>
      </div>
      <div className="dw-art-note">🛡️ Más control, menos imprevistos.</div>
    </div>
  )
}

export function HomeScreen() {
  const { navigate, setSelectedCategory, setSelectedTech, user } = useApp()
  const [contact, setContact] = useState({ name: '', email: '', subject: '', message: '' })
  const [featured, setFeatured] = useState([])
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [testimonialReviews, setTestimonialReviews] = useState([])

  // Técnicos destacados + estadísticas reales desde Supabase (Task #4: stats reales).
  useEffect(() => {
    supabase.from('technicians_full').select('*')
      .eq('is_featured', true)
      .eq('verification_status', 'verified')
      .order('average_rating', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        const list = data ?? []
        setFeatured(list)
        setActivity(buildActivity(list))
      })
      .catch(() => {})

    supabase.from('technicians_full').select('average_rating, is_available, verification_status')
      .eq('verification_status', 'verified')
      .then(({ data }) => {
        if (!data?.length) return
        const total = data.length
        const active = data.filter(x => x.is_available).length
        const verified = data.filter(x => x.verification_status === 'verified').length
        const avg = data.reduce((s, x) => s + Number(x.average_rating || 0), 0) / total
        setStats({ total, active, verified, satisfaction: Math.round((avg / 5) * 100) })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadTestimonials() {
      try {
        const { data: reviewRows, error } = await supabase
          .from('reviews')
          .select(`
            id,
            technician_id,
            rating,
            comment,
            created_at,
            reviewer:reviewer_id ( full_name, avatar_url )
          `)
          .eq('is_public', true)
          .eq('moderation_status', 'approved')
          .order('created_at', { ascending: false })
          .limit(8)

        if (error || !reviewRows?.length) return

        const techIds = [...new Set(reviewRows.map((review) => review.technician_id).filter(Boolean))]
        const { data: techRows } = techIds.length
          ? await supabase
              .from('technicians_full')
              .select('user_id, full_name, avatar_url, professional_title, category_name_es, city, province, average_rating')
              .in('user_id', techIds)
              .eq('verification_status', 'verified')
          : { data: [] }

        if (mounted) setTestimonialReviews(buildTestimonialsFromReviews(reviewRows, techRows ?? []))
      } catch {
        if (mounted) setTestimonialReviews([])
      }
    }

    loadTestimonials()
    return () => { mounted = false }
  }, [])

  const openTech = (tech) => { setSelectedTech(tech); navigate('tech-profile') }

  // Emergencia → navega a búsqueda con filtros precargados.
  const runEmergency = () => { setSelectedCategory({ emergency: true }); navigate('search') }
  const scrollHomeSection = (section) => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const openSmartTool = (tool) => {
    if (tool.aiTab && typeof window !== 'undefined') {
      window.sessionStorage.setItem('tecnifix_ai_tab', tool.aiTab)
    }
    navigate(tool.screen)
  }

  // Scroll-reveal (secciones entran con fade) + glow dorado que sigue el cursor en cards.
  useEffect(() => {
    const root = document.querySelector('.dewatt-home')
    if (!root) return
    const sections = [...root.querySelectorAll('section')].slice(1) // saltar el hero
    sections.forEach(s => s.classList.add('dw-reveal'))
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('dw-in'); io.unobserve(e.target) } })
    }, { threshold: 0.1 })
    sections.forEach(s => io.observe(s))
    // Seguridad: nunca dejar secciones invisibles si IO no dispara.
    const revealFallback = setTimeout(() => sections.forEach(s => s.classList.add('dw-in')), 2500)

    const cards = [...root.querySelectorAll('.dw-feature, .dw-service')]
    const onMove = (e) => {
      const r = e.currentTarget.getBoundingClientRect()
      e.currentTarget.style.setProperty('--gx', `${e.clientX - r.left}px`)
      e.currentTarget.style.setProperty('--gy', `${e.clientY - r.top}px`)
    }
    cards.forEach(c => { c.classList.add('dw-glow'); c.addEventListener('mousemove', onMove) })
    return () => { io.disconnect(); clearTimeout(revealFallback); cards.forEach(c => c.removeEventListener('mousemove', onMove)) }
  }, [featured])

  const sendContact = () => {
    const body = [
      'Hola Tecnifix',
      `Nombre: ${contact.name || '-'}`,
      `Email: ${contact.email || '-'}`,
      `Asunto: ${contact.subject || '-'}`,
      '',
      contact.message || '',
    ].join('\n')

    window.open(`https://wa.me/${PHONE.replace(/\D/g, '')}?text=${encodeURIComponent(body)}`, '_blank')
  }

  const featuredTestimonials = buildTestimonialsFromFeatured(featured)
  const testimonialItems = testimonialReviews.length
    ? testimonialReviews
    : (featuredTestimonials.length ? featuredTestimonials : DEFAULT_TESTIMONIALS)

  return (
    <main className="dewatt-home">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Inter+Tight:wght@600;700;800;900&display=swap');
        .dewatt-home{ --navy:${NAVY}; --navy-dark:${NAVY_DARK}; --gold:${GOLD}; --text:${TEXT}; --wrap:min(91.2vw,1340px); background:#fff; color:var(--navy); font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif; min-height:100dvh; overflow:hidden; }
        .dewatt-home *{ box-sizing:border-box; letter-spacing:0; }
        .dewatt-wrap{ width:var(--wrap); margin:0 auto; }
        .dw-title h2{ margin:0; font-family:'Inter Tight',Inter,sans-serif; font-size:clamp(46px,4.2vw,72px); font-weight:700; line-height:.98; color:var(--navy); }
        .dw-title .accent{ color:var(--gold); }
        .dw-title-center{ text-align:center; }
        .dw-copy{ margin:24px 0 0; color:var(--text); font-size:clamp(18px,1.16vw,24px); line-height:1.5; }
        .dw-button{ border:1px solid var(--gold); background:var(--gold); color:var(--navy); border-radius:8px; min-width:260px; min-height:76px; padding:18px 35px; font:700 clamp(17px,1.05vw,22px)/1 Inter,sans-serif; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; }
        .dw-button:hover{ background:transparent; color:#fff; }
        .dw-button.dark:hover{ color:var(--navy); border-color:var(--navy); }
        .dw-phone{ width:78px; height:78px; border-radius:50%; background:rgba(255,255,255,.28); display:inline-grid; place-items:center; flex:0 0 auto; }
        .dw-phone svg{ width:42px; height:42px; fill:none; stroke:var(--gold); stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }
        .dw-phone-dark{ background:var(--navy); border-radius:10px; }
        .dw-phone-dark svg{ width:34px; height:34px; }
        .dw-play{ position:absolute; inset:0; margin:auto; width:108px; height:108px; border:6px solid rgba(255,255,255,.92); border-radius:50%; display:grid; place-items:center; background:rgba(255,255,255,.08); }
        .dw-play svg{ width:44px; height:44px; fill:#fff; margin-left:7px; }

        .dw-hero{ position:relative; min-height:calc(95vh - 96px); isolation:isolate; display:flex; align-items:flex-end; overflow:hidden; background:var(--navy) url('/hero-tecnifix.webp?v=20260613-224946') center/cover no-repeat; border-radius:0 0 25px 25px; }
        .dw-hero::before{ content:''; position:absolute; inset:0; z-index:-1; background:linear-gradient(90deg,rgba(17,39,64,.18) 0%,rgba(17,39,64,.08) 46%,rgba(17,39,64,0) 100%); }
        .dw-hero-content{ width:var(--wrap); margin:0 auto; padding:clamp(86px,9vh,135px) 0 28px; color:#fff; position:relative; }
        .dw-hero h1{ margin:0; font-family:'Inter Tight',Inter,sans-serif; font-size:clamp(56px,5vw,96px); font-weight:700; line-height:.95; }
        .dw-hero h1 span{ color:var(--gold); display:block; }
        .dw-hero .dw-copy{ max-width:980px; color:#fff; }
        .dw-hero-actions{ margin-top:56px; display:flex; align-items:center; gap:42px; flex-wrap:wrap; }
        .dw-call{ display:flex; align-items:center; gap:18px; color:#fff; text-decoration:none; }
        .dw-call small{ display:block; color:var(--gold); font-size:22px; font-weight:600; line-height:1.2; }
        .dw-call strong{ display:block; color:#fff; font-size:24px; font-weight:700; line-height:1.2; }
        .dw-hero-bottom{ display:flex; align-items:flex-end; justify-content:space-between; gap:48px; margin-top:74px; }
        .dw-stats{ display:flex; gap:128px; }
        .dw-stat svg{ width:64px; height:64px; fill:#5bd5b7; margin-bottom:18px; }
        .dw-stat strong{ display:block; color:#fff; font-family:'Inter Tight',Inter,sans-serif; font-size:clamp(58px,4.7vw,88px); font-style:italic; line-height:.82; }
        .dw-stat span{ display:block; margin-top:20px; color:var(--gold); font-size:23px; font-weight:500; }
        .dw-process{ width:min(48vw,1100px); min-height:260px; border:1px solid rgba(255,255,255,.24); border-radius:25px; background:rgba(255,255,255,.08); backdrop-filter:blur(7px); display:grid; grid-template-columns:minmax(320px,1fr) minmax(420px,.95fr); overflow:hidden; cursor:pointer; }
        .dw-process-media{ position:relative; min-height:100%; }
        .dw-process-media img{ width:100%; height:100%; display:block; object-fit:cover; }
        .dw-process-text{ padding:36px 48px; display:flex; flex-direction:column; justify-content:center; }
        .dw-process-text h3{ margin:0 0 24px; color:var(--gold); font-size:clamp(24px,1.55vw,30px); line-height:1; font-weight:500; }
        .dw-process-text p{ margin:0; color:#fff; font-size:clamp(18px,1.2vw,24px); line-height:1.5; }

        .dw-features{ padding:96px 0 84px; }
        .dw-feature-grid{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:60px; }
        .dw-feature{ min-height:300px; background:var(--navy); border-radius:25px; box-shadow:0 10px 20px rgba(0,0,0,.35); padding:45px 48px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; }
        .dw-feature img{ width:90px; height:90px; object-fit:contain; margin-bottom:40px; }
        .dw-feature h3{ margin:0 0 20px; color:var(--gold); font-size:clamp(22px,1.45vw,32px); line-height:1.12; font-weight:500; }
        .dw-feature p{ margin:0; color:#fff; font-size:clamp(17px,1.15vw,24px); line-height:1.45; }

        .dw-about{ padding:100px 0 150px; display:grid; grid-template-columns:1fr 1.16fr; gap:90px; align-items:center; }
        .dw-about-art{ position:relative; min-height:760px; }
        .dw-about-main{ width:86%; height:650px; border-radius:25px; object-fit:cover; display:block; margin-left:auto; }
        .dw-about-small{ position:absolute; left:0; bottom:70px; width:40%; height:305px; border:10px solid #fff; border-radius:25px; object-fit:cover; }
        .dw-about-badge{ position:absolute; right:3%; bottom:34px; background:var(--gold); border-radius:25px; padding:24px 34px; min-width:250px; color:var(--navy); }
        .dw-about-badge strong{ display:block; font-family:'Inter Tight'; font-size:64px; font-weight:800; line-height:.9; }
        .dw-about-badge span{ display:block; margin-top:6px; font-size:20px; font-weight:700; }
        .dw-info-list{ margin-top:54px; display:grid; gap:42px; }
        .dw-info-row{ display:grid; grid-template-columns:120px 1fr; gap:28px; align-items:start; }
        .dw-info-icon{ width:120px; height:120px; border-radius:25px; background:var(--navy); display:grid; place-items:center; }
        .dw-info-icon img{ width:62px; height:62px; object-fit:contain; }
        .dw-info-row h3{ margin:6px 0 18px; font-size:32px; line-height:1; color:var(--navy); font-weight:700; }
        .dw-info-row p{ margin:0; color:var(--text); font-size:24px; line-height:1.45; }

        .dw-projects{ padding:95px 0 100px; }
        .dw-project-head{ display:flex; align-items:flex-end; justify-content:space-between; gap:48px; margin-bottom:92px; }
        .dw-project-head .dw-copy{ max-width:800px; }
        .dw-project-grid{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:60px; }
        .dw-project{ position:relative; min-height:760px; border-radius:25px; overflow:hidden; cursor:pointer; background:var(--navy); }
        .dw-project img{ width:100%; height:100%; position:absolute; inset:0; object-fit:cover; transition:transform .35s ease; }
        .dw-project:hover img{ transform:scale(1.05); }
        .dw-project::after{ content:''; position:absolute; inset:0; background:linear-gradient(180deg,rgba(17,39,64,.08) 15%,rgba(17,39,64,.74) 67%,rgba(17,39,64,.98) 100%); }
        .dw-project-text{ position:absolute; z-index:1; left:60px; right:42px; bottom:62px; }
        .dw-project h3{ margin:0 0 34px; color:var(--gold); font-size:clamp(26px,1.8vw,39px); line-height:.95; font-weight:500; }
        .dw-project p{ margin:0; color:#fff; font-size:clamp(16px,1.05vw,22px); line-height:1.08; font-weight:600; }

        .dw-services{ position:relative; isolation:isolate; min-height:1060px; padding:180px 0 260px; background:var(--navy) url('${img('4USMWKT.jpg')}') center/cover fixed no-repeat; color:#fff; border-radius:25px; overflow:hidden; }
        .dw-services::before{ content:''; position:absolute; inset:0; z-index:-1; background:rgba(17,39,64,.86); }
        .dw-services .dw-title h2{ color:#fff; }
        .dw-services .dw-title .accent{ color:var(--gold); }
        .dw-services .dw-copy{ color:#fff; max-width:900px; margin-left:auto; margin-right:auto; }
        .dw-service-grid{ margin-top:110px; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:80px; }
        .dw-service{ min-height:270px; border:1px solid rgba(255,255,255,.42); border-radius:25px; background:rgba(255,255,255,.08); backdrop-filter:blur(7px); padding:55px 62px; display:grid; grid-template-columns:116px 1fr; gap:42px; align-items:center; cursor:pointer; }
        .dw-service img{ width:108px; height:108px; object-fit:contain; }
        .dw-service h3{ margin:0 0 24px; color:var(--gold); font-size:clamp(25px,1.65vw,36px); line-height:1; font-weight:500; }
        .dw-service p{ margin:0; color:#fff; font-size:clamp(18px,1.15vw,24px); line-height:1.45; }

        .dw-story{ position:relative; margin-top:-122px; padding-bottom:100px; }
        .dw-story-card{ width:min(75vw,2200px); margin:0 auto; background:var(--gold); border-radius:30px; box-shadow:0 10px 20px rgba(0,0,0,.35); padding:20px 72px; display:grid; grid-template-columns:1.08fr .95fr .76fr; gap:60px; align-items:center; }
        .dw-story h2{ margin:0; font-family:'Inter Tight'; font-size:clamp(52px,4.2vw,82px); line-height:.95; color:#fff; }
        .dw-story h2 span{ color:var(--navy); display:block; }
        .dw-quote{ margin:54px 0 54px; color:var(--navy); font-size:clamp(28px,2vw,41px); font-style:italic; font-weight:700; line-height:1.28; }
        .dw-author{ display:flex; align-items:center; gap:26px; }
        .dw-author img{ width:78px; height:78px; border-radius:50%; object-fit:cover; }
        .dw-author strong{ display:block; font-size:27px; line-height:1; color:var(--navy); }
        .dw-author span{ color:var(--text); font-size:18px; }
        .dw-story-main{ width:100%; height:760px; object-fit:cover; border-radius:25px; display:block; }
        .dw-story-side strong{ display:block; font-family:'Inter Tight'; font-size:clamp(80px,6.7vw,130px); line-height:1; color:var(--navy); }
        .dw-story-side h3{ margin:6px 0 8px; font-size:29px; color:var(--navy); line-height:1; }
        .dw-story-side p{ margin:0 0 70px; font-size:20px; color:var(--navy); font-weight:700; }
        .dw-faces{ display:flex; margin-bottom:70px; }
        .dw-faces img{ width:72px; height:72px; border-radius:50%; object-fit:cover; border:2px solid var(--navy); margin-left:-18px; }
        .dw-faces img:first-child{ margin-left:0; }
        .dw-story-video{ position:relative; height:160px; border-radius:25px; overflow:hidden; cursor:pointer; }
        .dw-story-video img{ width:100%; height:100%; object-fit:cover; display:block; }
        .dw-story-video .dw-play{ width:92px; height:92px; border-width:5px; }
        .dw-story-video .dw-play svg{ width:38px; height:38px; }
        .dw-logo-copy{ text-align:center; margin:105px auto 78px; max-width:900px; color:var(--text); font-size:24px; line-height:1.45; }
        .dw-logo-cloud{ width:var(--wrap); margin:0 auto; display:grid; grid-template-columns:repeat(6,1fr); gap:80px; align-items:center; }
        .dw-logo-cloud img{ width:100%; height:64px; object-fit:contain; filter:grayscale(1) contrast(5); }

        .dw-safety{ padding:95px 0 140px; display:grid; grid-template-columns:1fr 1fr; gap:100px; align-items:center; }
        .dw-progress{ margin-top:70px; display:grid; gap:44px; }
        .dw-progress-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; font-size:24px; font-weight:700; color:var(--navy); }
        .dw-bar{ height:24px; border-radius:8px; background:var(--gold); overflow:hidden; }
        .dw-bar span{ display:block; height:100%; border-radius:8px; background:var(--navy); }
        .dw-safety-art{ position:relative; min-height:760px; }
        .dw-safety-main{ width:86%; height:650px; border-radius:25px; object-fit:cover; display:block; margin-left:auto; }
        .dw-safety-small{ position:absolute; left:0; bottom:105px; width:40%; height:305px; border:10px solid #fff; border-radius:25px; object-fit:cover; }
        .dw-safety-badge{ position:absolute; left:42%; bottom:38px; background:var(--gold); color:var(--navy); border-radius:25px; padding:34px 48px; min-width:360px; }
        .dw-safety-badge strong{ display:block; font-family:'Inter Tight'; font-size:96px; line-height:.8; font-weight:800; }
        .dw-safety-badge span{ display:block; margin-top:16px; font-size:27px; line-height:1; font-weight:800; }

        .dw-blog{ padding:100px 0 160px; }
        .dw-blog .dw-copy{ max-width:900px; margin-left:auto; margin-right:auto; }
        .dw-blog-grid{ margin-top:86px; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:60px; }
        .dw-post{ background:#fff; border-radius:25px; box-shadow:0 14px 44px rgba(17,39,64,.1); overflow:hidden; }
        .dw-post-img{ height:480px; position:relative; }
        .dw-post-img img{ width:100%; height:100%; object-fit:cover; display:block; }
        .dw-date{ position:absolute; left:60px; bottom:-32px; width:72px; height:92px; border-radius:10px; background:var(--navy); color:#fff; display:grid; place-items:center; text-align:center; font-size:26px; line-height:1; font-weight:800; }
        .dw-date span{ display:block; color:#fff; font-size:24px; font-weight:500; }
        .dw-post-body{ padding:70px 60px 58px; }
        .dw-meta{ display:flex; gap:34px; color:var(--text); font-size:19px; margin-bottom:28px; }
        .dw-post h3{ margin:0 0 34px; color:var(--navy); font-size:clamp(26px,1.7vw,34px); line-height:1.15; font-weight:700; }
        .dw-post p{ margin:0 0 48px; color:var(--text); font-size:23px; line-height:1.4; }
        .dw-post .dw-button{ min-width:250px; min-height:78px; border-color:#d55271; }

        .dw-contact{ padding:100px 0 170px; display:grid; grid-template-columns:1.02fr 1fr; gap:86px; align-items:center; }
        .dw-form{ position:relative; overflow:hidden; background:#fff; border:1px solid #e8edf5; border-radius:25px; padding:58px 56px; box-shadow:0 24px 70px rgba(17,39,64,.12); }
        .dw-form::before{ content:''; position:absolute; right:-70px; top:-80px; width:210px; height:210px; border-radius:50%; background:linear-gradient(135deg,#ffd99f,#ff9800); opacity:.55; pointer-events:none; }
        .dw-field{ position:relative; z-index:1; display:block; margin-bottom:22px; color:var(--navy); font-size:14px; font-weight:900; line-height:1; }
        .dw-field input,.dw-field textarea{ display:block; width:100%; box-sizing:border-box; margin-top:10px; background:#f6f8fc; border:1px solid #e8edf5; border-radius:16px; color:var(--navy); font:700 16px/1.4 Inter,sans-serif; padding:0 18px; outline:none; transition:border-color .2s, box-shadow .2s; }
        .dw-field input:focus,.dw-field textarea:focus{ border-color:#ff9b21; box-shadow:0 0 0 4px rgba(255,155,33,.14); }
        .dw-field input{ height:54px; }
        .dw-field textarea{ min-height:150px; resize:vertical; padding-top:16px; padding-bottom:16px; }
        .dw-field input::placeholder,.dw-field textarea::placeholder{ color:#99a3b4; font-weight:600; }
        .dw-form .dw-button{ margin-top:10px; }
        .dw-contact-list{ margin-top:70px; display:grid; gap:40px; }
        .dw-contact-row{ display:grid; grid-template-columns:118px 1fr; gap:28px; align-items:center; }
        .dw-contact-row h3{ margin:0 0 8px; color:var(--navy); font-size:28px; line-height:1; font-weight:500; }
        .dw-contact-row p{ margin:0; color:var(--navy); font-size:27px; line-height:1.3; font-weight:800; }

        .dw-cta{ position:relative; isolation:isolate; min-height:700px; padding:170px 0 120px; background:var(--navy) url('${img('4USMWKT.jpg')}') center/cover fixed no-repeat; overflow:hidden; color:#fff; }
        .dw-cta::before{ content:''; position:absolute; inset:0; z-index:-1; background:linear-gradient(90deg,rgba(17,39,64,.84) 0%,rgba(17,39,64,.84) 80%,var(--gold) 80%,var(--gold) 100%); }
        .dw-cta-inner{ width:var(--wrap); margin:0 auto; position:relative; min-height:420px; }
        .dw-cta h2{ margin:0; font-family:'Inter Tight'; font-size:clamp(56px,4.6vw,86px); line-height:.98; font-weight:700; max-width:1900px; }
        .dw-cta h2 span{ display:block; color:var(--gold); }
        .dw-cta-actions{ margin-top:58px; display:flex; align-items:center; gap:42px; flex-wrap:wrap; }
        .dw-cta-man{ position:absolute; right:3%; bottom:-120px; height:660px; max-width:28%; object-fit:contain; object-position:bottom center; }
        .dw-footer{ background:var(--navy); color:#fff; padding:180px 0 0; }
        .dw-footer-grid{ width:var(--wrap); margin:0 auto 120px; display:grid; grid-template-columns:1.45fr .8fr .8fr 1fr; gap:115px; }
        .dw-footer-logo{ margin-bottom:52px; }
        .dw-footer-brand strong{ display:inline-block; color:#fff; font-family:'Inter Tight'; font-size:64px; line-height:.8; font-weight:900; font-style:italic; }
        .dw-footer-brand span{ color:var(--gold); }
        .dw-footer-logo small{ display:block; margin-top:10px; color:#fff; font-size:22px; font-weight:700; }
        .dw-footer p{ color:#fff; font-size:20px; line-height:1.1; margin:0; }
        .dw-social{ display:flex; gap:12px; margin-top:62px; }
        .dw-social button{ width:60px; height:60px; border:0; border-radius:8px; background:rgba(255,255,255,.28); color:var(--gold); font-size:24px; font-weight:800; cursor:pointer; }
        .dw-footer h3{ margin:0 0 50px; color:var(--gold); font-size:30px; line-height:1; font-weight:500; }
        .dw-footer ul{ list-style:none; padding:0; margin:0; display:grid; gap:32px; }
        .dw-footer li,.dw-footer a{ color:#fff; text-decoration:none; font-size:26px; line-height:1; cursor:pointer; }
        .dw-footer li::before{ content:'->'; color:var(--gold); margin-right:18px; }
        .dw-touch{ display:grid; gap:34px; }
        .dw-touch p{ font-size:25px; line-height:1.35; }
        .dw-touch span{ color:var(--gold); margin-right:18px; }
        .dw-copybar{ border-top:1px solid var(--gold); text-align:center; padding:30px 20px 34px; color:#fff; font-size:18px; font-weight:700; }

        @media (min-width:761px){
          .dw-title h2{ font-size:clamp(36px,3vw,52px); }
          .dw-copy{ font-size:clamp(15px,.95vw,18px); margin-top:20px; }
          .dw-button{ min-width:190px; min-height:58px; padding:14px 28px; font-size:16px; }
          .dw-phone{ width:56px; height:56px; }
          .dw-phone svg{ width:30px; height:30px; }
          .dw-play{ width:78px; height:78px; border-width:5px; }
          .dw-play svg{ width:32px; height:32px; }

          .dw-hero{ height:min(860px,calc(100dvh - 84px)); min-height:720px; }
          .dw-hero-content{ padding:70px 0 24px; }
          .dw-hero h1{ font-size:clamp(48px,4.1vw,76px); }
          .dw-hero-actions{ margin-top:38px; gap:28px; }
          .dw-call{ gap:14px; }
          .dw-call small{ font-size:16px; }
          .dw-call strong{ font-size:18px; }
          .dw-hero-bottom{ margin-top:56px; gap:36px; }
          .dw-stats{ gap:82px; }
          .dw-stat svg{ width:48px; height:48px; margin-bottom:16px; }
          .dw-stat strong{ font-size:clamp(48px,4.1vw,70px); }
          .dw-stat span{ margin-top:16px; font-size:17px; }
          .dw-process{ width:min(44vw,720px); min-height:230px; grid-template-columns:minmax(260px,1fr) minmax(280px,.95fr); }
          .dw-process-text{ padding:28px 34px; }
          .dw-process-text h3{ margin-bottom:18px; font-size:24px; }
          .dw-process-text p{ font-size:17px; }

          .dw-features{ padding:58px 0 54px; }
          .dw-feature-grid{ gap:28px; }
          .dw-feature{ min-height:220px; padding:28px 30px; }
          .dw-feature img{ width:64px; height:64px; margin-bottom:24px; }
          .dw-feature h3{ font-size:22px; margin-bottom:14px; }
          .dw-feature p{ font-size:17px; }

          .dw-about{ padding:70px 0 86px; gap:56px; }
          .dw-about-art{ min-height:560px; }
          .dw-about-main{ height:500px; }
          .dw-about-small{ height:220px; bottom:45px; }
          .dw-about-badge{ min-width:190px; padding:18px 24px; }
          .dw-about-badge strong{ font-size:48px; }
          .dw-about-badge span{ font-size:16px; }
          .dw-info-list{ margin-top:36px; gap:28px; }
          .dw-info-row{ grid-template-columns:82px 1fr; gap:22px; }
          .dw-info-icon{ width:82px; height:82px; border-radius:18px; }
          .dw-info-icon img{ width:46px; height:46px; }
          .dw-info-row h3{ font-size:24px; margin-bottom:12px; }
          .dw-info-row p{ font-size:17px; }

          .dw-projects{ padding:64px 0 76px; }
          .dw-project-head{ margin-bottom:52px; }
          .dw-project-grid{ gap:28px; }
          .dw-project{ min-height:430px; }
          .dw-project-text{ left:32px; right:28px; bottom:34px; }
          .dw-project h3{ font-size:24px; margin-bottom:20px; }
          .dw-project p{ font-size:16px; line-height:1.2; }

          .dw-services{ min-height:760px; padding:96px 0 145px; }
          .dw-service-grid{ margin-top:62px; gap:32px; }
          .dw-service{ min-height:190px; padding:30px 32px; grid-template-columns:78px 1fr; gap:26px; }
          .dw-service img{ width:74px; height:74px; }
          .dw-service h3{ font-size:24px; margin-bottom:14px; }
          .dw-service p{ font-size:17px; }

          .dw-story{ margin-top:-82px; padding-bottom:70px; }
          .dw-story-card{ width:min(82vw,1180px); padding:18px 46px; gap:34px; }
          .dw-story h2{ font-size:52px; }
          .dw-quote{ margin:32px 0; font-size:26px; }
          .dw-author img{ width:58px; height:58px; }
          .dw-author strong{ font-size:22px; }
          .dw-author span{ font-size:14px; }
          .dw-story-main{ height:430px; }
          .dw-story-side strong{ font-size:72px; }
          .dw-story-side h3{ font-size:20px; }
          .dw-story-side p{ margin-bottom:34px; font-size:16px; }
          .dw-faces{ margin-bottom:34px; }
          .dw-faces img{ width:50px; height:50px; }
          .dw-story-video{ height:112px; }
          .dw-story-video .dw-play{ width:66px; height:66px; }
          .dw-logo-copy{ margin:58px auto 44px; font-size:18px; }
          .dw-logo-cloud{ gap:50px; }
          .dw-logo-cloud img{ height:46px; }

          .dw-safety{ padding:70px 0 96px; gap:64px; }
          .dw-progress{ margin-top:42px; gap:28px; }
          .dw-progress-head{ font-size:18px; margin-bottom:14px; }
          .dw-bar{ height:14px; }
          .dw-safety-art{ min-height:560px; }
          .dw-safety-main{ height:500px; }
          .dw-safety-small{ height:220px; bottom:70px; }
          .dw-safety-badge{ min-width:250px; padding:24px 32px; }
          .dw-safety-badge strong{ font-size:64px; }
          .dw-safety-badge span{ font-size:20px; }

          .dw-blog{ padding:72px 0 100px; }
          .dw-blog-grid{ margin-top:54px; gap:32px; }
          .dw-post-img{ height:300px; }
          .dw-date{ left:34px; width:58px; height:72px; font-size:20px; }
          .dw-date span{ font-size:17px; }
          .dw-post-body{ padding:50px 36px 36px; }
          .dw-meta{ font-size:15px; gap:20px; margin-bottom:20px; }
          .dw-post h3{ font-size:23px; margin-bottom:22px; }
          .dw-post p{ font-size:17px; margin-bottom:30px; }
          .dw-post .dw-button{ min-width:180px; min-height:58px; }

          .dw-contact{ padding:76px 0 110px; gap:58px; }
          .dw-form{ padding:52px 50px; }
          .dw-field{ margin-bottom:22px; font-size:15px; }
          .dw-field input,.dw-field textarea{ margin-top:10px; font-size:16px; padding-left:18px; padding-right:18px; }
          .dw-field input{ height:56px; }
          .dw-field textarea{ min-height:160px; }
          .dw-contact-list{ margin-top:42px; gap:26px; }
          .dw-contact-row{ grid-template-columns:76px 1fr; gap:22px; }
          .dw-contact-row h3{ font-size:20px; }
          .dw-contact-row p{ font-size:20px; }

          .dw-cta{ min-height:460px; padding:82px 0 72px; }
          .dw-cta-inner{ min-height:310px; }
          .dw-cta h2{ font-size:clamp(38px,3.4vw,58px); max-width:1050px; }
          .dw-cta-actions{ margin-top:36px; gap:28px; }
          .dw-cta-man{ height:430px; bottom:-72px; max-width:24%; }
          .dw-footer{ padding-top:96px; }
          .dw-footer-grid{ margin-bottom:74px; gap:62px; }
          .dw-footer-logo{ margin-bottom:34px; }
          .dw-footer-brand strong{ font-size:46px; }
          .dw-footer-logo small{ font-size:16px; }
          .dw-footer p{ font-size:15px; line-height:1.25; }
          .dw-social{ margin-top:38px; }
          .dw-social button{ width:42px; height:42px; font-size:18px; }
          .dw-footer h3{ margin-bottom:30px; font-size:22px; }
          .dw-footer ul{ gap:22px; }
          .dw-footer li,.dw-footer a{ font-size:18px; }
          .dw-touch{ gap:24px; }
          .dw-touch p{ font-size:18px; }
          .dw-copybar{ font-size:15px; padding:24px 20px; }
        }

        @media (max-width:1200px){
          .dewatt-home{ --wrap:90vw; }
          .dw-feature-grid,.dw-project-grid{ grid-template-columns:repeat(2,minmax(0,1fr)); }
          .dw-service-grid{ grid-template-columns:1fr 1fr; gap:34px; }
          .dw-process{ width:100%; }
          .dw-hero-bottom,.dw-about,.dw-safety,.dw-contact{ grid-template-columns:1fr; }
          .dw-story-card{ width:90vw; grid-template-columns:1fr; }
          .dw-blog-grid{ grid-template-columns:1fr; }
          .dw-footer-grid{ grid-template-columns:1fr 1fr; }
        }
        @media (max-width:760px){
          .dewatt-home{ --wrap:90vw; }
          .dw-hero{ min-height:auto; border-radius:0 0 18px 18px; }
          .dw-title h2{ font-size:34px; }
          .dw-copy{ font-size:15px; line-height:1.45; margin-top:16px; }
          .dw-hero-content{ padding:34px 0 22px; }
          .dw-hero h1{ font-size:36px; line-height:1; }
          .dw-hero-actions{ margin-top:18px; gap:12px; }
          .dw-hero-actions .dw-call{ display:none; }
          .dw-button{ width:100%; min-width:0; min-height:58px; }
          .dw-call small,.dw-call strong{ font-size:16px; }
          .dw-phone{ width:58px; height:58px; }
          .dw-phone svg{ width:30px; height:30px; }
          .dw-hero-bottom{ margin-top:22px; display:grid; }
          .dw-stats{ display:none; }
          .dw-stat svg{ width:54px; height:54px; margin-bottom:14px; }
          .dw-stat span{ font-size:15px; margin-top:12px; }
          .dw-process{ grid-template-columns:1fr; min-height:auto; }
          .dw-process-media{ height:110px; }
          .dw-process-text{ padding:16px; }
          .dw-process-text h3{ font-size:20px; margin-bottom:10px; }
          .dw-process-text p{ font-size:15px; }
          .dw-play{ width:70px; height:70px; border-width:4px; }
          .dw-play svg{ width:30px; height:30px; }
          .dw-features,.dw-about,.dw-projects,.dw-safety,.dw-blog,.dw-contact{ padding:54px 0; }
          .dw-feature-grid,.dw-project-grid,.dw-service-grid,.dw-logo-cloud,.dw-footer-grid{ grid-template-columns:1fr; gap:22px; }
          .dw-feature{ min-height:240px; padding:34px 24px; }
          .dw-project-head{ display:grid; margin-bottom:36px; }
          .dw-project{ min-height:360px; }
          .dw-project-text{ left:26px; right:26px; bottom:32px; }
          .dw-about-art,.dw-safety-art{ min-height:480px; }
          .dw-about-main,.dw-safety-main{ width:100%; height:420px; }
          .dw-about-small,.dw-safety-small{ width:58%; height:190px; bottom:20px; }
          .dw-about-badge,.dw-safety-badge{ right:0; left:auto; bottom:0; min-width:180px; padding:18px; }
          .dw-about-badge strong,.dw-safety-badge strong{ font-size:44px; }
          .dw-info-row,.dw-contact-row{ grid-template-columns:76px 1fr; }
          .dw-info-icon,.dw-contact-row .dw-phone{ width:76px; height:76px; }
          .dw-info-row h3,.dw-contact-row h3{ font-size:22px; }
          .dw-info-row p,.dw-contact-row p{ font-size:17px; }
          .dw-services{ min-height:auto; padding:70px 0 140px; border-radius:18px; }
          .dw-service-grid{ margin-top:46px; }
          .dw-service{ grid-template-columns:72px 1fr; min-height:190px; padding:28px; gap:22px; }
          .dw-service img{ width:68px; height:68px; }
          .dw-story{ margin-top:-72px; }
          .dw-story-card{ padding:28px; gap:28px; }
          .dw-story h2{ font-size:36px; }
          .dw-story-main{ height:280px; }
          .dw-quote{ margin:28px 0; }
          .dw-logo-copy{ margin:54px auto 36px; font-size:17px; }
          .dw-post-img{ height:260px; }
          .dw-post-body{ padding:58px 26px 30px; }
          .dw-form{ padding:32px 24px; }
          .dw-field input{ height:54px; }
          .dw-field input,.dw-field textarea{ font-size:16px; padding-left:16px; padding-right:16px; }
          .dw-cta{ min-height:auto; padding:70px 0 0; }
          .dw-cta::before{ background:linear-gradient(180deg,rgba(17,39,64,.84) 0%,rgba(17,39,64,.84) 78%,var(--gold) 78%,var(--gold) 100%); }
          .dw-cta-inner{ padding-bottom:330px; }
          .dw-cta-man{ right:0; bottom:0; height:340px; max-width:70%; }
          .dw-footer{ padding-top:70px; }
          .dw-footer-grid{ margin-bottom:60px; gap:42px; }
          .dw-footer li,.dw-footer a,.dw-touch p{ font-size:18px; }
        }
      `}</style>

      <style>{`
        /* ── Scroll reveal ── */
        .dewatt-home .dw-reveal{ opacity:0; transform:translateY(34px); transition:opacity .7s ease, transform .7s cubic-bezier(.2,.7,.2,1); }
        .dewatt-home .dw-reveal.dw-in{ opacity:1; transform:none; }
        @media (prefers-reduced-motion:reduce){ .dewatt-home .dw-reveal{ opacity:1 !important; transform:none !important; } }

        /* ── Glow dorado que sigue el cursor ── */
        .dewatt-home .dw-glow{ position:relative; }
        .dewatt-home .dw-glow::before{ content:''; position:absolute; inset:0; border-radius:inherit; z-index:1; pointer-events:none; opacity:0; transition:opacity .3s; background:radial-gradient(220px circle at var(--gx,50%) var(--gy,50%), rgba(248,219,19,.20), transparent 62%); }
        .dewatt-home .dw-glow:hover::before{ opacity:1; }
        .dewatt-home .dw-feature, .dewatt-home .dw-service{ transition:transform .25s ease; }
        .dewatt-home .dw-feature:hover, .dewatt-home .dw-service:hover{ transform:translateY(-6px); }
        .dewatt-home .dw-feature > *, .dewatt-home .dw-service > *{ position:relative; z-index:2; }

        /* ── Feed de actividad en vivo ── */
        .dw-ticker{ display:flex; align-items:center; gap:14px; background:#f5f7fa; border:1px solid #e6e9ee; border-radius:999px; padding:12px 22px; overflow:hidden; }
        .dw-ticker-dot{ width:10px; height:10px; border-radius:50%; background:#22c55e; box-shadow:0 0 0 0 rgba(34,197,94,.6); animation:dwPulse 1.6s infinite; flex:0 0 auto; }
        .dw-ticker-tag{ font-size:13px; font-weight:800; color:#16a34a; text-transform:uppercase; letter-spacing:.06em; flex:0 0 auto; }
        .dw-ticker-text{ font-size:clamp(14px,1vw,18px); color:var(--navy); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; animation:dwSlideIn .5s ease; }
        .dw-ticker-text em{ color:var(--text); font-style:normal; font-weight:500; margin-left:6px; }
        @keyframes dwPulse{ 0%{ box-shadow:0 0 0 0 rgba(34,197,94,.55) } 70%{ box-shadow:0 0 0 10px rgba(34,197,94,0) } 100%{ box-shadow:0 0 0 0 rgba(34,197,94,0) } }
        @keyframes dwSlideIn{ from{ opacity:0; transform:translateY(8px) } to{ opacity:1; transform:none } }

        /* ── Herramientas IA premium ── */
        .dw-tools-wrap{ padding:24px 0 28px; }
        .dw-tools-grid{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; overflow-x:auto; overflow-y:visible; padding:2px 0 10px; scroll-snap-type:x mandatory; scrollbar-width:none; }
        .dw-tools-grid::-webkit-scrollbar{ display:none; }
        .dw-tool-card{ position:relative; overflow:hidden; min-height:154px; display:block; text-align:left; cursor:pointer; border:1px solid #dfe7f3; border-radius:20px; background:linear-gradient(135deg,#ffffff 0%,#fbfdff 100%); padding:16px 15px 14px; box-shadow:0 12px 28px rgba(25,50,90,.08); font-family:inherit; transition:transform .2s ease, box-shadow .2s ease, border-color .2s ease; scroll-snap-align:start; }
        .dw-tool-card::after{ content:''; position:absolute; inset:0; pointer-events:none; background:linear-gradient(120deg,transparent 0%,rgba(37,99,235,.05) 100%); }
        .dw-tool-card:hover{ transform:translateY(-4px); box-shadow:0 20px 48px rgba(37,99,235,.13); border-color:#c8d8f1; }
        .dw-tool-copy{ position:relative; z-index:3; width:min(76%,230px); }
        .dw-tool-head{ display:flex; align-items:flex-start; gap:10px; margin-bottom:9px; min-width:0; }
        .dw-tool-kicker{ display:inline-flex; align-items:center; gap:7px; margin:0; min-height:30px; color:#2563eb; font-size:12px; font-weight:900; flex:0 0 auto; }
        .dw-tool-kicker i{ width:30px; height:30px; border-radius:11px; display:grid; place-items:center; background:#f4f8ff; box-shadow:0 8px 18px rgba(30,64,175,.10); font-style:normal; font-size:17px; }
        .dw-tool-kicker b{ padding:5px 10px; border-radius:999px; background:#edf4ff; color:#2563eb; font-size:9px; letter-spacing:.03em; }
        .dw-tool-card h3{ margin:2px 0 0; color:#07142f; font-family:'Inter Tight',Inter,sans-serif; font-size:clamp(17px,1.02vw,22px); font-weight:900; line-height:1.03; letter-spacing:0; min-width:0; }
        .dw-tool-card p{ margin:0 0 12px; color:#66758f; font-size:12px; line-height:1.28; font-weight:650; max-width:205px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .dw-tool-link{ display:inline-flex; align-items:center; justify-content:center; min-width:88px; height:32px; border-radius:9px; background:linear-gradient(180deg,#2f7cff,#1261f3); color:#fff; font-size:12px; font-weight:900; box-shadow:0 10px 18px rgba(37,99,235,.20); }
        .dw-tool-art{ position:absolute; z-index:2; right:-104px; bottom:-104px; width:70%; height:100%; min-height:220px; display:block; isolation:isolate; pointer-events:none; transform:scale(.40); transform-origin:right bottom; opacity:.80; }
        .dw-tool-art::before{ content:''; position:absolute; inset:12% 0 8% 6%; background:#eef5ff; clip-path:polygon(22% 0,100% 12%,94% 84%,46% 100%,0 72%,10% 18%); z-index:-1; opacity:.92; }
        .dw-art-dots{ position:absolute; right:8%; top:12%; width:118px; height:90px; opacity:.55; background-image:radial-gradient(#8bb8ff 3px, transparent 3px); background-size:24px 24px; }
        .dw-art-camera{ position:absolute; left:5%; top:8%; width:110px; height:96px; border-radius:28px; background:#f4f8ff; box-shadow:0 18px 40px rgba(30,64,175,.12); display:grid; place-items:center; }
        .dw-art-camera::before{ content:''; width:70px; height:52px; border-radius:12px; background:linear-gradient(145deg,#3b82ff,#1156e9); box-shadow:inset 0 -10px 16px rgba(3,20,80,.16); }
        .dw-art-camera span{ position:absolute; width:36px; height:36px; border-radius:50%; background:radial-gradient(circle at 42% 38%,#95baff 0 18%,#0f2e74 20% 58%,#1f6fff 60%); box-shadow:0 0 0 6px rgba(255,255,255,.18); }
        .dw-art-phone{ position:absolute; left:42%; top:7%; width:132px; height:248px; border-radius:30px; background:#0b1020; box-shadow:0 18px 42px rgba(16,31,67,.22); transform:rotate(4deg); border:6px solid #2f6dcb; }
        .dw-phone-top{ position:absolute; left:34%; top:6px; width:32%; height:10px; border-radius:0 0 10px 10px; background:#030712; }
        .dw-phone-crack{ position:absolute; left:16px; top:48px; right:16px; bottom:62px; border-radius:8px; background:linear-gradient(145deg,#e5e7eb,#cbd5e1); overflow:hidden; }
        .dw-phone-crack::before{ content:''; position:absolute; left:34px; top:0; width:2px; height:130px; background:#7b8797; transform:rotate(-24deg); box-shadow:18px 34px 0 #9aa4b2,-14px 52px 0 #a0aaba; }
        .dw-phone-btn{ position:absolute; left:50%; bottom:20px; width:42px; height:42px; transform:translateX(-50%); border-radius:50%; border:4px solid #fff; }
        .dw-art-estimate{ position:absolute; right:1%; top:25%; width:205px; border-radius:22px; background:rgba(255,255,255,.94); box-shadow:0 18px 48px rgba(15,23,42,.13); padding:22px; color:#07142f; transform:rotate(3deg); }
        .dw-art-estimate b{ display:block; color:#2563eb; font-size:14px; margin-bottom:18px; }
        .dw-art-estimate span,.dw-art-estimate em{ display:block; color:#64748b; font-style:normal; font-weight:800; font-size:13px; }
        .dw-art-estimate strong{ display:block; font-size:29px; margin:8px 0 18px; }
        .dw-art-estimate i{ display:block; height:1px; background:#e2e8f0; margin-bottom:18px; }
        .dw-art-estimate div{ display:flex; gap:9px; margin-top:12px; }
        .dw-art-estimate div span{ width:42px; height:42px; border-radius:10px; background:#eaf3ff; display:grid; place-items:center; color:#2563eb; font-size:22px; }
        .dw-art-robot{ position:absolute; left:5%; top:12%; width:120px; height:112px; border-radius:30px; background:#f4f8ff; box-shadow:0 18px 40px rgba(30,64,175,.10); }
        .dw-art-robot::before{ content:''; position:absolute; left:28px; top:35px; width:64px; height:44px; border:6px solid #2f73ff; border-radius:20px; }
        .dw-art-robot::after{ content:''; position:absolute; left:50%; top:23px; width:5px; height:18px; background:#2f73ff; transform:translateX(-50%); border-radius:99px; }
        .dw-art-robot span{ position:absolute; left:45px; top:53px; width:9px; height:9px; border-radius:50%; background:#2f73ff; box-shadow:23px 0 0 #2f73ff; }
        .dw-art-robot i{ position:absolute; left:34px; bottom:24px; width:28px; height:17px; border-left:5px solid #2f73ff; border-bottom:5px solid #2f73ff; transform:skewX(-24deg); }
        .dw-art-chat{ position:absolute; right:24%; top:22%; width:178px; height:96px; border-radius:22px; background:linear-gradient(180deg,#3b82ff,#165eea); color:#fff; display:grid; place-items:center; font-size:50px; letter-spacing:8px; box-shadow:0 20px 44px rgba(37,99,235,.25); }
        .dw-art-chat::after{ content:''; position:absolute; right:22px; bottom:-20px; border-width:22px 8px 0 24px; border-style:solid; border-color:#165eea transparent transparent transparent; }
        .dw-art-form{ position:absolute; right:4%; top:34%; width:220px; border-radius:22px; background:rgba(255,255,255,.9); box-shadow:0 18px 46px rgba(15,23,42,.10); padding:20px; }
        .dw-art-form p{ margin:0; display:flex; align-items:center; gap:12px; padding:11px 0; }
        .dw-art-form p + p{ border-top:1px solid #eef2f7; }
        .dw-art-form b{ width:38px; height:38px; border-radius:50%; background:#dbeafe; display:grid; place-items:center; color:#2563eb; font-size:18px; }
        .dw-art-form span{ height:9px; flex:1; border-radius:99px; background:#d7e2f3; }
        .dw-art-star{ position:absolute; left:48%; bottom:16%; width:42px; height:42px; }
        .dw-art-star::before,.dw-art-star::after{ content:''; position:absolute; inset:0; margin:auto; width:5px; height:42px; border-radius:99px; background:#9fc3ff; }
        .dw-art-star::after{ transform:rotate(90deg); }
        .dw-art-target{ position:absolute; left:11%; top:22%; width:185px; height:185px; border-radius:50%; background:repeating-radial-gradient(circle,#2f73ff 0 22px,#fff 23px 44px); box-shadow:0 20px 48px rgba(30,64,175,.16); }
        .dw-art-target span{ position:absolute; left:50%; top:50%; width:18px; height:18px; border-radius:50%; background:#2f73ff; transform:translate(-50%,-50%); }
        .dw-art-target i{ position:absolute; left:50%; top:50%; width:118px; height:6px; background:#7aa7ff; transform-origin:left center; transform:rotate(-34deg); border-radius:99px; }
        .dw-art-target i::after{ content:''; position:absolute; right:-18px; top:-14px; border-left:30px solid #2f73ff; border-top:16px solid transparent; border-bottom:16px solid transparent; }
        .dw-bid{ position:absolute; right:5%; width:178px; height:60px; border-radius:16px; background:rgba(255,255,255,.92); box-shadow:0 14px 34px rgba(15,23,42,.10); display:flex; align-items:center; justify-content:space-between; gap:14px; padding:0 18px; color:#9aa4b2; font-size:23px; font-weight:900; }
        .dw-bid span{ width:34px; height:34px; border-radius:50%; background:#dbeafe; }
        .dw-bid-one{ top:25%; }
        .dw-bid-two{ top:46%; color:#10b981; }
        .dw-bid-two span{ background:#2f73ff; }
        .dw-bid-three{ top:67%; color:#10b981; transform:translateX(-54px); }
        .dw-art-bell{ position:absolute; right:14%; top:8%; width:82px; height:82px; border-radius:50%; background:#fff; box-shadow:0 18px 40px rgba(30,64,175,.12); display:grid; place-items:center; color:#2f73ff; font-size:54px; line-height:1; }
        .dw-art-house{ position:absolute; right:16%; top:30%; width:230px; height:178px; }
        .dw-art-house .wall{ position:absolute; left:38px; bottom:0; width:150px; height:106px; border-radius:12px; background:#fff; box-shadow:0 18px 42px rgba(15,23,42,.10); }
        .dw-art-house .roof{ position:absolute; left:18px; top:10px; width:188px; height:92px; background:#2f73ff; clip-path:polygon(50% 0,100% 58%,88% 70%,50% 28%,12% 70%,0 58%); }
        .dw-art-house .door{ position:absolute; left:91px; bottom:0; width:38px; height:62px; border-radius:8px 8px 0 0; background:#10224a; }
        .dw-art-house .tree{ position:absolute; left:0; bottom:0; width:34px; height:72px; border-radius:24px 24px 8px 8px; background:#6ac35b; }
        .dw-art-checklist{ position:absolute; right:3%; bottom:18%; width:112px; border-radius:18px; background:#fff; border:6px solid #2f73ff; padding:16px 14px; box-shadow:0 18px 42px rgba(15,23,42,.12); }
        .dw-art-checklist p{ margin:0 0 10px; display:flex; gap:9px; align-items:center; color:#48c774; font-weight:900; font-size:17px; }
        .dw-art-checklist p:last-child{ margin-bottom:0; }
        .dw-art-checklist span{ height:8px; flex:1; border-radius:99px; background:#d7e2f3; }
        .dw-art-note{ position:absolute; right:4%; bottom:0; min-width:260px; border-radius:16px; background:#fff; box-shadow:0 14px 32px rgba(15,23,42,.10); padding:14px 18px; color:#07142f; font-size:17px; font-weight:800; }
        @media (max-width:1280px){ .dw-tools-grid{ grid-template-columns:repeat(4,minmax(238px,1fr)); } .dw-tool-card{ min-height:154px; } }
        @media (max-width:760px){ .dw-tools-wrap{ padding:20px 0 24px; } .dw-tools-grid{ grid-template-columns:repeat(4,minmax(220px,1fr)); gap:12px; padding-right:5vw; } .dw-tool-card{ min-height:150px; padding:15px 13px; border-radius:18px; } .dw-tool-card h3{ font-size:18px; } .dw-tool-card p{ font-size:11px; } .dw-tool-link{ min-width:82px; height:30px; font-size:12px; } .dw-tool-art{ right:-110px; bottom:-106px; transform:scale(.36); } }
        @media (max-width:520px){ .dw-tools-grid{ grid-template-columns:repeat(4,minmax(210px,1fr)); } .dw-tool-copy{ width:78%; } .dw-tool-art{ right:-116px; bottom:-112px; transform:scale(.34); } .dw-art-note{ min-width:220px; font-size:14px; } }

        /* ── Slider de reseñas ── */
        .dw-testimonial-wrap{ padding:30px 0 40px; }

        /* ── Botón flotante de emergencia ── */
        .dw-emergency{ position:fixed; right:22px; bottom:26px; z-index:60; display:inline-flex; align-items:center; gap:10px; background:#e11d2a; color:#fff; border:none; border-radius:999px; padding:15px 24px; font:800 16px/1 Inter,sans-serif; cursor:pointer; box-shadow:0 14px 34px rgba(225,29,42,.45); }
        .dw-emergency:hover{ background:#c81824; transform:translateY(-2px); }
        .dw-emergency b{ font-weight:900; }
        .dw-emergency-ping{ position:absolute; inset:0; border-radius:999px; border:2px solid #e11d2a; animation:dwPing 1.8s ease-out infinite; pointer-events:none; }
        @keyframes dwPing{ 0%{ transform:scale(1); opacity:.7 } 100%{ transform:scale(1.35); opacity:0 } }
        @media (max-width:760px){ .dw-emergency{ bottom:calc(84px + env(safe-area-inset-bottom, 0px)); right:14px; padding:13px 18px; font-size:14px; } .dw-emergency-txt b{ } }
      `}</style>

      <HeroSection navigate={navigate} user={user} />

      {/* ═════════ FEED DE ACTIVIDAD EN VIVO ═════════ */}
      {activity.length > 0 && (
        <section style={{ background: '#fff' }}>
          <div className="dewatt-wrap" style={{ padding: '22px 0' }}>
            <ActivityTicker items={activity} />
          </div>
        </section>
      )}



      <section className="dw-features">
        <div className="dewatt-wrap dw-feature-grid">
          {FEATURE_CARDS.map(([icon, title, text]) => (
            <article className="dw-feature" key={title}>
              <img src={img(icon)} alt="" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ═════════ RESEÑAS: técnico evaluado + cliente ═════════ */}
      <section className="dewatt-wrap dw-testimonial-wrap">
        <TestimonialSlider reviews={testimonialItems} />
      </section>

      <section className="dewatt-wrap dw-about" id="about">
        <div className="dw-about-art">
          <img className="dw-about-main" src={img('TZNR5ND.jpg')} alt="" />
          <img className="dw-about-small" src={img('4USMWKT.jpg')} alt="" />
          <div className="dw-about-badge"><strong><CountUp value="10" /></strong><span>Provincias cubiertas</span></div>
        </div>
        <div>
          <SectionTitle eyebrow="Todo Panamá conectado" accent="con técnicos confiables" />
          <p className="dw-copy">La página está pensada para que cualquier cliente vea la información clara, busque por necesidad y encuentre profesionales disponibles para resolver trabajos del hogar, comercios, oficinas y propiedades en todo el país.</p>
          <div className="dw-info-list">
            {[
              ['4APC6K8k.png', 'Nuestra visión', 'Hacer que contratar un técnico confiable sea rápido, claro y accesible para todos.'],
              ['4APC6K8l.png', 'Nuestra misión', 'Organizar perfiles, oficios, provincias y datos de contacto para que el cliente tome una mejor decisión.'],
            ].map(([icon, title, copy]) => (
              <div className="dw-info-row" key={title}>
                <div className="dw-info-icon"><img src={img(icon)} alt="" /></div>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dw-projects" id="business">
        <div className="dewatt-wrap">
          <div className="dw-project-head">
            <div>
              <SectionTitle eyebrow="Servicios que puedes encontrar" accent="en una sola página." />
              <p className="dw-copy">Explora técnicos para reparaciones urgentes, instalaciones, mantenimiento preventivo y mejoras para casas, apartamentos, locales y empresas.</p>
            </div>
            <button className="dw-button dark" onClick={() => navigate('search')}>Ver técnicos</button>
          </div>
          <div className="dw-project-grid">
            {PROJECTS.map(([photo, title, text]) => (
              <article className="dw-project" key={title} onClick={() => navigate('search')}>
                <img src={img(photo)} alt="" />
                <div className="dw-project-text">
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════ TÉCNICOS DESTACADOS (datos reales de Supabase) ═════════ */}
      <section className="dewatt-wrap" style={{ padding: '70px 0 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 32, marginBottom: 48, flexWrap: 'wrap' }}>
          <SectionTitle eyebrow="Técnicos destacados" accent="listos para ayudarte." />
          <button className="dw-button dark" onClick={() => navigate('search')}>Ver todos</button>
        </div>

        {featured.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: TEXT, fontSize: 20 }}>
            Aún no hay técnicos destacados. <span style={{ color: NAVY, fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate('search')}>Explora todos los técnicos →</span>
          </div>
        ) : (
          <>
            <style>{`
              .tf-grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(244px, 1fr)); gap:22px; }
              .tf-card{ position:relative; aspect-ratio:3/4; border-radius:22px; overflow:hidden; cursor:pointer; box-shadow:0 14px 40px rgba(17,39,64,.14); transition:transform .3s cubic-bezier(.2,.7,.2,1), box-shadow .3s; }
              .tf-card:hover{ transform:translateY(-6px) scale(1.015); box-shadow:0 26px 60px rgba(17,39,64,.24); }
              .tf-img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transition:transform .45s ease; }
              .tf-card:hover .tf-img{ transform:scale(1.06); }
              .tf-fallback{ position:absolute; inset:0; display:grid; place-items:center; font-size:96px; font-weight:800; color:rgba(255,255,255,.92); background:linear-gradient(160deg,#1b2d49,#0e1828); }
              .tf-grad{ position:absolute; inset:0; background:linear-gradient(to top, rgba(8,18,40,.97) 0%, rgba(8,18,40,.82) 26%, rgba(8,18,40,.32) 54%, transparent 80%); }
              .tf-content{ position:absolute; left:0; right:0; bottom:0; padding:18px; color:#fff; }
              .tf-name{ display:flex; align-items:center; gap:7px; margin:0 0 3px; font-size:19px; font-weight:800; line-height:1.15; }
              .tf-check{ width:18px; height:18px; border-radius:50%; background:#22c55e; color:#fff; display:grid; place-items:center; font-size:11px; flex:0 0 auto; }
              .tf-role{ margin:0 0 11px; font-size:13.5px; color:rgba(255,255,255,.82); }
              .tf-stats{ display:flex; align-items:center; gap:8px; font-size:12.5px; margin-bottom:13px; flex-wrap:wrap; }
              .tf-pill{ background:rgba(255,255,255,.16); backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,.22); padding:3px 9px; border-radius:999px; font-weight:600; }
              .tf-wa{ width:100%; background:#25d366; color:#fff; border:none; border-radius:12px; padding:11px 0; font-weight:700; font-size:14.5px; cursor:pointer; font-family:inherit; transition:filter .15s; }
              .tf-wa:hover{ filter:brightness(1.07); }
              @media (max-width:600px){ .tf-grid{ grid-template-columns:1fr 1fr; gap:14px; } .tf-content{ padding:13px; } .tf-name{ font-size:16px; } .tf-fallback{ font-size:72px; } }
            `}</style>
            <div className="tf-grid">
              {featured.map((tech) => {
                const slugs = (tech.category_slugs?.length ? tech.category_slugs : (tech.category_slug ? [tech.category_slug] : []))
                const wa = (tech.public_whatsapp || tech.whatsapp_phone || '').replace(/\D/g, '')
                const role = tech.professional_title || tech.category_name_es || 'Técnico'
                return (
                  <article className="tf-card" key={tech.user_id} onClick={() => openTech(tech)}>
                    {tech.avatar_url
                      ? <img className="tf-img" src={tech.avatar_url} alt={tech.full_name} />
                      : <div className="tf-fallback">{(tech.full_name || '?')[0]}</div>}
                    <div className="tf-grad" />
                    <div className="tf-content">
                      <h3 className="tf-name">{tech.full_name}{tech.verification_status === 'verified' && <span className="tf-check">✓</span>}</h3>
                      <p className="tf-role">{role}</p>
                      <div className="tf-stats">
                        <span className="tf-pill">★ {Number(tech.average_rating || 0).toFixed(1)} ({tech.total_reviews || 0})</span>
                        {tech.min_price != null && <span className="tf-pill">Desde ${tech.min_price}</span>}
                        {slugs[0] && <span className="tf-pill">{CAT_ICONS[slugs[0]] || '🔧'} {slugs[0]}</span>}
                      </div>
                      <button className="tf-wa"
                        onClick={(e) => { e.stopPropagation(); if (wa) window.open(`https://wa.me/${wa}?text=${encodeURIComponent('Hola ' + tech.full_name + ', vi tu perfil en Tecnifix')}`, '_blank'); else openTech(tech) }}>
                        📱 Contactar por WhatsApp
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>

      <section className="dw-services" id="services">
        <div className="dewatt-wrap">
          <SectionTitle center eyebrow="Busca por oficio" accent="y encuentra ayuda rápido." />
          <p className="dw-copy" style={{ textAlign: 'center' }}>Elige el tipo de servicio que necesitas y Tecnifix te lleva directo a técnicos disponibles para comparar perfiles, ubicación y experiencia.</p>
          <div className="dw-service-grid">
            {SERVICES.map(([icon, title, text, slug]) => (
              <article className="dw-service" key={title} onClick={() => goToCategory(slug, setSelectedCategory, navigate)}>
                <img src={img(icon)} alt="" />
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="dw-story">
        <div className="dw-story-card">
          <div>
            <h2>Confianza para hogares<span>y negocios.</span></h2>
            <p className="dw-quote">“Encontré un técnico cerca, vi su información y pude coordinar el trabajo sin perder la tarde buscando contactos.”</p>
            {/* TODO (Task #4): reemplazar por un testimonio real de un cliente de Panamá. */}
            <div className="dw-author">
              <img src={img('CCa.jpg')} alt="" />
              <div><strong>Cliente Tecnifix</strong><span>Testimonio de ejemplo</span></div>
            </div>
          </div>
          <img className="dw-story-main" src={img('team5.jpg')} alt="" />
          <div className="dw-story-side">
            <strong>{stats ? <CountUp value={`${stats.satisfaction}%`} /> : '—'}</strong>
            <h3>Satisfacción del cliente</h3>
            <p>Información clara para decidir mejor.</p>
            <div className="dw-faces">
              {['CCa.jpg', 'Ra.jpg', 'HP52FMM.jpg'].map((face) => <img src={img(face)} alt="" key={face} />)}
            </div>
            <div className="dw-story-video" onClick={() => navigate('search')}>
              <img src={img('8KPFMQ4.jpg')} alt="" />
              <PlayButton />
            </div>
          </div>
        </div>

        <p className="dw-logo-copy">Tecnifix organiza técnicos por categorías, provincias y disponibilidad para que el cliente entre, revise opciones y solicite ayuda con más seguridad.</p>
        <div className="dw-logo-cloud">
          {LOGOS.map((logo) => <img key={logo} src={img(logo)} alt="" />)}
        </div>
      </section>

      <section className="dewatt-wrap dw-safety" id="guarantee">
        <div>
          <SectionTitle eyebrow="Compara, elige" accent="y contacta con seguridad." />
          <p className="dw-copy">Antes de llamar, el cliente puede revisar especialidad, provincia, precio inicial, reseñas y disponibilidad para encontrar la mejor opción.</p>
          <div className="dw-progress">
            {METRICS.map(([label, pct]) => (
              <div key={label}>
                <div className="dw-progress-head"><span>{label}</span><strong>{pct}%</strong></div>
                <div className="dw-bar"><span style={{ width: `${pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="dw-safety-art">
          <img className="dw-safety-main" src={img('KM8CCJE.jpg')} alt="" />
          <img className="dw-safety-small" src={img('LCC7U5G.jpg')} alt="" />
          <div className="dw-safety-badge"><strong>{stats ? <CountUp value={`${stats.verified}+`} /> : '—'}</strong><span>Técnicos verificados</span></div>
        </div>
      </section>

      <section className="dw-blog">
        <div className="dewatt-wrap">
          <SectionTitle center eyebrow="Consejos para contratar" accent="mejor cada servicio." />
          <p className="dw-copy" style={{ textAlign: 'center' }}>Contenido pensado para ayudar al cliente a preparar su solicitud, comparar técnicos y cuidar su propiedad.</p>
          <div className="dw-blog-grid">
            {BLOG.map(([photo, title]) => (
              <article className="dw-post" key={title}>
                <div className="dw-post-img">
                  <img src={img(photo)} alt="" />
                  <div className="dw-date">25<span>Sep</span></div>
                </div>
                <div className="dw-post-body">
                  <div className="dw-meta"><span>Tecnifix</span><span>Septiembre 25, 2025</span></div>
                  <h3>{title}</h3>
                  <p>Guías simples para saber qué preguntar, qué datos revisar y cómo elegir un servicio con más confianza.</p>
                  <button className="dw-button dark" onClick={() => navigate('search')}>Buscar ahora</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="dewatt-wrap dw-contact" id="contact">
        <div className="dw-form">
          {[
            ['name', 'Nombre', 'Tu nombre'],
            ['email', 'Email', 'Tu email'],
            ['subject', 'Servicio', 'Qué técnico necesitas'],
          ].map(([key, label, placeholder]) => (
            <label className="dw-field" key={key}>
              {label}*
              <input value={contact[key]} onChange={(e) => setContact((c) => ({ ...c, [key]: e.target.value }))} placeholder={placeholder} />
            </label>
          ))}
          <label className="dw-field">
            Mensaje*
            <textarea value={contact.message} onChange={(e) => setContact((c) => ({ ...c, message: e.target.value }))} placeholder="Cuéntanos tu ciudad, oficio y urgencia" />
          </label>
          <button className="dw-button" onClick={sendContact}>Enviar mensaje</button>
        </div>

        <div>
          <SectionTitle eyebrow="¿Necesitas ayuda?" accent="Te orientamos" />
          <p className="dw-copy">Si no sabes qué oficio elegir, escríbenos y te ayudamos a encontrar la categoría correcta para tu solicitud.</p>
          <div className="dw-contact-list">
            {[
              ['pin', 'Cobertura', 'Todas las provincias de Panamá'],
              ['phone', 'Llámanos', PHONE],
              ['mail', 'Escríbenos', 'hola@tecnifix.com'],
            ].map(([kind, label, value]) => (
              <div className="dw-contact-row" key={label}>
                <PhoneIcon dark kind={kind} />
                <div><h3>{label}</h3><p>{value}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dw-cta">
        <div className="dw-cta-inner">
          <h2>Encuentra el técnico ideal en todo Panamá<span>Busca por oficio, ciudad o provincia.</span></h2>
          <div className="dw-cta-actions">
            <button className="dw-button" onClick={() => navigate('search')}>Buscar técnicos</button>
            <a className="dw-call" href={`tel:${PHONE.replace(/\D/g, '')}`}>
              <PhoneIcon />
              <span><small>Atención</small><strong>{PHONE}</strong></span>
            </a>
          </div>
          {(!user || user.role === 'user') && (
            <p style={{ marginTop: 36, color: GOLD, fontSize: 20, fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(user?.role === 'technician' ? 'verification-center' : 'register')}>
              ¿Eres técnico? Regístrate aquí
            </p>
          )}
          <img className="dw-cta-man" src={img('A8DABA5.png')} alt="" />
        </div>
      </section>

      <footer className="dw-footer">
        <div className="dw-footer-grid">
          <div>
            <div className="dw-footer-logo">
              <div className="dw-footer-brand"><strong>TECNI<span>FIX</span></strong></div>
              <small>Técnicos en todo Panamá</small>
            </div>
            <p>Plataforma para buscar técnicos por oficio, provincia, disponibilidad y experiencia. Pensada para clientes que necesitan información clara antes de contratar.</p>
            <div className="dw-social">
              {['f', 'x', '▶'].map((item) => <button key={item}>{item}</button>)}
            </div>
          </div>

          <div>
            <h3>Enlaces rápidos</h3>
            <ul>
              {[
                ['Inicio', () => window.scrollTo({ top: 0, behavior: 'smooth' })],
                ['Buscar', () => navigate('search')],
                ['Oficios', () => scrollHomeSection('services')],
                ['Urgencias', runEmergency],
                ['Empresas', () => scrollHomeSection('business')],
                ['Garantía', () => scrollHomeSection('guarantee')],
                ['Soy técnico', () => navigate(user?.role === 'technician' ? 'verification-center' : 'register')],
                ['Contacto', () => scrollHomeSection('contact')],
              ].map(([label, action]) => <li key={label} onClick={action}>{label}</li>)}
            </ul>
          </div>

          <div>
            <h3>Categorías</h3>
            <ul>
              {['Electricistas', 'Plomeros', 'Aire acondicionado', 'Cerrajeros', 'Pintores'].map((label) => <li key={label} onClick={() => navigate('search')}>{label}</li>)}
            </ul>
          </div>

          <div>
            <h3>Contacto</h3>
            <div className="dw-touch">
              <p><span>●</span>Cobertura nacional en Panamá</p>
              <p><span>●</span>hola@tecnifix.com</p>
              <p><span>●</span>{PHONE}</p>
            </div>
          </div>
        </div>
        <div className="dw-copybar">Copyright © 2026 Tecnifix. Todos los derechos reservados.</div>
      </footer>

      {/* ═════════ BOTÓN FLOTANTE DE EMERGENCIA ═════════ */}
      <button className="dw-emergency" onClick={runEmergency} aria-label="Buscar técnicos disponibles ahora">
        <span className="dw-emergency-ping" />
        🚨 <span className="dw-emergency-txt">Necesito ayuda <b>YA</b></span>
      </button>
    </main>
  )
}
