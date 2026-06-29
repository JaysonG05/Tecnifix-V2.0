import { lazy, Suspense, useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext.jsx'
import { NavBar } from './components/NavBar.jsx'
import { TopNav } from './components/TopNav.jsx'
import { InstallPrompt } from './components/InstallPrompt.jsx'

// ─── Carga diferida de pantallas (code-splitting por ruta) ────
// Cada pantalla se descarga solo cuando se visita, reduciendo
// drásticamente el peso del bundle inicial.
const named = (factory, name) => lazy(() => factory().then(m => ({ default: m[name] })))

const HomeScreen           = named(() => import('./screens/HomeScreen.jsx'), 'HomeScreen')
const SearchScreen         = named(() => import('./screens/SearchScreen.jsx'), 'SearchScreen')
const MapScreen            = named(() => import('./screens/MapScreen.jsx'), 'MapScreen')
const TechProfileScreen    = named(() => import('./screens/TechProfileScreen.jsx'), 'TechProfileScreen')
const RequestDetailScreen  = named(() => import('./screens/RequestDetailScreen.jsx'), 'RequestDetailScreen')
const CertificatesScreen   = named(() => import('./screens/CertificatesScreen.jsx'), 'CertificatesScreen')
const MyReceiptsScreen     = named(() => import('./screens/MyReceiptsScreen.jsx'), 'MyReceiptsScreen')
const ServiceCatalogScreen = named(() => import('./screens/ServiceCatalogScreen.jsx'), 'ServiceCatalogScreen')
const FavoritesScreen      = named(() => import('./screens/secondary/FavoritesScreen.jsx'), 'FavoritesScreen')
const ProfileScreen        = named(() => import('./screens/secondary/ProfileScreen.jsx'), 'ProfileScreen')
const LoginScreen          = named(() => import('./screens/secondary/LoginScreen.jsx'), 'LoginScreen')
const RegisterScreen       = named(() => import('./screens/secondary/RegisterScreen.jsx'), 'RegisterScreen')
const EditProfileScreen    = named(() => import('./screens/secondary/EditProfileScreen.jsx'), 'EditProfileScreen')
const EditTechProfileScreen= named(() => import('./screens/secondary/EditTechProfileScreen.jsx'), 'EditTechProfileScreen')
const SettingsScreen       = named(() => import('./screens/secondary/SettingsScreen.jsx'), 'SettingsScreen')
const NotificationsScreen  = named(() => import('./screens/secondary/NotificationsScreen.jsx'), 'NotificationsScreen')
const AdminScreen          = named(() => import('./screens/secondary/AdminScreen.jsx'), 'AdminScreen')
const VerificationCenterScreen = named(() => import('./screens/secondary/VerificationCenterScreen.jsx'), 'VerificationCenterScreen')
const AIStudioScreen       = named(() => import('./screens/AIStudioScreen.jsx'), 'AIStudioScreen')
const AuctionScreen        = named(() => import('./screens/AuctionScreen.jsx'), 'AuctionScreen')
const HomeMemoryScreen     = named(() => import('./screens/HomeMemoryScreen.jsx'), 'HomeMemoryScreen')
const TechInsightsScreen   = named(() => import('./screens/TechInsightsScreen.jsx'), 'TechInsightsScreen')
const QRPassportScreen     = named(() => import('./screens/QRPassportScreen.jsx'), 'QRPassportScreen')
const EscrowReleaseScreen  = named(() => import('./screens/EscrowReleaseScreen.jsx'), 'EscrowReleaseScreen')

// ─── Fallback mientras carga el chunk de una pantalla ─────────
function ScreenLoader({ th }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 20,
        border: `3px solid ${th?.border ?? '#e2e8f0'}`, borderTopColor: '#2563eb',
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  )
}

// ─── Enrutador ────────────────────────────────────────────────
function Router() {
  const { screen, th, isDesktop, setScreen } = useApp()

  // Recordatorios de mantenimiento (Mi Hogar): chequeo al iniciar la app.
  useEffect(() => {
    import('./lib/homeMemory.js').then((m) => m.checkAndNotify()).catch(() => {})
    
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('qr')) {
        setScreen('qr-passport');
      } else if (urlParams.get('release')) {
        setScreen('escrow-release');
      }
    }
  }, [setScreen])

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
    'verification-center': <VerificationCenterScreen />,
    login: <LoginScreen />,
    register: <RegisterScreen />,
    'request-detail': <RequestDetailScreen />,
    certificates: <CertificatesScreen />,
    'my-receipts': <MyReceiptsScreen />,
    'service-catalog': <ServiceCatalogScreen />,
    'ai-studio': <AIStudioScreen />,
    auction: <AuctionScreen />,
    'home-memory': <HomeMemoryScreen />,
    'tech-insights': <TechInsightsScreen />,
    'qr-passport': <QRPassportScreen />,
    'escrow-release': <EscrowReleaseScreen />,
  }

  const noNav = [
    'login', 'register', 'tech-profile', 'edit-profile',
    'edit-tech-profile', 'settings', 'notifications',
    'admin', 'verification-center', 'request-detail', 'certificates', 'my-receipts', 'service-catalog',
    'ai-studio', 'auction', 'home-memory', 'tech-insights', 'qr-passport', 'escrow-release',
  ]

  // Pantallas que ocupan todo el ancho. Las pantallas con fondos diseñados
  // (landing y formularios principales) no deben quedar dentro del contenedor centrado.
  const fullBleed = [
    'home', 'search', 'map', 'tech-profile', 'favorites',
    'profile', 'login', 'register', 'edit-tech-profile',
  ].includes(screen)
  // Pantallas principales que muestran el navbar superior compartido.
  // 'home' se excluye: el nuevo HeroSection trae su propia navbar (fondo blanco).
  const showTopNav = ['search', 'map', 'favorites', 'profile'].includes(screen)

  return (
    <div style={{
      maxWidth: 'none',
      margin: 0, minHeight: '100vh',
      background: th.bg, position: 'relative',
      fontFamily: "'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    }}>
      <style>{`
        @media (min-width: 900px) {
          html, body { background: ${th.bg}; }
        }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes slideUp  { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes slideDown{ from{transform:translate(-50%,-20px);opacity:0} to{transform:translate(-50%,0);opacity:1} }
        @keyframes slideIn  { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        :root{ --pad:20px; }
        @media (min-width:900px){ :root{ --pad:max(48px, calc((100% - 1280px) / 2)); } }
        *,*::before,*::after{ box-sizing:border-box; }
        *{ -webkit-tap-highlight-color:transparent; }
        ::-webkit-scrollbar{ display:none; }
        body{
          margin:0;
          font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
          -webkit-font-smoothing:antialiased;
          -moz-osx-font-smoothing:grayscale;
          letter-spacing:0;
        }
        input,select,button,textarea{ font-family:inherit; }
        /* Transiciones suaves y feedback táctil en elementos interactivos */
        button, [role="button"], a{ transition:transform .12s ease, box-shadow .18s ease, background-color .18s ease, opacity .18s ease; }
        button:active, [role="button"]:active{ transform:scale(.97); }
        /* Accesibilidad: anillo de foco visible solo con teclado */
        :focus-visible{ outline:2px solid #2563eb; outline-offset:2px; border-radius:6px; }
        h1,h2,h3{ letter-spacing:0; }
        @media (prefers-reduced-motion: reduce){
          *{ animation-duration:.001ms !important; transition-duration:.001ms !important; }
        }
      `}</style>

      {showTopNav && <TopNav />}

      <div style={{
        minHeight: '100vh',
        maxWidth: isDesktop ? (fullBleed ? '100%' : 880) : '100%',
        margin: isDesktop && !fullBleed ? '0 auto' : 0,
        // Un solo `padding` para no mezclar shorthand con paddingBottom (evita warning de React)
        padding: isDesktop
          ? (fullBleed ? 0 : '24px 24px 40px')
          : `0 0 ${(!noNav.includes(screen)) ? 70 : 0}px`,
      }}>
        <Suspense fallback={<ScreenLoader th={th} />}>
          {SCREENS[screen] ?? <HomeScreen />}
        </Suspense>
      </div>

      <NavBar />
      <InstallPrompt />
    </div>
  )
}

// ─── Error Boundary ───────────────────────────────────────────
import { Component } from 'react'
import { reportError } from './lib/report.js'
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(err) { return { error: err } }
  componentDidCatch(error, info) {
    reportError(error, { boundary: 'app-root', componentStack: info?.componentStack })
  }
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
            padding: '12px 28px', background: '#2563eb', color: '#fff', border: 'none',
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
