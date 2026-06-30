// ============================================================
// src/screens/SecondaryScreens.jsx
// Contiene: Favorites, Profile, Auth (Login/Register),
//           Settings, EditProfile, EditTechProfile, Admin, Notifications
// ============================================================
import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { TechnicianCard } from '../components/TechnicianCard.jsx'
import {
  Avatar, StarRating, Badge, Btn, Input, Toggle, SkeletonCard,
  EmptyState, Modal, Toast, PageHeader, SettingsRow, StatusBadge, Spinner
} from '../components/UI.jsx'
import {
  supabase, auth, profiles, technicians, techCategories, certificatesApi, serviceCatalog, favorites as favApi,
  serviceRequests, archiveApi, receiptsApi, admin, notifications
} from '../lib/supabase.js'
import { T } from '../i18n/translations.js'
import { receiptActions, disputeActions } from '../lib/payments.js'
import { Icon, IconBox } from '../components/Icons.jsx'
import { getPermissionStatus, requestPermission } from '../lib/pushNotifications.js'

// ─────────────────────────────────────────────────────────────
// FAVORITES
// ─────────────────────────────────────────────────────────────
export function FavoritesScreen() {
  const { th, user, navigate, setSelectedTech, favoriteIds, lang } = useApp()
  const t = T[lang]
  const [techList, setTechList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    favApi.listFull(user.id)
      .then(setTechList).catch(() => { }).finally(() => setLoading(false))
  }, [user, favoriteIds.length])

  if (!user) return (
    <EmptyState emoji="⭐" title={t.myFavorites} sub={t.loginRequired}
      action={<Btn onClick={() => navigate('login')} style={{ maxWidth: 200, margin: '0 auto' }}>{t.login}</Btn>}
    />
  )

  return (
    <div style={{ background: th.bg, minHeight: '100vh', padding: '20px 16px 90px' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: th.text }}>⭐ {t.myFavorites}</h2>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: th.textSec }}>{t.savedTechs}</p>
      {loading
        ? [1, 2].map(i => <SkeletonCard key={i} />)
        : techList.length === 0
          ? <EmptyState emoji="⭐" title={t.noFavorites} sub={t.tapToSave} />
          : techList.map(tech => (
            <TechnicianCard key={tech.user_id} tech={tech}
              onPress={t2 => { setSelectedTech(t2); navigate('tech-profile') }}
            />
          ))
      }
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────
export function ProfileScreen() {
  const { th, user, setUser, navigate, lang, unreadCount, setSelectedRequest } = useApp()
  const t = T[lang]
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    serviceRequests.listForUser(user.id)
      .then(setRequests).catch(() => { }).finally(() => setLoading(false))
  }, [user])

  if (!user) return (
    <div style={{ background: th.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke={th.textSec} strokeWidth="1" style={{ marginBottom: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
      <p style={{ fontSize: 20, fontWeight: 800, color: th.text, margin: '0 0 8px' }}>{t.login}</p>
      <p style={{ fontSize: 14, color: th.textSec, margin: '0 0 28px', textAlign: 'center' }}>{t.loginRequired}</p>
      <Btn onClick={() => navigate('login')}>{t.login}</Btn>
      <div style={{ height: 12 }} />
      <Btn variant="outline" onClick={() => navigate('register')}>{t.register}</Btn>
    </div>
  )

  const handleLogout = async () => {
    await auth.signOut()
    setUser(null)
    navigate('home')
  }

  const roleLabel = user.role === 'admin' ? t.admin : user.role === 'technician' ? t.techRole : t.clientRole

  // Íconos SVG para el menú de perfil
  const MENU_ITEMS = [
    { svg: <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />, label: t.editProfile, screen: 'edit-profile' },
    { svg: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />, label: 'Mis recibos', screen: 'my-receipts' },
    ...(user.role === 'technician' ? [
      { svg: <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />, label: t.editProfProfile, screen: 'edit-tech-profile' },
      { svg: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />, label: 'Catálogo de servicios', screen: 'service-catalog' },
      { svg: <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />, label: 'Mis certificados', screen: 'certificates' },
    ] : []),
    ...(user.role === 'admin' ? [
      { svg: <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />, label: t.adminPanel, screen: 'admin' },
    ] : []),
  ]

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 90 }}>

      {/* Header navy con info del usuario */}
      <div style={{
        background: 'linear-gradient(145deg, #00214D 0%, #00369A 100%)',
        padding: '28px 20px 24px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: -30, right: -20, width: 120, height: 120,
          borderRadius: '50%', background: 'rgba(255,214,0,0.07)', pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <Avatar photo={user.avatar_url} name={user.full_name} size={64} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 3px', fontWeight: 700, fontFamily: th.fontDisplay, fontSize: 17, color: '#fff' }}>
              {user.full_name}
            </p>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{user.email}</p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(255,255,255,0.12)', borderRadius: 100,
              padding: '4px 10px', border: '1px solid rgba(255,255,255,0.15)'
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: th.verified }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', fontFamily: th.fontDisplay, fontWeight: 600 }}>
                {roleLabel}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('notifications')}
              style={{
                position: 'relative', background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10,
                width: 38, height: 38, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute', top: 5, right: 5, width: 14, height: 14,
                  background: th.yellow, borderRadius: 7, fontSize: 8, color: th.ink,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>
            <button onClick={() => navigate('settings')}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10,
                width: 38, height: 38, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        {/* Menú de acciones con SVG icons */}
        <div style={{ background: th.surface, borderRadius: 16, border: `1px solid ${th.border}`, marginBottom: 14, overflow: 'hidden' }}>
          {MENU_ITEMS.map((item, idx) => (
            <button key={item.screen} onClick={() => navigate(item.screen)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', padding: '13px 16px',
                background: 'none', border: 'none',
                borderBottom: idx < MENU_ITEMS.length - 1 ? `1px solid ${th.border}` : 'none',
                cursor: 'pointer', fontFamily: 'inherit'
              }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: th.primaryLight, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={th.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {item.svg}
                  </svg>
                </span>
                <span style={{ fontSize: 14, fontWeight: 500, color: th.text }}>{item.label}</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={th.textSec} strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ))}
        </div>

        <RequestsTabs user={user} th={th} t={t} navigate={navigate} setSelectedRequest={setSelectedRequest} />

        <Btn variant="danger" onClick={handleLogout}>{t.logout}</Btn>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// OAUTH BUTTONS — Google y Facebook (reutilizable en Login/Register)
// ─────────────────────────────────────────────────────────────
function OAuthButtons({ th, lang, onSelect, loadingProvider }) {
  const L = lang === 'en'
    ? { divider: 'or', google: 'Continue with Google', facebook: 'Continue with Facebook' }
    : { divider: 'o', google: 'Continuar con Google', facebook: 'Continuar con Facebook' }

  const btnBase = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: '12px 14px', borderRadius: 100, fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
    transition: 'all 150ms var(--ease-out)',
  }

  return (
    <div>
      {/* Divisor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
        <div style={{ flex: 1, height: 1, background: th.border }} />
        <span style={{ fontSize: 11, color: th.textSec, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase' }}>{L.divider}</span>
        <div style={{ flex: 1, height: 1, background: th.border }} />
      </div>

      {/* Google */}
      <button onClick={() => onSelect('google')} disabled={!!loadingProvider}
        style={{
          ...btnBase, background: '#fff', color: '#1f2937',
          border: `1.5px solid ${th.border}`,
          opacity: loadingProvider && loadingProvider !== 'google' ? 0.5 : 1
        }}>
        {loadingProvider === 'google' ? (
          <Spinner size={16} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.85 2.07-1.81 2.7v2.26h2.92c1.71-1.57 2.69-3.89 2.69-6.6z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33C2.44 15.98 5.48 18 9 18z" />
            <path fill="#FBBC05" d="M3.97 10.72c-.18-.54-.28-1.12-.28-1.72s.1-1.18.28-1.72V4.95H.96C.35 6.18 0 7.55 0 9s.35 2.82.96 4.05l3.01-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
          </svg>
        )}
        {L.google}
      </button>

      {/* Facebook */}
      <button onClick={() => onSelect('facebook')} disabled={!!loadingProvider}
        style={{
          ...btnBase, background: '#1877F2', color: '#fff', border: 'none',
          opacity: loadingProvider && loadingProvider !== 'facebook' ? 0.5 : 1
        }}>
        {loadingProvider === 'facebook' ? (
          <Spinner size={16} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
            <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8v-6.78H7.9V12H10V9.79c0-2.07 1.23-3.21 3.11-3.21.9 0 1.84.16 1.84.16v2.02h-1.04c-1.02 0-1.34.64-1.34 1.3V12h2.46l-.39 3.02h-2.07V21.8c4.56-.93 8-4.96 8-9.8z" />
          </svg>
        )}
        {L.facebook}
      </button>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────
// LOGIN SCREEN (con botón ✕ para volver al inicio)
// ─────────────────────────────────────────────────────────────
export function LoginScreen() {
  const { th, navigate, refreshUser, lang, goBack } = useApp()
  const t = T[lang]
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const [oauthLoading, setOauthLoading] = useState(null) // 'google' | 'facebook' | null
 
  const handleLogin = async () => {
    if (!email || !password) { setError('Completa todos los campos.'); return }
    setLoading(true); setError('')
    try {
      await auth.signIn({ email: email.trim(), password })
      await refreshUser()
      navigate('home')
    } catch {
      setError(t.wrongCredentials)
    } finally {
      setLoading(false)
    }
  }
 
  const handleOAuth = async (provider) => {
    setOauthLoading(provider); setError('')
    try {
      await auth.signInWithOAuth(provider)
      // El navegador redirige al proveedor; al volver, onAuthStateChange
      // detecta la sesión y AppContext carga el perfil automáticamente.
    } catch (err) {
      setError(lang === 'en'
        ? `Could not connect with ${provider === 'google' ? 'Google' : 'Facebook'}.`
        : `No se pudo conectar con ${provider === 'google' ? 'Google' : 'Facebook'}.`)
      setOauthLoading(null)
    }
  }
 
  const handleReset = async () => {
    if (!email) { setError('Ingresa tu email.'); return }
    setLoading(true); setError('')
    try {
      await auth.resetPassword(email.trim())
      setResetSent(true)
    } catch {
      setError('Error al enviar. Verifica el email.')
    } finally {
      setLoading(false)
    }
  }
 
  return (
    <div style={{ background: th.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
 
      {/* Hero navy con logo + botón cerrar */}
      <div style={{
        background: 'linear-gradient(145deg, #00214D 0%, #00369A 100%)',
        padding: '44px 24px 36px', textAlign: 'center', position: 'relative', overflow: 'hidden'
      }}>
        {/* Círculo decorativo */}
        <div style={{
          position: 'absolute', top: -30, right: -30, width: 120, height: 120,
          borderRadius: '50%', background: 'rgba(255,214,0,0.08)', pointerEvents: 'none'
        }} />
 
        {/* ── BOTÓN CERRAR / VOLVER AL INICIO ── */}
        <button
          onClick={() => navigate('home')}
          style={{
            position: 'absolute', top: 16, left: 16,
            width: 36, height: 36, borderRadius: 18,
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          title={lang === 'en' ? 'Back to home' : 'Volver al inicio'}
        >
          ←
        </button>
 
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <img src="./favicon.png" alt="TECNIFIX Logo" width="56" height="56"
            style={{ borderRadius: 10, objectFit: 'cover' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0, marginBottom: 6 }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: '#FFFFFF', letterSpacing: -1 }}>TECNI</span>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: '#FFD600', letterSpacing: -1 }}>FIX</span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: "'Space Grotesk',sans-serif" }}>
          Técnicos en todo Panamá
        </p>
      </div>
 
      <div style={{ flex: 1, padding: '24px 24px 40px' }}>
        <div style={{
          background: th.surface, borderRadius: 20, padding: 24,
          border: `1px solid ${th.border}`, boxShadow: th.shadow
        }}>
          <h2 style={{
            margin: '0 0 20px', fontSize: 20, fontWeight: 700,
            fontFamily: th.fontDisplay, color: th.text
          }}>
            {resetMode ? t.forgotPassword : t.loginTitle}
          </h2>
 
          {resetSent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, background: th.primaryLight,
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={th.primary} strokeWidth="2" strokeLinecap="round">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p style={{ fontSize: 14, color: th.textSec }}>{t.resetSent}</p>
              <Btn variant="ghost" onClick={() => { setResetMode(false); setResetSent(false) }} style={{ marginTop: 16 }}>
                Volver al login
              </Btn>
            </div>
          ) : (
            <>
              <Input label={t.email} value={email} onChange={setEmail} placeholder="tu@email.com" type="email" />
              {!resetMode && (
                <div style={{ marginBottom: 4 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, fontFamily: th.fontDisplay, color: th.text, marginBottom: 6 }}>{t.password}</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                      placeholder="••••••••"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '12px 44px 12px 14px', borderRadius: 100, border: `1.5px solid ${th.inputBorder}`, fontSize: 14, outline: 'none', background: th.inputBg, color: th.text, fontFamily: 'inherit', transition: 'border-color 140ms' }}
                      onFocus={e => e.target.style.borderColor = th.primary}
                      onBlur={e => e.target.style.borderColor = th.inputBorder}
                    />
                    <button onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: th.textSec, display: 'flex', alignItems: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        {showPass
                          ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
                          : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                        }
                      </svg>
                    </button>
                  </div>
                </div>
              )}
 
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: `${th.red}14`, border: `1px solid ${th.red}33`, borderRadius: 10, padding: '10px 12px', margin: '10px 0 0' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={th.red} strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p style={{ margin: 0, color: th.red, fontSize: 13 }}>{error}</p>
                </div>
              )}
              <div style={{ height: 16 }} />
 
              {resetMode
                ? <Btn onClick={handleReset} loading={loading}>Enviar email de recuperación</Btn>
                : <Btn onClick={handleLogin} loading={loading}>{t.enter}</Btn>
              }
 
              <button onClick={() => { setResetMode(v => !v); setError('') }}
                style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: 14, background: 'none', border: 'none', color: th.primary, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                {resetMode ? '← Volver al login' : t.forgotPassword}
              </button>
 
              {!resetMode && <OAuthButtons th={th} lang={lang} loadingProvider={oauthLoading} onSelect={handleOAuth} />}
            </>
          )}
        </div>
 
        <p style={{ textAlign: 'center', fontSize: 13, color: th.textSec, marginTop: 20 }}>
          {t.noAccount}{' '}
          <button onClick={() => navigate('register')} style={{ background: 'none', border: 'none', color: th.primary, fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
            {t.signUp}
          </button>
        </p>
 
        {/* Volver al inicio — enlace secundario en el footer */}
        <p style={{ textAlign: 'center', marginTop: 8 }}>
          <button onClick={() => navigate('home')}
            style={{ background: 'none', border: 'none', color: th.textSec, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
            {lang === 'en' ? '← Back to home' : '← Volver al inicio'}
          </button>
        </p>
      </div>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────
// REGISTER SCREEN (con botón ← para volver)
// ─────────────────────────────────────────────────────────────
export function RegisterScreen() {
  const { th, navigate, refreshUser, lang, goBack } = useApp()
  const t = T[lang]
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', role: 'user' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsError, setTermsError] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null)
  const [oauthError, setOauthError] = useState('')
 
  const handleOAuth = async (provider) => {
    if (!acceptedTerms) { setTermsError(true); return }
    setTermsError(false); setOauthLoading(provider); setOauthError('')
    try { await auth.signInWithOAuth(provider) }
    catch {
      setOauthError(lang === 'en'
        ? `Could not connect with ${provider === 'google' ? 'Google' : 'Facebook'}.`
        : `No se pudo conectar con ${provider === 'google' ? 'Google' : 'Facebook'}.`)
      setOauthLoading(null)
    }
  }
 
  const F = (k) => ({
    value: form[k],
    onChange: v => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) },
    error: errors[k],
  })
 
  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = t.required
    if (!form.email.includes('@')) e.email = t.invalidEmail
    if (form.password.length < 6) e.password = t.minLength6
    if (form.password !== form.confirm) e.confirm = t.passNoMatch
    setErrors(e)
    return Object.keys(e).length === 0
  }
 
  const handleRegister = async () => {
    if (!validate()) return
    if (!acceptedTerms) { setTermsError(true); return }
    setTermsError(false); setLoading(true)
    try {
      await auth.signUp({ email: form.email.trim(), password: form.password, fullName: form.name.trim(), role: form.role })
      setSuccess(true)
    } catch (err) {
      setErrors({ email: err.message || 'Error al registrarse.' })
    } finally { setLoading(false) }
  }
 
  if (success) return (
    <div style={{ background: th.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
      <p style={{ fontWeight: 900, fontSize: 22, color: th.text, margin: '0 0 8px' }}>{t.accountCreated}</p>
      <p style={{ color: th.textSec, fontSize: 14, marginBottom: 24 }}>Revisa tu bandeja de entrada y confirma tu correo.</p>
      <Btn onClick={() => navigate('login')}>Ir al login</Btn>
    </div>
  )
 
  return (
    <div style={{ background: th.bg, minHeight: '100vh', padding: '24px 24px 60px' }}>
 
      {/* ── BOTÓN VOLVER (← a login o a home) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={goBack}
          style={{
            width: 38, height: 38, borderRadius: 19,
            background: th.surface2,
            border: `1px solid ${th.border}`,
            fontSize: 18, cursor: 'pointer', color: th.text,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 140ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = th.primaryLight; e.currentTarget.style.borderColor = th.primary }}
          onMouseLeave={e => { e.currentTarget.style.background = th.surface2; e.currentTarget.style.borderColor = th.border }}
          title={lang === 'en' ? 'Go back' : 'Volver'}
        >
          ←
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: th.text }}>{t.registerTitle}</h2>
          <p style={{ margin: 0, fontSize: 13, color: th.textSec }}>¿Eres cliente o técnico?</p>
        </div>
      </div>
 
      {/* Selector cliente / técnico */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        {[{ v: 'user', label: t.iAmClient, desc: t.lookingTechs }, { v: 'technician', label: t.iAmTech, desc: t.offerServices }].map(r => (
          <button key={r.v} onClick={() => setForm(f => ({ ...f, role: r.v }))}
            style={{ flex: 1, padding: '14px 10px', borderRadius: 16, border: `2.5px solid ${form.role === r.v ? th.primary : th.border}`, background: form.role === r.v ? th.primaryLight : 'transparent', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit' }}>
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14, color: th.text }}>{r.label}</p>
            <p style={{ margin: 0, fontSize: 12, color: th.textSec }}>{r.desc}</p>
          </button>
        ))}
      </div>
 
      <Input label={t.fullName} placeholder="Juan Pérez" {...F('name')} />
      <Input label={t.email} placeholder="tu@email.com" type="email" {...F('email')} />
      <Input label={t.phone} placeholder="+507 6000-0000" {...F('phone')} />
      <Input label={t.password} placeholder="Mínimo 6 caracteres" type="password" {...F('password')} />
      <Input label={t.confirmPassword} placeholder="Repite tu contraseña" type="password" {...F('confirm')} />
 
      <div style={{ height: 8 }} />
 
      {/* Aceptación de términos */}
      <div onClick={() => { setAcceptedTerms(v => !v); setTermsError(false) }}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, cursor: 'pointer', padding: '10px 12px', borderRadius: 12, background: termsError ? '#fee2e2' : th.surface2, border: `1px solid ${termsError ? '#fca5a5' : th.border}` }}>
        <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1, border: `2px solid ${acceptedTerms ? th.primary : th.border}`, background: acceptedTerms ? th.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 900 }}>
          {acceptedTerms && '✓'}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: termsError ? '#991b1b' : th.textSec, lineHeight: 1.6 }}>
          Acepto los{' '}
          <span onClick={e => { e.stopPropagation(); navigate('legal') }} style={{ color: th.primary, fontWeight: 700, textDecoration: 'underline' }}>
            Términos y Condiciones
          </span>{' '}y la{' '}
          <span onClick={e => { e.stopPropagation(); navigate('legal') }} style={{ color: th.primary, fontWeight: 700, textDecoration: 'underline' }}>
            Política de Privacidad
          </span>.
        </p>
      </div>
 
      <Btn onClick={handleRegister} loading={loading}>{t.create}</Btn>
 
      {oauthError && (
        <p style={{ color: th.red, fontSize: 13, margin: '10px 0 0', textAlign: 'center', background: '#fef2f2', padding: '8px', borderRadius: 8 }}>
          {oauthError}
        </p>
      )}
 
      <OAuthButtons th={th} lang={lang} loadingProvider={oauthLoading} onSelect={handleOAuth} />
 
      {/* Link volver al inicio */}
      <p style={{ textAlign: 'center', marginTop: 16 }}>
        <button onClick={() => navigate('home')}
          style={{ background: 'none', border: 'none', color: th.textSec, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
          {lang === 'en' ? '← Back to home' : '← Volver al inicio'}
        </button>
      </p>
    </div>
  )
}
 
// ─────────────────────────────────────────────────────────────
// EDIT PROFILE (info personal)
// ─────────────────────────────────────────────────────────────
export function EditProfileScreen() {
  const { th, user, setUser, refreshUser, navigate, lang } = useApp()
  const t = T[lang]
  const [form, setForm] = useState({ full_name: user?.full_name || '', phone: user?.phone || '', whatsapp_phone: user?.whatsapp_phone || '' })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const handleSave = async () => {
    setLoading(true)
    try {
      const updated = await profiles.update(user.id, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        whatsapp_phone: form.whatsapp_phone.trim() || null,
      })
      setUser(updated)
      // Guardar categorías múltiples
      if (selectedCatIds.length > 0) {
        await techCategories.set(user.id, selectedCatIds)
      }
      showToast(t.saved)
    } catch {
      showToast('Error al guardar.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { showToast('Máximo 5 MB.', 'error'); return }
    setUploading(true)
    try {
      const { profiles: p } = await import('../lib/supabase.js')
      const url = await p.uploadAvatar(user.id, file)
      setUser(u => ({ ...u, avatar_url: url }))
      showToast(t.photoUploaded)
    } catch {
      showToast(t.errorUpload, 'error')
    } finally {
      setUploading(false)
    }
  }

  const handlePasswordChange = async () => {
    const email = user?.email
    if (!email) return
    try {
      await auth.resetPassword(email)
      showToast('Te enviamos un email para cambiar la contraseña.')
    } catch {
      showToast('Error.', 'error')
    }
  }

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 90 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <PageHeader title={t.editProfile} />

      <div style={{ padding: '20px 16px' }}>
        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, padding: 20, background: th.surface, borderRadius: 16, border: `1px solid ${th.border}` }}>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <Avatar photo={user?.avatar_url} name={user?.full_name} size={96} />
            {uploading && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', borderRadius: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spinner size={28} color="#fff" />
              </div>
            )}
          </div>
          <label style={{ padding: '9px 22px', background: th.primaryLight, color: th.primaryText, borderRadius: 12, border: `1px solid ${th.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            📷 Cambiar foto de perfil
            <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={uploading} />
          </label>
          <p style={{ margin: '8px 0 0', fontSize: 11, color: th.textSec }}>JPG, PNG o WebP · Máx. 5 MB</p>
        </div>

        {/* Datos personales */}
        <div style={{ background: th.surface, borderRadius: 16, padding: 16, marginBottom: 14, border: `1px solid ${th.border}` }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: th.text, margin: '0 0 14px' }}>👤 Información personal</p>
          <Input label={t.fullName} value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} placeholder="Juan Pérez" />
          <Input label={t.phone} value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+507 6000-0000" />
          <Input label="WhatsApp" value={form.whatsapp_phone} onChange={v => setForm(f => ({ ...f, whatsapp_phone: v }))} placeholder="+507 6000-0000" />
          <div style={{ background: th.surface2, borderRadius: 10, padding: '10px 14px', marginTop: 4 }}>
            <p style={{ margin: 0, fontSize: 12, color: th.textSec }}>Email: <strong style={{ color: th.text }}>{user?.email}</strong></p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: th.textSec }}>El email no se puede cambiar directamente aquí.</p>
          </div>
        </div>

        {/* Seguridad */}
        <div style={{ background: th.surface, borderRadius: 16, border: `1px solid ${th.border}`, marginBottom: 16, overflow: 'hidden' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: th.textSec, padding: '12px 16px 8px', borderBottom: `1px solid ${th.border}`, textTransform: 'uppercase', letterSpacing: 0.8 }}>Seguridad</p>
          <SettingsRow label={t.changePassword} sub="Recibirás un email de recuperación"
            right={<Btn onClick={handlePasswordChange} variant="ghost" size="sm" style={{ width: 'auto', padding: '6px 14px' }}>Enviar email</Btn>}
          />
        </div>

        <Btn onClick={handleSave} loading={loading}>{t.saveChanges}</Btn>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// EDIT TECH PROFILE (perfil profesional del técnico)
// ─────────────────────────────────────────────────────────────
export function EditTechProfileScreen() {
  const { th, user, navigate, lang } = useApp()
  const t = T[lang]
  const [form, setForm] = useState({
    professional_title: '', professional_title_en: '',
    bio: '', bio_en: '', slogan: '',
    years_experience: '', company_name: '', national_id: '',
    min_price: '', max_price: '', price_unit: 'por visita',
    public_phone: '', public_whatsapp: '', public_email: '',
    website: '', instagram: '', facebook: '', bank_account: '',
    address_text: '', city: 'Panamá', province: 'Panamá',
    latitude: '9.4390', longitude: '-82.5177',
    service_radius_km: '15', response_time_minutes: '60',
    is_available: true,
  })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState(null)
  const [galleryList, setGalleryList] = useState([])
  const [selectedCatIds, setSelectedCatIds] = useState([])

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  // Cargar datos existentes
  useEffect(() => {
    if (!user) return
    Promise.all([
      technicians.getOne(user.id).catch(() => null),
      technicians.getGallery(user.id).catch(() => []),
      techCategories.get(user.id).catch(() => []),
    ]).then(([tp, gal, cats]) => {
      // Cargar IDs de categorías existentes
      if (cats.length > 0) {
        // Convertir slugs a IDs
        const catMap = { climatizacion: 1, electricidad: 2, plomeria: 3, albanileria: 4, limpieza: 5, cerrajeria: 6, pintura: 7, tecnologia: 8 }
        setSelectedCatIds(cats.map(c => catMap[c.slug]).filter(Boolean))
      }
      if (tp) {
        setForm(f => ({
          ...f,
          professional_title: tp.professional_title || '',
          professional_title_en: tp.professional_title_en || '',
          bio: tp.bio || '',
          bio_en: tp.bio_en || '',
          slogan: tp.slogan || '',
          years_experience: String(tp.years_experience || ''),
          company_name: tp.company_name || '',
          national_id: tp.national_id || '',
          min_price: String(tp.min_price || ''),
          max_price: String(tp.max_price || ''),
          price_unit: tp.price_unit || 'por visita',
          public_phone: tp.public_phone || '',
          public_whatsapp: tp.public_whatsapp || '',
          public_email: tp.public_email || '',
          website: tp.website || '',
          instagram: tp.instagram || '',
          facebook: tp.facebook || '',
          address_text: tp.address_text || '',
          city: tp.city || 'Panamá',
          province: tp.province || 'Panamá',
          latitude: String(tp.latitude || '9.4390'),
          longitude: String(tp.longitude || '-82.5177'),
          service_radius_km: String(tp.service_radius_km || '15'),
          response_time_minutes: String(tp.response_time_minutes || '60'),
          is_available: tp.is_available !== false,
          bank_account: tp.bank_account || '',
        }))
      }
      setGalleryList(gal)
    }).finally(() => setFetching(false))
  }, [user])

  const handleSave = async () => {
    if (selectedCatIds.length === 0) {
      showToast('Selecciona al menos una categoria.', 'error')
      return
    }
    setLoading(true)
    try {
      // 1. Preparar datos
      const payload = {
        ...form,
        category_id: selectedCatIds[0] ?? null,
        years_experience: parseInt(form.years_experience) || 0,
        min_price: parseFloat(form.min_price) || null,
        max_price: parseFloat(form.max_price) || null,
        latitude: parseFloat(form.latitude) || 9.4390,
        longitude: parseFloat(form.longitude) || -82.5177,
        service_radius_km: parseFloat(form.service_radius_km) || 15,
        response_time_minutes: parseInt(form.response_time_minutes) || 60,
      }

      // 2. Guardar perfil
      const exists = await technicians.getOne(user.id).catch(() => null)
      if (exists) {
        await technicians.update(user.id, payload)
      } else {
        await technicians.create(user.id, payload)
      }

      // 3. Guardar categorias multiples
      await techCategories.set(user.id, selectedCatIds)

      showToast(t.saved)
    } catch (err) {
      console.error('Error guardando perfil tecnico:', err)
      showToast('Error al guardar: ' + (err?.message ?? 'intenta de nuevo.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files.slice(0, 5)) {
        await technicians.uploadGalleryImage(user.id, file)
      }
      const gal = await technicians.getGallery(user.id)
      setGalleryList(gal)
      showToast('Fotos subidas.')
    } catch {
      showToast('Error al subir fotos.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteGallery = async (imageId) => {
    try {
      await technicians.deleteGalleryImage(imageId)
      setGalleryList(g => g.filter(x => x.id !== imageId))
    } catch {
      showToast('Error al eliminar.', 'error')
    }
  }

  // Helper estable: NO definir componentes aquí dentro, solo funciones de valor
  const field = (k) => ({
    value: form[k],
    onChange: (v) => setForm(f => ({ ...f, [k]: v })),
  })

  if (fetching) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>

  // Estilos de sección como objeto, no como componente (evita remount)
  const sectionStyle = {
    background: th.surface, borderRadius: 16,
    padding: 16, marginBottom: 14, border: `1px solid ${th.border}`,
  }
  const sectionTitle = {
    fontWeight: 700, fontSize: 15, color: th.text, margin: '0 0 14px',
  }

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 90 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <PageHeader title={t.editProfProfile} />

      <div style={{ padding: '20px 16px' }}>
        {/* Disponibilidad */}
        <div style={{ background: th.surface, borderRadius: 16, padding: '14px 16px', marginBottom: 14, border: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: th.text }}>Estado de disponibilidad</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: form.is_available ? th.primary : th.textSec }}>{form.is_available ? '● Disponible para trabajos' : '○ No disponible'}</p>
          </div>
          <Toggle value={form.is_available} onChange={v => setForm(f => ({ ...f, is_available: v }))} />
        </div>

        {/* Perfil profesional */}
        <div style={sectionStyle}>
          <p style={sectionTitle}>🛠️ Perfil profesional</p>
          <Input label="Título profesional (ES)" placeholder="Electricista profesional certificado" {...field('professional_title')} />
          <Input label="Professional title (EN)" placeholder="Certified professional electrician"  {...field('professional_title_en')} />
          <Input label={`${t.bio} (ES)`} placeholder="Tu descripción en español..." rows={3}      {...field('bio')} />
          <Input label={`${t.bio} (EN)`} placeholder="Your description in English..." rows={3}    {...field('bio_en')} />
          <Input label={t.slogan} placeholder="Tu frase profesional"                        {...field('slogan')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label={t.yearsExp} type="number" {...field('years_experience')} />
            <Input label={t.nationalId} placeholder="8-123-456" {...field('national_id')} />
          </div>
          <Input label={t.company} placeholder="Nombre de tu empresa (opcional)" {...field('company_name')} />
        </div>

        {/* Categorías de servicio */}
        <div style={sectionStyle}>
          <p style={sectionTitle}>🗂️ Categorías de servicio</p>
          <p style={{ margin: '-6px 0 14px', fontSize: 12, color: th.textSec }}>
            Selecciona todos los servicios que ofreces (puedes elegir varios)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { id: 1, slug: 'climatizacion', icon: '❄️', nameEs: 'Climatización', nameEn: 'A/C & Cooling', color: th.primaryLight },
              { id: 2, slug: 'electricidad', icon: '⚡', nameEs: 'Electricidad', nameEn: 'Electrical', color: th.yellowLight },
              { id: 3, slug: 'plomeria', icon: '🔧', nameEs: 'Plomería', nameEn: 'Plumbing', color: '#e0f2fe' },
              { id: 4, slug: 'albanileria', icon: '🧱', nameEs: 'Albañilería', nameEn: 'Masonry', color: th.yellowLight },
              { id: 5, slug: 'limpieza', icon: '🧹', nameEs: 'Limpieza', nameEn: 'Cleaning', color: '#d1fae5' },
              { id: 6, slug: 'cerrajeria', icon: '🔐', nameEs: 'Cerrajería', nameEn: 'Locksmith', color: '#ede9fe' },
              { id: 7, slug: 'pintura', icon: '🎨', nameEs: 'Pintura', nameEn: 'Painting', color: '#fce7f3' },
              { id: 8, slug: 'tecnologia', icon: '💻', nameEs: 'Técnico PC', nameEn: 'PC Tech', color: '#e0f2fe' },
            ].map(cat => {
              const active = selectedCatIds.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatIds(prev =>
                    prev.includes(cat.id)
                      ? prev.filter(x => x !== cat.id)
                      : [...prev, cat.id]
                  )}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${active ? th.primary : th.border}`,
                    background: active ? th.primaryLight : cat.color + '66',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: 22 }}>{cat.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? th.primaryText : th.surface2, textAlign: 'left', lineHeight: 1.2 }}>
                    {lang === 'en' ? cat.nameEn : cat.nameEs}
                  </span>
                  {active && (
                    <span style={{ marginLeft: 'auto', fontSize: 16, color: th.primary }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>
          {selectedCatIds.length === 0 && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: th.red }}>
              ⚠️ Selecciona al menos una categoría para aparecer en las búsquedas.
            </p>
          )}
          {selectedCatIds.length > 0 && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: th.primary, fontWeight: 600 }}>
              ✓ {selectedCatIds.length} categoría{selectedCatIds.length > 1 ? 's' : ''} seleccionada{selectedCatIds.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Precios */}
        <div style={sectionStyle}>
          <p style={sectionTitle}>💰 Precios</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Precio mín. ($)" type="number" {...field('min_price')} />
            <Input label="Precio máx. ($)" type="number" {...field('max_price')} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: th.text, marginBottom: 6 }}>Unidad de precio</label>
            <select value={form.price_unit} onChange={e => setForm(f => ({ ...f, price_unit: e.target.value }))}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${th.inputBorder}`, fontSize: 14, background: th.inputBg, color: th.text, outline: 'none', fontFamily: 'inherit' }}>
              {['por visita', 'por hora', 'por metro', 'por servicio', 'por equipo'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>{/* fin Precios */}

        {/* Ubicación y zona */}
        <div style={sectionStyle}>
          <p style={sectionTitle}>📍 Ubicación y zona</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label={t.city} placeholder="Panamá"    {...field('city')} />
            <Input label={t.province} placeholder="Panamá" {...field('province')} />
          </div>
          <Input label={t.address} placeholder="Calle, barrio..." {...field('address_text')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Latitud" type="number" {...field('latitude')} />
            <Input label="Longitud" type="number" {...field('longitude')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label={t.serviceRadius} type="number" {...field('service_radius_km')} />
            <Input label={t.responseTime} type="number" {...field('response_time_minutes')} />
          </div>
        </div>

        {/* Contacto público */}
        <div style={sectionStyle}>
          <p style={sectionTitle}>📱 Contacto público</p>
          <Input label="Número de cuenta bancaria (para transferencias)"
            placeholder="Banco General · Cta 001-123456-7" {...field('bank_account')} />
          <p style={{ fontSize: 11, color: th.textSec, margin: '-8px 0 14px' }}>
            Los clientes verán este número al pagar por transferencia. No compartas CVC ni contraseñas.
          </p>
          <Input label={t.whatsappPublic} placeholder="50761234567"       {...field('public_whatsapp')} />
          <Input label={t.emailPublic} type="email" placeholder="tu@email.com" {...field('public_email')} />
          <Input label={t.phone} placeholder="+507 6000-0000"    {...field('public_phone')} />
          <Input label={t.instagram} placeholder="@usuario"          {...field('instagram')} />
          <Input label={t.facebook} placeholder="facebook.com/..."  {...field('facebook')} />
          <Input label={t.website} placeholder="https://..."       {...field('website')} />
        </div>

        {/* Galería */}
        <div style={sectionStyle}>
          <p style={sectionTitle}>📸 {t.galleryWork}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            {galleryList.map(img => (
              <div key={img.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: `1px solid ${th.border}` }}>
                <img src={img.image_url} alt="Trabajo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => handleDeleteGallery(img.id)}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', borderRadius: 10, width: 24, height: 24, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ×
                </button>
              </div>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: th.surface2, borderRadius: 12, border: `2px dashed ${th.border}`, cursor: 'pointer', fontSize: 14, color: th.textSec, fontWeight: 600 }}>
            {uploading ? <Spinner size={20} /> : '📷'} {uploading ? 'Subiendo...' : t.addPhoto}
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleGalleryUpload} disabled={uploading} />
          </label>
        </div>

        <Btn onClick={handleSave} loading={loading}>{t.saveChanges}</Btn>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────
export function SettingsScreen() {
  const { th, darkMode, setDarkMode, lang, setLang, navigate, user, setUser, refreshUser } = useApp()
  const t = T[lang]
  const [prefs, setPrefs] = useState({
    notif_push: user?.notif_push ?? true,
    notif_email: user?.notif_email ?? true,
    notif_sms: user?.notif_sms ?? false,
    show_phone: user?.show_phone ?? true,
    show_email: user?.show_email ?? false,
    location_perm: user?.location_perm ?? true,
    two_factor_enabled: user?.two_factor_enabled ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [pushPerm, setPushPerm] = useState(getPermissionStatus())
  const [linkedProviders, setLinkedProviders] = useState([])
  const [linkLoading, setLinkLoading] = useState(null)

  useEffect(() => {
    auth.getLinkedProviders().then(setLinkedProviders).catch(() => { })
  }, [])

  const PROVIDER_INFO = {
    email: { label: 'Email y contraseña', icon: '✉️' },
    google: { label: 'Google', icon: '🔵' },
    facebook: { label: 'Facebook', icon: '🔷' },
  }

  const handleLinkProvider = async (provider) => {
    setLinkLoading(provider)
    try {
      await auth.linkOAuthIdentity(provider)
    } catch (err) {
      showToast(err?.message ?? 'Error al vincular')
      setLinkLoading(null)
    }
  }

  const handleUnlinkProvider = async (provider) => {
    if (linkedProviders.length <= 1) {
      showToast(lang === 'en'
        ? 'You must keep at least one sign-in method.'
        : 'Debes mantener al menos un método de acceso.')
      return
    }
    if (!window.confirm(lang === 'en'
      ? `Remove ${PROVIDER_INFO[provider]?.label} as a sign-in method?`
      : `¿Quitar ${PROVIDER_INFO[provider]?.label} como método de acceso?`)) return
    setLinkLoading(provider)
    try {
      const { data } = await supabase.auth.getUserIdentities()
      const identity = data?.identities?.find(i => i.provider === provider)
      if (identity) {
        await auth.unlinkOAuthIdentity(identity)
        setLinkedProviders(prev => prev.filter(p => p !== provider))
        showToast(lang === 'en' ? 'Removed' : 'Eliminado')
      }
    } catch (err) {
      showToast(err?.message ?? 'Error')
    } finally { setLinkLoading(null) }
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  const savePref = async (key, val) => {
    const updated = { ...prefs, [key]: val }
    setPrefs(updated)
    if (user) {
      setSaving(true)
      try {
        const p = await profiles.update(user.id, { [key]: val })
        setUser(p)
        showToast(t.saved)
      } catch { } finally { setSaving(false) }
    }
  }

  // Estilos de sección como objetos (NO componente dentro del render)
  const ss = { background: th.surface, borderRadius: 16, marginBottom: 12, border: `1px solid ${th.border}`, overflow: 'hidden' }
  const sh = { margin: 0, fontSize: 12, fontWeight: 700, color: th.textSec, padding: '12px 16px 8px', borderBottom: `1px solid ${th.border}`, textTransform: 'uppercase', letterSpacing: 0.8 }

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 40 }}>
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      <PageHeader title={`⚙️ ${t.settings}`} />

      <div style={{ padding: 16 }}>
        {/* Idioma */}
        <div style={ss}>
          <p style={sh}>{t.language}</p>
          <SettingsRow label={t.language} right={
            <div style={{ display: 'flex', gap: 6 }}>
              {[['es', '🇵🇦 ES'], ['en', '🇺🇸 EN']].map(([l, label]) => (
                <button key={l} onClick={() => setLang(l)}
                  style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${lang === l ? th.primary : th.border}`, background: lang === l ? th.primaryLight : 'transparent', color: lang === l ? th.primaryText : th.textSec, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {label}
                </button>
              ))}
            </div>
          } />
        </div>

        {/* Apariencia */}
        <div style={ss}>
          <p style={sh}>Apariencia</p>
          <SettingsRow label={t.darkMode} sub={darkMode ? 'Tema oscuro activo' : 'Tema claro activo'}
            right={<Toggle value={darkMode} onChange={v => setDarkMode(v)} />}
          />
        </div>

        {/* Notificaciones */}
        <div style={ss}>
          <p style={sh}>{t.notifications}</p>

          {/* Banner: pedir permiso al navegador para notificaciones push */}
          {pushPerm !== 'granted' && pushPerm !== 'unsupported' && (
            <div style={{
              padding: '12px 16px', background: pushPerm === 'denied' ? '#fee2e2' : '#eff6ff',
              borderBottom: `1px solid ${th.border}`
            }}>
              <p style={{
                margin: '0 0 8px', fontSize: 12,
                color: pushPerm === 'denied' ? '#991b1b' : th.primary, lineHeight: 1.5
              }}>
                {pushPerm === 'denied'
                  ? (lang === 'en'
                    ? '🔕 Notifications are blocked. Enable them in your browser settings to receive alerts about new requests.'
                    : '🔕 Las notificaciones están bloqueadas. Activa los permisos del navegador para recibir alertas de nuevas solicitudes.')
                  : (lang === 'en'
                    ? '🔔 Enable browser notifications to get alerted instantly about new requests, even when the app is in the background.'
                    : '🔔 Activa las notificaciones del navegador para enterarte al instante de nuevas solicitudes, incluso con la app en segundo plano.')
                }
              </p>
              {pushPerm !== 'denied' && (
                <button onClick={async () => {
                  const result = await requestPermission()
                  setPushPerm(result)
                  if (result === 'granted') showToast(t.saved)
                }} style={{
                  background: th.primary, color: '#fff', border: 'none',
                  borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  {lang === 'en' ? 'Enable notifications' : 'Activar notificaciones'}
                </button>
              )}
            </div>
          )}
          {pushPerm === 'granted' && (
            <div style={{
              padding: '8px 16px', background: '#f0fdf4',
              borderBottom: `1px solid ${th.border}`
            }}>
              <p style={{ margin: 0, fontSize: 12, color: th.verifiedText }}>
                ✅ {lang === 'en' ? 'Browser notifications enabled' : 'Notificaciones del navegador activadas'}
              </p>
            </div>
          )}

          <SettingsRow label={t.pushNotif} sub="Alertas en tu dispositivo" right={<Toggle value={prefs.notif_push} onChange={v => savePref('notif_push', v)} />} />
          <SettingsRow label={t.emailNotif} sub="Resumen de actividad" right={<Toggle value={prefs.notif_email} onChange={v => savePref('notif_email', v)} />} />
          <SettingsRow label={t.smsNotif} sub="Mensajes de texto" right={<Toggle value={prefs.notif_sms} onChange={v => savePref('notif_sms', v)} />} />
        </div>

        {/* Privacidad */}
        <div style={ss}>
          <p style={sh}>{t.privacy}</p>
          <SettingsRow label={t.showPhone} sub="Visible en tu perfil público" right={<Toggle value={prefs.show_phone} onChange={v => savePref('show_phone', v)} />} />
          <SettingsRow label={t.showEmail} sub="Visible en tu perfil público" right={<Toggle value={prefs.show_email} onChange={v => savePref('show_email', v)} />} />
          <SettingsRow label={t.locationPerm} sub="Necesario para el mapa" right={<Toggle value={prefs.location_perm} onChange={v => savePref('location_perm', v)} />} />
        </div>

        {/* Seguridad */}
        <div style={ss}>
          <p style={sh}>{t.security}</p>
          <SettingsRow label={t.twoFactor} sub={prefs.two_factor_enabled ? 'Activo' : 'Inactivo'}
            right={<Toggle value={prefs.two_factor_enabled} onChange={v => savePref('two_factor_enabled', v)} />}
          />
          <SettingsRow label={t.changePassword} sub="Recibirás un email"
            right={<Btn onClick={async () => { if (user) { await auth.resetPassword(user.email); showToast('Email enviado') } }} variant="ghost" size="sm" style={{ width: 'auto', padding: '6px 14px' }}>Enviar →</Btn>}
          />

          {/* Cuentas vinculadas (Google / Facebook / Email) */}
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${th.border}` }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: th.text }}>
              {lang === 'en' ? 'Linked sign-in methods' : 'Métodos de acceso vinculados'}
            </p>
            {['email', 'google', 'facebook'].map(provider => {
              const info = { email: { label: 'Email y contraseña', icon: '✉️' }, google: { label: 'Google', icon: '🔵' }, facebook: { label: 'Facebook', icon: '🔷' } }[provider]
              const linked = linkedProviders.includes(provider)
              const isLoading = linkLoading === provider
              return (
                <div key={provider} style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', padding: '8px 0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{info.icon}</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: th.text }}>{info.label}</p>
                      <p style={{ margin: 0, fontSize: 11, color: linked ? th.primaryText : th.textSec }}>
                        {linked
                          ? (lang === 'en' ? 'Connected' : 'Conectado')
                          : (lang === 'en' ? 'Not connected' : 'No conectado')}
                      </p>
                    </div>
                  </div>
                  {provider === 'email' ? null : (
                    linked ? (
                      <button onClick={() => handleUnlinkProvider(provider)} disabled={isLoading}
                        style={{
                          background: 'none', border: `1px solid ${th.border}`, borderRadius: 10,
                          padding: '5px 12px', fontSize: 12, fontWeight: 600, color: th.red,
                          cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                        {isLoading ? '...' : (lang === 'en' ? 'Remove' : 'Quitar')}
                      </button>
                    ) : (
                      <button onClick={() => handleLinkProvider(provider)} disabled={isLoading}
                        style={{
                          background: th.primaryLight, border: `1px solid ${th.primary}`, borderRadius: 10,
                          padding: '5px 12px', fontSize: 12, fontWeight: 600, color: th.primaryText,
                          cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                        {isLoading ? '...' : (lang === 'en' ? 'Connect' : 'Vincular')}
                      </button>
                    )
                  )}
                </div>
              )
            })}
            <p style={{ margin: '8px 0 0', fontSize: 11, color: th.textSec, lineHeight: 1.5 }}>
              🔒 {lang === 'en'
                ? 'Linking another provider lets you sign in multiple ways without losing your data.'
                : 'Vincular otro proveedor te permite iniciar sesión de varias formas sin perder tu información.'}
            </p>
          </div>
        </div>

        {/* Acerca de */}
        <div style={ss}>
          <p style={sh}>{t.about}</p>
          <SettingsRow label={t.version} right={<span style={{ fontSize: 13, color: th.textSec }}>2.0.0</span>} />
          <SettingsRow label={t.terms} onClick={() => navigate('legal')} right={<span style={{ color: th.primary, fontSize: 13 }}>›</span>} />
          <SettingsRow label={t.privacyPolicy} onClick={() => navigate('legal')} right={<span style={{ color: th.primary, fontSize: 13 }}>›</span>} />
          <SettingsRow label={t.contactSupport} onClick={() => window.open('mailto:soporte@tecnifix.com')} right={<span style={{ color: th.primary, fontSize: 13 }}>›</span>} />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────
export function NotificationsScreen() {
  const { th, user, notifs, setNotifs, unreadCount, setUnreadCount,
    markNotifsRead, loadNotifs, lang } = useApp()
  const t = T[lang]
  const [deleting, setDeleting] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => { if (user) loadNotifs(user.id) }, [user])

  const TYPE_ICON = {
    new_request: '📋', request_accepted: '✅', review: '⭐',
    contract: '📄', payment: '💚', system: '🔔', dispute: '⚠️',
  }
  const TYPE_COLOR = {
    new_request: th.primaryLight, request_accepted: th.verifiedLight, review: th.yellowLight,
    contract: '#ede9fe', payment: '#d1fae5', system: th.surface2, dispute: '#fff7ed',
  }

  // ── Eliminar una notificación ──────────────────────────────
  const deleteOne = async (id) => {
    setDeleting(id)
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id)
      if (error) throw error
      const wasUnread = notifs.find(n => n.id === id && !n.is_read)
      setNotifs(prev => prev.filter(n => n.id !== id))
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      showToast('Error al eliminar', 'error')
    } finally { setDeleting(null) }
  }

  // ── Eliminar solo las leídas ───────────────────────────────
  const deleteAllRead = async () => {
    if (!window.confirm('¿Eliminar todas las notificaciones leídas?')) return
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('is_read', true)
      if (error) throw error
      setNotifs(prev => prev.filter(n => !n.is_read))
      showToast('Notificaciones leídas eliminadas')
    } catch (err) {
      showToast('Error: ' + (err?.message ?? ''), 'error')
    }
  }

  // ── Eliminar todas ─────────────────────────────────────────
  const deleteAll = async () => {
    if (!window.confirm('¿Eliminar TODAS las notificaciones? No se puede deshacer.')) return
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
      if (error) throw error
      setNotifs([])
      setUnreadCount(0)
      showToast('Todas las notificaciones eliminadas')
    } catch (err) {
      showToast('Error: ' + (err?.message ?? ''), 'error')
    }
  }

  const hasRead = notifs.some(n => n.is_read)
  const hasUnread = notifs.some(n => !n.is_read)

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 40 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader title={'🔔 ' + t.notificationsTitle}
        right={
          notifs.length > 0 ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {hasUnread && (
                <button onClick={markNotifsRead}
                  style={{
                    background: 'none', border: 'none', color: th.primary,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                  }}>
                  Marcar leídas
                </button>
              )}
              {hasRead && (
                <button onClick={deleteAllRead}
                  style={{
                    background: '#fee2e2', border: 'none', color: '#991b1b',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    padding: '5px 10px', borderRadius: 20
                  }}>
                  🗑️ Limpiar leídas
                </button>
              )}
            </div>
          ) : null
        }
      />

      {/* Barra de info + borrar todo */}
      {notifs.length > 0 && (
        <div style={{
          padding: '10px 16px', background: th.surface,
          borderBottom: '1px solid ' + th.border,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <p style={{ margin: 0, fontSize: 13, color: th.textSec }}>
            {notifs.length} notificación{notifs.length !== 1 ? 'es' : ''}
            {hasUnread
              ? ' · ' + notifs.filter(n => !n.is_read).length + ' sin leer'
              : ' · Todas leídas'}
          </p>
          <button onClick={deleteAll}
            style={{
              background: 'none', border: 'none', color: th.textSec,
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              textDecoration: 'underline'
            }}>
            Borrar todo
          </button>
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        {notifs.length === 0 ? (
          <EmptyState emoji="🔔" title={t.noNotifs}
            sub="Las notificaciones nuevas aparecerán aquí." />
        ) : (
          notifs.map(n => {
            const isBeingDeleted = deleting === n.id
            const iconBg = n.is_read ? th.surface2 : (TYPE_COLOR[n.type] ?? th.surface2)
            return (
              <div key={n.id} style={{
                display: 'flex', gap: 12, padding: '14px 0',
                borderBottom: '1px solid ' + th.border,
                opacity: isBeingDeleted ? 0.4 : 1,
                transition: 'opacity 0.2s',
                background: n.is_read ? 'transparent' : th.primaryLight + '22',
              }}>

                {/* Ícono */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}>
                  {TYPE_ICON[n.type] || '🔔'}
                </div>

                {/* Contenido */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: '0 0 3px',
                    fontWeight: n.is_read ? 500 : 700,
                    fontSize: 14, color: th.text,
                  }}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p style={{
                      margin: '0 0 4px', fontSize: 13,
                      color: th.textSec, lineHeight: 1.4
                    }}>
                      {n.body}
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: 11, color: th.textSec }}>
                    {new Date(n.created_at).toLocaleString('es-PA', {
                      day: '2-digit', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Acciones */}
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0
                }}>
                  {/* Punto no leído */}
                  {!n.is_read && (
                    <div style={{
                      width: 8, height: 8, borderRadius: 4,
                      background: th.primary
                    }} />
                  )}
                  {/* Botón X eliminar */}
                  <button
                    onClick={() => deleteOne(n.id)}
                    disabled={isBeingDeleted}
                    title="Eliminar notificación"
                    style={{
                      width: 28, height: 28, borderRadius: 14,
                      background: th.surface2, border: '1px solid ' + th.border,
                      cursor: isBeingDeleted ? 'not-allowed' : 'pointer',
                      color: th.textSec, fontSize: 16, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                    {isBeingDeleted ? '…' : '×'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────
// REQUESTS TABS — Activas / Completadas / Archivadas
// ─────────────────────────────────────────────────────────────
function RequestsTabs({ user, th, t, navigate, setSelectedRequest }) {
  const [tab, setTab] = useState('active')
  const [lists, setLists] = useState({ active: [], completed: [], archived: [] })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [archiving, setArchiving] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      archiveApi.listByStatus(user.id, 'active'),
      archiveApi.listByStatus(user.id, 'archived'),
    ]).then(([active, archived]) => {
      const inProgress = active.filter(r => r.status !== 'completed')
      const completed = active.filter(r => r.status === 'completed')
      setLists({ active: inProgress, completed, archived })
    }).catch(() => showToast('Error al cargar solicitudes', 'error'))
      .finally(() => setLoading(false))
  }, [user])

  const handleArchive = async (r) => {
    setArchiving(r.id)
    try {
      await archiveApi.archiveRequest(r.id, user.id)
      setLists(prev => ({
        ...prev,
        completed: prev.completed.filter(x => x.id !== r.id),
        archived: [{ ...r, archive_status: 'archived' }, ...prev.archived],
      }))
      showToast('Solicitud archivada')
    } catch (err) {
      showToast(err?.message ?? 'Error al archivar', 'error')
    } finally { setArchiving(null) }
  }

  const handleDelete = async (r) => {
    if (!window.confirm(`¿Eliminar definitivamente "${r.title}"?
Se descargará el recibo automáticamente.`)) return
    setDeleting(r.id)
    try {
      // Descargar recibo antes de borrar
      const { data: receipt } = await supabase
        .from('receipts').select('*').eq('service_request_id', r.id).single()
      if (receipt) {
        try {
          await receiptActions.downloadPDF(receipt)
          await new Promise(res => setTimeout(res, 1200))
        } catch { }
      }
      await archiveApi.deleteArchivedRequest(r.id, user.id)
      setLists(prev => ({ ...prev, archived: prev.archived.filter(x => x.id !== r.id) }))
      showToast('Solicitud eliminada definitivamente')
    } catch (err) {
      showToast(err?.message ?? 'Error al eliminar', 'error')
    } finally { setDeleting(null) }
  }

  const downloadReceipt = async (req) => {
    // req puede venir como string (id) o como objeto completo de la solicitud
    const requestId = typeof req === 'string' ? req : req.id
    try {
      let { data: receipt } = await supabase
        .from('receipts').select('*').eq('service_request_id', requestId).single()

      // Si no existe el recibo (p.ej. servicio completado sin pago confirmado
      // en la app, pago en efectivo acordado fuera de línea, etc.), generarlo
      // ahora mismo con los datos disponibles de la solicitud.
      if (!receipt) {
        const full = typeof req === 'object' ? req : null
        const { data: r } = await supabase
          .from('service_requests').select('*').eq('id', requestId).single()
        const sr = full ?? r
        if (!sr) { showToast('Solicitud no encontrada.', 'error'); return }

        receipt = await receiptActions.generate({
          requestId: sr.id,
          clientId: sr.client_id,
          technicianId: sr.technician_id,
          serviceTitle: sr.title,
          serviceDescription: sr.description,
          amount: sr.agreed_price ?? 0,
          paymentMethod: sr.payment_method || 'cash',
          paymentReference: sr.payment_ref || null,
          clientName: sr.client_name ?? 'Cliente',
          technicianName: sr.technician_name ?? 'Técnico',
        })
      }

      await receiptActions.downloadPDF(receipt)
      showToast('Recibo descargado')
    } catch (err) {
      showToast('Error al descargar: ' + (err?.message ?? ''), 'error')
    }
  }

  const STATUS_COLORS = {
    pending: { bg: th.yellowLight, text: th.yellowText },
    accepted: { bg: th.primaryLight, text: th.primary },
    in_progress: { bg: '#ede9fe', text: '#5b21b6' },
    pending_payment: { bg: '#fce7f3', text: '#9d174d' },
    completed: { bg: th.verifiedLight, text: th.verifiedText },
    cancelled: { bg: '#fee2e2', text: '#991b1b' },
    disputed: { bg: '#fff7ed', text: '#9a3412' },
  }
  const STATUS_LABEL = {
    pending: 'Enviada', accepted: 'Aceptada', in_progress: 'En progreso',
    pending_payment: 'Pend. pago', completed: 'Completada',
    cancelled: 'Cancelada', disputed: 'En disputa',
  }

  const TABS = [
    { id: 'active', emoji: '⚡', label: 'Activas', list: lists.active },
    { id: 'completed', emoji: '✅', label: 'Completadas', list: lists.completed },
    { id: 'archived', emoji: '📦', label: 'Archivadas', list: lists.archived },
  ]
  const currentList = TABS.find(tb => tb.id === tab)?.list ?? []

  return (
    <div style={{
      background: th.surface, borderRadius: 16,
      border: `1px solid ${th.border}`, marginBottom: 16, overflow: 'hidden'
    }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header con tabs */}
      <div style={{ padding: '14px 16px 0', borderBottom: `1px solid ${th.border}` }}>
        <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 15, color: th.text }}>
          {user.role === 'technician' ? 'Solicitudes recibidas' : 'Mis solicitudes'}
        </p>
        <div style={{ display: 'flex' }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              style={{
                flex: 1, padding: '8px 2px', background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
                fontWeight: tab === tb.id ? 700 : 400,
                color: tab === tb.id ? th.primary : th.textSec,
                borderBottom: tab === tb.id
                  ? `2.5px solid ${th.primary}` : '2.5px solid transparent',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 4
              }}>
              {tb.emoji} {tb.label}
              {tb.list.length > 0 && (
                <span style={{
                  background: tab === tb.id ? th.primary : th.border,
                  color: tab === tb.id ? '#fff' : th.textSec,
                  fontSize: 10, fontWeight: 700, padding: '1px 5px',
                  borderRadius: 20
                }}>
                  {tb.list.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Info de archivo automático */}
      {tab === 'completed' && lists.completed.length > 0 && (
        <div style={{
          padding: '8px 16px', background: th.yellowLight,
          borderBottom: `1px solid #fde68a`
        }}>
          <p style={{ margin: 0, fontSize: 11, color: th.yellowText }}>
            ⏰ Las solicitudes completadas se archivan automáticamente a los 30 días.
            Descarga el recibo antes de archivar para guardar evidencia.
          </p>
        </div>
      )}

      {/* Contenido */}
      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <Spinner />
          </div>
        ) : currentList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '22px 0', color: th.textSec }}>
            <p style={{ fontSize: 28, margin: '0 0 6px' }}>
              {tab === 'active' ? '📋' : tab === 'completed' ? '✅' : '📦'}
            </p>
            <p style={{ fontSize: 13, margin: 0 }}>
              {tab === 'active' ? 'Sin solicitudes activas'
                : tab === 'completed' ? 'Sin solicitudes completadas'
                  : 'Sin solicitudes archivadas'}
            </p>
          </div>
        ) : currentList.map((r, i) => {
          const isArchiving_ = archiving === r.id
          const isDeleting_ = deleting === r.id
          const sc = STATUS_COLORS[r.status] ?? { bg: th.surface2, text: th.textSec }
          const isLast = i === currentList.length - 1

          return (
            <div key={r.id} style={{
              padding: '12px 0',
              borderBottom: isLast ? 'none' : `1px solid ${th.border}`,
              opacity: (isArchiving_ || isDeleting_) ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}>
              {/* Fila principal clickeable */}
              <div onClick={() => { setSelectedRequest(r); navigate('request-detail') }}
                style={{ cursor: 'pointer', marginBottom: 8 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', gap: 8, marginBottom: 3
                }}>
                  <p style={{
                    margin: 0, fontWeight: 700, fontSize: 14,
                    color: th.text, flex: 1
                  }}>{r.title}</p>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px',
                    borderRadius: 20, flexShrink: 0,
                    background: sc.bg, color: sc.text
                  }}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                {r.description && (
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: th.textSec }}>
                    {r.description.slice(0, 55)}{r.description.length > 55 ? '…' : ''}
                  </p>
                )}
                <div style={{
                  display: 'flex', gap: 8, flexWrap: 'wrap',
                  alignItems: 'center', marginBottom: 4
                }}>
                  <span style={{ fontSize: 11, color: th.textSec }}>
                    📅 {new Date(r.created_at).toLocaleDateString('es-PA')}
                  </span>
                  {r.agreed_price && (
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: th.primaryText
                    }}>
                      💲{r.agreed_price}
                    </span>
                  )}
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    background: r.payment_status === 'paid' ? th.verifiedLight : th.surface2,
                    color: r.payment_status === 'paid' ? th.verifiedText : th.textSec,
                    padding: '1px 6px', borderRadius: 20
                  }}>
                    {r.payment_status === 'paid' ? '✓ Pagado' : 'Sin pagar'}
                  </span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 11,
                    color: th.primary, fontWeight: 600
                  }}>
                    Ver →
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar
                    photo={user.role === 'technician' ? r.client_avatar : r.technician_avatar}
                    name={user.role === 'technician' ? r.client_name : r.technician_name}
                    size={20}
                  />
                  <span style={{ fontSize: 11, color: th.textSec }}>
                    {user.role === 'technician'
                      ? `Cliente: ${r.client_name}`
                      : `Técnico: ${r.technician_name}`}
                  </span>
                </div>
              </div>

              {/* Botones según tab */}
              {tab === 'active' && r.status === 'cancelled' && (
                <button onClick={async () => {
                  if (!window.confirm('¿Eliminar esta solicitud cancelada?')) return
                  try {
                    await supabase.from('service_requests')
                      .update({ archive_status: 'deleted' }).eq('id', r.id)
                    setLists(prev => ({
                      ...prev, active: prev.active.filter(x => x.id !== r.id)
                    }))
                  } catch { showToast('Error', 'error') }
                }} style={{
                  width: '100%', padding: '8px', background: '#fee2e2',
                  color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 10,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  🗑️ Eliminar solicitud cancelada
                </button>
              )}

              {tab === 'completed' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => downloadReceipt(r)}
                    style={{
                      flex: 2, padding: '8px', background: th.primaryLight,
                      color: th.primaryText, border: `1px solid ${th.primary}`,
                      borderRadius: 10, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit'
                    }}>
                    ⬇️ Recibo PDF
                  </button>
                  <button onClick={() => handleArchive(r)} disabled={isArchiving_}
                    style={{
                      flex: 1, padding: '8px', background: th.surface2,
                      color: th.textSec, border: `1px solid ${th.border}`,
                      borderRadius: 10, fontSize: 12, fontWeight: 600,
                      cursor: isArchiving_ ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit'
                    }}>
                    {isArchiving_ ? '…' : '📦 Archivar'}
                  </button>
                </div>
              )}

              {tab === 'archived' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => downloadReceipt(r)}
                    style={{
                      flex: 2, padding: '8px', background: th.primaryLight,
                      color: th.primaryText, border: `1px solid ${th.primary}`,
                      borderRadius: 10, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit'
                    }}>
                    ⬇️ Ver recibo
                  </button>
                  <button onClick={() => handleDelete(r)} disabled={isDeleting_}
                    style={{
                      flex: 1, padding: '8px', background: '#fee2e2',
                      color: '#991b1b', border: '1px solid #fca5a5',
                      borderRadius: 10, fontSize: 12, fontWeight: 700,
                      cursor: isDeleting_ ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit'
                    }}>
                    {isDeleting_ ? '…' : '🗑️'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


export function AdminScreen() {
  const { th, user, navigate, lang } = useApp()
  const t = T[lang]
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [techs, setTechs] = useState([])
  const [revs, setRevs] = useState([])
  const [certs, setCerts] = useState([])
  const [disputes, setDisputes] = useState([])
  const [resolvingId, setResolvingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tabLoad, setTabLoad] = useState(false)
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Cargar datos iniciales del dashboard
  useEffect(() => {
    if (user?.role !== 'admin') { navigate('home'); return }
    loadTab('dashboard')
  }, [user])

  const loadTab = async (newTab) => {
    setTab(newTab)
    setTabLoad(true)
    setSearch('')
    try {
      if (newTab === 'dashboard') {
        const s = await admin.getDashboardStats()
        setStats(s)
      } else if (newTab === 'users') {
        const u = await admin.listAllUsers()
        setUsers(Array.isArray(u) ? u : [])
      } else if (newTab === 'techs') {
        const tc = await admin.listAllTechnicians()
        setTechs(Array.isArray(tc) ? tc : [])
      } else if (newTab === 'reviews') {
        const rv = await admin.listPendingReviews()
        setRevs(Array.isArray(rv) ? rv : [])
      } else if (newTab === 'certs') {
        const { data, error } = await supabase
          .from('certificates')
          .select(`
            *,
            tech:technician_id (
              user_id,
              profiles!technician_profiles_user_id_fkey ( full_name, avatar_url )
            )
          `)
          .eq('is_verified', false)
          .order('created_at', { ascending: false })
        // 406: tabla vacía o RLS — no congelar, mostrar lista vacía
        if (error) {
          console.warn('[Admin/certs] Error:', error.code, error.message)
          setCerts([])
        } else {
          setCerts(data ?? [])
        }
      } else if (newTab === 'disputes') {
        try {
          const d = await disputeActions.listAll()
          setDisputes(Array.isArray(d) ? d : [])
        } catch (dErr) {
          // La tabla disputes puede no existir aún — mostrar vacío sin crash
          console.warn('[Admin/disputes] Error:', dErr?.message ?? dErr)
          setDisputes([])
        }
      }
    } catch (err) {
      const msg = err?.message ?? ''
      const friendly = msg.includes('406') || msg.includes('Not Acceptable')
        ? 'La tabla aún no está disponible. Ejecuta el SQL de configuración en Supabase.'
        : 'Error al cargar datos: ' + msg
      showToast(friendly, 'error')
    } finally {
      setTabLoad(false)
      setLoading(false)
    }
  }

  if (user?.role !== 'admin') return null

  const TABS = [
    { id: 'dashboard', icon: 'admin', label: 'Dashboard' },
    { id: 'users', icon: 'user-group', label: 'Usuarios' },
    { id: 'techs', icon: 'wrench', label: 'Técnicos', badge: stats?.pending?.techs },
    { id: 'reviews', icon: 'star', label: 'Reseñas', badge: stats?.pending?.reviews },
    { id: 'certs', icon: 'certificate', label: 'Certificados', badge: stats?.pending?.certs },
    { id: 'disputes', icon: 'warning', label: 'Disputas', badge: stats?.pending?.disputes },
  ]

  const filterBySearch = (list, fields) => {
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(item => fields.some(f => String(item[f] ?? '').toLowerCase().includes(q)))
  }

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 40 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader title="🔧 Panel de Administración" />

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: `1px solid ${th.border}`,
        background: th.surface, overflowX: 'auto', scrollbarWidth: 'none'
      }}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => loadTab(tb.id)}
            style={{
              flexShrink: 0, padding: '12px 14px', background: 'none', border: 'none',
              cursor: 'pointer', fontWeight: tab === tb.id ? 700 : 400,
              color: tab === tb.id ? th.primary : th.textSec,
              borderBottom: tab === tb.id ? `2.5px solid ${th.primary}` : '2.5px solid transparent',
              fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
              position: 'relative'
            }}>
            <Icon name={tb.icon} size={15} color={tab === tb.id ? th.primary : th.textSec} />
            {tb.label}
            {!!tb.badge && (
              <span style={{
                background: th.red, color: '#fff', fontSize: 10, fontWeight: 700,
                minWidth: 16, height: 16, borderRadius: 8, display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: '0 4px'
              }}>
                {tb.badge > 9 ? '9+' : tb.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Buscador (excepto dashboard) */}
      {tab !== 'dashboard' && (
        <div style={{
          padding: '12px 16px', background: th.surface,
          borderBottom: `1px solid ${th.border}`
        }}>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', fontSize: 16
            }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 14px 10px 38px',
                borderRadius: 12, border: `1.5px solid ${th.inputBorder}`,
                fontSize: 14, background: th.inputBg, color: th.text, outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>
      )}

      <div style={{ padding: '16px 16px 0' }}>
        {(loading || tabLoad) ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', padding: 50, gap: 14
          }}>
            <Spinner />
            <p style={{ color: th.textSec, fontSize: 14 }}>Cargando...</p>
          </div>
        ) : (
          <>
            {/* ────── DASHBOARD ────── */}
            {tab === 'dashboard' && stats && (
              <div>
                {/* Alertas de pendientes */}
                {(stats.pending.disputes > 0 || stats.pending.techs > 0 ||
                  stats.pending.reviews > 0 || stats.pending.certs > 0) && (
                    <div style={{
                      background: th.yellowLight, borderRadius: 14, padding: 14,
                      border: '1px solid #fde68a', marginBottom: 16
                    }}>
                      <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 14, color: th.yellowText }}>
                        ⚡ Requiere tu atención
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {stats.pending.disputes > 0 && (
                          <button onClick={() => loadTab('disputes')}
                            style={{
                              background: '#fee2e2', color: '#991b1b', border: 'none',
                              borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                              cursor: 'pointer', fontFamily: 'inherit'
                            }}>
                            ⚠️ {stats.pending.disputes} disputa{stats.pending.disputes !== 1 ? 's' : ''}
                          </button>
                        )}
                        {stats.pending.techs > 0 && (
                          <button onClick={() => loadTab('techs')}
                            style={{
                              background: th.primaryLight, color: th.primary, border: 'none',
                              borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                              cursor: 'pointer', fontFamily: 'inherit'
                            }}>
                            🛠️ {stats.pending.techs} técnico{stats.pending.techs !== 1 ? 's' : ''} sin verificar
                          </button>
                        )}
                        {stats.pending.reviews > 0 && (
                          <button onClick={() => loadTab('reviews')}
                            style={{
                              background: th.yellowLight, color: th.yellowText, border: 'none',
                              borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                              cursor: 'pointer', fontFamily: 'inherit'
                            }}>
                            ⭐ {stats.pending.reviews} reseña{stats.pending.reviews !== 1 ? 's' : ''} pendiente{stats.pending.reviews !== 1 ? 's' : ''}
                          </button>
                        )}
                        {stats.pending.certs > 0 && (
                          <button onClick={() => loadTab('certs')}
                            style={{
                              background: '#ede9fe', color: '#5b21b6', border: 'none',
                              borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                              cursor: 'pointer', fontFamily: 'inherit'
                            }}>
                            📜 {stats.pending.certs} certificado{stats.pending.certs !== 1 ? 's' : ''}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                {/* KPIs principales */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  {[
                    { val: stats.totalUsers, label: 'Usuarios registrados', iconName: 'user-group', color: th.primaryLight, text: th.primary },
                    { val: stats.totalTechs, label: 'Técnicos activos', iconName: 'wrench', color: th.verifiedLight, text: th.verifiedText },
                    { val: stats.totalRequests, label: 'Solicitudes totales', iconName: null, emoji: '📋', color: th.yellowLight, text: th.yellowText },
                    { val: stats.totalReviews, label: 'Reseñas publicadas', iconName: 'star', color: '#fce7f3', text: '#9d174d' },
                  ].map((s, i) => (
                    <div key={i} style={{
                      background: s.color, borderRadius: 16,
                      padding: '18px 16px', border: `1px solid ${th.border}`
                    }}>
                      <div style={{ marginBottom: 6 }}>
                        {s.iconName
                          ? <Icon name={s.iconName} size={28} color={s.text} />
                          : <span style={{ fontSize: 28 }}>{s.emoji}</span>
                        }
                      </div>
                      <p style={{ margin: '0 0 4px', fontSize: 30, fontWeight: 900, color: th.ink }}>
                        {s.val}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: s.text, fontWeight: 600 }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Métricas de negocio */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                    borderRadius: 16, padding: '18px 16px'
                  }}>
                    <p style={{ margin: '0 0 6px', fontSize: 24 }}><Icon name='money' size={16} /></p>
                    <p style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: '#fff' }}>
                      ${stats.totalRevenue.toFixed(2)}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                      Ingresos confirmados
                    </p>
                  </div>
                  <div style={{
                    background: th.surface, borderRadius: 16,
                    border: `1px solid ${th.border}`, padding: '18px 16px'
                  }}>
                    <p style={{ margin: '0 0 6px', fontSize: 24 }}>✅</p>
                    <p style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: th.text }}>
                      {stats.completedRequests}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: th.textSec, fontWeight: 600 }}>
                      Servicios completados
                    </p>
                  </div>
                </div>

                {/* Acciones rápidas */}
                <div style={{
                  background: th.surface, borderRadius: 16,
                  border: `1px solid ${th.border}`, padding: 16, marginBottom: 16
                }}>
                  <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 15, color: th.text }}>
                    ⚡ Acciones rápidas
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Ver técnicos pendientes', tab: 'techs', icon: 'wrench', color: th.verifiedLight, text: th.verifiedText },
                      { label: 'Moderar reseñas', tab: 'reviews', icon: 'star', color: th.yellowLight, text: th.yellowText },
                      { label: 'Gestionar usuarios', tab: 'users', icon: 'user-group', color: th.primaryLight, text: th.primary },
                      { label: 'Verificar certificados', tab: 'certs', icon: 'certificate', color: '#ede9fe', text: '#5b21b6' },
                    ].map(a => (
                      <button key={a.tab} onClick={() => loadTab(a.tab)}
                        style={{
                          padding: '12px', background: a.color, border: `1px solid ${th.border}`,
                          borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit'
                        }}>
                        <div style={{ marginBottom: 6 }}>
                          <Icon name={a.icon} size={22} color={a.text} />
                        </div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: a.text }}>{a.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actividad reciente */}
                <div style={{
                  background: th.surface, borderRadius: 16,
                  border: `1px solid ${th.border}`, padding: 16, marginBottom: 16
                }}>
                  <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 15, color: th.text }}>
                    🕐 Actividad reciente
                  </p>

                  {stats.recentRequests.length === 0 && stats.recentUsers.length === 0 ? (
                    <p style={{ fontSize: 13, color: th.textSec, margin: 0 }}>Sin actividad reciente.</p>
                  ) : (
                    <>
                      {stats.recentUsers.slice(0, 3).map(u => (
                        <div key={'u-' + u.id} style={{
                          display: 'flex', alignItems: 'center',
                          gap: 10, padding: '6px 0', borderBottom: `1px solid ${th.border}`
                        }}>
                          <Icon name={u.role === 'technician' ? 'wrench' : u.role === 'admin' ? 'admin' : 'user'} size={16} color={th.primary} />
                          <p style={{
                            margin: 0, fontSize: 13, color: th.text, flex: 1,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}>
                            <strong>{u.full_name}</strong> se registró
                          </p>
                          <span style={{ fontSize: 11, color: th.textSec, flexShrink: 0 }}>
                            {new Date(u.created_at).toLocaleDateString('es-PA', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      ))}
                      {stats.recentRequests.slice(0, 4).map(r => (
                        <div key={'r-' + r.id} style={{
                          display: 'flex', alignItems: 'center',
                          gap: 10, padding: '6px 0', borderBottom: `1px solid ${th.border}`
                        }}>
                          <Icon name='document' size={16} color={th.primary} />
                          <p style={{
                            margin: 0, fontSize: 13, color: th.text, flex: 1,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}>
                            Nueva solicitud: <strong>{r.title}</strong>
                          </p>
                          <span style={{ fontSize: 11, color: th.textSec, flexShrink: 0 }}>
                            {new Date(r.created_at).toLocaleDateString('es-PA', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ────── USUARIOS ────── */}
            {tab === 'users' && (
              <div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 14
                }}>
                  <p style={{ color: th.textSec, fontSize: 13, margin: 0 }}>
                    {filterBySearch(users, ['full_name', 'email', 'role']).length} usuarios
                  </p>
                  <button onClick={() => admin.exportToCSV(
                    filterBySearch(users, ['full_name', 'email', 'role']),
                    [
                      { key: 'full_name', label: 'Nombre' },
                      { key: 'email', label: 'Email' },
                      { key: 'role', label: 'Rol' },
                      { key: 'account_status', label: 'Estado' },
                      { key: 'created_at', label: 'Fecha de registro' },
                    ],
                    `usuarios_panama_${new Date().toISOString().slice(0, 10)}.csv`
                  )} style={{
                    background: th.surface2, border: `1px solid ${th.border}`,
                    borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 600,
                    color: th.text, cursor: 'pointer', fontFamily: 'inherit'
                  }}>
                    ⬇️ Exportar CSV
                  </button>
                </div>
                {filterBySearch(users, ['full_name', 'email', 'role']).map(u => (
                  <div key={u.id} style={{
                    background: th.surface, borderRadius: 14,
                    padding: '14px 16px', marginBottom: 10, border: `1px solid ${th.border}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <Avatar photo={u.avatar_url} name={u.full_name} size={46} />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14, color: th.text }}>
                          {u.full_name || 'Sin nombre'}
                        </p>
                        <p style={{ margin: '0 0 4px', fontSize: 12, color: th.textSec }}>{u.email}</p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px',
                            borderRadius: 20, background: u.role === 'admin' ? th.yellowLight :
                              u.role === 'technician' ? th.verifiedLight : th.primaryLight,
                            color: u.role === 'admin' ? th.yellowText :
                              u.role === 'technician' ? th.verifiedText : th.primary
                          }}>
                            {u.role === 'admin' ? '🔧 Admin' :
                              u.role === 'technician' ? '🛠️ Técnico' : '👤 Cliente'}
                          </span>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px',
                            borderRadius: 20,
                            background: u.account_status === 'active' ? th.verifiedLight : '#fee2e2',
                            color: u.account_status === 'active' ? th.verifiedText : '#991b1b'
                          }}>
                            {u.account_status === 'active' ? '● Activo' : '● Suspendido'}
                          </span>
                          <span style={{ fontSize: 11, color: th.textSec }}>
                            {new Date(u.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Botones de acción */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {u.account_status === 'active' && u.role !== 'admin' && (
                        <button onClick={async () => {
                          if (!window.confirm(`¿Suspender a ${u.full_name}?`)) return
                          try {
                            await admin.suspendUser(u.id)
                            setUsers(prev => prev.map(x => x.id === u.id
                              ? { ...x, account_status: 'suspended' } : x))
                            showToast(`${u.full_name} suspendido.`)
                          } catch (err) { showToast(err.message, 'error') }
                        }} style={{
                          flex: 1, minWidth: 100, padding: '8px', background: '#fee2e2',
                          color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 10,
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                          🚫 Suspender
                        </button>
                      )}
                      {u.account_status === 'suspended' && (
                        <button onClick={async () => {
                          try {
                            const { error } = await supabase.from('profiles')
                              .update({ account_status: 'active' }).eq('id', u.id)
                            if (error) throw error
                            setUsers(prev => prev.map(x => x.id === u.id
                              ? { ...x, account_status: 'active' } : x))
                            showToast(`${u.full_name} reactivado.`)
                          } catch (err) { showToast(err.message, 'error') }
                        }} style={{
                          flex: 1, minWidth: 100, padding: '8px', background: th.verifiedLight,
                          color: th.verifiedText, border: '1px solid #bbf7d0', borderRadius: 10,
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                          ✅ Reactivar
                        </button>
                      )}
                      {u.role === 'user' && (
                        <button onClick={async () => {
                          if (!window.confirm(`¿Cambiar rol de ${u.full_name} a técnico?`)) return
                          try {
                            const { error } = await supabase.from('profiles')
                              .update({ role: 'technician' }).eq('id', u.id)
                            if (error) throw error
                            setUsers(prev => prev.map(x => x.id === u.id
                              ? { ...x, role: 'technician' } : x))
                            showToast('Rol cambiado a técnico.')
                          } catch (err) { showToast(err.message, 'error') }
                        }} style={{
                          flex: 1, minWidth: 120, padding: '8px', background: '#f0fdf4',
                          color: th.verifiedText, border: '1px solid #bbf7d0', borderRadius: 10,
                          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                          🛠️ Hacer técnico
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ────── TÉCNICOS ────── */}
            {tab === 'techs' && (
              <div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 14
                }}>
                  <p style={{ color: th.textSec, fontSize: 13, margin: 0 }}>
                    {filterBySearch(techs, ['full_name', 'professional_title', 'city']).length} técnicos
                  </p>
                  <button onClick={() => admin.exportToCSV(
                    filterBySearch(techs, ['full_name', 'professional_title', 'city']),
                    [
                      { key: 'full_name', label: 'Nombre' },
                      { key: 'professional_title', label: 'Título profesional' },
                      { key: 'city', label: 'Ciudad' },
                      { key: 'average_rating', label: 'Calificación' },
                      { key: 'total_jobs', label: 'Trabajos completados' },
                      { key: 'verification_status', label: 'Verificación' },
                      { key: 'is_featured', label: 'Destacado' },
                      { key: 'public_phone', label: 'Teléfono' },
                    ],
                    `tecnicos_panama_${new Date().toISOString().slice(0, 10)}.csv`
                  )} style={{
                    background: th.surface2, border: `1px solid ${th.border}`,
                    borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 600,
                    color: th.text, cursor: 'pointer', fontFamily: 'inherit'
                  }}>
                    ⬇️ Exportar CSV
                  </button>
                </div>
                {filterBySearch(techs, ['full_name', 'professional_title', 'city']).map(tech => (
                  <div key={tech.user_id} style={{
                    background: th.surface, borderRadius: 14,
                    padding: '14px 16px', marginBottom: 12, border: `1px solid ${th.border}`
                  }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      <Avatar photo={tech.avatar_url} name={tech.full_name} size={52} online={tech.is_available} />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15, color: th.text }}>
                          {tech.full_name}
                        </p>
                        <p style={{ margin: '0 0 4px', fontSize: 12, color: th.textSec }}>
                          {tech.professional_title || 'Sin título'}
                        </p>
                        <p style={{ margin: '0 0 6px', fontSize: 11, color: th.textSec }}>
                          📍 {tech.city || 'Panamá'} · ⭐ {Number(tech.average_rating).toFixed(1)}
                          ({tech.total_reviews} reseñas) · {tech.total_jobs} trabajos
                        </p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {/* Estado de verificación */}
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8px',
                            borderRadius: 20,
                            background: tech.verification_status === 'verified' ? th.verifiedLight :
                              tech.verification_status === 'rejected' ? '#fee2e2' : th.yellowLight,
                            color: tech.verification_status === 'verified' ? th.verifiedText :
                              tech.verification_status === 'rejected' ? '#991b1b' : th.yellowText
                          }}>
                            {tech.verification_status === 'verified' ? '✓ Verificado' :
                              tech.verification_status === 'rejected' ? '✗ Rechazado' : '⏳ Pendiente'}
                          </span>
                          {tech.is_featured && (
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 8px',
                              borderRadius: 20, background: th.yellowLight, color: th.yellowText
                            }}>
                              ⭐ Destacado
                            </span>
                          )}
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 20,
                            background: tech.is_available ? th.verifiedLight : th.surface2,
                            color: tech.is_available ? th.verifiedText : th.textSec
                          }}>
                            {tech.is_available ? '● Disponible' : '○ No disponible'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Botones */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {tech.verification_status !== 'verified' && (
                        <button onClick={async () => {
                          try {
                            await admin.verifyTechnician(tech.user_id)
                            setTechs(prev => prev.map(x => x.user_id === tech.user_id
                              ? { ...x, verification_status: 'verified' } : x))
                            showToast(`${tech.full_name} verificado. ✓`)
                          } catch (err) { showToast(err.message, 'error') }
                        }} style={{
                          padding: '9px', background: th.verifiedLight, color: th.verifiedText,
                          border: '1px solid #bbf7d0', borderRadius: 10, fontSize: 13,
                          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                          ✓ Verificar
                        </button>
                      )}
                      {tech.verification_status === 'verified' && (
                        <button onClick={async () => {
                          if (!window.confirm(`¿Quitar verificación de ${tech.full_name}?`)) return
                          try {
                            const { error } = await supabase.from('technician_profiles')
                              .update({ verification_status: 'pending' }).eq('user_id', tech.user_id)
                            if (error) throw error
                            setTechs(prev => prev.map(x => x.user_id === tech.user_id
                              ? { ...x, verification_status: 'pending' } : x))
                            showToast('Verificación removida.')
                          } catch (err) { showToast(err.message, 'error') }
                        }} style={{
                          padding: '9px', background: th.yellowLight, color: th.yellowText,
                          border: '1px solid #fde68a', borderRadius: 10, fontSize: 12,
                          fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                          ↩ Quitar verif.
                        </button>
                      )}
                      <button onClick={async () => {
                        const newFeatured = !tech.is_featured
                        try {
                          await admin.featureTechnician(tech.user_id, newFeatured)
                          // Actualizar lista local inmediatamente
                          setTechs(prev => prev.map(x => x.user_id === tech.user_id
                            ? { ...x, is_featured: newFeatured } : x))
                          showToast(newFeatured
                            ? `⭐ ${tech.full_name} ahora aparece en Técnicos Destacados`
                            : `${tech.full_name} quitado de destacados`)
                        } catch (err) {
                          showToast('Error al guardar: ' + (err?.message ?? 'intenta de nuevo'), 'error')
                          // Recargar para mostrar estado real
                          admin.listAllTechnicians().then(setTechs).catch(() => { })
                        }
                      }} style={{
                        padding: '9px', background: tech.is_featured ? th.surface2 : th.yellowLight,
                        color: tech.is_featured ? th.textSec : th.yellowText,
                        border: `1px solid ${tech.is_featured ? th.border : th.brass}`,
                        borderRadius: 10, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit'
                      }}>
                        {tech.is_featured ? '★ Quitar destacado' : '⭐ Destacar'}
                      </button>
                      <button onClick={async () => {
                        if (!window.confirm(`¿Rechazar verificación de ${tech.full_name}?`)) return
                        try {
                          const { error } = await supabase.from('technician_profiles')
                            .update({ verification_status: 'rejected' }).eq('user_id', tech.user_id)
                          if (error) throw error
                          setTechs(prev => prev.map(x => x.user_id === tech.user_id
                            ? { ...x, verification_status: 'rejected' } : x))
                          showToast('Verificación rechazada.')
                        } catch (err) { showToast(err.message, 'error') }
                      }} style={{
                        padding: '9px', background: '#fee2e2', color: '#991b1b',
                        border: '1px solid #fca5a5', borderRadius: 10, fontSize: 12,
                        fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                      }}>
                        ✗ Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ────── RESEÑAS ────── */}
            {tab === 'reviews' && (
              <div>
                {revs.length === 0 ? (
                  <EmptyState emoji="⭐" title="Sin reseñas pendientes"
                    sub="Todas las reseñas han sido moderadas." />
                ) : (
                  <>
                    <p style={{ color: th.textSec, fontSize: 13, margin: '0 0 14px' }}>
                      {revs.length} reseña{revs.length !== 1 ? 's' : ''} pendiente{revs.length !== 1 ? 's' : ''}
                    </p>
                    {revs.map(r => (
                      <div key={r.id} style={{
                        background: th.surface, borderRadius: 14,
                        padding: 16, marginBottom: 12, border: `1px solid ${th.border}`
                      }}>
                        {/* Partes */}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'flex-start', marginBottom: 10
                        }}>
                          <div>
                            <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 13, color: th.text }}>
                              👤 {r.reviewer?.full_name || 'Usuario'}
                            </p>
                            <p style={{ margin: '0 0 6px', fontSize: 12, color: th.textSec }}>
                              → 🛠️ {r.technician?.full_name || 'Técnico'}
                            </p>
                            <StarRating rating={r.rating} size={16} />
                          </div>
                          <span style={{ fontSize: 11, color: th.textSec }}>
                            {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {/* Comentario */}
                        {r.comment && (
                          <div style={{
                            background: th.surface2, borderRadius: 10,
                            padding: '10px 12px', marginBottom: 12, border: `1px solid ${th.border}`
                          }}>
                            <p style={{
                              margin: 0, fontSize: 13, color: th.text,
                              fontStyle: 'italic', lineHeight: 1.6
                            }}>
                              "{r.comment}"
                            </p>
                          </div>
                        )}
                        {/* Botones */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={async () => {
                            try {
                              await admin.approveReview(r.id)
                              setRevs(prev => prev.filter(x => x.id !== r.id))
                              showToast('Reseña aprobada y publicada.')
                            } catch (err) { showToast(err.message, 'error') }
                          }} style={{
                            flex: 1, padding: '10px', background: th.verifiedLight,
                            color: th.verifiedText, border: '1px solid #bbf7d0', borderRadius: 10,
                            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                          }}>
                            ✅ Aprobar
                          </button>
                          <button onClick={async () => {
                            try {
                              await admin.rejectReview(r.id)
                              setRevs(prev => prev.filter(x => x.id !== r.id))
                              showToast('Reseña rechazada.')
                            } catch (err) { showToast(err.message, 'error') }
                          }} style={{
                            flex: 1, padding: '10px', background: '#fee2e2',
                            color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 10,
                            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                          }}>
                            ✗ Rechazar
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ────── CERTIFICADOS ────── */}
            {tab === 'certs' && (
              <div>
                {certs.length === 0 ? (
                  <EmptyState emoji="📜" title="Sin certificados pendientes"
                    sub="Todos los documentos han sido revisados." />
                ) : (
                  <>
                    <p style={{ color: th.textSec, fontSize: 13, margin: '0 0 14px' }}>
                      {certs.length} documento{certs.length !== 1 ? 's' : ''} pendiente{certs.length !== 1 ? 's' : ''} de verificación
                    </p>
                    {certs.map(cert => {
                      const techName = cert.tech?.profiles?.full_name
                        || cert.tech?.full_name || 'Técnico'
                      const techAvatar = cert.tech?.profiles?.avatar_url || null
                      const TYPE_ICONS = {
                        certificate: '📜', title: '🎓',
                        license: '🪪', course: '📚', other: '📄'
                      }
                      return (
                        <div key={cert.id} style={{
                          background: th.surface, borderRadius: 14,
                          padding: 16, marginBottom: 12, border: `1px solid ${th.border}`
                        }}>
                          {/* Técnico */}
                          <div style={{
                            display: 'flex', alignItems: 'center',
                            gap: 10, marginBottom: 12
                          }}>
                            <Avatar photo={techAvatar} name={techName} size={40} />
                            <div>
                              <p style={{
                                margin: '0 0 2px', fontWeight: 700,
                                fontSize: 14, color: th.text
                              }}>{techName}</p>
                              <p style={{ margin: 0, fontSize: 11, color: th.textSec }}>🛠️ Técnico</p>
                            </div>
                          </div>
                          {/* Documento */}
                          <div style={{
                            background: th.surface2, borderRadius: 12,
                            padding: '12px 14px', marginBottom: 12,
                            border: `1px solid ${th.border}`
                          }}>
                            <div style={{
                              display: 'flex', alignItems: 'center',
                              gap: 10, marginBottom: 6
                            }}>
                              <span style={{ fontSize: 24 }}>
                                {TYPE_ICONS[cert.file_type] || '📄'}
                              </span>
                              <div>
                                <p style={{
                                  margin: '0 0 2px', fontWeight: 700,
                                  fontSize: 14, color: th.text
                                }}>{cert.name}</p>
                                {cert.issuer && (
                                  <p style={{ margin: 0, fontSize: 12, color: th.textSec }}>
                                    🏛️ {cert.issuer}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div style={{
                              display: 'flex', gap: 12, fontSize: 12,
                              color: th.textSec
                            }}>
                              {cert.issued_at && (
                                <span>📅 Emitido: {new Date(cert.issued_at + 'T00:00:00')
                                  .toLocaleDateString('es-PA', { year: 'numeric', month: 'short' })}</span>
                              )}
                              {cert.expires_at && (
                                <span>📆 Vence: {new Date(cert.expires_at + 'T00:00:00')
                                  .toLocaleDateString('es-PA', { year: 'numeric', month: 'short' })}</span>
                              )}
                            </div>
                            {cert.description && (
                              <p style={{
                                margin: '6px 0 0', fontSize: 12,
                                color: th.textSec
                              }}>{cert.description}</p>
                            )}
                          </div>
                          {/* Botones */}
                          <div style={{ display: 'flex', gap: 8 }}>
                            {cert.file_url && (
                              <button onClick={() => window.open(cert.file_url, '_blank')}
                                style={{
                                  flex: 1, padding: '10px', background: '#eff6ff',
                                  color: th.primary, border: '1px solid #bfdbfe',
                                  borderRadius: 10, fontSize: 13, fontWeight: 600,
                                  cursor: 'pointer', fontFamily: 'inherit'
                                }}>
                                👁️ Ver documento
                              </button>
                            )}
                            <button onClick={async () => {
                              try {
                                await certificatesApi.verify(cert.id)
                                // Notificar al técnico
                                await supabase.from('notifications').insert({
                                  user_id: cert.technician_id,
                                  type: 'system',
                                  title: '✓ Certificado verificado',
                                  body: `Tu documento "${cert.name}" fue verificado por el equipo de TECNIFIX.`,
                                  data: JSON.stringify({ cert_id: cert.id }),
                                })
                                setCerts(prev => prev.filter(c => c.id !== cert.id))
                                showToast(`✅ "${cert.name}" verificado correctamente.`)
                              } catch (err) { showToast(err.message, 'error') }
                            }} style={{
                              flex: 1, padding: '10px', background: th.verifiedLight,
                              color: th.verifiedText, border: '1px solid #bbf7d0', borderRadius: 10,
                              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                            }}>
                              ✓ Verificar
                            </button>
                            <button onClick={async () => {
                              if (!window.confirm(`¿Rechazar "${cert.name}"?`)) return
                              try {
                                const { error } = await supabase.from('certificates')
                                  .delete().eq('id', cert.id)
                                if (error) throw error
                                setCerts(prev => prev.filter(c => c.id !== cert.id))
                                showToast('Documento rechazado y eliminado.')
                              } catch (err) { showToast(err.message, 'error') }
                            }} style={{
                              padding: '10px 14px', background: '#fee2e2',
                              color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 10,
                              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                            }}>
                              ✗
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )}

            {/* ────── DISPUTAS ────── */}
            {tab === 'disputes' && (
              <div>
                {disputes.length === 0 ? (
                  <EmptyState emoji="⚠️" title="Sin disputas"
                    sub="No hay disputas abiertas en este momento." />
                ) : (
                  <>
                    <p style={{ color: th.textSec, fontSize: 13, margin: '0 0 14px' }}>
                      {disputes.length} disputa{disputes.length !== 1 ? 's' : ''}
                    </p>
                    {disputes.map(d => {
                      const isResolving = resolvingId === d.id
                      const STATUS_INFO = {
                        open: { label: '🔴 Abierta', bg: '#fee2e2', text: '#991b1b' },
                        under_review: { label: '🟡 En revisión', bg: th.yellowLight, text: th.yellowText },
                        resolved_client: { label: '✅ A favor del cliente', bg: th.primaryLight, text: th.primary },
                        resolved_tech: { label: '✅ A favor del técnico', bg: th.verifiedLight, text: th.verifiedText },
                        closed: { label: '🔒 Cerrada', bg: th.surface2, text: '#475569' },
                      }
                      const si = STATUS_INFO[d.status] ?? STATUS_INFO.open
                      const isFinal = ['resolved_client', 'resolved_tech', 'closed'].includes(d.status)

                      const handleResolve = async (resolution) => {
                        const labels = {
                          resolved_client: 'a favor del CLIENTE',
                          resolved_tech: 'a favor del TÉCNICO',
                          closed: 'cerrando sin responsabilidad',
                        }
                        if (!window.confirm(`¿Resolver esta disputa ${labels[resolution]}?\n\nEsto actualizará el estado de la solicitud y notificará a ambas partes.`)) return
                        setResolvingId(d.id)
                        try {
                          await disputeActions.resolve(d.id, d.service_request_id, resolution, d.resolution_notes, user.id)
                          setDisputes(prev => prev.map(x => x.id === d.id
                            ? { ...x, status: resolution, resolved_at: new Date().toISOString() } : x))
                          showToast('Disputa resuelta correctamente')
                        } catch (err) {
                          showToast(err?.message ?? 'Error al resolver', 'error')
                        } finally { setResolvingId(null) }
                      }

                      const handleUnderReview = async () => {
                        setResolvingId(d.id)
                        try {
                          await disputeActions.markUnderReview(d.id, user.id)
                          setDisputes(prev => prev.map(x => x.id === d.id
                            ? { ...x, status: 'under_review' } : x))
                          showToast('Marcada como en revisión')
                        } catch (err) {
                          showToast(err?.message ?? 'Error', 'error')
                        } finally { setResolvingId(null) }
                      }

                      const handleDismiss = async () => {
                        if (!window.confirm('¿Eliminar esta disputa? La solicitud volverá a estado "Completada" y se notificará a ambas partes.')) return
                        setResolvingId(d.id)
                        try {
                          await disputeActions.dismiss(d.id, d.service_request_id)
                          setDisputes(prev => prev.filter(x => x.id !== d.id))
                          showToast('Disputa eliminada')
                        } catch (err) {
                          showToast(err?.message ?? 'Error al eliminar', 'error')
                        } finally { setResolvingId(null) }
                      }

                      return (
                        <div key={d.id} style={{
                          background: th.surface, borderRadius: 14,
                          padding: 16, marginBottom: 12, border: `1px solid ${th.border}`,
                          opacity: isResolving ? 0.6 : 1, transition: 'opacity 0.2s'
                        }}>

                          {/* Header: estado + fecha */}
                          <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', marginBottom: 10
                          }}>
                            <span style={{
                              fontSize: 12, fontWeight: 700, padding: '3px 10px',
                              borderRadius: 20, background: si.bg, color: si.text
                            }}>
                              {si.label}
                            </span>
                            <span style={{ fontSize: 11, color: th.textSec }}>
                              {new Date(d.created_at).toLocaleDateString('es-PA', {
                                day: '2-digit', month: 'short', year: 'numeric'
                              })}
                            </span>
                          </div>

                          {/* Servicio relacionado */}
                          <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 14, color: th.text }}>
                            {d.request?.title ?? 'Solicitud eliminada'}
                          </p>
                          {d.request?.agreed_price && (
                            <p style={{ margin: '0 0 8px', fontSize: 12, color: th.textSec }}>
                              💲 Monto acordado: ${Number(d.request.agreed_price).toFixed(2)} ·{' '}
                              {d.request.payment_status === 'paid' ? '✓ Pagado' : 'Sin pagar'}
                            </p>
                          )}

                          {/* Partes involucradas */}
                          <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Avatar photo={d.client?.avatar_url} name={d.client?.full_name} size={28} />
                              <div>
                                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: th.text }}>
                                  {d.client?.full_name ?? 'Cliente'}
                                </p>
                                <p style={{ margin: 0, fontSize: 10, color: th.textSec }}>Cliente</p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Avatar photo={d.technician?.avatar_url} name={d.technician?.full_name} size={28} />
                              <div>
                                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: th.text }}>
                                  {d.technician?.full_name ?? 'Técnico'}
                                </p>
                                <p style={{ margin: 0, fontSize: 10, color: th.textSec }}>Técnico</p>
                              </div>
                            </div>
                          </div>

                          {/* Quién abrió la disputa */}
                          <p style={{ margin: '0 0 6px', fontSize: 12, color: th.textSec }}>
                            🚩 Abierta por: <strong style={{ color: th.text }}>{d.opener?.full_name ?? '—'}</strong>
                          </p>

                          {/* Motivo y descripción */}
                          <div style={{
                            background: th.surface2, borderRadius: 10,
                            padding: '10px 12px', marginBottom: 10, border: `1px solid ${th.border}`
                          }}>
                            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: th.text }}>
                              Motivo: {d.reason}
                            </p>
                            {d.description && (
                              <p style={{
                                margin: 0, fontSize: 12, color: th.textSec,
                                lineHeight: 1.5, fontStyle: 'italic'
                              }}>
                                "{d.description}"
                              </p>
                            )}
                          </div>

                          {/* Notas de resolución (si ya fue resuelta) */}
                          {isFinal && d.resolution_notes && (
                            <div style={{
                              background: '#f0fdf4', borderRadius: 10,
                              padding: '10px 12px', marginBottom: 10, border: '1px solid #bbf7d0'
                            }}>
                              <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, color: th.verifiedText }}>
                                Notas de resolución:
                              </p>
                              <p style={{ margin: 0, fontSize: 12, color: th.verifiedText }}>
                                {d.resolution_notes}
                              </p>
                            </div>
                          )}

                          {isFinal && (
                            <p style={{ margin: '0 0 10px', fontSize: 11, color: th.textSec }}>
                              Resuelta el {new Date(d.resolved_at).toLocaleDateString('es-PA')}
                            </p>
                          )}

                          {/* Botones de acción — solo si no está resuelta */}
                          {!isFinal && (
                            <>
                              {d.status === 'open' && (
                                <button onClick={handleUnderReview} disabled={isResolving}
                                  style={{
                                    width: '100%', padding: '9px', marginBottom: 8,
                                    background: th.yellowLight, color: th.yellowText,
                                    border: '1px solid #fde68a', borderRadius: 10,
                                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                    fontFamily: 'inherit'
                                  }}>
                                  🔍 Marcar como en revisión
                                </button>
                              )}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                <button onClick={() => handleResolve('resolved_client')} disabled={isResolving}
                                  style={{
                                    padding: '9px', background: th.primaryLight, color: th.primary,
                                    border: '1px solid #bfdbfe', borderRadius: 10, fontSize: 12,
                                    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                                  }}>
                                  👤 A favor del cliente
                                </button>
                                <button onClick={() => handleResolve('resolved_tech')} disabled={isResolving}
                                  style={{
                                    padding: '9px', background: th.verifiedLight, color: th.verifiedText,
                                    border: '1px solid #bbf7d0', borderRadius: 10, fontSize: 12,
                                    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                                  }}>
                                  🛠️ A favor del técnico
                                </button>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <button onClick={() => handleResolve('closed')} disabled={isResolving}
                                  style={{
                                    padding: '9px', background: th.surface2, color: th.textSec,
                                    border: `1px solid ${th.border}`, borderRadius: 10, fontSize: 12,
                                    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                                  }}>
                                  🔒 Cerrar sin culpa
                                </button>
                                <button onClick={handleDismiss} disabled={isResolving}
                                  style={{
                                    padding: '9px', background: '#fee2e2', color: '#991b1b',
                                    border: '1px solid #fca5a5', borderRadius: 10, fontSize: 12,
                                    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                                  }}>
                                  🗑️ Eliminar (inválida)
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}