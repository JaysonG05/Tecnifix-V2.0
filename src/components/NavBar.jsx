import { useApp } from '../context/AppContext.jsx'

export function NavBar() {
  const { th, screen, navigate, user, unreadCount, lang } = useApp()
  const hidden = ['login', 'register', 'tech-profile', 'edit-profile', 'edit-tech-profile', 'settings', 'notifications', 'contract', 'payment', 'write-review', 'admin', 'request-service'].includes(screen)
  if (hidden) return null

  const labels = {
    es: { home: 'Inicio', search: 'Buscar', map: 'Mapa', favorites: 'Favoritos', profile: 'Perfil' },
    en: { home: 'Home',   search: 'Search', map: 'Map',  favorites: 'Favorites', profile: 'Profile' },
  }
  const L = labels[lang] || labels.es

  const tabs = [
    { id: 'home',      label: L.home,      icon: '🏠' },
    { id: 'search',    label: L.search,    icon: '🔍' },
    { id: 'map',       label: L.map,       icon: '🗺️' },
    { id: 'favorites', label: L.favorites, icon: '⭐' },
    { id: 'profile',   label: L.profile,   icon: '👤' },
  ]

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430,
      background: th.navBg, borderTop: `1px solid ${th.border}`,
      display: 'flex', zIndex: 100,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {tabs.map(tab => {
        const active = screen === tab.id
        return (
          <button key={tab.id}
            onClick={() => {
              if (tab.id === 'profile' && !user) { navigate('login'); return }
              navigate(tab.id)
            }}
            style={{ flex: 1, padding: '10px 0 8px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: active ? th.primary : th.textSec, position: 'relative' }}>
            {/* Badge de notificaciones en perfil */}
            {tab.id === 'profile' && unreadCount > 0 && (
              <div style={{ position: 'absolute', top: 6, right: '28%', background: th.red, color: '#fff', fontSize: 9, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
            <span style={{ fontSize: 22 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{tab.label}</span>
            {active && <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 24, height: 3, background: th.primary, borderRadius: '3px 3px 0 0' }} />}
          </button>
        )
      })}
    </div>
  )
}
