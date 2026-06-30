// ─────────────────────────────────────────────────────────────
// Tecnifix — Verificación de técnicos (KYC)
//
// Constantes de estados/pasos, verificationApi (flujo del técnico) y
// verificationAdminApi (revisión del admin). Extraído de supabase.js para
// reducir el monolito. Importa el cliente desde client.js (sin ciclos).
// ─────────────────────────────────────────────────────────────
import { supabase } from './client.js'

// Inserta una notificación sin depender de supabase.js (evita import circular).
async function notify(userId, { type, title, body, data = null }) {
  const { error } = await supabase.from('notifications').insert({ user_id: userId, type, title, body, data })
  if (error) throw error
}

export const VERIFICATION_GENERAL_STATUS = {
  unverified: { label: 'No verificado', color: '#475569', bg: '#f1f5f9' },
  incomplete: { label: 'Incompleto', color: '#92400e', bg: '#fef3c7' },
  pending: { label: 'Pendiente', color: '#92400e', bg: '#fef3c7' },
  pending_review: { label: 'Pendiente de revisión', color: '#1e40af', bg: '#dbeafe' },
  under_review: { label: 'En revisión', color: '#1e40af', bg: '#dbeafe' },
  verified: { label: 'Verificado', color: '#166534', bg: '#dcfce7' },
  rejected: { label: 'Rechazado', color: '#991b1b', bg: '#fee2e2' },
  needs_correction: { label: 'Necesita corrección', color: '#9a3412', bg: '#ffedd5' },
  suspended: { label: 'Suspendido', color: '#991b1b', bg: '#fee2e2' },
  expired: { label: 'Vencido', color: '#6b21a8', bg: '#f3e8ff' },
}

export const VERIFICATION_STEP_STATUS = {
  not_started: { label: 'No iniciado', color: '#64748b', bg: '#f1f5f9' },
  in_progress: { label: 'En progreso', color: '#92400e', bg: '#fef3c7' },
  submitted: { label: 'Enviado', color: '#1e40af', bg: '#dbeafe' },
  approved: { label: 'Aprobado', color: '#166534', bg: '#dcfce7' },
  rejected: { label: 'Rechazado', color: '#991b1b', bg: '#fee2e2' },
  needs_correction: { label: 'Necesita corrección', color: '#9a3412', bg: '#ffedd5' },
}

export const VERIFICATION_STEPS = [
  { key: 'account_basic', name: 'Registro básico', required: true, group: 'Cuenta', icon: '👤', description: 'Nombre, correo, teléfono y dirección general de la cuenta.' },
  { key: 'email_verification', name: 'Verificación de correo', required: true, group: 'Cuenta', icon: '📧', description: 'Confirma tu correo para continuar con la verificación.' },
  { key: 'phone_verification', name: 'Verificación de teléfono', required: true, group: 'Cuenta', icon: '📱', description: 'Confirma un número válido de Panamá para recibir solicitudes.' },
  { key: 'personal_info', name: 'Información personal', required: true, group: 'Identidad', icon: '🪪', description: 'Datos legales exactamente como aparecen en tu documento.' },
  { key: 'identity_document', name: 'Documento de identidad', required: true, group: 'Identidad', icon: '🧾', description: 'Cédula frontal y trasera, pasaporte o documento alternativo.' },
  { key: 'selfie', name: 'Selfie o confirmación', required: true, group: 'Identidad', icon: '🤳', description: 'Foto clara de tu rostro para confirmar identidad.' },
  { key: 'proof_of_address', name: 'Comprobante de domicilio', required: true, group: 'Identidad', icon: '🏠', description: 'Documento reciente y legible que confirme tu dirección.' },
  { key: 'professional_info', name: 'Información profesional', required: true, group: 'Perfil', icon: '🛠️', description: 'Título, descripción, experiencia, disponibilidad y tipo de técnico.' },
  { key: 'service_categories', name: 'Categorías y servicios', required: true, group: 'Perfil', icon: '🗂️', description: 'Oficios y servicios específicos que ofreces.' },
  { key: 'coverage_area', name: 'Área de cobertura', required: true, group: 'Perfil', icon: '📍', description: 'Provincias, distritos o radio donde atiendes.' },
  { key: 'work_experience', name: 'Experiencia laboral', required: false, group: 'Confianza', icon: '📋', description: 'Trabajos, empresas o proyectos relevantes.' },
  { key: 'certifications', name: 'Certificados y licencias', required: false, group: 'Confianza', icon: '🎓', description: 'Diplomas, licencias o permisos que aumentan confianza.' },
  { key: 'portfolio', name: 'Portafolio de trabajos', required: false, group: 'Confianza', icon: '🖼️', description: 'Fotos antes/después o evidencias de trabajos realizados.' },
  { key: 'activity_questionnaire', name: 'Cuestionario de actividad', required: true, group: 'Declaración', icon: '🧭', description: 'Cómo trabajas, herramientas, emergencias, clientes y enlaces.' },
  { key: 'consent', name: 'Declaración y consentimiento', required: true, group: 'Declaración', icon: '✅', description: 'Acepta términos, privacidad, revisión de documentos y veracidad.' },
]

export const PANAMA_PROVINCES = [
  'Bocas del Toro', 'Chiriquí', 'Veraguas', 'Coclé', 'Herrera', 'Los Santos',
  'Panamá', 'Panamá Oeste', 'Colón', 'Darién', 'Comarca Ngäbe-Buglé',
  'Comarca Guna Yala', 'Comarca Emberá-Wounaan',
]

const VERIFICATION_BUCKET = 'technician-verification-documents'
const ALLOWED_VERIFICATION_MIME = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_VERIFICATION_FILE_SIZE = 10 * 1024 * 1024

function safeFileName(name = 'documento') {
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 90)
}

function normalizeVerificationStatus(status) {
  if (status === 'pending') return 'pending_review'
  return status || 'unverified'
}

function progressFromSteps(steps = []) {
  const required = VERIFICATION_STEPS.filter(s => s.required)
  const byKey = Object.fromEntries((steps || []).map(s => [s.step_key, s]))
  const done = required.filter(s => ['submitted', 'approved'].includes(byKey[s.key]?.status)).length
  return Math.round((done / required.length) * 100)
}

function checkVerificationFile(file) {
  if (!file) throw new Error('Selecciona un archivo.')
  if (!ALLOWED_VERIFICATION_MIME.includes(file.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG o PDF.')
  }
  if (file.size <= 0) throw new Error('El archivo está vacío.')
  if (file.size > MAX_VERIFICATION_FILE_SIZE) {
    throw new Error('El archivo supera el máximo permitido de 10 MB.')
  }
}

async function logVerificationEvent({ technicianId, adminId = null, action, previousStatus = null, newStatus = null, documentId = null, stepKey = null, reason = null, comment = null }) {
  await supabase.from('verification_audit_logs').insert({
    technician_id: technicianId,
    admin_id: adminId,
    action,
    previous_status: previousStatus,
    new_status: newStatus,
    document_id: documentId,
    step_key: stepKey,
    reason,
    comment,
  }).catch(() => {})
}

export const verificationApi = {
  steps: VERIFICATION_STEPS,

  validateFile: checkVerificationFile,

  async ensureTechnicianProfile(userId) {
    let { data, error } = await supabase
      .from('technician_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    if (data) return data

    const res = await supabase
      .from('technician_profiles')
      .insert({
        user_id: userId,
        verification_status: 'unverified',
        professional_title: '',
        bio: '',
        city: 'Panamá',
        province: 'Panamá',
      })
      .select()
      .single()
    if (res.error) throw res.error
    return res.data
  },

  async ensureSteps(userId) {
    const rows = VERIFICATION_STEPS.map(step => ({
      technician_id: userId,
      step_key: step.key,
      step_name: step.name,
      required: step.required,
      status: 'not_started',
    }))
    const { error } = await supabase
      .from('technician_verification_steps')
      .upsert(rows, { onConflict: 'technician_id,step_key', ignoreDuplicates: true })
    if (error) throw error
  },

  async getStatus(userId) {
    await verificationApi.ensureTechnicianProfile(userId)
    await verificationApi.ensureSteps(userId)

    const [profileRes, stepsRes, docsRes, questionnaireRes] = await Promise.all([
      supabase.from('technician_profiles').select('*').eq('user_id', userId).single(),
      supabase.from('technician_verification_steps').select('*').eq('technician_id', userId).order('created_at'),
      supabase.from('technician_documents').select('*').eq('technician_id', userId).order('created_at', { ascending: false }),
      supabase.from('technician_questionnaire').select('*').eq('technician_id', userId).maybeSingle(),
    ])
    if (profileRes.error) throw profileRes.error
    if (stepsRes.error) throw stepsRes.error
    if (docsRes.error) throw docsRes.error
    if (questionnaireRes.error && questionnaireRes.error.code !== 'PGRST116') throw questionnaireRes.error

    const steps = VERIFICATION_STEPS.map(def => {
      const saved = stepsRes.data?.find(s => s.step_key === def.key)
      return { ...def, ...(saved || {}), status: saved?.status || 'not_started' }
    })
    const progress = profileRes.data?.verification_progress ?? progressFromSteps(steps)
    return {
      profile: { ...profileRes.data, verification_status: normalizeVerificationStatus(profileRes.data?.verification_status) },
      steps,
      documents: docsRes.data ?? [],
      questionnaire: questionnaireRes.data ?? null,
      progress,
    }
  },

  async saveStep(userId, stepKey, payload = {}, status = 'submitted') {
    const before = await supabase
      .from('technician_verification_steps')
      .select('status')
      .eq('technician_id', userId)
      .eq('step_key', stepKey)
      .maybeSingle()

    const step = VERIFICATION_STEPS.find(s => s.key === stepKey)
    const { error } = await supabase.from('technician_verification_steps').upsert({
      technician_id: userId,
      step_key: stepKey,
      step_name: step?.name || stepKey,
      required: step?.required ?? true,
      status,
      submitted_at: ['submitted', 'approved'].includes(status) ? new Date().toISOString() : null,
      payload,
      rejection_reason: null,
      correction_message: null,
    }, { onConflict: 'technician_id,step_key' })
    if (error) throw error

    await verificationApi.refreshProgress(userId)
    await logVerificationEvent({
      technicianId: userId,
      action: `step_${status}`,
      previousStatus: before.data?.status || 'not_started',
      newStatus: status,
      stepKey,
    })
  },

  async refreshProgress(userId) {
    const { data: steps, error } = await supabase
      .from('technician_verification_steps')
      .select('step_key,status')
      .eq('technician_id', userId)
    if (error) throw error
    const progress = progressFromSteps(steps)
    const profile = await supabase
      .from('technician_profiles')
      .select('verification_status')
      .eq('user_id', userId)
      .single()
    const current = normalizeVerificationStatus(profile.data?.verification_status)
    const next = progress > 0 && current === 'unverified' ? 'incomplete' : current
    const { error: upErr } = await supabase
      .from('technician_profiles')
      .update({ verification_progress: progress, verification_status: next })
      .eq('user_id', userId)
    if (upErr) throw upErr
    return progress
  },

  async savePersonalInfo(userId, payload) {
    const critical = {
      legal_name: payload.legal_name,
      document_number: payload.document_number,
      date_of_birth: payload.date_of_birth,
      nationality: payload.nationality,
      gender: payload.gender || null,
      address_text: payload.address_text,
      province: payload.province,
      district: payload.district,
      corregimiento: payload.corregimiento,
      address_reference: payload.address_reference,
      secondary_phone: payload.secondary_phone || null,
      emergency_contact: payload.emergency_contact || null,
      emergency_phone: payload.emergency_phone || null,
    }
    const fullUpdate = await supabase
      .from('technician_profiles')
      .update({
        national_id: payload.document_number,
        address_text: payload.address_text,
        city: payload.district || payload.city || payload.province,
        province: payload.province,
        application_data: critical,
      })
      .eq('user_id', userId)
    if (fullUpdate.error) {
      const compactUpdate = await supabase
        .from('technician_profiles')
        .update({
          national_id: payload.document_number,
          city: payload.district || payload.city || payload.province,
          province: payload.province,
          application_data: critical,
        })
        .eq('user_id', userId)
      if (compactUpdate.error) {
        const minimalUpdate = await supabase
          .from('technician_profiles')
          .update({ application_data: critical })
          .eq('user_id', userId)
        if (minimalUpdate.error) throw fullUpdate.error
      }
    }
    await verificationApi.saveStep(userId, 'personal_info', critical)
  },

  async saveProfessionalInfo(userId, payload) {
    if ((payload.professional_description || '').trim().length < 100) {
      throw new Error('La descripción profesional debe tener mínimo 100 caracteres.')
    }
    const { error } = await supabase
      .from('technician_profiles')
      .update({
        professional_title: payload.profile_title,
        bio: payload.professional_description,
        years_experience: Number(payload.years_experience || 0),
        is_available: payload.availability !== 'Por cita',
        response_time_minutes: payload.emergency_service ? 30 : 60,
      })
      .eq('user_id', userId)
    if (error) throw error
    await verificationApi.saveStep(userId, 'professional_info', payload)
  },

  async saveCoverage(userId, payload) {
    await supabase.from('technician_coverage_areas').delete().eq('technician_id', userId)
    const rows = (payload.coverage_type === 'all_country' ? ['Todo Panamá'] : (payload.provinces || []))
      .map(province => ({
        technician_id: userId,
        province,
        district: payload.district || null,
        corregimiento: payload.corregimiento || null,
        covers_all_country: payload.coverage_type === 'all_country',
        coverage_radius_km: Number(payload.coverage_radius_km || 0) || null,
      }))
    if (rows.length) {
      const { error } = await supabase.from('technician_coverage_areas').insert(rows)
      if (error) throw error
    }
    const { error: upErr } = await supabase
      .from('technician_profiles')
      .update({
        province: payload.provinces?.[0] || payload.province || 'Panamá',
        city: payload.district || payload.provinces?.[0] || 'Panamá',
        service_radius_km: Number(payload.coverage_radius_km || 15),
      })
      .eq('user_id', userId)
    if (upErr) throw upErr
    await verificationApi.saveStep(userId, 'coverage_area', payload)
  },

  async saveQuestionnaire(userId, payload) {
    const { error } = await supabase.from('technician_questionnaire').upsert({
      technician_id: userId,
      ...payload,
      social_links: payload.social_links || {},
      updated_at: new Date().toISOString(),
    }, { onConflict: 'technician_id' })
    if (error) throw error
    await verificationApi.saveStep(userId, 'activity_questionnaire', payload)
  },

  async uploadDocument(userId, { stepKey, documentType, file, meta = {} }) {
    checkVerificationFile(file)
    const filename = safeFileName(file.name)
    const path = `${userId}/${documentType}/${Date.now()}_${filename}`
    const { error: upErr } = await supabase.storage
      .from(VERIFICATION_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type })
    if (upErr) throw upErr

    const { data, error } = await supabase
      .from('technician_documents')
      .insert({
        technician_id: userId,
        document_type: documentType,
        file_path: path,
        file_name: filename,
        file_mime_type: file.type,
        file_size: file.size,
        status: 'submitted',
        expiration_date: meta.expiration_date || null,
        metadata: meta,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error

    await verificationApi.saveStep(userId, stepKey, { document_type: documentType, document_id: data.id }, 'submitted')
    await logVerificationEvent({ technicianId: userId, action: 'document_submitted', documentId: data.id, stepKey, newStatus: 'submitted' })
    return data
  },

  async signedDocumentUrl(filePath, expiresIn = 300) {
    const { data, error } = await supabase.storage
      .from(VERIFICATION_BUCKET)
      .createSignedUrl(filePath, expiresIn)
    if (error) throw error
    return data.signedUrl
  },

  async resendEmailVerification(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) throw error
  },

  async markEmailVerified(userId) {
    await verificationApi.saveStep(userId, 'email_verification', { verified_at: new Date().toISOString() }, 'approved')
  },

  /** Fallback: deja el teléfono en revisión manual (cuando no hay SMS configurado). */
  async markPhoneSubmitted(userId, phone) {
    await verificationApi.saveStep(userId, 'phone_verification', { phone, provider: 'manual_review' }, 'submitted')
  },

  /**
   * Envía un código OTP por SMS al teléfono (Edge Function send-otp).
   * Devuelve { ok, delivery, devCode?, cooldownSeconds }. Si la función no está
   * desplegada, lanza para que la UI ofrezca el fallback de revisión manual.
   */
  async sendPhoneOtp(phone) {
    const { data, error } = await supabase.functions.invoke('send-otp', { body: { phone } })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return data
  },

  /**
   * Verifica el código OTP (Edge Function verify-otp). En éxito, la función ya
   * marcó el paso 'phone_verification' como aprobado en el servidor.
   */
  async verifyPhoneOtp(phone, code) {
    const { data, error } = await supabase.functions.invoke('verify-otp', { body: { phone, code } })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return data
  },

  async submitForReview(userId) {
    const status = await verificationApi.getStatus(userId)
    const missing = VERIFICATION_STEPS
      .filter(s => s.required)
      .filter(def => !['submitted', 'approved'].includes(status.steps.find(s => s.key === def.key || s.step_key === def.key)?.status))
    if (missing.length) {
      throw new Error(`Faltan pasos obligatorios: ${missing.map(s => s.name).join(', ')}.`)
    }
    const before = status.profile.verification_status
    const { error } = await supabase
      .from('technician_profiles')
      .update({
        verification_status: 'pending_review',
        verification_submitted_at: new Date().toISOString(),
        verification_progress: 100,
      })
      .eq('user_id', userId)
    if (error) throw error
    await logVerificationEvent({ technicianId: userId, action: 'submitted_for_review', previousStatus: before, newStatus: 'pending_review' })
    return true
  },
}

export const verificationAdminApi = {
  async list({ status = 'all', province = 'all' } = {}) {
    let q = supabase
      .from('technician_profiles')
      .select('*, profiles!technician_profiles_user_id_fkey(full_name,email,avatar_url)')
      .order('verification_submitted_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
    if (status !== 'all') q = q.eq('verification_status', status)
    if (province !== 'all') q = q.eq('province', province)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },

  async getCase(userId) {
    const status = await verificationApi.getStatus(userId)
    const [coverage, logs] = await Promise.all([
      supabase.from('technician_coverage_areas').select('*').eq('technician_id', userId).catch(() => ({ data: [] })),
      supabase.from('verification_audit_logs').select('*').eq('technician_id', userId).order('created_at', { ascending: false }).catch(() => ({ data: [] })),
    ])
    return { ...status, coverage: coverage.data ?? [], logs: logs.data ?? [] }
  },

  async markUnderReview(userId, adminId) {
    const { data: before } = await supabase.from('technician_profiles').select('verification_status').eq('user_id', userId).single()
    const { error } = await supabase.from('technician_profiles')
      .update({ verification_status: 'under_review', reviewed_by: adminId })
      .eq('user_id', userId)
    if (error) throw error
    await logVerificationEvent({ technicianId: userId, adminId, action: 'marked_under_review', previousStatus: before?.verification_status, newStatus: 'under_review' })
  },

  async reviewStep(userId, stepKey, { status, reason = null, correctionMessage = null, adminId }) {
    const { data: before } = await supabase
      .from('technician_verification_steps')
      .select('status')
      .eq('technician_id', userId)
      .eq('step_key', stepKey)
      .maybeSingle()
    const patch = {
      status,
      reviewed_by: adminId,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
      rejected_at: ['rejected', 'needs_correction'].includes(status) ? new Date().toISOString() : null,
      rejection_reason: reason,
      correction_message: correctionMessage,
    }
    const { error } = await supabase
      .from('technician_verification_steps')
      .update(patch)
      .eq('technician_id', userId)
      .eq('step_key', stepKey)
    if (error) throw error
    if (status === 'needs_correction') {
      await supabase.from('technician_profiles').update({ verification_status: 'needs_correction' }).eq('user_id', userId)
    }
    await logVerificationEvent({ technicianId: userId, adminId, action: `step_${status}`, previousStatus: before?.status, newStatus: status, stepKey, reason, comment: correctionMessage })
  },

  async reviewDocument(documentId, { status, reason = null, correctionMessage = null, adminId }) {
    const { data: doc, error: getErr } = await supabase.from('technician_documents').select('*').eq('id', documentId).single()
    if (getErr) throw getErr
    const { error } = await supabase
      .from('technician_documents')
      .update({
        status,
        reviewed_by: adminId,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
        rejected_at: ['rejected', 'needs_correction'].includes(status) ? new Date().toISOString() : null,
        rejection_reason: reason || correctionMessage,
      })
      .eq('id', documentId)
    if (error) throw error
    if (status === 'needs_correction') {
      await supabase.from('technician_profiles').update({ verification_status: 'needs_correction' }).eq('user_id', doc.technician_id)
    }
    await logVerificationEvent({ technicianId: doc.technician_id, adminId, action: `document_${status}`, previousStatus: doc.status, newStatus: status, documentId, reason, comment: correctionMessage })
  },

  async approveTechnician(userId, adminId) {
    const { data: before } = await supabase.from('technician_profiles').select('verification_status').eq('user_id', userId).single()
    const { error } = await supabase
      .from('technician_profiles')
      .update({
        verification_status: 'verified',
        verification_progress: 100,
        verified_at: new Date().toISOString(),
        verified_by: adminId,
        reviewed_by: adminId,
        rejected_reason: null,
      })
      .eq('user_id', userId)
    if (error) throw error
    await supabase.from('technician_verification_steps').update({ status: 'approved', reviewed_by: adminId, approved_at: new Date().toISOString() }).eq('technician_id', userId).neq('status', 'approved')
    await notify(userId, {
      type: 'verification',
      title: 'Técnico verificado',
      body: '¡Felicidades! Tu perfil ha sido verificado. Ahora los clientes podrán ver tu insignia de técnico verificado.',
    }).catch(() => {})
    await logVerificationEvent({ technicianId: userId, adminId, action: 'technician_approved', previousStatus: before?.verification_status, newStatus: 'verified' })
  },

  async rejectTechnician(userId, adminId, reason) {
    const { data: before } = await supabase.from('technician_profiles').select('verification_status').eq('user_id', userId).single()
    const { error } = await supabase
      .from('technician_profiles')
      .update({ verification_status: 'rejected', rejected_reason: reason, reviewed_by: adminId })
      .eq('user_id', userId)
    if (error) throw error
    await notify(userId, {
      type: 'verification',
      title: 'Solicitud de verificación rechazada',
      body: reason || 'Tu solicitud fue rechazada. Revisa los motivos indicados y contacta soporte si necesitas más información.',
    }).catch(() => {})
    await logVerificationEvent({ technicianId: userId, adminId, action: 'technician_rejected', previousStatus: before?.verification_status, newStatus: 'rejected', reason })
  },

  async requestCorrection(userId, adminId, { stepKey, reason, correctionMessage }) {
    await verificationAdminApi.reviewStep(userId, stepKey, { status: 'needs_correction', reason, correctionMessage, adminId })
    await notify(userId, {
      type: 'verification',
      title: 'Necesitas corregir información',
      body: correctionMessage || reason || 'Algunos documentos no pudieron ser aprobados. Revisa los motivos y vuelve a enviar.',
    }).catch(() => {})
  },

  async suspendTechnician(userId, adminId, reason) {
    const { data: before } = await supabase.from('technician_profiles').select('verification_status').eq('user_id', userId).single()
    const { error } = await supabase.from('technician_profiles')
      .update({ verification_status: 'suspended', suspended_reason: reason, reviewed_by: adminId })
      .eq('user_id', userId)
    if (error) throw error
    await logVerificationEvent({ technicianId: userId, adminId, action: 'technician_suspended', previousStatus: before?.verification_status, newStatus: 'suspended', reason })
  },

  async reactivateTechnician(userId, adminId) {
    const { data: before } = await supabase.from('technician_profiles').select('verification_status').eq('user_id', userId).single()
    const { error } = await supabase.from('technician_profiles')
      .update({ verification_status: 'verified', suspended_reason: null, reviewed_by: adminId })
      .eq('user_id', userId)
    if (error) throw error
    await logVerificationEvent({ technicianId: userId, adminId, action: 'technician_reactivated', previousStatus: before?.verification_status, newStatus: 'verified' })
  },
}
