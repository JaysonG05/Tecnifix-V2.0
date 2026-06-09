import { useApp } from '../context/AppContext.jsx'
import { Avatar, StarRating, Badge } from './UI.jsx'

export function TechnicianCard({ tech, onPress }) {
  const { th, favoriteIds, toggleFavorite, navigate, lang } = useApp()
  const isFav = favoriteIds.includes(tech.user_id)

  const title = lang === 'en'
    ? (tech.professional_title_en || tech.professional_title)
    : tech.professional_title

  return (
    <div onClick={() => onPress(tech)} style={{
      background: th.surface, borderRadius: 18, overflow: 'hidden',
      border: `1px solid ${th.border}`, marginBottom: 16, cursor: 'pointer',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = th.shadow }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Banner */}
      <div style={{ position: 'relative', padding: '14px 16px 12px', background: tech.category_color ? `${tech.category_color}cc` : '#f1f5f9', display: 'flex', gap: 14, alignItems: 'center' }}>
        <Avatar photo={tech.avatar_url} name={tech.full_name} size={70} online={tech.is_available} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: 15, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tech.full_name}</p>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StarRating rating={tech.average_rating} size={13} />
            <span style={{ fontSize: 11, color: '#64748b' }}>({tech.total_reviews})</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 20, marginBottom: 4 }}>★ {Number(tech.average_rating).toFixed(1)}</div>
          <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>Desde <strong style={{ color: '#16a34a', fontSize: 13 }}>${tech.min_price}</strong></p>
        </div>
        {/* Fav button */}
        <button onClick={e => { e.stopPropagation(); toggleFavorite(tech.user_id) }}
          style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 16, width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isFav ? '⭐' : '☆'}
        </button>
        {/* Badges */}
        {tech.verification_status === 'verified' && (
          <div style={{ position: 'absolute', bottom: 8, left: 10, background: '#16a34a', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>✓ Verificado</div>
        )}
        {tech.distance_km !== undefined && (
          <div style={{ position: 'absolute', bottom: 8, right: 10, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>📍 {tech.distance_km} km</div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px 14px' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {tech.is_featured && <Badge>⭐ Destacado</Badge>}
          <Badge color={tech.is_available ? '#dcfce7' : '#f1f5f9'} textColor={tech.is_available ? '#166534' : '#64748b'}>
            {tech.is_available ? '● Disponible' : '○ Ocupado'}
          </Badge>
          {/* Todas las categorías del técnico */}
          {(() => {
            const CAT_ICONS = { climatizacion: '❄️', electricidad: '⚡', plomeria: '🔧', albanileria: '🧱', limpieza: '🧹', cerrajeria: '🔐', pintura: '🎨', tecnologia: '💻' }
            const CAT_COLORS = { climatizacion: '#dbeafe', electricidad: '#fef9c3', plomeria: '#e0f2fe', albanileria: '#fef3c7', limpieza: '#d1fae5', cerrajeria: '#ede9fe', pintura: '#fce7f3', tecnologia: '#e0f2fe' }
            const CAT_ES = { climatizacion: 'Climatización', electricidad: 'Electricidad', plomeria: 'Plomería', albanileria: 'Albañilería', limpieza: 'Limpieza', cerrajeria: 'Cerrajería', pintura: 'Pintura', tecnologia: 'Técnico PC' }
            const CAT_EN = { climatizacion: 'A/C', electricidad: 'Electrical', plomeria: 'Plumbing', albanileria: 'Masonry', limpieza: 'Cleaning', cerrajeria: 'Locksmith', pintura: 'Painting', tecnologia: 'PC Tech' }
            const slugs = (tech.category_slugs?.length > 0)
              ? tech.category_slugs
              : (tech.category_slug ? [tech.category_slug] : [])
            return slugs.map((slug, i) => (
              <Badge key={i} color={CAT_COLORS[slug] || '#f1f5f9'} textColor="#334155">
                {CAT_ICONS[slug] || '🔧'} {lang === 'en' ? (CAT_EN[slug] || slug) : (CAT_ES[slug] || slug)}
              </Badge>
            ))
          })()}
        </div>
        <button onClick={e => {
          e.stopPropagation()
          const phone = tech.public_whatsapp || tech.whatsapp_phone || ''
          window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(tech.full_name)},%20vi%20tu%20perfil%20en%20Changuinola%20Pro`, '_blank')
        }}
          style={{ width: '100%', background: '#25d366', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span>📱</span> Contactar por WhatsApp
        </button>
      </div>
    </div>
  )
}