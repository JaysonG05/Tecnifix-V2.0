import { useApp } from '../context/AppContext.jsx'

// Paleta de la barra (estilo azul con franja amarilla, íconos blancos).
const NAV_BLUE = '#1b39b5'      // azul royal de la barra
const NAV_STRIPE = '#ffd23f'    // franja superior amarilla (marca Tecnifix)
const ACTIVE = '#ffffff'
const INACTIVE = 'rgba(255,255,255,0.70)'

// ── Íconos SVG blancos (heredan color del contenedor) ──────────
const Icon = {
  home: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.2 21 11h-2.4v8.8h-4.4v-5.6h-4.4v5.6H5.4V11H3z" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.6" y2="16.6" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.6A2.6 2.6 0 1 1 12 6.4a2.6 2.6 0 0 1 0 5.2z" />
    </svg>
  ),
  favorites: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.57L12 17.56 6.1 20.67l1.13-6.57L2.45 9.44l6.6-.96z" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
      <path d="M12 12.2a4.6 4.6 0 1 0 0-9.2 4.6 4.6 0 0 0 0 9.2zM3.6 20.4c0-3.3 3.77-5.6 8.4-5.6s8.4 2.3 8.4 5.6V21H3.6z" />
    </svg>
  ),
}

export function NavBar() {
  const { screen, navigate, user, unreadCount, lang, isDesktop } = useApp()
  const hidden = ['login', 'register', 'tech-profile', 'edit-profile', 'edit-tech-profile', 'verification-center', 'settings', 'notifications', 'contract', 'payment', 'write-review', 'admin', 'request-service'].includes(screen)
  if (hidden) return null
  const userName = user?.full_name || user?.email || 'Usuario'
  const userInitial = (userName.trim()[0] || 'U').toUpperCase()

  const labels = {
    es: { home: 'Inicio', search: 'Buscar', map: 'Mapa', favorites: 'Favoritos', profile: 'Perfil' },
    en: { home: 'Home', search: 'Search', map: 'Map', favorites: 'Favorites', profile: 'Profile' },
  }
  const L = labels[lang] || labels.es

  const tabs = [
    { id: 'home', label: L.home, icon: Icon.home },
    { id: 'search', label: L.search, icon: Icon.search },
    { id: 'map', label: L.map, icon: Icon.map },
    { id: 'favorites', label: L.favorites, icon: Icon.favorites },
    { id: 'profile', label: L.profile, icon: Icon.profile },
  ]

  const go = (tabId) => {
    if (tabId === 'profile' && !user) { navigate('login'); return }
    navigate(tabId)
  }

  // Desktop: la navegación va en el TopNav superior.
  if (isDesktop) return null

  // ───────────── MÓVIL: barra inferior azul ─────────────
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      background: NAV_BLUE,
      borderTop: `4px solid ${NAV_STRIPE}`,
      display: 'flex', zIndex: 100,
      boxShadow: '0 -6px 22px rgba(11,23,68,0.28)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {tabs.map(tab => {
        const active = screen === tab.id
        const color = active ? ACTIVE : INACTIVE
        return (
          <button key={tab.id} onClick={() => go(tab.id)}
            aria-label={tab.label} aria-current={active ? 'page' : undefined}
            style={{
              flex: 1, padding: '11px 0 9px', background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 4, color, position: 'relative',
            }}>
            {/* Badge de notificaciones en Perfil */}
            {tab.id === 'profile' && unreadCount > 0 && (
              <div style={{
                position: 'absolute', top: 4, right: '26%', background: '#ef4444', color: '#fff',
                fontSize: 9, fontWeight: 800, minWidth: 16, height: 16, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                border: `1.5px solid ${NAV_BLUE}`,
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}

            {/* Ícono (avatar si hay sesión en Perfil) */}
            {tab.id === 'profile' && user ? (
              <span style={{
                width: 26, height: 26, borderRadius: '50%', overflow: 'hidden',
                display: 'grid', placeItems: 'center',
                background: 'rgba(255,255,255,0.18)', color: '#fff',
                fontSize: 12, fontWeight: 900,
                boxShadow: active ? `0 0 0 2px ${NAV_STRIPE}` : '0 0 0 1.5px rgba(255,255,255,0.5)',
              }}>
                {user.avatar_url
                  ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : userInitial}
              </span>
            ) : (
              <span style={{ display: 'grid', placeItems: 'center', height: 26 }}>{tab.icon}</span>
            )}

            <span style={{ fontSize: 11, fontWeight: active ? 800 : 600, letterSpacing: 0.1 }}>{tab.label}</span>

            {/* Indicador activo: barrita amarilla */}
            {active && (
              <div style={{
                position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                width: 22, height: 3, background: NAV_STRIPE, borderRadius: '3px 3px 0 0',
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
