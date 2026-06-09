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
import { receiptActions } from '../lib/payments.js'

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
      <div style={{ fontSize: 72, marginBottom: 16 }}>👤</div>
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
  const roleIcon = user.role === 'admin' ? '🔧' : user.role === 'technician' ? '🛠️' : '👤'

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', padding: '28px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar photo={user.avatar_url} name={user.full_name} size={72} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 3px', fontWeight: 800, fontSize: 18, color: '#fff' }}>{user.full_name}</p>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{user.email}</p>
            <Badge color="rgba(255,255,255,0.25)" textColor="#fff">{roleIcon} {roleLabel}</Badge>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('notifications')} style={{ position: 'relative', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 20, width: 38, height: 38, fontSize: 20, cursor: 'pointer' }}>
              🔔
              {unreadCount > 0 && <div style={{ position: 'absolute', top: 4, right: 4, width: 14, height: 14, background: '#ef4444', borderRadius: 7, fontSize: 9, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{unreadCount > 9 ? '9+' : unreadCount}</div>}
            </button>
            <button onClick={() => navigate('settings')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 20, width: 38, height: 38, fontSize: 20, cursor: 'pointer' }}>⚙️</button>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Acciones rápidas */}
        <div style={{ background: th.surface, borderRadius: 16, border: `1px solid ${th.border}`, marginBottom: 14, overflow: 'hidden' }}>
          {[
            { icon: '✏️', label: t.editProfile, screen: 'edit-profile' },
            { icon: '🧾', label: 'Mis recibos', screen: 'my-receipts' },
            ...(user.role === 'technician' ? [
              { icon: '🛠️', label: t.editProfProfile, screen: 'edit-tech-profile' },
              { icon: '💰', label: 'Catálogo de servicios', screen: 'service-catalog' },
              { icon: '📜', label: 'Mis certificados y títulos', screen: 'certificates' },
            ] : []),
            ...(user.role === 'admin' ? [{ icon: '🔧', label: t.adminPanel, screen: 'admin' }] : []),
          ].map(item => (
            <button key={item.screen} onClick={() => navigate(item.screen)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'none', border: 'none', borderBottom: `1px solid ${th.border}`, cursor: 'pointer', fontSize: 14, color: th.text, fontFamily: 'inherit' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>{item.label}
              </span>
              <span style={{ color: th.textSec }}>›</span>
            </button>
          ))}
        </div>

        {/* Solicitudes — 3 tabs */}
        <RequestsTabs user={user} th={th} t={t} navigate={navigate} setSelectedRequest={setSelectedRequest} />

        <Btn variant="danger" onClick={handleLogout}>{t.logout}</Btn>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
export function LoginScreen() {
  const { th, navigate, refreshUser, lang } = useApp()
  const t = T[lang]
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

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
      <div style={{ padding: '52px 24px 32px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 14px' }}>🔧</div>
        <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 900, color: '#22c55e' }}>{t.appName}</h1>
        <p style={{ margin: 0, fontSize: 14, color: th.textSec }}>{t.appSlogan}</p>
      </div>

      <div style={{ flex: 1, padding: '0 24px 40px' }}>
        <div style={{ background: th.surface, borderRadius: 20, padding: 24, border: `1px solid ${th.border}`, boxShadow: th.shadow }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 800, color: th.text }}>
            {resetMode ? t.forgotPassword : t.loginTitle}
          </h2>

          {resetSent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
              <p style={{ fontSize: 14, color: th.textSec }}>{t.resetSent}</p>
              <Btn variant="ghost" onClick={() => { setResetMode(false); setResetSent(false) }} style={{ marginTop: 16 }}>Volver al login</Btn>
            </div>
          ) : (
            <>
              <Input label={t.email} value={email} onChange={setEmail} placeholder="tu@email.com" type="email" icon="📧" />
              {!resetMode && (
                <div style={{ marginBottom: 4 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: th.text, marginBottom: 6 }}>{t.password}</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                      placeholder="••••••••"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '12px 44px 12px 14px', borderRadius: 12, border: `1.5px solid ${th.inputBorder}`, fontSize: 14, outline: 'none', background: th.inputBg, color: th.text, fontFamily: 'inherit' }}
                    />
                    <button onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              )}

              {error && <p style={{ color: th.red, fontSize: 13, margin: '8px 0 0', textAlign: 'center', background: '#fef2f2', padding: '8px', borderRadius: 8 }}>{error}</p>}
              <div style={{ height: 16 }} />

              {resetMode
                ? <Btn onClick={handleReset} loading={loading}>Enviar email de recuperación</Btn>
                : <Btn onClick={handleLogin} loading={loading}>{t.enter}</Btn>
              }

              <button onClick={() => { setResetMode(v => !v); setError('') }} style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: 14, background: 'none', border: 'none', color: th.primary, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                {resetMode ? '← Volver al login' : t.forgotPassword}
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: th.textSec, marginTop: 20 }}>
          {t.noAccount}{' '}
          <button onClick={() => navigate('register')} style={{ background: 'none', border: 'none', color: th.primary, fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
            {t.signUp}
          </button>
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────
export function RegisterScreen() {
  const { th, navigate, refreshUser, lang } = useApp()
  const t = T[lang]
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', role: 'user' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

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
    setLoading(true)
    try {
      await auth.signUp({ email: form.email.trim(), password: form.password, fullName: form.name.trim(), role: form.role })
      setSuccess(true)
    } catch (err) {
      setErrors({ email: err.message || 'Error al registrarse.' })
    } finally {
      setLoading(false)
    }
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
      <button onClick={() => navigate('login')} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: th.text, marginBottom: 16 }}>←</button>
      <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900, color: th.text }}>{t.registerTitle}</h2>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: th.textSec }}>¿Eres cliente o técnico?</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        {[{ v: 'user', label: `👤 ${t.iAmClient}`, desc: t.lookingTechs }, { v: 'technician', label: `🛠️ ${t.iAmTech}`, desc: t.offerServices }].map(r => (
          <button key={r.v} onClick={() => setForm(f => ({ ...f, role: r.v }))}
            style={{ flex: 1, padding: '14px 10px', borderRadius: 16, border: `2.5px solid ${form.role === r.v ? th.primary : th.border}`, background: form.role === r.v ? th.primaryLight : 'transparent', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit' }}>
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14, color: th.text }}>{r.label}</p>
            <p style={{ margin: 0, fontSize: 12, color: th.textSec }}>{r.desc}</p>
          </button>
        ))}
      </div>

      <Input label={t.fullName} placeholder="Juan Pérez"        {...F('name')} />
      <Input label={t.email} placeholder="tu@email.com" type="email"    {...F('email')} />
      <Input label={t.phone} placeholder="+507 6000-0000"     {...F('phone')} />
      <Input label={t.password} placeholder="Mínimo 6 caracteres" type="password" {...F('password')} />
      <Input label={t.confirmPassword} placeholder="Repite tu contraseña" type="password" {...F('confirm')} />

      <div style={{ height: 8 }} />
      <Btn onClick={handleRegister} loading={loading}>{t.create}</Btn>
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
            <p style={{ margin: 0, fontSize: 12, color: th.textSec }}>📧 Email: <strong style={{ color: th.text }}>{user?.email}</strong></p>
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
    address_text: '', city: 'Changuinola', province: 'Bocas del Toro',
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
          city: tp.city || 'Changuinola',
          province: tp.province || 'Bocas del Toro',
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
              { id: 1, slug: 'climatizacion', icon: '❄️', nameEs: 'Climatización', nameEn: 'A/C & Cooling', color: '#dbeafe' },
              { id: 2, slug: 'electricidad', icon: '⚡', nameEs: 'Electricidad', nameEn: 'Electrical', color: '#fef9c3' },
              { id: 3, slug: 'plomeria', icon: '🔧', nameEs: 'Plomería', nameEn: 'Plumbing', color: '#e0f2fe' },
              { id: 4, slug: 'albanileria', icon: '🧱', nameEs: 'Albañilería', nameEn: 'Masonry', color: '#fef3c7' },
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
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? th.primaryText : '#334155', textAlign: 'left', lineHeight: 1.2 }}>
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

        {/* Ubicación y zona */}
        <div style={sectionStyle}>
          <p style={sectionTitle}>📍 Ubicación y zona</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label={t.city} placeholder="Changuinola"    {...field('city')} />
            <Input label={t.province} placeholder="Bocas del Toro" {...field('province')} />
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
        </div>

        {/* Acerca de */}
        <div style={ss}>
          <p style={sh}>{t.about}</p>
          <SettingsRow label={t.version} right={<span style={{ fontSize: 13, color: th.textSec }}>2.0.0</span>} />
          <SettingsRow label={t.terms} onClick={() => window.open('https://changuinolapro.com/terms')} right={<span style={{ color: th.primary, fontSize: 13 }}>›</span>} />
          <SettingsRow label={t.privacyPolicy} onClick={() => window.open('https://changuinolapro.com/privacy')} right={<span style={{ color: th.primary, fontSize: 13 }}>›</span>} />
          <SettingsRow label={t.contactSupport} onClick={() => window.open('mailto:soporte@changuinolapro.com')} right={<span style={{ color: th.primary, fontSize: 13 }}>›</span>} />
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
    new_request: '#dbeafe', request_accepted: '#dcfce7', review: '#fef9c3',
    contract: '#ede9fe', payment: '#d1fae5', system: '#f1f5f9', dispute: '#fff7ed',
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
            const iconBg = n.is_read ? th.surface2 : (TYPE_COLOR[n.type] ?? '#f1f5f9')
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

  const downloadReceipt = async (requestId) => {
    try {
      const { data: receipt } = await supabase
        .from('receipts').select('*').eq('service_request_id', requestId).single()
      if (receipt) {
        await receiptActions.downloadPDF(receipt)
        showToast('Recibo descargado')
      } else {
        showToast('No hay recibo generado aún.', 'error')
      }
    } catch { showToast('Error al descargar', 'error') }
  }

  const STATUS_COLORS = {
    pending: { bg: '#fef3c7', text: '#92400e' },
    accepted: { bg: '#dbeafe', text: '#1e40af' },
    in_progress: { bg: '#ede9fe', text: '#5b21b6' },
    pending_payment: { bg: '#fce7f3', text: '#9d174d' },
    completed: { bg: '#dcfce7', text: '#166534' },
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
          padding: '8px 16px', background: '#fef9c3',
          borderBottom: `1px solid #fde68a`
        }}>
          <p style={{ margin: 0, fontSize: 11, color: '#92400e' }}>
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
          const sc = STATUS_COLORS[r.status] ?? { bg: '#f1f5f9', text: '#64748b' }
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
                    background: r.payment_status === 'paid' ? '#dcfce7' : '#f1f5f9',
                    color: r.payment_status === 'paid' ? '#166534' : '#64748b',
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
                  <button onClick={() => downloadReceipt(r.id)}
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
                  <button onClick={() => downloadReceipt(r.id)}
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
        setUsers(u)
      } else if (newTab === 'techs') {
        const tc = await admin.listAllTechnicians()
        setTechs(tc)
      } else if (newTab === 'reviews') {
        const rv = await admin.listPendingReviews()
        setRevs(rv)
      } else if (newTab === 'certs') {
        const { data } = await supabase
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
        setCerts(data ?? [])
      }
    } catch (err) {
      showToast('Error al cargar datos: ' + (err?.message ?? ''), 'error')
    } finally {
      setTabLoad(false)
      setLoading(false)
    }
  }

  if (user?.role !== 'admin') return null

  const TABS = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'users', icon: '👥', label: 'Usuarios' },
    { id: 'techs', icon: '🛠️', label: 'Técnicos' },
    { id: 'reviews', icon: '⭐', label: 'Reseñas' },
    { id: 'certs', icon: '📜', label: 'Certificados' },
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
              fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5
            }}>
            {tb.icon} {tb.label}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {[
                    { val: stats.totalUsers, label: 'Usuarios registrados', icon: '👥', color: '#dbeafe', text: '#1e40af' },
                    { val: stats.totalTechs, label: 'Técnicos activos', icon: '🛠️', color: '#dcfce7', text: '#166534' },
                    { val: stats.totalRequests, label: 'Solicitudes totales', icon: '📋', color: '#fef3c7', text: '#92400e' },
                    { val: stats.totalReviews, label: 'Reseñas publicadas', icon: '⭐', color: '#fce7f3', text: '#9d174d' },
                  ].map((s, i) => (
                    <div key={i} style={{
                      background: s.color, borderRadius: 16,
                      padding: '18px 16px', border: `1px solid ${th.border}`
                    }}>
                      <p style={{ margin: '0 0 6px', fontSize: 30 }}>{s.icon}</p>
                      <p style={{ margin: '0 0 4px', fontSize: 30, fontWeight: 900, color: '#0f172a' }}>
                        {s.val}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: s.text, fontWeight: 600 }}>{s.label}</p>
                    </div>
                  ))}
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
                      { label: 'Ver técnicos pendientes', tab: 'techs', icon: '🛠️', color: '#dcfce7', text: '#166534' },
                      { label: 'Moderar reseñas', tab: 'reviews', icon: '⭐', color: '#fef3c7', text: '#92400e' },
                      { label: 'Gestionar usuarios', tab: 'users', icon: '👥', color: '#dbeafe', text: '#1e40af' },
                      { label: 'Verificar certificados', tab: 'certs', icon: '📜', color: '#ede9fe', text: '#5b21b6' },
                    ].map(a => (
                      <button key={a.tab} onClick={() => loadTab(a.tab)}
                        style={{
                          padding: '12px', background: a.color, border: `1px solid ${th.border}`,
                          borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit'
                        }}>
                        <p style={{ margin: '0 0 4px', fontSize: 20 }}>{a.icon}</p>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: a.text }}>{a.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ────── USUARIOS ────── */}
            {tab === 'users' && (
              <div>
                <p style={{ color: th.textSec, fontSize: 13, margin: '0 0 14px' }}>
                  {filterBySearch(users, ['full_name', 'email', 'role']).length} usuarios
                </p>
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
                            borderRadius: 20, background: u.role === 'admin' ? '#fef3c7' :
                              u.role === 'technician' ? '#dcfce7' : '#dbeafe',
                            color: u.role === 'admin' ? '#92400e' :
                              u.role === 'technician' ? '#166534' : '#1e40af'
                          }}>
                            {u.role === 'admin' ? '🔧 Admin' :
                              u.role === 'technician' ? '🛠️ Técnico' : '👤 Cliente'}
                          </span>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px',
                            borderRadius: 20,
                            background: u.account_status === 'active' ? '#dcfce7' : '#fee2e2',
                            color: u.account_status === 'active' ? '#166534' : '#991b1b'
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
                          flex: 1, minWidth: 100, padding: '8px', background: '#dcfce7',
                          color: '#166534', border: '1px solid #bbf7d0', borderRadius: 10,
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
                          color: '#166534', border: '1px solid #bbf7d0', borderRadius: 10,
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
                <p style={{ color: th.textSec, fontSize: 13, margin: '0 0 14px' }}>
                  {filterBySearch(techs, ['full_name', 'professional_title', 'city']).length} técnicos
                </p>
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
                          📍 {tech.city || 'Changuinola'} · ⭐ {Number(tech.average_rating).toFixed(1)}
                          ({tech.total_reviews} reseñas) · {tech.total_jobs} trabajos
                        </p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {/* Estado de verificación */}
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8px',
                            borderRadius: 20,
                            background: tech.verification_status === 'verified' ? '#dcfce7' :
                              tech.verification_status === 'rejected' ? '#fee2e2' : '#fef3c7',
                            color: tech.verification_status === 'verified' ? '#166534' :
                              tech.verification_status === 'rejected' ? '#991b1b' : '#92400e'
                          }}>
                            {tech.verification_status === 'verified' ? '✓ Verificado' :
                              tech.verification_status === 'rejected' ? '✗ Rechazado' : '⏳ Pendiente'}
                          </span>
                          {tech.is_featured && (
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 8px',
                              borderRadius: 20, background: '#fef9c3', color: '#92400e'
                            }}>
                              ⭐ Destacado
                            </span>
                          )}
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 20,
                            background: tech.is_available ? '#dcfce7' : '#f1f5f9',
                            color: tech.is_available ? '#166534' : '#64748b'
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
                          padding: '9px', background: '#dcfce7', color: '#166534',
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
                          padding: '9px', background: '#fef3c7', color: '#92400e',
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
                        padding: '9px', background: tech.is_featured ? '#f1f5f9' : '#fef9c3',
                        color: tech.is_featured ? '#64748b' : '#92400e',
                        border: `1px solid ${tech.is_featured ? th.border : '#fde68a'}`,
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
                              showToast('✅ Reseña aprobada y publicada.')
                            } catch (err) { showToast(err.message, 'error') }
                          }} style={{
                            flex: 1, padding: '10px', background: '#dcfce7',
                            color: '#166534', border: '1px solid #bbf7d0', borderRadius: 10,
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
                                  color: '#1e40af', border: '1px solid #bfdbfe',
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
                                  body: `Tu documento "${cert.name}" fue verificado por el equipo de Changuinola Pro.`,
                                  data: JSON.stringify({ cert_id: cert.id }),
                                })
                                setCerts(prev => prev.filter(c => c.id !== cert.id))
                                showToast(`✅ "${cert.name}" verificado correctamente.`)
                              } catch (err) { showToast(err.message, 'error') }
                            }} style={{
                              flex: 1, padding: '10px', background: '#dcfce7',
                              color: '#166534', border: '1px solid #bbf7d0', borderRadius: 10,
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
          </>
        )}
      </div>
    </div>
  )
}