// ============================================================
//  supabase.secure.js — Wrappers seguros sobre supabase.js
//  Integra sanitización en auth, perfiles y solicitudes.
//  INSTRUCCIONES: importa estas funciones en lugar de las
//  originales en los archivos que manejan input del usuario.
// ============================================================
import { supabase } from './supabase.js'
import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeText,
  sanitizeNumber,
  sanitizeUUID,
  sanitizeURL,
  sanitizeSearch,
  sanitizeRole,
  sanitizeFormData,
  detectMaliciousInput,
  SCHEMAS,
} from './sanitize.js'
import { checkRateLimit, RATE_LIMITS } from './security.js'

// ── Helper: loggear y bloquear inputs maliciosos ─────────────
function guardInput(value, fieldName = 'input') {
  const check = detectMaliciousInput(String(value ?? ''))
  if (check.detected) {
    console.warn(`[Security] Intento de ${check.type} detectado en campo "${fieldName}"`)
    // En producción podrías registrar esto en una tabla de auditoría
    throw new Error('Entrada inválida detectada.')
  }
}

// ─────────────────────────────────────────────────────────────
// AUTH — registro, login y recuperación con rate limiting
// ─────────────────────────────────────────────────────────────
export const secureAuth = {
  async signUp({ email, password, fullName, role = 'user' }) {
    // Rate limiting
    const rl = checkRateLimit('register', RATE_LIMITS.register.max, RATE_LIMITS.register.window)
    if (!rl.allowed) {
      throw new Error(`Demasiados intentos. Espera ${rl.retryAfter} segundos.`)
    }

    // Sanitizar
    const cleanEmail    = sanitizeEmail(email)
    const cleanName     = sanitizeString(fullName, { maxLength: 100 })
    const cleanRole     = sanitizeRole(role)

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Email inválido.')
    }
    if (!cleanName.trim()) {
      throw new Error('El nombre es requerido.')
    }
    if (!password || password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.')
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { full_name: cleanName, role: cleanRole } },
    })
    if (error) throw error
    return data
  },

  async signIn({ email, password }) {
    // Rate limiting estricto para login
    const rl = checkRateLimit('login', RATE_LIMITS.login.max, RATE_LIMITS.login.window)
    if (!rl.allowed) {
      throw new Error(`Demasiados intentos. Espera ${rl.retryAfter} segundos.`)
    }

    const cleanEmail = sanitizeEmail(email)
    if (!cleanEmail) throw new Error('Email inválido.')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })
    if (error) throw error
    return data
  },

  async resetPassword(email) {
    const rl = checkRateLimit('resetPassword', RATE_LIMITS.resetPassword.max, RATE_LIMITS.resetPassword.window)
    if (!rl.allowed) {
      throw new Error(`Demasiados intentos. Espera ${rl.retryAfter} segundos.`)
    }

    const cleanEmail = sanitizeEmail(email)
    if (!cleanEmail) throw new Error('Email inválido.')

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  },
}

// ─────────────────────────────────────────────────────────────
// PROFILES — actualización de perfil con sanitización
// ─────────────────────────────────────────────────────────────
export const secureProfiles = {
  async update(userId, updates) {
    const cleanId = sanitizeUUID(userId)
    if (!cleanId) throw new Error('ID de usuario inválido.')

    // Sanitizar todos los campos del perfil
    const clean = sanitizeFormData(updates, SCHEMAS.profile)

    // Eliminar campos vacíos para no sobrescribir con ''
    const payload = Object.fromEntries(
      Object.entries(clean).filter(([_, v]) => v !== '' && v !== null)
    )

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', cleanId)
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// ─────────────────────────────────────────────────────────────
// TECHNICIANS — actualización de perfil técnico
// ─────────────────────────────────────────────────────────────
export const secureTechnicians = {
  async update(userId, updates) {
    const cleanId = sanitizeUUID(userId)
    if (!cleanId) throw new Error('ID inválido.')

    const clean = sanitizeFormData(updates, SCHEMAS.techProfile)

    // Validar coordenadas
    if (updates.latitude !== undefined) {
      const lat = sanitizeNumber(updates.latitude, { min: -90, max: 90 })
      clean.latitude = lat
    }
    if (updates.longitude !== undefined) {
      const lng = sanitizeNumber(updates.longitude, { min: -180, max: 180 })
      clean.longitude = lng
    }

    const payload = Object.fromEntries(
      Object.entries(clean).filter(([_, v]) => v !== '' && v !== null)
    )

    const { data, error } = await supabase
      .from('technician_profiles')
      .update(payload)
      .eq('user_id', cleanId)
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// ─────────────────────────────────────────────────────────────
// SERVICE REQUESTS — crear solicitud con validación completa
// ─────────────────────────────────────────────────────────────
export const secureServiceRequests = {
  async create(payload) {
    // Rate limiting
    const rl = checkRateLimit('createRequest', RATE_LIMITS.createRequest.max, RATE_LIMITS.createRequest.window)
    if (!rl.allowed) {
      throw new Error(`Demasiadas solicitudes. Espera ${rl.retryAfter} segundos.`)
    }

    // Sanitizar
    const clean = sanitizeFormData(payload, SCHEMAS.serviceRequest)

    // Validar IDs requeridos
    if (!clean.client_id)      throw new Error('ID de cliente inválido.')
    if (!clean.technician_id)  throw new Error('ID de técnico inválido.')
    if (!clean.title?.trim())  throw new Error('El título es requerido.')

    // Detectar intentos de inyección en campos de texto libre
    guardInput(payload.title,       'title')
    guardInput(payload.description, 'description')
    guardInput(payload.address,     'address')

    // Validar método de pago
    const validMethods = ['yappy', 'cash', 'transfer']
    const method = validMethods.includes(payload.payment_method)
      ? payload.payment_method
      : 'cash'

    const { data, error } = await supabase
      .from('service_requests')
      .insert({
        ...clean,
        payment_method: method,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// ─────────────────────────────────────────────────────────────
// REVIEWS — crear reseña con sanitización
// ─────────────────────────────────────────────────────────────
export const secureReviews = {
  async create({ serviceRequestId, reviewerId, technicianId, rating, comment }) {
    const cleanReviewerId    = sanitizeUUID(reviewerId)
    const cleanTechnicianId  = sanitizeUUID(technicianId)
    const cleanRating        = sanitizeNumber(rating, { min: 1, max: 5 })
    const cleanComment       = sanitizeText(comment, { maxLength: 1000 })

    if (!cleanReviewerId)   throw new Error('ID de revisor inválido.')
    if (!cleanTechnicianId) throw new Error('ID de técnico inválido.')
    if (!cleanComment.trim()) throw new Error('El comentario es requerido.')

    guardInput(comment, 'comment')

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        service_request_id: sanitizeUUID(serviceRequestId),
        reviewer_id:        cleanReviewerId,
        technician_id:      cleanTechnicianId,
        rating:             cleanRating,
        comment:            cleanComment,
        moderation_status:  'approved',
      })
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// ─────────────────────────────────────────────────────────────
// MESSAGES — enviar mensaje con sanitización y rate limit
// ─────────────────────────────────────────────────────────────
export const secureChat = {
  async send(requestId, senderId, body) {
    // Rate limiting para mensajes
    const rl = checkRateLimit(
      `msg_${senderId}`,
      RATE_LIMITS.sendMessage.max,
      RATE_LIMITS.sendMessage.window
    )
    if (!rl.allowed) {
      throw new Error('Demasiados mensajes. Espera un momento.')
    }

    const cleanRequestId = sanitizeUUID(requestId)
    const cleanSenderId  = sanitizeUUID(senderId)
    const cleanBody      = sanitizeText(body, { maxLength: 2000 })

    if (!cleanRequestId) throw new Error('ID de solicitud inválido.')
    if (!cleanSenderId)  throw new Error('ID de usuario inválido.')
    if (!cleanBody.trim()) throw new Error('El mensaje no puede estar vacío.')

    guardInput(body, 'message_body')

    const { data, error } = await supabase
      .from('messages')
      .insert({
        request_id: cleanRequestId,
        sender_id:  cleanSenderId,
        body:       cleanBody.trim(),
      })
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// ─────────────────────────────────────────────────────────────
// SEARCH — búsqueda sanitizada
// ─────────────────────────────────────────────────────────────
export const secureSearch = {
  async technicians(query, filters = {}) {
    const cleanQuery = sanitizeSearch(query)

    // Nota: Supabase usa consultas parametrizadas internamente,
    // pero sanitizamos igual para mayor seguridad en el cliente.
    let q = supabase.from('technicians_full').select('*')

    if (cleanQuery) {
      q = q.or([
        `full_name.ilike.%${cleanQuery}%`,
        `professional_title.ilike.%${cleanQuery}%`,
        `city.ilike.%${cleanQuery}%`,
      ].join(','))
    }

    if (filters.categorySlug) {
      const cleanSlug = sanitizeString(filters.categorySlug, { maxLength: 50 })
      q = q.or(`category_slug.eq.${cleanSlug},category_slugs.cs.{${cleanSlug}}`)
    }
    if (filters.onlyAvailable) q = q.eq('is_available', true)
    if (filters.onlyVerified)  q = q.eq('verification_status', 'verified')

    const sortBy = ['average_rating', 'min_price', 'total_reviews'].includes(filters.sortBy)
      ? filters.sortBy
      : 'average_rating'
    q = q.order(sortBy, { ascending: sortBy === 'min_price' })

    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },
}

// ─────────────────────────────────────────────────────────────
// DISPUTES — abrir disputa con sanitización y rate limit
// ─────────────────────────────────────────────────────────────
export const secureDisputes = {
  async open(requestId, openedBy, reason, description) {
    const rl = checkRateLimit(
      `dispute_${openedBy}`,
      RATE_LIMITS.openDispute.max,
      RATE_LIMITS.openDispute.window
    )
    if (!rl.allowed) {
      throw new Error(`Límite de disputas alcanzado. Espera ${rl.retryAfter} segundos.`)
    }

    const cleanRequestId = sanitizeUUID(requestId)
    const cleanOpenedBy  = sanitizeUUID(openedBy)
    const cleanReason    = sanitizeString(reason,      { maxLength: 200 })
    const cleanDesc      = sanitizeText(description,   { maxLength: 2000 })

    if (!cleanRequestId) throw new Error('ID de solicitud inválido.')
    if (!cleanOpenedBy)  throw new Error('ID de usuario inválido.')
    if (!cleanReason)    throw new Error('El motivo es requerido.')

    guardInput(reason,      'dispute_reason')
    guardInput(description, 'dispute_description')

    const { data, error } = await supabase
      .from('disputes')
      .insert({
        service_request_id: cleanRequestId,
        opened_by:          cleanOpenedBy,
        reason:             cleanReason,
        description:        cleanDesc,
        status:             'open',
      })
      .select()
      .single()
    if (error) throw error

    await supabase
      .from('service_requests')
      .update({ status: 'disputed', dispute_id: data.id })
      .eq('id', cleanRequestId)

    return data
  },
}
