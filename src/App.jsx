// ============================================================
//  App.jsx — TECNIFIX v2.3
//  Desktop (≥900px): sidebar + topbar + pantallas a ancho real
//  Mobile  (<900px):  layout original sin ningún cambio
// ============================================================
import { AppProvider, useApp } from './context/AppContext.jsx'
import { Component, useState } from 'react'

// Desktop
import { DesktopLayout }       from './layouts/DesktopLayout.jsx'
import { DesktopDashboard }    from './screens/desktop/DesktopDashboard.jsx'
import { DesktopAdaptWrapper } from './layouts/DesktopAdaptWrapper.jsx'

// Mobile (sin tocar)
import { NavBar }               from './components/NavBar.jsx'
import { HomeScreen }           from './screens/HomeScreen.jsx'
import { SearchScreen }         from './screens/SearchScreen.jsx'
import { MapScreen }            from './screens/MapScreen.jsx'
import { TechProfileScreen }    from './screens/TechProfileScreen.jsx'
import { RequestDetailScreen }  from './screens/RequestDetailScreen.jsx'
import { CertificatesScreen }   from './screens/CertificatesScreen.jsx'
import { MyReceiptsScreen }     from './screens/MyReceiptsScreen.jsx'
import { ServiceCatalogScreen } from './screens/ServiceCatalogScreen.jsx'
import { LegalScreen }          from './screens/LegalScreen.jsx'
import { Onboarding, hasSeenOnboarding } from './components/Onboarding.jsx'
import { OfflineBanner }        from './components/OfflineBanner.jsx'
import {
  FavoritesScreen, ProfileScreen,
  LoginScreen, RegisterScreen,
  EditProfileScreen, EditTechProfileScreen,
  SettingsScreen, NotificationsScreen,
  AdminScreen,
} from './screens/SecondaryScreens.jsx'

const NO_NAV_MOBILE = [
  'login','register','tech-profile','edit-profile','edit-tech-profile',
  'settings','notifications','admin','request-detail','certificates',
  'my-receipts','service-catalog','legal',
]

// ── CSS global compartido ─────────────────────────────────
const GLOBAL_STYLES = `
  :root {
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  }
  @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.45} }
  @keyframes spin     { to{transform:rotate(360deg)} }
  @keyframes slideUp  { from{transform:translateY(32px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes slideDown{ from{transform:translate(-50%,-20px);opacity:0} to{transform:translate(-50%,0);opacity:1} }
  @keyframes fadeIn   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  @keyframes d-pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
  *,*::before,*::after { box-sizing:border-box; }
  * { -webkit-tap-highlight-color:transparent; }
  ::-webkit-scrollbar { display:none; }
  input,select,button,textarea { font-family:inherit; }
  @media (prefers-reduced-motion:reduce) {
    *,*::before,*::after { animation-duration:.01ms!important; transition-duration:.01ms!important; }
  }
`

// ─────────────────────────────────────────────────────────
// DESKTOP ROUTER
// ─────────────────────────────────────────────────────────
function DesktopRouter() {
  const { screen, th } = useApp()

  // Pantallas que van a ancho completo (no necesitan wrapper)
  const FULL_SCREENS = {
    home:      <DesktopDashboard />,
    search:    <SearchScreen />,
    map:       <MapScreen />,
    favorites: <FavoritesScreen />,
    admin:     <AdminScreen />,
  }

  // Pantallas que se adaptan centradas con DesktopAdaptWrapper
  const ADAPTED = {
    profile:             <ProfileScreen />,
    'tech-profile':      <TechProfileScreen />,
    'request-detail':    <RequestDetailScreen />,
    'edit-profile':      <EditProfileScreen />,
    'edit-tech-profile': <EditTechProfileScreen />,
    settings:            <SettingsScreen />,
    notifications:       <NotificationsScreen />,
    certificates:        <CertificatesScreen />,
    'my-receipts':       <MyReceiptsScreen />,
    'service-catalog':   <ServiceCatalogScreen />,
    legal:               <LegalScreen />,
    login:               <LoginScreen />,
    register:            <RegisterScreen />,
  }

  let content
  if (FULL_SCREENS[screen]) {
    content = FULL_SCREENS[screen]
  } else if (ADAPTED[screen]) {
    content = (
      <DesktopAdaptWrapper screen={screen}>
        {ADAPTED[screen]}
      </DesktopAdaptWrapper>
    )
  } else {
    content = <DesktopDashboard />
  }

  return (
    <>
      <style>{`
        ${GLOBAL_STYLES}
        html, body { background:#F0F5FA; margin:0; padding:0; }
        body { font-family:'Inter',system-ui,sans-serif; }
        h1,h2,h3,h4 { font-family:'Space Grotesk','Inter',sans-serif; }
      `}</style>
      <DesktopLayout>{content}</DesktopLayout>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// MOBILE ROUTER — original, sin ningún cambio
// ─────────────────────────────────────────────────────────
function MobileRouter() {
  const { screen, th } = useApp()
  const [showOnboarding, setShowOnboarding] = useState(!hasSeenOnboarding())

  const SCREENS = {
    home:                <HomeScreen />,
    search:              <SearchScreen />,
    map:                 <MapScreen />,
    favorites:           <FavoritesScreen />,
    profile:             <ProfileScreen />,
    'tech-profile':      <TechProfileScreen />,
    'edit-profile':      <EditProfileScreen />,
    'edit-tech-profile': <EditTechProfileScreen />,
    settings:            <SettingsScreen />,
    notifications:       <NotificationsScreen />,
    admin:               <AdminScreen />,
    login:               <LoginScreen />,
    register:            <RegisterScreen />,
    'request-detail':    <RequestDetailScreen />,
    certificates:        <CertificatesScreen />,
    'my-receipts':       <MyReceiptsScreen />,
    'service-catalog':   <ServiceCatalogScreen />,
    legal:               <LegalScreen />,
  }

  return (
    <div style={{
      maxWidth: 430, margin: '0 auto', minHeight: '100vh',
      background: th.bg, position: 'relative',
      fontFamily: th.fontBody, color: th.text,
    }}>
      <style>{`
        ${GLOBAL_STYLES}
        body { margin:0; background:${th.bg}; color:${th.text}; }
        h1,h2,h3,h4 { font-family:${th.fontDisplay}; }
      `}</style>
      <div style={{ paddingBottom: !NO_NAV_MOBILE.includes(screen) ? 70 : 0, minHeight: '100vh' }}>
        {SCREENS[screen] ?? <HomeScreen />}
      </div>
      <NavBar />
      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// ROUTER PRINCIPAL
// ─────────────────────────────────────────────────────────
function Router() {
  const { isDesktop } = useApp()
  return isDesktop ? <DesktopRouter /> : <MobileRouter />
}

// ── Error Boundary ────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(err) { return { error: err } }
  render() {
    if (this.state.error) return (
      <div style={{
        minHeight:'100vh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', padding:32,
        background:'#F0F5FA', fontFamily:'system-ui,sans-serif',
        maxWidth:500, margin:'0 auto',
      }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
        <h2 style={{ margin:'0 0 8px', color:'#00214D', textAlign:'center',
          fontFamily:"'Space Grotesk',sans-serif" }}>
          Algo salió mal
        </h2>
        <p style={{ color:'#4A6A8A', fontSize:14, textAlign:'center', marginBottom:24 }}>
          Recarga la página o revisa la consola (F12).
        </p>
        <pre style={{
          background:'#fee2e2', color:'#991b1b', padding:14, borderRadius:12,
          fontSize:11, maxWidth:'100%', overflow:'auto', marginBottom:20, width:'100%',
        }}>
          {this.state.error?.message ?? 'Error desconocido'}
        </pre>
        <button onClick={() => window.location.reload()} style={{
          padding:'12px 28px', background:'#0053A0', color:'#fff', border:'none',
          borderRadius:100, fontWeight:700, fontSize:15, cursor:'pointer',
          fontFamily:"'Space Grotesk',sans-serif",
        }}>
          🔄 Recargar
        </button>
      </div>
    )
    return this.props.children
  }
}

// ── App raíz ──────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <OfflineBanner />
        <Router />
      </AppProvider>
    </ErrorBoundary>
  )
}