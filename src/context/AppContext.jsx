import { createContext, useContext, useState, useEffect, useCallback } from 'react'
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
    // Empuja una entrada al historial del navegador para que el botón
    // "atrás" del navegador funcione de forma nativa.
    if (typeof window !== 'undefined') window.history.pushState({ cpScreen: s }, '')
  }, [])

  const goBack = useCallback(() => {
    setHistory(h => {
      // Si hay historial dentro de la app, delega en el navegador
      // (dispara popstate, que actualiza la pantalla). Si no, va a home.
      if (h.length <= 1) {
        setScreen('home')
        return ['home']
      }
      if (typeof window !== 'undefined') window.history.back()
      return h
    })
  }, [])

  // ── Sincronización con el historial del navegador ──────
  useEffect(() => {
    window.history.replaceState({ cpScreen: 'home' }, '')
    const onPop = (e) => {
      const s = e.state?.cpScreen || 'home'
      setScreen(s)
      setHistory(h => (h.length > 1 ? h.slice(0, -1) : ['home']))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // ── Cargar sesión inicial ──────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s) loadProfile(s.user.id, s.user)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) loadProfile(s.user.id, s.user)
      else { setUser(null); setFavoriteIds([]); setNotifs([]); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const profileFromAuth = (authUser) => ({
    id: authUser.id,
    full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario Tecnifix',
    email: authUser.email,
    role: authUser.user_metadata?.role || 'user',
    avatar_url: authUser.user_metadata?.avatar_url || null,
  })

  const loadProfile = async (userId, authUser = null) => {
    try {
      const profile = authUser
        ? await profiles.ensureFromAuth(authUser).catch(() => profileFromAuth(authUser))
        : await profiles.get(userId)
      setUser(profile.email ? profile : { ...profile, email: authUser?.email })
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
    })
    return () => supabase.removeChannel(channel)
  }, [user?.id])

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
    const authUser = session?.user || await auth.getUser().catch(() => null)
    if (!authUser?.id) return
    const profile = await profiles.ensureFromAuth(authUser).catch(() => profileFromAuth(authUser))
    setUser(profile)
  }, [session])

  // ── Tema (colores) ─────────────────────────────────────
  // El landing (home) replica la plantilla DEWATT en tema CLARO, así que se
  // fuerza claro en esa pantalla aunque el usuario tenga el modo oscuro
  // activado. El resto de pantallas respeta el toggle normalmente.
  const th = buildTheme(darkMode && screen !== 'home')

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: th.bg, flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 24, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🔧</div>
      <div style={{ width: 32, height: 4, borderRadius: 2, background: '#e2e8f0', overflow: 'hidden' }}>
        <div style={{ width: '60%', height: '100%', background: '#2563eb', animation: 'slideIn 1s infinite' }} />
      </div>
    </div>
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

function buildTheme(dark) {
  return {
    bg: dark ? '#0f172a' : '#f8fafc',
    surface: dark ? '#1e293b' : '#ffffff',
    surface2: dark ? '#334155' : '#f1f5f9',
    border: dark ? '#334155' : '#e2e8f0',
    text: dark ? '#f1f5f9' : '#0f172a',
    textSec: dark ? '#94a3b8' : '#64748b',
    primary: '#2563eb',
    primaryDark: '#1d4ed8',
    primaryLight: dark ? '#1e3a8a' : '#dbeafe',
    primaryText: dark ? '#93c5fd' : '#1e40af',
    red: dark ? '#f87171' : '#ef4444',
    yellow: '#fbbf24',
    blue: dark ? '#60a5fa' : '#3b82f6',
    navBg: dark ? '#1e293b' : '#ffffff',
    inputBg: dark ? '#334155' : '#ffffff',
    inputBorder: dark ? '#475569' : '#d1d5db',
    whatsapp: '#25d366',
    // Sombras en capas para mayor profundidad y realismo
    shadow: dark
      ? '0 1px 2px rgba(0,0,0,0.5), 0 6px 20px rgba(0,0,0,0.35)'
      : '0 1px 2px rgba(15,23,42,0.04), 0 6px 20px rgba(15,23,42,0.07)',
    shadowLg: dark
      ? '0 8px 32px rgba(0,0,0,0.55)'
      : '0 12px 32px rgba(15,23,42,0.12)',
  }
}
