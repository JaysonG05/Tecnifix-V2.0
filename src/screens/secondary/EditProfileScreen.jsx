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
      const { profiles: p } = await import('../../lib/supabase.js')
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
