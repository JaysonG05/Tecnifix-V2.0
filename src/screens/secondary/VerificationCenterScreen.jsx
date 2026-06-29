import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { PageHeader, Badge, Btn, Input, Modal, Spinner, Toast } from '../../components/UI.jsx'
import {
  auth,
  profiles,
  verificationApi,
  VERIFICATION_GENERAL_STATUS,
  VERIFICATION_STEP_STATUS,
  VERIFICATION_STEPS,
  PANAMA_PROVINCES,
} from '../../lib/supabase.js'

const STEP_ORDER = Object.fromEntries(VERIFICATION_STEPS.map((s, i) => [s.key, i]))
const REQUIRED_KEYS = VERIFICATION_STEPS.filter(s => s.required).map(s => s.key)

const emptyForms = {
  account_basic: { full_name: '', email: '', phone: '', account_type: 'Técnico', province: '', district: '', corregimiento: '', address_general: '' },
  email_verification: {},
  phone_verification: { phone: '', code: '' },
  personal_info: { legal_name: '', document_number: '', date_of_birth: '', nationality: 'Panameña', gender: '', address_text: '', province: '', district: '', corregimiento: '', address_reference: '', secondary_phone: '', emergency_contact: '', emergency_phone: '' },
  identity_document: { document_kind: 'cedula' },
  selfie: { selfie_type: 'selfie' },
  proof_of_address: { proof_type: 'Recibo de luz', issued_at: '', comment: '' },
  professional_info: { profile_title: '', professional_description: '', years_experience: '', experience_level: 'Intermedio', technician_type: 'Independiente', availability: 'Tiempo completo', work_schedule: '', emergency_service: false, home_service: true, business_service: false, residential_service: true },
  service_categories: { categories: '', services: '' },
  coverage_area: { coverage_type: 'provinces', provinces: [], district: '', corregimiento: '', base_address: '', coverage_radius_km: '20' },
  work_experience: { title: '', company: '', service_type: '', start_date: '', end_date: '', description: '', location_general: '' },
  certifications: { name: '', institution: '', issue_date: '', expiration_date: '', category: '' },
  portfolio: { title: '', description: '', category: '', location_general: '', work_date: '', comment: '' },
  activity_questionnaire: { main_services: '', years_experience: '', works_alone_or_team: 'Trabajo solo', has_own_tools: true, handles_emergencies: false, monthly_clients_estimate: '', works_with_companies: false, facebook: '', instagram: '', tiktok: '', website: '', google_business: '', other_link: '', accepts_quality_rules: false },
  consent: { terms: false, privacy: false, document_review: false, truthfulness: false, conduct: false },
}

function statusInfo(status, fallback = VERIFICATION_STEP_STATUS.not_started) {
  return VERIFICATION_STEP_STATUS[status] || fallback
}

function generalInfo(status) {
  return VERIFICATION_GENERAL_STATUS[status] || VERIFICATION_GENERAL_STATUS.unverified
}

function isAdult(dateValue) {
  if (!dateValue) return false
  const birth = new Date(dateValue + 'T00:00:00')
  const now = new Date()
  const age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  return age > 18 || (age === 18 && (m > 0 || (m === 0 && now.getDate() >= birth.getDate())))
}

function isPanamaPhone(value = '') {
  const digits = String(value).replace(/\D/g, '')
  return /^(507)?[0-9]{7,8}$/.test(digits)
}

function isUrlOrEmpty(value = '') {
  if (!value.trim()) return true
  try { new URL(value); return true } catch { return false }
}

export function VerificationCenterScreen() {
  const { th, user, navigate } = useApp()
  const [data, setData] = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeStep, setActiveStep] = useState(null)
  const [form, setForm] = useState({})
  const [files, setFiles] = useState({})
  const [toast, setToast] = useState(null)
  const [loadError, setLoadError] = useState('')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  const load = async () => {
    if (!user?.id) return
    setLoading(true)
    setLoadError('')
    try {
      const [currentAuth, status] = await Promise.all([
        auth.getUser().catch(() => null),
        verificationApi.getStatus(user.id),
      ])
      setAuthUser(currentAuth)
      setData(status)
      if (currentAuth?.email_confirmed_at) {
        const emailStep = status.steps.find(s => (s.step_key || s.key) === 'email_verification')
        if (emailStep?.status !== 'approved') {
          await verificationApi.markEmailVerified(user.id).catch(() => {})
          setData(await verificationApi.getStatus(user.id))
        }
      }
    } catch (err) {
      const message = err?.message || 'No se pudo cargar el Centro de Verificación. Ejecuta verification_center.sql en Supabase.'
      setLoadError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.id])

  const stepMap = useMemo(() => Object.fromEntries((data?.steps || []).map(s => [s.step_key || s.key, s])), [data])
  const requiredDone = REQUIRED_KEYS.filter(key => ['submitted', 'approved'].includes(stepMap[key]?.status)).length
  const canSubmit = requiredDone === REQUIRED_KEYS.length && !['pending_review', 'under_review', 'verified', 'suspended'].includes(data?.profile?.verification_status)
  const general = generalInfo(data?.profile?.verification_status)

  const openStep = (step) => {
    const saved = stepMap[step.key]?.payload || {}
    const base = { ...(emptyForms[step.key] || {}), ...saved }
    if (step.key === 'account_basic') {
      base.full_name = saved.full_name || user?.full_name || ''
      base.email = saved.email || user?.email || authUser?.email || ''
      base.phone = saved.phone || user?.phone || ''
    }
    if (step.key === 'personal_info') {
      Object.assign(base, data?.profile?.application_data || {})
    }
    if (step.key === 'professional_info') {
      base.profile_title = saved.profile_title || data?.profile?.professional_title || ''
      base.professional_description = saved.professional_description || data?.profile?.bio || ''
      base.years_experience = saved.years_experience || data?.profile?.years_experience || ''
    }
    setFiles({})
    setForm(base)
    setActiveStep(step)
  }

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const submitStep = async () => {
    if (!activeStep || !user?.id) return
    setSaving(true)
    try {
      const key = activeStep.key
      if (key === 'account_basic') {
        if (!form.full_name.trim()) throw new Error('El nombre completo es obligatorio.')
        if (!String(form.email).includes('@')) throw new Error('El correo no es válido.')
        if (!isPanamaPhone(form.phone)) throw new Error('El teléfono debe tener formato válido para Panamá.')
        if (!form.province || !form.district) throw new Error('Provincia y distrito son obligatorios.')
        await profiles.update(user.id, { full_name: form.full_name.trim() }).catch(() => {})
        await profiles.update(user.id, { phone: form.phone.trim() }).catch(() => {})
        await profiles.update(user.id, { whatsapp_phone: form.phone.trim() }).catch(() => {})
        await verificationApi.saveStep(user.id, key, form, 'approved')
      } else if (key === 'email_verification') {
        if (authUser?.email_confirmed_at) await verificationApi.markEmailVerified(user.id)
        else {
          await verificationApi.resendEmailVerification(user.email || authUser?.email)
          await verificationApi.saveStep(user.id, key, { email: user.email || authUser?.email, resent_at: new Date().toISOString() }, 'in_progress')
          showToast('Enviamos nuevamente el correo de verificación.')
        }
      } else if (key === 'phone_verification') {
        if (!isPanamaPhone(form.phone)) throw new Error('Escribe un teléfono válido de Panamá.')
        if (form.code && String(form.code).trim()) {
          // Verificación real por OTP.
          await verificationApi.verifyPhoneOtp(form.phone.trim(), String(form.code).trim())
          showToast('✅ Teléfono verificado correctamente.')
        } else {
          // Sin código: revisión manual (failsafe si no hay SMS configurado).
          await verificationApi.markPhoneSubmitted(user.id, form.phone)
          showToast('Teléfono enviado. Pide el código por SMS o quedará en revisión manual.')
        }
      } else if (key === 'personal_info') {
        if (!form.legal_name.trim()) throw new Error('El nombre legal es obligatorio.')
        if (!form.document_number.trim()) throw new Error('La cédula o documento es obligatorio.')
        if (!isAdult(form.date_of_birth)) throw new Error('Debes ser mayor de edad.')
        if (!form.address_text.trim() || !form.province || !form.district) throw new Error('Dirección, provincia y distrito son obligatorios.')
        await verificationApi.savePersonalInfo(user.id, form)
      } else if (key === 'identity_document') {
        if (!files.id_front && !files.id_back && !files.passport) throw new Error('Sube cédula frontal/trasera o pasaporte.')
        if (files.id_front) await verificationApi.uploadDocument(user.id, { stepKey: key, documentType: 'id_front', file: files.id_front })
        if (files.id_back) await verificationApi.uploadDocument(user.id, { stepKey: key, documentType: 'id_back', file: files.id_back })
        if (files.passport) await verificationApi.uploadDocument(user.id, { stepKey: key, documentType: 'passport', file: files.passport })
      } else if (key === 'selfie') {
        if (!files.selfie) throw new Error('Sube una selfie clara.')
        await verificationApi.uploadDocument(user.id, { stepKey: key, documentType: 'selfie', file: files.selfie, meta: { selfie_type: form.selfie_type } })
      } else if (key === 'proof_of_address') {
        if (!form.issued_at) throw new Error('Indica la fecha de emisión.')
        if (!files.proof) throw new Error('Sube el comprobante de domicilio.')
        await verificationApi.uploadDocument(user.id, { stepKey: key, documentType: 'proof_of_address', file: files.proof, meta: { proof_type: form.proof_type, issued_at: form.issued_at, comment: form.comment } })
      } else if (key === 'professional_info') {
        if (!form.profile_title.trim()) throw new Error('El título visible es obligatorio.')
        await verificationApi.saveProfessionalInfo(user.id, form)
      } else if (key === 'service_categories') {
        if (!form.categories.trim() || !form.services.trim()) throw new Error('Agrega categorías y servicios específicos.')
        await verificationApi.saveStep(user.id, key, form)
      } else if (key === 'coverage_area') {
        if (form.coverage_type !== 'all_country' && (!form.provinces || form.provinces.length === 0)) throw new Error('Selecciona al menos una provincia.')
        await verificationApi.saveCoverage(user.id, form)
      } else if (key === 'activity_questionnaire') {
        if (!form.main_services.trim()) throw new Error('Describe tus servicios principales.')
        if (!form.accepts_quality_rules) throw new Error('Debes aceptar cumplir las normas de calidad y conducta.')
        for (const keyUrl of ['facebook', 'instagram', 'tiktok', 'website', 'google_business', 'other_link']) {
          if (!isUrlOrEmpty(form[keyUrl])) throw new Error(`El enlace ${keyUrl} no es una URL válida.`)
        }
        await verificationApi.saveQuestionnaire(user.id, {
          main_services: form.main_services,
          years_experience: Number(form.years_experience || 0),
          works_alone_or_team: form.works_alone_or_team,
          has_own_tools: Boolean(form.has_own_tools),
          handles_emergencies: Boolean(form.handles_emergencies),
          monthly_clients_estimate: form.monthly_clients_estimate,
          works_with_companies: Boolean(form.works_with_companies),
          social_links: {
            facebook: form.facebook, instagram: form.instagram, tiktok: form.tiktok,
            website: form.website, google_business: form.google_business, other: form.other_link,
          },
          accepts_quality_rules: Boolean(form.accepts_quality_rules),
        })
      } else if (key === 'consent') {
        const missing = ['terms', 'privacy', 'document_review', 'truthfulness', 'conduct'].filter(k => !form[k])
        if (missing.length) throw new Error('Debes aceptar todos los consentimientos para enviar tu verificación.')
        await verificationApi.saveStep(user.id, key, { ...form, accepted_at: new Date().toISOString() })
      } else if (key === 'certifications') {
        if (!form.name.trim()) throw new Error('Escribe el nombre del certificado.')
        if (files.certificate) {
          await verificationApi.uploadDocument(user.id, { stepKey: key, documentType: 'certificate', file: files.certificate, meta: form })
        }
        await verificationApi.saveStep(user.id, key, form)
      } else if (key === 'portfolio') {
        if (!form.title.trim()) throw new Error('Agrega un título para el trabajo.')
        if (files.portfolio) {
          await verificationApi.uploadDocument(user.id, { stepKey: key, documentType: 'portfolio_image', file: files.portfolio, meta: form })
        }
        await verificationApi.saveStep(user.id, key, form)
      } else {
        await verificationApi.saveStep(user.id, key, form)
      }

      showToast('Paso guardado correctamente.')
      setActiveStep(null)
      await load()
    } catch (err) {
      showToast(err?.message || 'No se pudo guardar el paso.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const submitForReview = async () => {
    setSaving(true)
    try {
      await verificationApi.submitForReview(user.id)
      showToast('Tu perfil fue enviado a revisión.')
      await load()
    } catch (err) {
      showToast(err?.message || 'No se pudo enviar a revisión.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null
  if (user.role !== 'technician' && user.role !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', background: th.bg }}>
        <PageHeader title="Centro de Verificación" />
        <div style={{ padding: 20 }}>
          <p style={{ color: th.text, fontWeight: 800 }}>Esta sección es para técnicos y empresas técnicas.</p>
          <Btn onClick={() => navigate('register')}>Registrarme como técnico</Btn>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: th.bg, paddingBottom: 80 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <PageHeader title="Centro de Verificación de Técnicos" />

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 60 }}><Spinner /></div>
      ) : loadError ? (
        <div style={{ padding: 16 }}>
          <section style={{
            background: th.surface,
            border: '1px solid #fecaca',
            borderRadius: 18,
            padding: 16,
            boxShadow: th.shadow,
          }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>⚠️</div>
            <h1 style={{ margin: '0 0 8px', color: th.text, fontSize: 20 }}>Verificación avanzada no instalada</h1>
            <p style={{ margin: '0 0 12px', color: '#991b1b', fontSize: 13, lineHeight: 1.55, fontWeight: 700 }}>
              {loadError}
            </p>
            <p style={{ margin: '0 0 16px', color: th.textSec, fontSize: 13, lineHeight: 1.55 }}>
              Por ahora usa la <strong>postulación profesional</strong>. El dueño/admin puede revisarte y aprobarte desde el panel actual. Cuando estés aprobado, se activa el panel técnico azul.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Btn onClick={() => navigate('profile')} variant="ghost">Ir a mi perfil</Btn>
              <Btn onClick={() => navigate('edit-tech-profile')}>Completar postulación</Btn>
            </div>
          </section>
        </div>
      ) : (
        <div style={{ padding: 16 }}>
          <section style={{ background: 'linear-gradient(135deg,#102a56,#2563eb)', borderRadius: 22, padding: 20, color: '#fff', marginBottom: 14, boxShadow: th.shadowLg }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: '#bfdbfe' }}>
              Centro de Verificación
            </p>
            <h1 style={{ margin: '0 0 8px', fontSize: 24, lineHeight: 1.08 }}>
              Completa tu verificación para generar confianza
            </h1>
            <p style={{ margin: '0 0 18px', color: 'rgba(255,255,255,.86)', fontSize: 14, lineHeight: 1.55 }}>
              Completa tu verificación para generar mayor confianza, aparecer mejor posicionado en las búsquedas y recibir solicitudes de clientes.
            </p>
            <div style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.22)', borderRadius: 16, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: '#bfdbfe', fontWeight: 800 }}>Estado actual</p>
                  <p style={{ margin: '3px 0 0', fontSize: 18, fontWeight: 900 }}>{general.label}</p>
                </div>
                <span style={{ background: general.bg, color: general.color, borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 900 }}>
                  {data.progress}%
                </span>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,.22)', overflow: 'hidden' }}>
                <div style={{ width: `${data.progress}%`, height: '100%', background: '#f8db13', borderRadius: 999 }} />
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 12, color: '#dbeafe' }}>
                Tus documentos solo serán visibles para el equipo autorizado. Los clientes no verán cédula, dirección exacta ni archivos privados.
              </p>
            </div>
          </section>

          <section style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 18, padding: 14, marginBottom: 14 }}>
            <p style={{ margin: '0 0 4px', fontWeight: 900, color: th.text }}>Pasos obligatorios</p>
            <p style={{ margin: 0, color: th.textSec, fontSize: 13 }}>
              {requiredDone} de {REQUIRED_KEYS.length} completados o enviados.
            </p>
          </section>

          <div style={{ display: 'grid', gap: 12 }}>
            {[...VERIFICATION_STEPS].sort((a, b) => STEP_ORDER[a.key] - STEP_ORDER[b.key]).map(step => (
              <StepCard
                key={step.key}
                step={step}
                saved={stepMap[step.key]}
                onOpen={() => openStep(step)}
                th={th}
              />
            ))}
          </div>

          <div style={{ marginTop: 16, background: th.surface, border: `1px solid ${th.border}`, borderRadius: 18, padding: 14 }}>
            <Btn onClick={submitForReview} loading={saving} disabled={!canSubmit}>
              Enviar a revisión
            </Btn>
            <p style={{ margin: '10px 0 0', fontSize: 12, color: canSubmit ? th.textSec : '#92400e', lineHeight: 1.45 }}>
              {canSubmit
                ? 'Tu expediente está listo. Al enviarlo quedará pendiente de revisión manual.'
                : 'Completa todos los pasos obligatorios para activar el envío a revisión.'}
            </p>
          </div>
        </div>
      )}

      {activeStep && (
        <Modal title={`${activeStep.icon} ${activeStep.name}`} onClose={() => setActiveStep(null)}>
          <StepForm step={activeStep} form={form} update={update} setFiles={setFiles} files={files} authUser={authUser} showToast={showToast} />
          {stepMap[activeStep.key]?.correction_message && (
            <p style={{ color: '#9a3412', background: '#ffedd5', border: '1px solid #fdba74', borderRadius: 12, padding: 10, fontSize: 12, lineHeight: 1.5 }}>
              Corrección solicitada: {stepMap[activeStep.key].correction_message}
            </p>
          )}
          <Btn onClick={submitStep} loading={saving}>Guardar paso</Btn>
        </Modal>
      )}
    </div>
  )
}

function StepCard({ step, saved, onOpen, th }) {
  const status = saved?.status || 'not_started'
  const info = statusInfo(status)
  return (
    <article style={{
      background: th.surface,
      border: `1px solid ${status === 'needs_correction' ? '#fdba74' : th.border}`,
      borderRadius: 16,
      padding: 14,
      boxShadow: th.shadow,
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 42, height: 42, borderRadius: 14, background: info.bg, color: info.color, display: 'grid', placeItems: 'center', fontSize: 21, flexShrink: 0 }}>
          {step.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
            <h3 style={{ margin: 0, color: th.text, fontSize: 15 }}>{step.name}</h3>
            {step.required && <Badge color="#fef3c7" textColor="#92400e">Obligatorio</Badge>}
            <Badge color={info.bg} textColor={info.color}>{info.label}</Badge>
          </div>
          <p style={{ margin: '0 0 8px', color: th.textSec, fontSize: 12, lineHeight: 1.45 }}>{step.description}</p>
          {saved?.rejection_reason && (
            <p style={{ margin: '0 0 8px', color: '#991b1b', fontSize: 12, lineHeight: 1.45 }}>
              Motivo: {saved.rejection_reason}
            </p>
          )}
          <button onClick={onOpen} style={{
            border: 0,
            background: status === 'approved' ? th.surface2 : th.primary,
            color: status === 'approved' ? th.text : '#fff',
            borderRadius: 12,
            padding: '9px 12px',
            fontSize: 12,
            fontWeight: 900,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
            {status === 'needs_correction' || status === 'rejected' ? 'Corregir' : status === 'not_started' ? 'Completar' : 'Ver / actualizar'}
          </button>
        </div>
      </div>
    </article>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#17213a', marginBottom: 8 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', height: 44, borderRadius: 16, border: '1px solid #e8edf5', background: '#f6f8fc', color: '#17213a', padding: '0 12px', fontWeight: 700 }}>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  )
}

function Check({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', cursor: 'pointer' }}>
      <input type="checkbox" checked={Boolean(checked)} onChange={e => onChange(e.target.checked)} style={{ marginTop: 2, accentColor: '#2563eb' }} />
      <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.45 }}>{label}</span>
    </label>
  )
}

function FileField({ label, name, setFiles }) {
  return (
    <label style={{ display: 'block', border: '1.5px dashed #cbd5e1', background: '#f8fafc', borderRadius: 16, padding: 13, marginBottom: 12, cursor: 'pointer' }}>
      <span style={{ display: 'block', color: '#17213a', fontSize: 13, fontWeight: 900, marginBottom: 5 }}>{label}</span>
      <span style={{ display: 'block', color: '#64748b', fontSize: 11, lineHeight: 1.4 }}>JPG, PNG o PDF. Máximo 10 MB.</span>
      <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={e => setFiles(prev => ({ ...prev, [name]: e.target.files?.[0] || null }))} style={{ marginTop: 10, maxWidth: '100%' }} />
    </label>
  )
}

// Verificación de teléfono por OTP real (Edge Functions send-otp / verify-otp).
// "Enviar código" dispara el SMS; el código se confirma con "Guardar paso".
// Failsafe: si no hay SMS configurado, el usuario deja el código vacío y queda
// en revisión manual (comportamiento anterior).
function PhoneVerifyField({ form, update, showToast }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const sendCode = async () => {
    if (!isPanamaPhone(form.phone)) { showToast('Escribe un teléfono válido de Panamá.', 'error'); return }
    setSending(true)
    try {
      const res = await verificationApi.sendPhoneOtp(form.phone.trim())
      setSent(true)
      setCooldown(res?.cooldownSeconds || 60)
      if (res?.delivery === 'sms') showToast('📲 Código enviado por SMS.')
      else if (res?.devCode) { update('code', res.devCode); showToast('Modo prueba: código autocompletado.') }
      else showToast('SMS aún no configurado. Deja el código vacío para revisión manual.', 'error')
    } catch (e) {
      showToast('No se pudo enviar el código (' + (e?.message || 'reintenta') + '). Puedes continuar con revisión manual.', 'error')
    } finally { setSending(false) }
  }

  return (
    <>
      <Input label="Teléfono" value={form.phone} onChange={v => update('phone', v)} placeholder="+507 6000-0000" />
      <Btn onClick={sendCode} loading={sending} disabled={cooldown > 0} variant="outline">
        {cooldown > 0 ? `Reenviar en ${cooldown}s` : (sent ? 'Reenviar código' : '📲 Enviar código por SMS')}
      </Btn>
      <div style={{ height: 10 }} />
      <Input label="Código de 6 dígitos" value={form.code} onChange={v => update('code', v)} placeholder="123456"
        helper="Escribe el código que recibiste y pulsa “Guardar paso”. Si no recibes SMS, déjalo vacío para revisión manual." />
    </>
  )
}

function StepForm({ step, form, update, setFiles, authUser, showToast }) {
  if (step.key === 'account_basic') return (
    <>
      <Input label="Nombre completo" value={form.full_name} onChange={v => update('full_name', v)} />
      <Input label="Correo electrónico" value={form.email} onChange={v => update('email', v)} type="email" />
      <Input label="Número de teléfono" value={form.phone} onChange={v => update('phone', v)} placeholder="+507 6000-0000" />
      <Select label="Tipo de cuenta" value={form.account_type} onChange={v => update('account_type', v)} options={['Técnico', 'Empresa técnica']} />
      <Select label="Provincia" value={form.province} onChange={v => update('province', v)} options={['', ...PANAMA_PROVINCES]} />
      <Input label="Distrito" value={form.district} onChange={v => update('district', v)} />
      <Input label="Corregimiento" value={form.corregimiento} onChange={v => update('corregimiento', v)} />
      <Input label="Dirección general" value={form.address_general} onChange={v => update('address_general', v)} rows={2} />
    </>
  )
  if (step.key === 'email_verification') return (
    <div>
      <p style={{ color: '#334155', fontSize: 13, lineHeight: 1.55 }}>
        Correo: <strong>{authUser?.email || 'No disponible'}</strong>
      </p>
      <p style={{ color: authUser?.email_confirmed_at ? '#166534' : '#92400e', fontWeight: 800 }}>
        {authUser?.email_confirmed_at ? 'Correo verificado' : 'Pendiente de verificación. Guarda este paso para reenviar el correo.'}
      </p>
    </div>
  )
  if (step.key === 'phone_verification') return (
    <PhoneVerifyField form={form} update={update} showToast={showToast} />
  )
  if (step.key === 'personal_info') return (
    <>
      <p style={{ color: '#1e40af', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 10, fontSize: 12, lineHeight: 1.5 }}>
        Ingresa tus datos exactamente como aparecen en tu documento de identidad. Si los datos no coinciden, tu verificación puede ser rechazada.
      </p>
      <Input label="Nombre legal completo" value={form.legal_name} onChange={v => update('legal_name', v)} />
      <Input label="Número de cédula o documento" value={form.document_number} onChange={v => update('document_number', v)} />
      <Input label="Fecha de nacimiento" value={form.date_of_birth} onChange={v => update('date_of_birth', v)} type="date" />
      <Input label="Nacionalidad" value={form.nationality} onChange={v => update('nationality', v)} />
      <Select label="Sexo (opcional)" value={form.gender} onChange={v => update('gender', v)} options={['', 'Femenino', 'Masculino', 'Prefiero no decir']} />
      <Input label="Dirección residencial" value={form.address_text} onChange={v => update('address_text', v)} rows={2} />
      <Select label="Provincia" value={form.province} onChange={v => update('province', v)} options={['', ...PANAMA_PROVINCES]} />
      <Input label="Distrito" value={form.district} onChange={v => update('district', v)} />
      <Input label="Corregimiento" value={form.corregimiento} onChange={v => update('corregimiento', v)} />
      <Input label="Referencia de ubicación" value={form.address_reference} onChange={v => update('address_reference', v)} />
      <Input label="Teléfono secundario (opcional)" value={form.secondary_phone} onChange={v => update('secondary_phone', v)} />
      <Input label="Contacto de emergencia (opcional)" value={form.emergency_contact} onChange={v => update('emergency_contact', v)} />
      <Input label="Teléfono de emergencia (opcional)" value={form.emergency_phone} onChange={v => update('emergency_phone', v)} />
    </>
  )
  if (step.key === 'identity_document') return (
    <>
      <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>Deben verse las cuatro esquinas, sin reflejos, sin borrosidad y vigente.</p>
      <FileField label="Foto frontal de cédula" name="id_front" setFiles={setFiles} />
      <FileField label="Foto trasera de cédula" name="id_back" setFiles={setFiles} />
      <FileField label="Pasaporte o documento alternativo" name="passport" setFiles={setFiles} />
    </>
  )
  if (step.key === 'selfie') return (
    <>
      <Select label="Tipo de foto" value={form.selfie_type} onChange={v => update('selfie_type', v)} options={['selfie', 'selfie_sosteniendo_cedula']} />
      <FileField label="Selfie clara de tu rostro" name="selfie" setFiles={setFiles} />
    </>
  )
  if (step.key === 'proof_of_address') return (
    <>
      <Select label="Tipo de documento" value={form.proof_type} onChange={v => update('proof_type', v)} options={['Recibo de luz', 'Recibo de agua', 'Recibo de internet', 'Estado de cuenta bancario', 'Certificación bancaria', 'Documento municipal o gubernamental', 'Otro documento válido']} />
      <Input label="Fecha de emisión" value={form.issued_at} onChange={v => update('issued_at', v)} type="date" />
      <Input label="Comentario opcional" value={form.comment} onChange={v => update('comment', v)} rows={2} />
      <FileField label="Comprobante de domicilio" name="proof" setFiles={setFiles} />
    </>
  )
  if (step.key === 'professional_info') return (
    <>
      <Input label="Título visible del perfil" value={form.profile_title} onChange={v => update('profile_title', v)} placeholder="Técnico en refrigeración y aires acondicionados" />
      <Input label="Descripción profesional" value={form.professional_description} onChange={v => update('professional_description', v)} rows={5} helper="Mínimo 100 caracteres para que el perfil se vea profesional." />
      <Input label="Años de experiencia" value={form.years_experience} onChange={v => update('years_experience', v)} type="number" />
      <Select label="Nivel de experiencia" value={form.experience_level} onChange={v => update('experience_level', v)} options={['Principiante', 'Intermedio', 'Avanzado', 'Experto']} />
      <Select label="Tipo de técnico" value={form.technician_type} onChange={v => update('technician_type', v)} options={['Independiente', 'Empresa', 'Equipo de técnicos']} />
      <Select label="Disponibilidad" value={form.availability} onChange={v => update('availability', v)} options={['Tiempo completo', 'Medio tiempo', 'Fines de semana', 'Emergencias 24/7', 'Por cita']} />
      <Input label="Horario de atención" value={form.work_schedule} onChange={v => update('work_schedule', v)} />
      <Check label="Servicios de emergencia" checked={form.emergency_service} onChange={v => update('emergency_service', v)} />
      <Check label="Atiendo a domicilio" checked={form.home_service} onChange={v => update('home_service', v)} />
      <Check label="Atiendo empresas" checked={form.business_service} onChange={v => update('business_service', v)} />
      <Check label="Atiendo residencias" checked={form.residential_service} onChange={v => update('residential_service', v)} />
    </>
  )
  if (step.key === 'service_categories') return (
    <>
      <Input label="Categorías principales" value={form.categories} onChange={v => update('categories', v)} rows={3} placeholder="Electricidad, Aires acondicionados, Cámaras de seguridad..." />
      <Input label="Servicios específicos por categoría" value={form.services} onChange={v => update('services', v)} rows={5} placeholder="Aires acondicionados: instalación, limpieza profunda, carga de gas..." />
    </>
  )
  if (step.key === 'coverage_area') return (
    <>
      <Select label="Tipo de cobertura" value={form.coverage_type} onChange={v => update('coverage_type', v)} options={['provinces', 'all_country', 'radius']} />
      {form.coverage_type !== 'all_country' && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: '#17213a' }}>Provincias donde trabajas</p>
          {PANAMA_PROVINCES.map(p => (
            <Check key={p} label={p} checked={form.provinces?.includes(p)} onChange={v => {
              const current = form.provinces || []
              update('provinces', v ? [...current, p] : current.filter(x => x !== p))
            }} />
          ))}
        </div>
      )}
      <Input label="Distrito específico (opcional)" value={form.district} onChange={v => update('district', v)} />
      <Input label="Dirección base o zona principal" value={form.base_address} onChange={v => update('base_address', v)} />
      <Input label="Radio de cobertura en km" value={form.coverage_radius_km} onChange={v => update('coverage_radius_km', v)} type="number" />
    </>
  )
  if (step.key === 'activity_questionnaire') return (
    <>
      <Input label="¿Qué servicios principales ofreces?" value={form.main_services} onChange={v => update('main_services', v)} rows={3} />
      <Input label="¿Cuántos años de experiencia tienes?" value={form.years_experience} onChange={v => update('years_experience', v)} type="number" />
      <Select label="¿Trabajas solo o con equipo?" value={form.works_alone_or_team} onChange={v => update('works_alone_or_team', v)} options={['Trabajo solo', 'Equipo pequeño', 'Empresa']} />
      <Check label="Tengo herramientas propias" checked={form.has_own_tools} onChange={v => update('has_own_tools', v)} />
      <Check label="Atiendo emergencias" checked={form.handles_emergencies} onChange={v => update('handles_emergencies', v)} />
      <Input label="Clientes aproximados al mes" value={form.monthly_clients_estimate} onChange={v => update('monthly_clients_estimate', v)} />
      <Check label="He trabajado con empresas" checked={form.works_with_companies} onChange={v => update('works_with_companies', v)} />
      <Input label="Facebook profesional" value={form.facebook} onChange={v => update('facebook', v)} />
      <Input label="Instagram" value={form.instagram} onChange={v => update('instagram', v)} />
      <Input label="TikTok" value={form.tiktok} onChange={v => update('tiktok', v)} />
      <Input label="Página web" value={form.website} onChange={v => update('website', v)} />
      <Input label="Google Business" value={form.google_business} onChange={v => update('google_business', v)} />
      <Check label="Acepto cumplir las normas de calidad y conducta de Tecnifix" checked={form.accepts_quality_rules} onChange={v => update('accepts_quality_rules', v)} />
    </>
  )
  if (step.key === 'consent') return (
    <>
      <p style={{ color: '#334155', fontSize: 13, lineHeight: 1.55 }}>
        Declaro que la información proporcionada es verdadera, actual y verificable. Entiendo que Tecnifix puede revisar mis documentos, solicitar correcciones, rechazar mi solicitud o suspender mi cuenta si detecta información falsa, documentos alterados, conducta fraudulenta o incumplimiento de normas.
      </p>
      <Check label="Acepto términos y condiciones" checked={form.terms} onChange={v => update('terms', v)} />
      <Check label="Acepto política de privacidad" checked={form.privacy} onChange={v => update('privacy', v)} />
      <Check label="Autorizo revisión de documentos" checked={form.document_review} onChange={v => update('document_review', v)} />
      <Check label="Declaro veracidad de la información" checked={form.truthfulness} onChange={v => update('truthfulness', v)} />
      <Check label="Acepto normas de conducta del técnico" checked={form.conduct} onChange={v => update('conduct', v)} />
    </>
  )
  if (step.key === 'certifications') return (
    <>
      <Input label="Nombre del certificado" value={form.name} onChange={v => update('name', v)} />
      <Input label="Institución emisora" value={form.institution} onChange={v => update('institution', v)} />
      <Input label="Fecha de emisión" value={form.issue_date} onChange={v => update('issue_date', v)} type="date" />
      <Input label="Fecha de vencimiento (si aplica)" value={form.expiration_date} onChange={v => update('expiration_date', v)} type="date" />
      <Input label="Categoría relacionada" value={form.category} onChange={v => update('category', v)} />
      <FileField label="Archivo del certificado" name="certificate" setFiles={setFiles} />
    </>
  )
  if (step.key === 'portfolio') return (
    <>
      <Input label="Título del trabajo" value={form.title} onChange={v => update('title', v)} />
      <Input label="Descripción" value={form.description} onChange={v => update('description', v)} rows={3} />
      <Input label="Categoría" value={form.category} onChange={v => update('category', v)} />
      <Input label="Ubicación general" value={form.location_general} onChange={v => update('location_general', v)} />
      <Input label="Fecha aproximada" value={form.work_date} onChange={v => update('work_date', v)} type="date" />
      <FileField label="Foto antes/después o general" name="portfolio" setFiles={setFiles} />
    </>
  )
  return (
    <>
      <Input label="Título / empresa" value={form.title || ''} onChange={v => update('title', v)} />
      <Input label="Tipo de servicio realizado" value={form.service_type || ''} onChange={v => update('service_type', v)} />
      <Input label="Fecha de inicio" value={form.start_date || ''} onChange={v => update('start_date', v)} type="date" />
      <Input label="Fecha de finalización" value={form.end_date || ''} onChange={v => update('end_date', v)} type="date" />
      <Input label="Descripción" value={form.description || ''} onChange={v => update('description', v)} rows={4} />
      <Input label="Ubicación general" value={form.location_general || ''} onChange={v => update('location_general', v)} />
    </>
  )
}
