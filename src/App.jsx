import { AppProvider, useApp } from './context/AppContext.jsx'
import { NavBar } from './components/NavBar.jsx'
import { HomeScreen } from './screens/HomeScreen.jsx'
import { SearchScreen } from './screens/SearchScreen.jsx'
import { MapScreen } from './screens/MapScreen.jsx'
import { TechProfileScreen } from './screens/TechProfileScreen.jsx'
import { RequestDetailScreen } from './screens/RequestDetailScreen.jsx'
import { CertificatesScreen } from './screens/CertificatesScreen.jsx'
import { MyReceiptsScreen } from './screens/MyReceiptsScreen.jsx'
import { ServiceCatalogScreen } from './screens/ServiceCatalogScreen.jsx'
import { LegalScreen } from './screens/LegalScreen.jsx'
import { Onboarding, hasSeenOnboarding } from './components/Onboarding.jsx'
import { OfflineBanner } from './components/OfflineBanner.jsx'
import {
  FavoritesScreen, ProfileScreen,
  LoginScreen, RegisterScreen,
  EditProfileScreen, EditTechProfileScreen,
  SettingsScreen, NotificationsScreen,
  AdminScreen,
} from './screens/SecondaryScreens.jsx'

// ─── Enrutador ────────────────────────────────────────────────
function Router() {
  const { screen, th, isDesktop } = useApp()
  const [showOnboarding, setShowOnboarding] = useState(!hasSeenOnboarding())

  const SCREENS = {
    home: <HomeScreen />,
    search: <SearchScreen />,
    map: <MapScreen />,
    favorites: <FavoritesScreen />,
    profile: <ProfileScreen />,
    'tech-profile': <TechProfileScreen />,
    'edit-profile': <EditProfileScreen />,
    'edit-tech-profile': <EditTechProfileScreen />,
    settings: <SettingsScreen />,
    notifications: <NotificationsScreen />,
    admin: <AdminScreen />,
    login: <LoginScreen />,
    register: <RegisterScreen />,
    'request-detail': <RequestDetailScreen />,
    certificates: <CertificatesScreen />,
    'my-receipts': <MyReceiptsScreen />,
    'service-catalog': <ServiceCatalogScreen />,
    legal: <LegalScreen />,
  }

  const noNav = [
    'login', 'register', 'tech-profile', 'edit-profile',
    'edit-tech-profile', 'settings', 'notifications',
    'admin', 'request-detail', 'certificates', 'my-receipts', 'service-catalog', 'legal',
  ]

  return (
    <div style={{
      maxWidth: isDesktop ? 1100 : 430,
      margin: '0 auto', minHeight: '100vh',
      background: th.bg, position: 'relative',
      paddingLeft: isDesktop ? 220 : 0,
      fontFamily: th.fontBody,
      color: th.text,
    }}>
      <style>{`
        :root {
          /* Curvas de easing — "Orden de Trabajo": entradas con golpe
             de sello (ease-out fuerte) y movimiento natural (ease-in-out) */
          --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
          --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
        }
        @media (min-width: 900px) {
          html, body { background: ${th.bg}; }
        }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes slideUp  { from{transform:translateY(32px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes slideDown{ from{transform:translate(-50%,-20px);opacity:0} to{transform:translate(-50%,0);opacity:1} }
        @keyframes slideIn  { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
        @keyframes fadeIn   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        *,*::before,*::after{ box-sizing:border-box; }
        *{ -webkit-tap-highlight-color:transparent; }
        ::-webkit-scrollbar{ display:none; }
        input,select,button,textarea{ font-family:inherit; }
        body{ margin:0; font-family:${th.fontBody}; background:${th.bg}; color:${th.text}; }
        h1,h2,h3,h4{ font-family:${th.fontDisplay}; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <div style={{
        paddingBottom: (!isDesktop && !noNav.includes(screen)) ? 70 : 0,
        minHeight: '100vh',
        maxWidth: isDesktop ? 880 : '100%',
        margin: isDesktop ? '0 auto' : 0,
        padding: isDesktop ? '24px 24px 40px' : undefined,
      }}>
        {SCREENS[screen] ?? <HomeScreen />}
      </div>

      <NavBar />
    </div>
  )
}

// ─── Error Boundary ───────────────────────────────────────────
import { Component, useState } from 'react'
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(err) { return { error: err } }
  render() {
    if (this.state.error) return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 32,
        background: '#f8fafc', fontFamily: 'system-ui,sans-serif', maxWidth: 430, margin: '0 auto'
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔧</div>
        <h2 style={{ margin: '0 0 8px', color: '#0f172a', textAlign: 'center' }}>
          Algo salió mal
        </h2>
        <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
          Recarga la página. Si el error persiste, revisa la consola del navegador (F12).
        </p>
        <pre style={{
          background: '#fee2e2', color: '#991b1b', padding: 14, borderRadius: 12,
          fontSize: 11, maxWidth: '100%', overflow: 'auto', marginBottom: 20
        }}>
          {this.state.error?.message ?? 'Error desconocido'}
        </pre>
        <button onClick={() => window.location.reload()}
          style={{
            padding: '12px 28px', background: '#22c55e', color: '#fff', border: 'none',
            borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer'
          }}>
          🔄 Recargar
        </button>
      </div>
    )
    return this.props.children
  }
}

// ─── App raíz ────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Router />
      </AppProvider>
    </ErrorBoundary>
  )
}