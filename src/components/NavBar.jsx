import { useApp } from '../context/AppContext.jsx'
import { TecnifixLogo } from './UI.jsx'

// Íconos SVG inline — reemplazan los emojis genéricos
const Icon = ({ name, size = 20, color }) => {
  const icons = {
    home: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />,
    search: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />,
    map: <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />,
    star: <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color || 'currentColor'} strokeWidth="1.8">
      {icons[name]}
    </svg>
  )
}

export function NavBar() {
  const { th, screen, navigate, user, unreadCount, lang, isDesktop } = useApp()
  const hidden = ['login', 'register', 'tech-profile', 'edit-profile', 'edit-tech-profile',
    'settings', 'notifications', 'contract', 'payment', 'write-review', 'admin', 'request-service'].includes(screen)
  if (hidden) return null

  const tabs = [
    { id: 'home', label: lang === 'en' ? 'Home' : 'Inicio', icon: 'home' },
    { id: 'search', label: lang === 'en' ? 'Search' : 'Buscar', icon: 'search' },
    { id: 'map', label: lang === 'en' ? 'Map' : 'Mapa', icon: 'map' },
    { id: 'favorites', label: lang === 'en' ? 'Saved' : 'Guardados', icon: 'star' },
    { id: 'profile', label: lang === 'en' ? 'Profile' : 'Perfil', icon: 'user' },
  ]
  const go = (id) => { if (id === 'profile' && !user) { navigate('login'); return } navigate(id) }

  // ── DESKTOP: sidebar ──────────────────────────────────────
  if (isDesktop) return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, width: 240,
      background: th.ink, borderRight: `1px solid rgba(255,255,255,0.06)`,
      display: 'flex', flexDirection: 'column', zIndex: 100, padding: '28px 16px',
    }}>
      <div style={{ paddingLeft: 8, marginBottom: 36 }}>
        <TecnifixLogo size={36} showText dark={false} />
      </div>

      <nav style={{ flex: 1 }}>
        {tabs.map(t => {
          const active = screen === t.id
          return (
            <button key={t.id} onClick={() => go(t.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', marginBottom: 2, borderRadius: 12, border: 'none',
              background: active ? th.primary : 'transparent',
              color: active ? '#fff' : 'rgba(255,255,255,0.55)',
              fontFamily: th.fontDisplay, fontWeight: 600, fontSize: 14,
              cursor: 'pointer', textAlign: 'left',
              transition: 'all 160ms var(--ease-out)',
            }}>
              <Icon name={t.icon} size={18} color={active ? '#fff' : 'rgba(255,255,255,0.5)'} />
              {t.label}
              {t.id === 'profile' && unreadCount > 0 && (
                <span style={{
                  marginLeft: 'auto', background: th.yellow, color: th.ink,
                  fontSize: 10, fontWeight: 800, minWidth: 18, height: 18,
                  borderRadius: 9, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: '0 5px'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
        <p style={{
          margin: 0, fontSize: 10, fontFamily: th.fontMono,
          color: 'rgba(255,255,255,0.2)', textAlign: 'center'
        }}>
          © {new Date().getFullYear()} TECNIFIX
        </p>
      </div>
    </aside>
  )

  // ── MÓVIL: barra inferior ─────────────────────────────────
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430, zIndex: 100,
      background: th.surface, borderTop: `1px solid ${th.border}`,
      display: 'flex', boxShadow: th.shadow,
      paddingBottom: 'env(safe-area-inset-bottom,0px)',
    }}>
      {tabs.map(t => {
        const active = screen === t.id
        return (
          <button key={t.id} onClick={() => go(t.id)} style={{
            flex: 1, padding: '10px 0 8px', background: 'none', border: 'none',
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 4,
            color: active ? th.primary : th.textSec,
            position: 'relative',
            transition: 'color 160ms var(--ease-out)',
          }}>
            {t.id === 'profile' && unreadCount > 0 && (
              <div style={{
                position: 'absolute', top: 6, right: '20%',
                background: th.yellow, color: th.ink, fontSize: 9, fontWeight: 800,
                minWidth: 15, height: 15, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
            <Icon name={t.icon} size={21} color={active ? th.primary : th.textSec} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, fontFamily: th.fontDisplay }}>
              {t.label}
            </span>
            {active && (
              <span style={{
                position: 'absolute', bottom: 0, left: '50%',
                transform: 'translateX(-50%)', width: 20, height: 3,
                background: th.primary, borderRadius: '3px 3px 0 0'
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}