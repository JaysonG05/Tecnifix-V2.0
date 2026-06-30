import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

const NAVY = '#102840'
const GOLD = '#FFD400'
const PHONE = '+507 0000-0000'

const NAV = [
  { label: 'Servicios', to: 'search' },
  { label: 'Técnicos', action: 'technician' },
  { label: 'Cómo funciona', section: 'how-it-works' },
  { label: 'Verificación', action: 'verification' },
  { label: 'Soporte', section: 'support' },
]

function WrenchIcon() {
  return (
    <div style={{
      width: 40,
      height: 40,
      borderRadius: 10,
      background: NAVY,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '0 4px 6px rgba(16, 40, 64, 0.2)'
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-45deg)' }}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    </div>
  )
}

function MenuIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  )
}

export function TopNav() {
  const { navigate, screen, isDesktop, setSelectedCategory, user } = useApp()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const userName = user?.full_name || user?.email || 'Mi cuenta'
  const userInitial = (userName.trim()[0] || 'U').toUpperCase()
  const userRoleLabel = user?.role === 'technician'
    ? 'Técnico'
    : user?.role === 'admin'
      ? 'Dueño'
      : 'Cliente'

  const scrollToSection = (section) => {
    setIsMenuOpen(false)
    const scroll = () => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (screen !== 'home') {
      navigate('home')
      window.setTimeout(scroll, 80)
      return
    }
    scroll()
  }

  const go = (item) => {
    setIsMenuOpen(false)
    if (item.action === 'technician') {
      navigate('search')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (item.action === 'verification') {
      if (!user) {
        navigate('login')
      } else if (user.role === 'admin') {
        navigate('admin')
      } else if (user.role === 'technician') {
        navigate('verification-center')
      } else {
        navigate('register')
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (item.to) {
      navigate(item.to)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    scrollToSection(item.section)
  }

  return (
    <>
      <header style={{
        position: 'relative',
        zIndex: 50,
        background: '#ffffff',
        minHeight: isDesktop ? 88 : 72,
        padding: '0 4vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        fontFamily: "'Inter',system-ui,-apple-system,'Segoe UI',sans-serif",
        letterSpacing: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <style>{`
          .tf-top-nav-menu { display:flex; align-items:center; justify-content:center; gap:clamp(16px,2vw,32px); flex:1; }
          .tf-top-nav-link { border:0; background:transparent; color:#475569; font-size:15px; font-weight:700; line-height:1; cursor:pointer; padding:8px 0; font-family:inherit; white-space:nowrap; transition:color 0.2s; }
          .tf-top-nav-link:hover { color:${NAVY}; }
          .tf-top-nav-right { display:flex; align-items:center; justify-content:flex-end; gap:20px; min-width:${isDesktop ? '300px' : 'auto'}; }
          
          .tf-login-btn { border:0; background:transparent; color:${NAVY}; font-size:15px; font-weight:700; cursor:pointer; transition: opacity 0.2s; }
          .tf-login-btn:hover { opacity: 0.8; }
          
          .tf-register-btn { background:${NAVY}; color:#fff; border:none; padding:12px 24px; border-radius:999px; font-size:15px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px; transition:all 0.2s; box-shadow:0 4px 12px rgba(16,40,64,0.15); }
          .tf-register-btn:hover { transform: translateY(-2px); box-shadow:0 6px 16px rgba(16,40,64,0.25); background:#1e3a5f; }
          
          .tf-top-nav-user { border:1px solid #e2e8f0; background:#f8fafc; color:${NAVY}; min-height:48px; border-radius:999px; padding:6px 16px 6px 6px; display:flex; align-items:center; gap:12px; cursor:pointer; font-family:inherit; transition:background 0.2s; }
          .tf-top-nav-user:hover { background:#f1f5f9; }
          .tf-top-nav-avatar { width:36px; height:36px; border-radius:50%; display:grid; place-items:center; flex:0 0 auto; overflow:hidden; background:${NAVY}; color:${GOLD}; font-size:14px; font-weight:800; }
          .tf-top-nav-avatar img { width:100%; height:100%; object-fit:cover; display:block; }
          .tf-top-nav-user-meta { min-width:0; display:block; text-align:left; }
          .tf-top-nav-user-meta strong { display:block; max-width:118px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:14px; line-height:1.2; font-weight:700; }
          .tf-top-nav-user-meta small { display:block; margin-top:2px; color:#64748b; font-size:11px; line-height:1; font-weight:600; }
          
          .tf-hamburger { display:none; background:transparent; border:none; padding:8px; cursor:pointer; }
          
          @media (max-width:1180px){ 
            .tf-top-nav-menu { display:none; }
            .tf-login-btn, .tf-register-btn { display:none; } 
            .tf-top-nav-user-meta { display:none; } 
            .tf-top-nav-user { padding:6px; } 
            .tf-hamburger { display:flex; align-items:center; justify-content:center; }
          }
        `}</style>

        {/* Logo */}
        <button onClick={() => navigate('home')} style={{
          border: 0,
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minWidth: isDesktop ? 200 : 0,
        }}>
          <WrenchIcon />
          <span style={{
            display: 'block',
            fontFamily: "'Outfit','Inter Tight','Inter',system-ui,sans-serif",
            fontSize: isDesktop ? 28 : 24,
            lineHeight: 1,
            fontWeight: 900,
            color: NAVY,
            letterSpacing: '-0.5px',
          }}>
            Tecni<span style={{ color: GOLD }}>Fix</span>
          </span>
        </button>

        {/* Desktop Nav */}
        <nav className="tf-top-nav-menu">
          {NAV.map((item) => (
            <button key={item.label} onClick={() => go(item)} className="tf-top-nav-link">
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right side icons & user */}
        <div className="tf-top-nav-right">
          {user ? (
            <button onClick={() => navigate(user.role === 'admin' ? 'admin' : 'profile')} className="tf-top-nav-user" title="Sesión activa">
              <span className="tf-top-nav-avatar">
                {user.avatar_url ? <img src={user.avatar_url} alt="" /> : userInitial}
              </span>
              <span className="tf-top-nav-user-meta">
                <strong>{userName}</strong>
                <small>{userRoleLabel}</small>
              </span>
            </button>
          ) : (
            <>
              <button className="tf-login-btn" onClick={() => navigate('login')}>
                Iniciar sesión
              </button>
              <button className="tf-register-btn" onClick={() => navigate('register')}>
                Regístrate 
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </>
          )}
          
          <button className="tf-hamburger" onClick={() => setIsMenuOpen(true)}>
            <MenuIcon />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex'
        }}>
          <div 
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease' }} 
            onClick={() => setIsMenuOpen(false)}
          />
          
          <div style={{
            position: 'relative', width: '85%', maxWidth: 320, background: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column',
            boxShadow: '4px 0 24px rgba(0,0,0,0.1)', animation: 'slideRight 0.3s ease'
          }}>
            <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <WrenchIcon />
                <span style={{ fontFamily: "'Outfit',system-ui,sans-serif", fontSize: 24, fontWeight: 900, color: NAVY }}>
                  Tecni<span style={{ color: GOLD }}>Fix</span>
                </span>
              </div>
              <button onClick={() => setIsMenuOpen(false)} style={{ background: '#f8fafc', border: 'none', color: NAVY, width: 36, height: 36, borderRadius: 18, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </button>
            </div>
            
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
              {NAV.map((item) => (
                <button key={item.label} onClick={() => go(item)} style={{
                  background: 'transparent', border: 'none', color: NAVY, fontSize: 18, fontWeight: 700, textAlign: 'left', padding: '8px 0',
                }}>
                  {item.label}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 'auto', padding: '24px 20px', borderTop: '1px solid #f1f5f9' }}>
              {!user && (
                <>
                  <button onClick={() => { setIsMenuOpen(false); navigate('login') }} style={{
                    width: '100%', background: '#f8fafc', color: NAVY, border: '1px solid #e2e8f0', padding: '14px', borderRadius: 12, fontSize: 16, fontWeight: 700, marginBottom: 12
                  }}>
                    Iniciar sesión
                  </button>
                  <button onClick={() => { setIsMenuOpen(false); navigate('register') }} style={{
                    width: '100%', background: NAVY, color: '#fff', border: 'none', padding: '14px', borderRadius: 12, fontSize: 16, fontWeight: 700, marginBottom: 16
                  }}>
                    Regístrate
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
