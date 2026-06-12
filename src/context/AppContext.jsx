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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: th.bg, flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 24, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🔧</div>
      <div style={{ width: 32, height: 4, borderRadius: 2, background: '#e2e8f0', overflow: 'hidden' }}>
        <div style={{ width: '60%', height: '100%', background: '#22c55e', animation: 'slideIn 1s infinite' }} />
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
    primary: '#22c55e',
    primaryDark: '#16a34a',
    primaryLight: dark ? '#14532d' : '#dcfce7',
    primaryText: dark ? '#86efac' : '#166534',
    red: dark ? '#f87171' : '#ef4444',
    yellow: '#fbbf24',
    blue: dark ? '#60a5fa' : '#3b82f6',
    navBg: dark ? '#1e293b' : '#ffffff',
    inputBg: dark ? '#334155' : '#ffffff',
    inputBorder: dark ? '#475569' : '#d1d5db',
    whatsapp: '#25d366',
    shadow: dark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
  }
}