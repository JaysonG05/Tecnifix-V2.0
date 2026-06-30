import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { TechnicianCard } from '../../components/TechnicianCard.jsx'
import {
  Avatar, StarRating, Badge, Btn, Input, Toggle, SkeletonCard,
  EmptyState, Modal, Toast, PageHeader, SettingsRow, StatusBadge, Spinner
} from '../../components/UI.jsx'
import {
  supabase, auth, profiles, technicians, techCategories, certificatesApi, serviceCatalog, favorites as favApi,
  serviceRequests, archiveApi, receiptsApi, admin, notifications
} from '../../lib/supabase.js'
import { T } from '../../i18n/translations.js'
import { receiptActions, disputeActions } from '../../lib/payments.js'
import { enablePush, disablePush, getPushStatus, isPushSupported } from '../../lib/push.js'

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
  const [pushBusy, setPushBusy] = useState(false)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  // Refleja en el toggle el estado real de la suscripción push del dispositivo.
  useEffect(() => {
    if (!isPushSupported()) return
    getPushStatus().then((st) => {
      setPrefs((p) => ({ ...p, notif_push: st === 'subscribed' }))
    }).catch(() => {})
  }, [])

  // Toggle de push: pide permiso y suscribe (o cancela) de verdad.
  const handlePushToggle = async (val) => {
    if (!isPushSupported()) {
      showToast('Este navegador no soporta notificaciones push.')
      return
    }
    setPushBusy(true)
    setPrefs((p) => ({ ...p, notif_push: val })) // optimista
    try {
      if (val) { await enablePush(user.id); showToast('Notificaciones push activadas.') }
      else { await disablePush(user.id); showToast('Notificaciones push desactivadas.') }
      if (user) {
        const p = await profiles.update(user.id, { notif_push: val }).catch(() => null)
        if (p) setUser(p)
      }
    } catch (e) {
      setPrefs((p) => ({ ...p, notif_push: !val })) // revertir si falla
      showToast(e?.message || 'No se pudo cambiar las notificaciones push.')
    } finally {
      setPushBusy(false)
    }
  }

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
          <SettingsRow label={t.pushNotif} sub="Alertas en tu dispositivo, incluso con la app cerrada" right={<Toggle value={prefs.notif_push} disabled={pushBusy} onChange={handlePushToggle} />} />
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
          <SettingsRow label={t.terms} onClick={() => navigate('legal')} right={<span style={{ color: th.primary, fontSize: 13 }}>›</span>} />
          <SettingsRow label={t.privacyPolicy} onClick={() => navigate('legal')} right={<span style={{ color: th.primary, fontSize: 13 }}>›</span>} />
          <SettingsRow label={t.contactSupport} onClick={() => window.open('mailto:soporte@changuinolapro.com')} right={<span style={{ color: th.primary, fontSize: 13 }}>›</span>} />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────
