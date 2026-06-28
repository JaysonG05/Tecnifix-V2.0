// ============================================================
//  DesktopLayout.jsx
//  Shell de escritorio: Sidebar + Topbar + área de contenido.
//  Se usa cuando isDesktop === true (≥ 900px).
// ============================================================
import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { auth } from '../lib/supabase.js'
import { T } from '../i18n/translations.js'
import '../styles/desktop.css'

// ── Íconos SVG inline ────────────────────────────────────────
const NavIcon = ({ name, size = 17 }) => {
  const icons = {
    home:        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />,
    search:      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />,
    map:         <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />,
    star:        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />,
    user:        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />,
    bell:        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />,
    settings:    <><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    logout:      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />,
    wrench:      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75" />,
    admin:       <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />,
    receipt:     <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />,
    certificate: <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      {icons[name] || <circle cx="12" cy="12" r="9" />}
    </svg>
  )
}

// ── Sidebar ─────────────────────────────────────────────────
function DesktopSidebar({ screen, navigate, user, lang, unreadCount, onLogout }) {
  const t = T[lang]
  const navGroups = [
    {
      label: lang === 'en' ? 'Main' : 'Principal',
      items: [
        { id: 'home',      icon: 'home',    label: 'Dashboard' },
        { id: 'search',    icon: 'search',  label: lang === 'en' ? 'Find Techs' : 'Buscar técnicos' },
        { id: 'map',       icon: 'map',     label: t.map },
        { id: 'favorites', icon: 'star',    label: t.myFavorites },
      ]
    },
    ...(user ? [{
      label: lang === 'en' ? 'My Account' : 'Mi cuenta',
      items: [
        { id: 'profile',    icon: 'user',    label: t.myProfile },
        { id: 'my-receipts',icon: 'receipt', label: lang === 'en' ? 'Receipts' : 'Mis recibos' },
        ...(user.role === 'technician' ? [
          { id: 'certificates',   icon: 'certificate', label: lang === 'en' ? 'Certificates' : 'Certificados' },
          { id: 'service-catalog',icon: 'wrench',      label: lang === 'en' ? 'My Services' : 'Catálogo' },
        ] : []),
        ...(user.role === 'admin' ? [
          { id: 'admin', icon: 'admin', label: t.adminPanel },
        ] : []),
      ]
    }] : []),
  ]

  const avatarInitial = (user?.full_name || '?').charAt(0).toUpperCase()

  return (
    <aside className="d-sidebar">
      <div className="d-sidebar__logo">
        <img src="./favicon.png" alt="TECNIFIX" />
        <div className="d-sidebar__logo-text">
          <span>TECNI</span><span>FIX</span>
        </div>
      </div>

      <nav className="d-sidebar__nav">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            <div className="d-sidebar__section-label">{group.label}</div>
            {group.items.map(item => (
              <button key={item.id}
                className={`d-nav-item ${screen === item.id ? 'active' : ''}`}
                onClick={() => navigate(item.id)}>
                <NavIcon name={item.icon} />
                {item.label}
                {item.id === 'profile' && unreadCount > 0 && (
                  <span className="d-nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
            ))}
          </div>
        ))}
        <div style={{ height: 8 }} />
        <button className={`d-nav-item ${screen === 'settings' ? 'active' : ''}`}
          onClick={() => navigate('settings')}>
          <NavIcon name="settings" />
          {t.settings}
        </button>
      </nav>

      <div className="d-sidebar__footer">
        {user ? (
          <div className="d-sidebar__user" onClick={() => navigate('profile')}>
            {user.avatar_url
              ? <img src={user.avatar_url} alt={user.full_name} className="d-sidebar__user-avatar"
                  style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid rgba(255,214,0,0.3)' }} />
              : <div className="d-sidebar__user-avatar">{avatarInitial}</div>
            }
            <div className="d-sidebar__user-info">
              <div className="d-sidebar__user-name">{user.full_name}</div>
              <div className="d-sidebar__user-role">
                {user.role === 'technician' ? '🛠 Técnico' : user.role === 'admin' ? '⚙ Admin' : '👤 Cliente'}
              </div>
            </div>
            <button onClick={e => { e.stopPropagation(); onLogout() }} title={t.logout}
              style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.35)',
                padding:4, borderRadius:6, transition:'color 150ms', flexShrink:0 }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}>
              <NavIcon name="logout" size={15} />
            </button>
          </div>
        ) : (
          <button className="d-btn d-btn--yellow"
            style={{ width:'100%', maxWidth:'100%', borderRadius:10 }}
            onClick={() => navigate('login')}>
            {t.login}
          </button>
        )}
      </div>
    </aside>
  )
}

// ── Topbar ──────────────────────────────────────────────────
function DesktopTopbar({ screen, navigate, lang, unreadCount, user }) {
  const [search, setSearch] = useState('')
  const t = T[lang]
  const PAGE_TITLES = {
    home: 'Dashboard', search: lang === 'en' ? 'Find Technicians' : 'Buscar Técnicos',
    map: t.map, favorites: t.myFavorites, profile: t.myProfile,
    settings: t.settings, admin: t.adminPanel,
    'my-receipts': lang === 'en' ? 'My Receipts' : 'Mis Recibos',
    certificates: lang === 'en' ? 'Certificates' : 'Certificados',
    'service-catalog': lang === 'en' ? 'Service Catalog' : 'Catálogo de Servicios',
    notifications: lang === 'en' ? 'Notifications' : 'Notificaciones',
    'tech-profile': lang === 'en' ? 'Technician Profile' : 'Perfil del Técnico',
    'request-detail': lang === 'en' ? 'Request Detail' : 'Detalle de Solicitud',
  }
  const avatarInitial = (user?.full_name || '?').charAt(0).toUpperCase()

  return (
    <header className="d-topbar">
      <span className="d-topbar__title">{PAGE_TITLES[screen] ?? 'TECNIFIX'}</span>

      <div className="d-topbar__search">
        <svg className="d-topbar__search-icon" width="15" height="15" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={lang === 'en' ? 'Search technician, service...' : 'Buscar técnico, servicio...'}
          onKeyDown={e => { if (e.key === 'Enter' && search.trim()) navigate('search') }}
        />
      </div>

      <div className="d-topbar__actions">
        <button className="d-topbar__icon-btn" onClick={() => navigate('notifications')}
          title={lang === 'en' ? 'Notifications' : 'Notificaciones'}>
          <NavIcon name="bell" size={17} />
          {unreadCount > 0 && <span className="d-topbar__notif-dot" />}
        </button>

        {user ? (
          <button className="d-topbar__icon-btn" onClick={() => navigate('profile')}
            style={{ width:'auto', padding:'0 10px', gap:7, borderRadius:20 }}>
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" style={{ width:26, height:26, borderRadius:'50%', objectFit:'cover' }} />
              : <div style={{ width:26, height:26, borderRadius:'50%', background:'#DDEEFF',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontWeight:700, color:'#0053A0', flexShrink:0 }}>
                  {avatarInitial}
                </div>
            }
            <span style={{ fontSize:13, fontWeight:600, color:'#00214D', maxWidth:100,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user.full_name?.split(' ')[0]}
            </span>
          </button>
        ) : (
          <button className="d-btn d-btn--primary" style={{ padding:'7px 16px', fontSize:12 }}
            onClick={() => navigate('login')}>
            {t.login}
          </button>
        )}
      </div>
    </header>
  )
}

// ── DesktopLayout — componente exportado ─────────────────────
export function DesktopLayout({ children }) {
  const { screen, navigate, user, setUser, lang, unreadCount } = useApp()

  const handleLogout = async () => {
    await auth.signOut()
    setUser(null)
    navigate('home')
  }

  return (
    <div className="d-shell">
      <DesktopSidebar
        screen={screen} navigate={navigate} user={user}
        lang={lang} unreadCount={unreadCount} onLogout={handleLogout}
      />
      <DesktopTopbar
        screen={screen} navigate={navigate}
        lang={lang} unreadCount={unreadCount} user={user}
      />
      <main className="d-main">
        {children}
      </main>
    </div>
  )
}