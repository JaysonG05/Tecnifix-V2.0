import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { registerServiceWorker, showLocalNotification, listenNotificationClicks } from '../lib/pushNotifications.js'
import { supabase, auth, profiles, favorites as favoritesApi, notifications } from '../lib/supabase.js'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

export function AppProvider({ children }) {
  // ── Tema e idioma ──────────────────────────────────────
  const [darkMode, setDarkModeState] = useState(() => localStorage.getItem('cp_dark') === 'true')
  const [lang, setLangState] = useState(() => localStorage.getItem('cp_lang') || 'es')

  const setDarkMode = v => { setDarkModeState(v); localStorage.setItem('cp_dark', v) }
  const setLang = v => { setLangState(v); localStorage.setItem('cp_lang', v) }

  // ── Sesión / Usuario ───────────────────────────────────
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)   // fila de profiles
  const [loading, setLoading] = useState(true)

  // ── Favoritos ──────────────────────────────────────────
  const [favoriteIds, setFavoriteIds] = useState([])

  // ── Notificaciones ─────────────────────────────────────
  const [notifs, setNotifs] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // ── Navegación ─────────────────────────────────────────
  const [screen, setScreen] = useState('home')

  // ── Registrar Service Worker para notificaciones push ──────
  useEffect(() => {
    registerServiceWorker()
  }, [])

  // ── Detección de tamaño de pantalla (responsive desktop/mobile) ──
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 900 : false
  )
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 900)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const [selectedTech, setSelectedTech] = useState(null)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [history, setHistory] = useState(['home'])

  const navigate = useCallback((s) => {
    setHistory(h => [...h, s])
    setScreen(s)
  }, [])

  const goBack = useCallback(() => {
    setHistory(h => {
      if (h.length <= 1) { setScreen('home'); return ['home'] }
      const prev = h[h.length - 2]
      setScreen(prev)
      return h.slice(0, -1)
    })
  }, [])

  // ── Cargar sesión inicial ──────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s) loadProfile(s.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) loadProfile(s.user.id)
      else { setUser(null); setFavoriteIds([]); setNotifs([]); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId) => {
    try {
      const profile = await profiles.get(userId)
      setUser(profile)
      // Cargar favoritos
      const fids = await favoritesApi.list(userId)
      setFavoriteIds(fids)
      // Cargar notificaciones
      loadNotifs(userId)
    } catch (err) {
      console.error('loadProfile error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadNotifs = async (userId) => {
    try {
      const data = await notifications.list(userId)
      setNotifs(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    } catch { }
  }

  // ── Suscripción tiempo real a notificaciones ───────────
  useEffect(() => {
    if (!user?.id) return
    const channel = notifications.subscribe(user.id, (newNotif) => {
      setNotifs(prev => [newNotif, ...prev])
      setUnreadCount(c => c + 1)
      // Vibrar si el navegador lo soporta
      if ('vibrate' in navigator) navigator.vibrate(200)

      // Notificación del sistema operativo (si la pestaña está
      // en segundo plano y el usuario dio permiso)
      let data = {}
      try { data = typeof newNotif.data === 'string' ? JSON.parse(newNotif.data) : (newNotif.data || {}) } catch { }
      const requestId = data.request_id
      showLocalNotification({
        title: newNotif.title,
        body: newNotif.body || '',
        tag: `notif-${newNotif.type}`,
        url: requestId ? `/?screen=request-detail&request=${requestId}` : '/',
      })
    })
    return () => supabase.removeChannel(channel)
  }, [user?.id])

  // ── Manejar clic en notificación del sistema (abrir pantalla) ──
  useEffect(() => {
    const unsub = listenNotificationClicks((url) => {
      try {
        const params = new URL(url, window.location.origin).searchParams
        const target = params.get('screen')
        if (target === 'request-detail') {
          setScreen('notifications')
        } else if (target) {
          setScreen(target)
        }
      } catch { }
    })
    return unsub
  }, [])

  // ── Toggle favorito ────────────────────────────────────
  const toggleFavorite = useCallback(async (techId) => {
    if (!user) { navigate('login'); return }
    const isFav = favoriteIds.includes(techId)
    // Optimistic update
    setFavoriteIds(prev => isFav ? prev.filter(id => id !== techId) : [...prev, techId])
    try {
      if (isFav) await favoritesApi.remove(user.id, techId)
      else await favoritesApi.add(user.id, techId)
    } catch {
      // Revertir si falla
      setFavoriteIds(prev => isFav ? [...prev, techId] : prev.filter(id => id !== techId))
    }
  }, [user, favoriteIds, navigate])

  // ── Refresh user ───────────────────────────────────────
  const refreshUser = useCallback(async () => {
    if (!session?.user?.id) return
    const profile = await profiles.get(session.user.id)
    setUser(profile)
  }, [session])

  // ── Tema (colores) ─────────────────────────────────────
  const th = buildTheme(darkMode)

  const value = {
    // Auth
    session, user, setUser, loading, refreshUser,
    // Navegación
    screen, navigate, goBack, setScreen,
    selectedTech, setSelectedTech,
    selectedRequest, setSelectedRequest,
    selectedCategory, setSelectedCategory,
    // Favoritos
    favoriteIds, toggleFavorite,
    // Notificaciones
    notifs, setNotifs, unreadCount, setUnreadCount, loadNotifs,
    isDesktop,
    markNotifsRead: async () => {
      if (!user) return
      await notifications.markAllRead(user.id)
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    },
    // Tema e idioma
    darkMode, setDarkMode, lang, setLang, th,
  }

  if (loading) return (
    <div style={{
      position: 'fixed', inset: 0, background: '#00214D',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32
    }}>

      {/* Logo TECNIFIX animado */}
      <div style={{ textAlign: 'center', animation: 'tfFadeIn 0.6s ease forwards' }}>
        {/* Ícono: llave inglesa + rayo (SVG inline) */}
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
          <img src="./favicon.png" alt="TECNIFIX" width="72" height="72" style={{ borderRadius: 18, objectFit: 'cover' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1 }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 36, color: '#FFFFFF', letterSpacing: -1 }}>TECNI</span>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 36, color: '#FFD600', letterSpacing: -1 }}>FIX</span>
        </div>
        <p style={{ margin: '6px 0 0', fontFamily: "'Inter',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase' }}>
          Técnicos en todo Panamá
        </p>
      </div>

      {/* Barra de carga minimalista */}
      <div style={{ width: 160, height: 2, background: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#FFD600', borderRadius: 2, animation: 'tfProgress 1.6s ease infinite' }} />
      </div>

      <style>{`
        @keyframes tfFadeIn { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes tfProgress {
          0%   { width: 0%;   margin-left: 0 }
          50%  { width: 70%;  margin-left: 0 }
          100% { width: 0%;   margin-left: 100% }
        }
      `}</style>
    </div>
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// ============================================================
//  Sistema de diseño TECNIFIX — Profesional · Panamá
//  Navy profundo (#00214D) + Amarillo acento (#FFD600)
//  + Verde confianza (#00C47D) + Blanco puro
// ============================================================
function buildTheme(dark) {
  const shared = {
    fontDisplay: "'Space Grotesk','Inter',system-ui,sans-serif",
    fontBody: "'Inter',system-ui,-apple-system,sans-serif",
    fontMono: "'JetBrains Mono','SFMono-Regular',monospace",
    whatsapp: '#25D366',
    // ── Amarillo TECNIFIX ──
    yellow: '#FFD600',
    yellowDark: '#E0BC00',
    yellowLight: dark ? '#2A2400' : '#FFFAD6',
    yellowText: dark ? '#FFE55C' : '#7A5E00',
    brass: '#FFD600',
    // ── Verde TECNIFIX ──
    verified: '#00C47D',
    verifiedLight: dark ? '#003626' : '#D6F7EC',
    verifiedText: dark ? '#5FFCC0' : '#00704A',
    // ── Rojo / azul ──
    red: dark ? '#FF6B6B' : '#E5282D',
    blue: dark ? '#5EA3FF' : '#1E6FFF',
  }

  if (dark) return {
    ...shared,
    bg: '#06101A',
    surface: '#0D1E2D',
    surface2: '#122334',
    border: '#1A3347',
    ink: '#F0F6FF',
    paper: '#06101A',
    text: '#F0F6FF',
    textSec: '#6A8DA3',
    // ── Azul acento (turquesa dark) ──
    primary: '#00B4D8',
    primaryDark: '#009ABD',
    primaryLight: '#00243A',
    primaryText: '#5CDEFF',
    accent: '#00B4D8',
    accentDark: '#009ABD',
    accentLight: '#00243A',
    accentText: '#5CDEFF',
    navBg: '#0D1E2D',
    inputBg: '#122334',
    inputBorder: '#1F3D54',
    shadow: '0 16px 40px rgba(0,0,0,0.55)',
    shadowSm: '0 4px 16px rgba(0,0,0,0.40)',
  }

  return {
    ...shared,
    bg: '#F0F5FA',
    surface: '#FFFFFF',
    surface2: '#E8F1F8',
    border: '#D1E0ED',
    ink: '#00214D',
    paper: '#F0F5FA',
    text: '#00214D',
    textSec: '#4A6A8A',
    // ── Azul TECNIFIX navy ──
    primary: '#0053A0',
    primaryDark: '#003F80',
    primaryLight: '#DDEEFF',
    primaryText: '#00214D',
    accent: '#0053A0',
    accentDark: '#003F80',
    accentLight: '#DDEEFF',
    accentText: '#00214D',
    navBg: '#FFFFFF',
    inputBg: '#FFFFFF',
    inputBorder: '#C5D8EC',
    shadow: '0 12px 32px rgba(0,33,77,0.12)',
    shadowSm: '0 4px 14px rgba(0,33,77,0.07)',
  }
}