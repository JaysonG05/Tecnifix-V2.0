import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Avatar, StarRating } from './UI.jsx'

// Icono de categoría como SVG simple — reemplaza emojis
const CatIcon = ({ slug, size = 16, color = 'currentColor' }) => {
  const paths = {
    climatizacion: <><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /><circle cx="12" cy="12" r="3" /></>,
    electricidad: <path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H13L13 2z" />,
    plomeria: <><path d="M5 12s2.3-1 5-1 5 1 5 1" /><path d="M12 7v5M8 7h8" /><path d="M6 19a2 2 0 104 0 2 2 0 00-4 0" /><path d="M14 19a2 2 0 104 0 2 2 0 00-4 0" /><path d="M8 19h2M16 19h2" /></>,
    albanileria: <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />,
    limpieza: <><path d="M3 22v-3l16-16 3 3L6 22H3z" /><path d="M14.5 5.5l3 3" /></>,
    cerrajeria: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /><circle cx="12" cy="16" r="1" /></>,
    pintura: <><path d="M19 3H5c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" /><path d="M12 11v10M12 21c0 0-3-1.5-3-4.5S12 13 12 13s3 2.5 3 3.5-3 4.5-3 4.5z" /></>,
    tecnologia: <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[slug] || <circle cx="12" cy="12" r="9" />}
    </svg>
  )
}

const CAT_ES = { climatizacion: 'Climatización', electricidad: 'Electricidad', plomeria: 'Plomería', albanileria: 'Albañilería', limpieza: 'Limpieza', cerrajeria: 'Cerrajería', pintura: 'Pintura', tecnologia: 'Técnico PC' }
const CAT_EN = { climatizacion: 'A/C & HVAC', electricidad: 'Electrical', plomeria: 'Plumbing', albanileria: 'Masonry', limpieza: 'Cleaning', cerrajeria: 'Locksmith', pintura: 'Painting', tecnologia: 'IT Support' }

export function TechnicianCard({ tech, onPress }) {
  const { th, favoriteIds, toggleFavorite, lang, isDesktop } = useApp() 
  const isFav = favoriteIds.includes(tech.user_id)
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  const title = lang === 'en'
    ? (tech.professional_title_en || tech.professional_title)
    : tech.professional_title

  const slugs = tech.category_slugs?.length > 0
    ? tech.category_slugs.slice(0, 3)
    : (tech.category_slug ? [tech.category_slug] : [])

  return (
    <div
      onClick={() => onPress(tech)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        background: th.surface,
        borderRadius: 16,
        border: `1.5px solid ${hovered ? th.primary + '55' : th.border}`,
        marginBottom: isDesktop ? 0 : 12, 
        cursor: 'pointer',
        height: isDesktop ? '100%' : undefined,
        overflow: 'hidden',
        position: 'relative',
        transform: pressed ? 'scale(0.985)' : hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? th.shadow : th.shadowSm,
        transition: 'all 180ms var(--ease-out)',
      }}
    >
      {/* ── Franja superior de color si está disponible ── */}
      <div style={{
        height: 4,
        background: tech.is_available
          ? `linear-gradient(90deg, ${th.verified} 0%, ${th.primary} 100%)`
          : th.border,
        transition: 'all 200ms',
      }} />

      <div style={{ padding: '14px 16px 16px' }}>
        {/* ── Header: avatar + info + precio ── */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ position: 'relative' }}>
            <Avatar photo={tech.avatar_url} name={tech.full_name} size={56} />
            {/* Punto de disponibilidad encima del avatar */}
            <div style={{
              position: 'absolute', bottom: 2, right: 2,
              width: 12, height: 12, borderRadius: 6,
              background: tech.is_available ? th.verified : th.border,
              border: `2px solid ${th.surface}`,
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <p style={{
                margin: 0, fontWeight: 700, fontFamily: th.fontDisplay,
                fontSize: 15, color: th.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {tech.full_name}
              </p>
              {tech.verification_status === 'verified' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill={th.primary}>
                  <path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-.865 3.48 3.745 3.745 0 01-3.48.865A3.735 3.735 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.48-.865 3.746 3.746 0 01-.865-3.48A3.735 3.735 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 01.865-3.48 3.745 3.745 0 013.48-.865A3.735 3.735 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 013.48.865 3.745 3.745 0 01.865 3.48A3.735 3.735 0 0121 12z" />
                </svg>
              )}
            </div>

            <p style={{
              margin: '0 0 6px', fontSize: 12, color: th.textSec,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {title}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StarRating rating={tech.average_rating} size={13} />
              <span style={{ fontSize: 11, color: th.textSec, fontFamily: th.fontMono }}>
                {Number(tech.average_rating).toFixed(1)} ({tech.total_reviews})
              </span>
              {tech.distance_km !== undefined && (
                <span style={{ fontSize: 11, color: th.textSec }}>
                  · {tech.distance_km} km
                </span>
              )}
            </div>
          </div>

          {/* Precio — estilo etiqueta */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{
              margin: '0 0 1px', fontSize: 9, color: th.textSec,
              textTransform: 'uppercase', letterSpacing: 1, fontFamily: th.fontDisplay
            }}>
              {lang === 'en' ? 'FROM' : 'DESDE'}
            </p>
            <p style={{
              margin: 0, fontFamily: th.fontMono, fontWeight: 700,
              fontSize: 20, color: th.primary, lineHeight: 1
            }}>
              ${tech.min_price}
            </p>
          </div>
        </div>

        {/* ── Categorías como pills con SVG ── */}
        {slugs.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {slugs.map((slug, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 100,
                background: th.surface2, border: `1px solid ${th.border}`,
                fontSize: 11, fontWeight: 600, color: th.textSec, fontFamily: th.fontDisplay,
              }}>
                <CatIcon slug={slug} size={12} color={th.primary} />
                {lang === 'en' ? (CAT_EN[slug] || slug) : (CAT_ES[slug] || slug)}
              </div>
            ))}
            {tech.is_featured && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 100,
                background: th.yellowLight, border: `1px solid ${th.yellow}66`,
                fontSize: 11, fontWeight: 700, color: th.yellowText, fontFamily: th.fontDisplay,
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill={th.yellow}>
                  <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                Destacado
              </div>
            )}
          </div>
        )}

        {/* ── Botón WhatsApp ── */}
        <button
          onClick={e => {
            e.stopPropagation()
            const p = tech.public_whatsapp || tech.whatsapp_phone || ''
            window.open(`https://wa.me/${p.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(tech.full_name)},%20vi%20tu%20perfil%20en%20TECNIFIX`, '_blank')
          }}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 100,
            background: `linear-gradient(135deg, #25D366, #1DA851)`,
            color: '#fff', border: 'none',
            fontFamily: th.fontDisplay, fontWeight: 700, fontSize: 13,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 12px #25D36640',
            transition: 'all 160ms var(--ease-out)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px #25D36655' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px #25D36640' }}
          onMouseDown={e => { e.stopPropagation(); e.currentTarget.style.transform = 'scale(0.97)' }}
          onMouseUp={e => { e.stopPropagation(); e.currentTarget.style.transform = 'translateY(-1px)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
            <path d="M20.52 3.449C18.245 1.178 15.235 0 12.045 0 5.463 0 .104 5.334.1 11.893c-.001 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 005.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896.001-3.176-1.24-6.165-3.48-8.45zm-8.474 18.3h-.005a10.06 10.06 0 01-5.116-1.398l-.367-.217-3.804.993 1.015-3.688-.239-.38a9.918 9.918 0 01-1.532-5.302C2.1 6.417 6.619 1.92 12.05 1.92c2.628 0 5.099 1.021 6.957 2.876a9.785 9.785 0 012.88 6.94c-.003 5.41-4.522 9.812-10.84 9.012zm5.906-7.399c-.316-.157-1.873-.917-2.163-1.022-.291-.106-.503-.158-.715.158-.212.315-.82 1.022-.995 1.233-.185.21-.37.236-.686.079-.316-.158-1.332-.487-2.538-1.56-.939-.834-1.572-1.864-1.756-2.18-.184-.314-.02-.485.138-.641.143-.142.316-.368.474-.553.158-.185.21-.316.316-.527.105-.21.052-.394-.027-.553-.079-.158-.715-1.716-.979-2.35-.258-.616-.52-.532-.715-.541l-.609-.01a1.17 1.17 0 00-.846.395c-.291.315-1.11 1.075-1.11 2.621 0 1.546 1.136 3.04 1.294 3.25.158.211 2.231 3.392 5.408 4.758.755.325 1.344.52 1.804.665.758.24 1.448.206 1.993.125.608-.09 1.873-.763 2.137-1.5.264-.737.264-1.369.184-1.5-.079-.132-.29-.21-.606-.368z" />
          </svg>
          Contactar por WhatsApp
        </button>
      </div>

      {/* Botón favorito — esquina superior derecha */}
      <button
        onClick={e => { e.stopPropagation(); toggleFavorite(tech.user_id) }}
        style={{
          position: 'absolute', top: 14, right: 14,
          width: 32, height: 32, borderRadius: 16,
          border: isFav ? `1.5px solid ${th.yellow}` : `1.5px solid ${th.border}`,
          background: isFav ? '#FFF9C4' : 'rgba(255,255,255,0.92)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.13)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 140ms var(--ease-out)',
          zIndex: 2,
        }}
        onMouseDown={e => { e.stopPropagation(); e.currentTarget.style.transform = 'scale(0.85)' }}
        onMouseUp={e => { e.stopPropagation(); e.currentTarget.style.transform = 'scale(1)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24"
          fill={isFav ? '#FFD600' : 'none'}
          stroke={isFav ? '#B8860B' : '#6B7280'} strokeWidth="2">
          <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      </button>
    </div>
  )
}