import { useApp } from '../context/AppContext.jsx'
import { Avatar, Badge } from './UI.jsx'
import { computeTrustScore, getTrustTier } from '../lib/trust.js'

export function TechnicianCard({ tech, onPress }) {
  const { favoriteIds, toggleFavorite, lang } = useApp()
  const isFav = favoriteIds.includes(tech.user_id)

  const title = lang === 'en'
    ? (tech.professional_title_en || tech.professional_title)
    : tech.professional_title
  const trustScore = computeTrustScore(tech)
  const trustTier = getTrustTier(trustScore)

  return (
    <div className="tf-profile-card" onClick={() => onPress(tech)}>
      <style>{`
        .tf-profile-card {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          background: #ffffff;
          padding: 24px;
          box-shadow: 12px 12px 24px rgba(0,0,0,0.06), -12px -12px 24px rgba(255,255,255,0.9);
          transition: all 0.5s ease;
          display: flex;
          flex-direction: column;
          height: 100%;
          cursor: pointer;
          border: 1px solid rgba(0,0,0,0.02);
        }
        .tf-profile-card:hover {
          box-shadow: 20px 20px 40px rgba(0,0,0,0.1), -20px -20px 40px rgba(255,255,255,1);
          transform: scale(1.02) translateY(-8px);
        }

        /* Status Indicator */
        .tf-status-dot {
          height: 14px;
          width: 14px;
          border-radius: 50%;
          border: 2px solid #fff;
          transition: all 0.3s ease;
        }
        .tf-profile-card:hover .tf-status-dot {
          transform: scale(1.25);
        }
        @keyframes pingSoft {
          0% { transform: scale(1); opacity: 0.6; }
          75%, 100% { transform: scale(2.5); opacity: 0; }
        }
        .tf-status-ping {
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          background: #22c55e;
          animation: pingSoft 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        /* Verified Badge */
        .tf-verified-badge {
          border-radius: 50%;
          background: #102840;
          padding: 6px;
          box-shadow: 2px 2px 4px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tf-profile-card:hover .tf-verified-badge {
          transform: scale(1.1) rotate(12deg);
          box-shadow: 0 0 15px rgba(16,40,64,0.4);
        }

        /* Avatar Container */
        .tf-avatar-wrap {
          position: relative;
          transition: transform 0.5s ease;
        }
        .tf-profile-card:hover .tf-avatar-wrap {
          transform: scale(1.05);
        }
        @keyframes pulseRing {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        .tf-avatar-ring {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 2px solid #FFD400;
          opacity: 0;
          transition: all 0.5s ease;
        }
        .tf-profile-card:hover .tf-avatar-ring {
          opacity: 1;
          animation: pulseRing 2s infinite;
        }

        /* Text Animations */
        .tf-info-wrap {
          text-align: center;
          position: relative;
          z-index: 10;
          transition: transform 0.3s ease;
          margin-top: 16px;
        }
        .tf-profile-card:hover .tf-info-wrap {
          transform: translateY(-4px);
        }
        .tf-name {
          font-size: 1.125rem;
          font-weight: 800;
          color: #111827;
          transition: color 0.3s ease;
          margin: 0 0 4px;
        }
        .tf-profile-card:hover .tf-name {
          color: #102840;
        }
        .tf-role {
          font-size: 0.875rem;
          color: #6b7280;
          transition: color 0.3s ease;
          margin: 0;
          font-weight: 600;
        }
        .tf-profile-card:hover .tf-role {
          color: #374151;
        }

        /* Tag Animations */
        .tf-tag {
          display: inline-block;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 0.75rem;
          font-weight: 700;
          box-shadow: 2px 2px 4px rgba(0,0,0,0.04), -2px -2px 4px rgba(255,255,255,0.8);
          transition: all 0.3s ease;
          background: #f8fafc;
          color: #475569;
        }
        .tf-profile-card:hover .tf-tag {
          transform: scale(1.05);
        }

        /* Buttons */
        .tf-action-btn {
          flex: 1;
          border-radius: 999px;
          padding: 14px 0;
          font-size: 0.875rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.3s ease;
          box-shadow: 6px 6px 12px rgba(0,0,0,0.06), -6px -6px 12px rgba(255,255,255,0.9);
          background: #ffffff;
        }
        .tf-action-btn:hover {
          box-shadow: 2px 2px 4px rgba(0,0,0,0.04), -2px -2px 4px rgba(255,255,255,0.8);
          transform: scale(0.96);
        }
        .tf-btn-primary { color: #102840; }
        .tf-profile-card:hover .tf-btn-primary { background: #FFD400; }
        
        .tf-btn-secondary { color: #475569; }
        .tf-profile-card:hover .tf-btn-secondary { background: #f1f5f9; }

        .tf-card-border {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          border: 2px solid rgba(16,40,64,0.1);
          opacity: 0;
          transition: opacity 0.5s ease;
          pointer-events: none;
        }
        .tf-profile-card:hover .tf-card-border {
          opacity: 1;
        }
      `}</style>

      {/* Animated border on hover */}
      <div className="tf-card-border"></div>

      {/* Top right actions (Status & Fav) */}
      <div style={{ position: 'absolute', right: 20, top: 20, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <div className="tf-status-dot" style={{ background: tech.is_available ? '#22c55e' : '#9ca3af' }}></div>
          {tech.is_available && <div className="tf-status-ping"></div>}
        </div>
        
        <button onClick={e => { e.stopPropagation(); toggleFavorite(tech.user_id) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 22, padding: 0, outline: 'none', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform='scale(1.2)'} onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
          {isFav ? '⭐' : '☆'}
        </button>
      </div>

      {/* Verified badge with bounce animation */}
      {tech.verification_status === 'verified' && (
        <div style={{ position: 'absolute', left: 20, top: 20, zIndex: 10 }}>
          <div className="tf-verified-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFD400" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        </div>
      )}

      {/* Profile Photo with enhanced hover effects */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 10, marginTop: 12 }}>
        <div className="tf-avatar-wrap">
          <div style={{ padding: 6, borderRadius: '50%', background: '#fff', boxShadow: 'inset 6px 6px 12px rgba(0,0,0,0.06), inset -6px -6px 12px rgba(255,255,255,0.9)' }}>
            {/* Usamos el componente Avatar nativo en vez de <img> puro para soportar iniciales */}
            <Avatar photo={tech.avatar_url} name={tech.full_name} size={96} online={undefined} />
          </div>
          {/* Glowing ring on hover */}
          <div className="tf-avatar-ring"></div>
        </div>
      </div>

      {/* Profile Info with slide-up animation */}
      <div className="tf-info-wrap">
        <h3 className="tf-name">{tech.full_name}</h3>
        <p className="tf-role">{title}</p>
        
        <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.3s' }} className="group-hover:text-gray-700">
          <span style={{ color: '#FFD400', fontSize: '1rem' }}>★</span> 
          <span style={{ color: '#111827', fontWeight: 800 }}>{Number(tech.average_rating || 0).toFixed(1)}</span>
          <span>({tech.total_reviews || 0} res)</span>
        </div>
      </div>

      {/* Tags with bounce animation */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
        {(() => {
          const CAT_ES = { climatizacion: 'A/C', electricidad: 'Electricidad', plomeria: 'Plomería', albanileria: 'Albañilería', limpieza: 'Limpieza', cerrajeria: 'Cerrajería', pintura: 'Pintura', tecnologia: 'Tecnología' }
          const slugs = (tech.category_slugs?.length > 0) ? tech.category_slugs : (tech.category_slug ? [tech.category_slug] : [])
          return slugs.slice(0, 2).map((slug, i) => (
            <span key={i} className="tf-tag">
              {CAT_ES[slug] || slug}
            </span>
          ))
        })()}
        {tech.distance_km !== undefined && (
          <span className="tf-tag">📍 {tech.distance_km} km</span>
        )}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confianza</span>
          <span style={{ fontSize: 12, color: '#102840', fontWeight: 900 }}>{trustScore}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: '#f1f5f9' }}>
          <div style={{ width: `${trustScore}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, #FFD400, #102840)` }} />
        </div>
      </div>

      {/* Action Buttons with enhanced hover effects */}
      <div style={{ marginTop: 24, display: 'flex', gap: 12, position: 'relative', zIndex: 10 }}>
        <button className="tf-action-btn tf-btn-secondary" onClick={e => { e.stopPropagation(); onPress(tech) }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </button>
        <button className="tf-action-btn tf-btn-primary" onClick={e => {
            e.stopPropagation()
            const phone = tech.public_whatsapp || tech.whatsapp_phone || ''
            window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(tech.full_name)},%20vi%20tu%20perfil%20en%20TecniFix`, '_blank')
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        </button>
      </div>
    </div>
  )
}

