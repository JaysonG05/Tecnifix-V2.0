import { useApp } from '../context/AppContext.jsx'

export function NavBar() {
  const { th, screen, navigate, user, unreadCount, lang, isDesktop } = useApp()
  const hidden = ['login', 'register', 'tech-profile', 'edit-profile', 'edit-tech-profile', 'settings', 'notifications', 'contract', 'payment', 'write-review', 'admin', 'request-service'].includes(screen)
  if (hidden) return null

  const labels = {
    es: { home: 'Inicio', search: 'Buscar', map: 'Mapa', favorites: 'Favoritos', profile: 'Perfil', brand: 'Changuinola Pro' },
    en: { home: 'Home', search: 'Search', map: 'Map', favorites: 'Favorites', profile: 'Profile', brand: 'Changuinola Pro' },
  }
  const L = labels[lang] || labels.es

  const tabs = [
    { id: 'home', label: L.home, icon: '🏠' },
    { id: 'search', label: L.search, icon: '🔍' },
    { id: 'map', label: L.map, icon: '🗺️' },
    { id: 'favorites', label: L.favorites, icon: '⭐' },
    { id: 'profile', label: L.profile, icon: '👤' },
  ]

  const go = (tabId) => {
    if (tabId === 'profile' && !user) { navigate('login'); return }
    navigate(tabId)
  }

  // ───────────── DESKTOP: sidebar fijo a la izquierda ─────────────
  if (isDesktop) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 220,
        background: th.navBg, borderRight: `1px solid ${th.border}`,
        display: 'flex', flexDirection: 'column', zIndex: 100,
        padding: '24px 12px',
      }}>
        {/* Logo / marca */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 12px', marginBottom: 28
        }}>
          <span style={{ fontSize: 28 }}>🛠️</span>
          <span style={{ fontWeight: 900, fontSize: 16, color: th.text }}>
            {L.brand}
          </span>
        </div>

        {tabs.map(tab => {
          const active = screen === tab.id
          return (
            <button key={tab.id} onClick={() => go(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 14px', marginBottom: 4, borderRadius: 12,
                border: 'none', cursor: 'pointer', textAlign: 'left',
                background: active ? th.primaryLight : 'transparent',
                color: active ? th.primaryText : th.textSec,
                fontWeight: active ? 700 : 500, fontSize: 15,
                fontFamily: 'inherit', position: 'relative', width: '100%',
              }}>
              <span style={{ fontSize: 22, width: 26, textAlign: 'center' }}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.id === 'profile' && unreadCount > 0 && (
                <span style={{
                  marginLeft: 'auto', background: th.red, color: '#fff',
                  fontSize: 11, fontWeight: 700, minWidth: 20, height: 20,
                  borderRadius: 10, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: '0 5px'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )
        })}

        <div style={{
          marginTop: 'auto', padding: '12px 14px', fontSize: 11,
          color: th.textSec, borderTop: `1px solid ${th.border}`, paddingTop: 16
        }}>
          © {new Date().getFullYear()} Changuinola Pro
        </div>
      </div>
    )
  }

  // ───────────── MÓVIL: barra inferior ─────────────
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
          <button key={tab.id} onClick={() => go(tab.id)}
            style={{ flex: 1, padding: '10px 0 8px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: active ? th.primary : th.textSec, position: 'relative' }}>
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