import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// ── Guard de variables de entorno ────────────────────────────
// Si faltan las env vars la app NO se congela en la pantalla azul;
// cada query simplemente devuelve [] o null con un error en consola.
const ENV_OK = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

if (!ENV_OK) {
  console.error(
    '🚨 TECNIFIX — Variables de entorno faltantes:\n' +
    '  1. Crea un archivo .env en la raíz del proyecto.\n' +
    '  2. Agrega:\n' +
    '       VITE_SUPABASE_URL=https://tu-proyecto.supabase.co\n' +
    '       VITE_SUPABASE_ANON_KEY=tu-anon-key\n' +
    '  3. Las encuentras en: supabase.com → tu proyecto → Settings → API\n' +
    '  4. En Netlify: Site settings → Environment variables.'
  )
}

// Cliente Supabase — funciona aunque las env vars estén vacías
// (las queries fallarán con 401/400 pero NO congelarán la UI)
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })

// ─────────────────────────────────────────────
// AUTH helpers
// ─────────────────────────────────────────────
export const auth = {
  /** Registro de nuevo usuario */
  async signUp({ email, password, fullName, role = 'user' }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    })
    if (error) throw error
    return data
  },

  /** Login */
  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

<<<<<<< HEAD
  /** Reenviar confirmación de correo */
  async resendConfirmation(email) {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    })
    if (error) throw error
    return data
  },

  /** Login con Google OAuth */
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
    return data
  },

=======
>>>>>>> parent of a206e5c (feat: actualizar plataforma Tecnifix)
  /** Logout */
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  /** Recuperar contraseña */
  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  },

  /** Sesión actual */
  async getSession() {
    const { data } = await supabase.auth.getSession()
    return data.session
  },

  /** Usuario actual */
  async getUser() {
    const { data } = await supabase.auth.getUser()
    return data.user
  },

  /**
   * Iniciar sesión / registrarse con un proveedor OAuth (Google o Facebook).
   * Redirige al usuario al proveedor y luego de vuelta a la app.
   * El trigger handle_new_user crea automáticamente el perfil
   * en public.profiles la primera vez que el usuario inicia sesión.
   */
  async signInWithOAuth(provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider, // 'google' | 'facebook'
      options: {
        redirectTo: window.location.origin,
        queryParams: provider === 'google'
          ? { access_type: 'offline', prompt: 'consent' }
          : undefined,
      },
    })
    if (error) throw error
    return data
  },

  /**
   * Lista los proveedores de inicio de sesión vinculados a la cuenta
   * actual (útil para mostrar en Configuración → Seguridad).
   */
  async getLinkedProviders() {
    const { data } = await supabase.auth.getUserIdentities()
    return (data?.identities ?? []).map(i => i.provider)
  },

  /**
   * Vincular un proveedor OAuth adicional a la cuenta ya autenticada
   * (p.ej. usuario que se registró con email y quiere agregar Google).
   */
  async linkOAuthIdentity(provider) {
    const { data, error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
    return data
  },

  /** Desvincular un proveedor OAuth (requiere quedar con al menos 1 método de acceso) */
  async unlinkOAuthIdentity(identity) {
    const { error } = await supabase.auth.unlinkIdentity(identity)
    if (error) throw error
  },
}

// ─────────────────────────────────────────────
// PROFILES helpers
// ─────────────────────────────────────────────
export const profiles = {
  async get(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) throw error
    return data
  },

  async update(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async uploadAvatar(userId, file) {
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (upErr) throw upErr
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    // Guarda la URL en el perfil
    await profiles.update(userId, { avatar_url: data.publicUrl + '?t=' + Date.now() })
    return data.publicUrl
  },
}

// ─────────────────────────────────────────────
// TECHNICIANS helpers
// ─────────────────────────────────────────────
export const technicians = {
  /** Lista completa (vista technicians_full) */
  async list({ categorySlug, onlyAvailable, onlyVerified, sortBy = 'average_rating' } = {}) {
    let q = supabase.from('technicians_full').select('*')
    // Filtrar por slug: busca en category_slug principal O en el array category_slugs
    if (categorySlug) q = q.or(`category_slug.eq.${categorySlug},category_slugs.cs.{${categorySlug}}`)
    if (onlyAvailable) q = q.eq('is_available', true)
    if (onlyVerified) q = q.eq('verification_status', 'verified')
    q = q.order(sortBy, { ascending: sortBy === 'min_price' })
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },

  /** Técnicos cercanos (usa función SQL) */
  async nearby(lat, lng, radiusKm = 20) {
    const { data, error } = await supabase.rpc('technicians_near', {
      lat, lng, radius_km: radiusKm,
    })
    if (error) throw error
    return data ?? []
  },

  /** Perfil completo de un técnico */
  async getOne(userId) {
    const { data, error } = await supabase
      .from('technicians_full')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (error) throw error
    return data
  },

  /** Crear perfil de técnico (primera vez) */
  async create(userId, profileData) {
    const { data, error } = await supabase
      .from('technician_profiles')
      .insert({ user_id: userId, ...profileData })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Actualizar perfil de técnico */
  async update(userId, updates) {
    const { data, error } = await supabase
      .from('technician_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Subir imagen a galería */
  async uploadGalleryImage(userId, file) {
    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('gallery')
      .upload(path, file, { upsert: false })
    if (upErr) throw upErr
    const { data } = supabase.storage.from('gallery').getPublicUrl(path)
    // Insertar en technician_gallery
    await supabase.from('technician_gallery').insert({
      technician_id: userId,
      image_url: data.publicUrl,
    })
    return data.publicUrl
  },

  /** Galería de un técnico */
  async getGallery(userId) {
    const { data, error } = await supabase
      .from('technician_gallery')
      .select('*')
      .eq('technician_id', userId)
      .order('sort_order')
    if (error) throw error
    return data ?? []
  },

  /** Eliminar imagen de galería */
  async deleteGalleryImage(imageId) {
    const { error } = await supabase
      .from('technician_gallery')
      .delete()
      .eq('id', imageId)
    if (error) throw error
  },
}

// ─────────────────────────────────────────────
// TECHNICIAN CATEGORIES helpers
// ─────────────────────────────────────────────
export const techCategories = {
  /** Obtener categorias del tecnico (IDs y slugs) */
  async get(technicianId) {
    const { data, error } = await supabase
      .from('technician_categories')
      .select('category_id')
      .eq('technician_id', technicianId)
    if (error) throw error
    if (!data || data.length === 0) return []

    // Obtener detalles de cada categoria
    const ids = data.map(r => r.category_id)
    const { data: cats, error: err2 } = await supabase
      .from('categories')
      .select('id, slug, name_es, name_en, icon, color')
      .in('id', ids)
    if (err2) throw err2
    return cats ?? []
  },

  /** Guardar categorias (reemplaza todas las anteriores) */
  async set(technicianId, categoryIds) {
    if (!technicianId) throw new Error('technicianId requerido')

    // 1. Borrar todas las anteriores
    const { error: delErr } = await supabase
      .from('technician_categories')
      .delete()
      .eq('technician_id', technicianId)
    if (delErr) throw delErr

    // 2. Si no hay nuevas, terminar
    if (!categoryIds || categoryIds.length === 0) return

    // 3. Insertar nuevas (asegurar que sean integers)
    const rows = categoryIds.map(id => ({
      technician_id: technicianId,
      category_id: parseInt(id),
    }))
    const { error: insErr } = await supabase
      .from('technician_categories')
      .insert(rows)
    if (insErr) throw insErr
  },
}

// ─────────────────────────────────────────────
// CERTIFICATES helpers
// ─────────────────────────────────────────────
export const certificatesApi = {
  /** Listar certificados de un técnico */
  async list(technicianId) {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('technician_id', technicianId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  /** Subir archivo y crear registro */
  async upload(technicianId, file, meta) {
    const ext = file.name.split('.').pop()
    const path = `${technicianId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: upErr } = await supabase.storage
      .from('certificates')
      .upload(path, file, { upsert: false })
    if (upErr) throw upErr

    const { data: { publicUrl } } = supabase.storage
      .from('certificates').getPublicUrl(path)

    const { data, error } = await supabase
      .from('certificates')
      .insert({
        technician_id: technicianId,
        name: meta.name,
        issuer: meta.issuer || null,
        issued_at: meta.issued_at || null,
        expires_at: meta.expires_at || null,
        description: meta.description || null,
        file_type: meta.file_type || 'certificate',
        is_public: meta.is_public !== false,
        file_url: publicUrl,
      })
      .select().single()
    if (error) throw error
    return data
  },

  /** Eliminar certificado */
  async delete(certId) {
    const { error } = await supabase
      .from('certificates').delete().eq('id', certId)
    if (error) throw error
  },

  /** Verificar certificado (solo admin) */
  async verify(certId) {
    const { error } = await supabase
      .from('certificates')
      .update({ is_verified: true })
      .eq('id', certId)
    if (error) throw error
  },
}

// ─────────────────────────────────────────────
// FAVORITES helpers
// ─────────────────────────────────────────────
export const favorites = {
  async list(userId) {
    const { data, error } = await supabase
      .from('favorites')
      .select('technician_id')
      .eq('user_id', userId)
    if (error) throw error
    return (data ?? []).map(r => r.technician_id)
  },

  async add(userId, technicianId) {
    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: userId, technician_id: technicianId })
    if (error && error.code !== '23505') throw error  // ignora duplicado
  },

  async remove(userId, technicianId) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('technician_id', technicianId)
    if (error) throw error
  },

  /** Técnicos completos que el usuario tiene en favoritos */
  async listFull(userId) {
    const ids = await favorites.list(userId)
    if (!ids.length) return []
    const { data, error } = await supabase
      .from('technicians_full')
      .select('*')
      .in('user_id', ids)
    if (error) throw error
    return data ?? []
  },
}

// ─────────────────────────────────────────────
// REVIEWS helpers
// ─────────────────────────────────────────────
export const reviews = {
  async listForTechnician(technicianId, limit = 20) {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:reviewer_id ( full_name, avatar_url )
      `)
      .eq('technician_id', technicianId)
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  },

  async create({ serviceRequestId, reviewerId, technicianId, rating, comment }) {
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        service_request_id: serviceRequestId ?? null,
        reviewer_id: reviewerId,
        technician_id: technicianId,
        rating,
        comment,
        moderation_status: 'approved',
      })
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// ─────────────────────────────────────────────
// SERVICE REQUESTS helpers
// ─────────────────────────────────────────────
export const serviceRequests = {
  async create(payload) {
    const { data, error } = await supabase
      .from('service_requests')
      .insert(payload)
      .select()
      .single()
    if (error) throw error

    // Notificar al tecnico en tiempo real
    try {
      const { data: cp } = await supabase
        .from('profiles').select('full_name').eq('id', payload.client_id).single()
      await supabase.from('notifications').insert({
        user_id: payload.technician_id,
        type: 'new_request',
        title: '\u{1F4CB} Nueva solicitud de servicio',
        body: `${cp?.full_name ?? 'Un cliente'} solicita: ${payload.title}`,
        data: {
          request_id: data.id, client_id: payload.client_id,
          client_name: cp?.full_name ?? 'Cliente',
          title: payload.title, price: payload.agreed_price ?? null
        },
      })
    } catch { /* no bloquear si falla notif */ }

    return data
  },

  /** Eliminar solicitud cancelada */
  async delete(requestId) {
    const { error } = await supabase
      .from('service_requests').delete().eq('id', requestId)
    if (error) throw error
  },

  async listForUser(userId) {
    // Paso 1: traer las solicitudes del usuario (como cliente O como técnico)
    const { data: asClient, error: e1 } = await supabase
      .from('service_requests')
      .select('*')
      .eq('client_id', userId)
      .order('created_at', { ascending: false })
    if (e1) throw e1

    const { data: asTech, error: e2 } = await supabase
      .from('service_requests')
      .select('*')
      .eq('technician_id', userId)
      .order('created_at', { ascending: false })
    if (e2) throw e2

    // Unir y deduplicar
    const all = [...(asClient ?? []), ...(asTech ?? [])]
    const seen = new Set()
    const unique = all.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true })
    unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    // Paso 2: enriquecer con nombre del técnico y del cliente
    const techIds = [...new Set(unique.map(r => r.technician_id).filter(Boolean))]
    const clientIds = [...new Set(unique.map(r => r.client_id).filter(Boolean))]

    const [techProfiles, clientProfiles] = await Promise.all([
      techIds.length > 0
        ? supabase.from('technicians_full').select('user_id, full_name, avatar_url, professional_title').in('user_id', techIds).then(r => r.data ?? [])
        : Promise.resolve([]),
      clientIds.length > 0
        ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', clientIds).then(r => r.data ?? [])
        : Promise.resolve([]),
    ])

    const techMap = Object.fromEntries(techProfiles.map(t => [t.user_id, t]))
    const clientMap = Object.fromEntries(clientProfiles.map(c => [c.id, c]))

    return unique.map(r => ({
      ...r,
      technician_name: techMap[r.technician_id]?.full_name ?? 'Técnico',
      technician_avatar: techMap[r.technician_id]?.avatar_url ?? null,
      technician_title: techMap[r.technician_id]?.professional_title ?? '',
      client_name: clientMap[r.client_id]?.full_name ?? 'Cliente',
      client_avatar: clientMap[r.client_id]?.avatar_url ?? null,
    }))
  },

  async updateStatus(requestId, status) {
    const { data, error } = await supabase
      .from('service_requests')
      .update({ status })
      .eq('id', requestId)
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// ─────────────────────────────────────────────
// SERVICE CATALOG helpers
// ─────────────────────────────────────────────
export const serviceCatalog = {
  PRICE_UNITS: [
    { value: 'por visita', label: 'Por visita', labelEn: 'Per visit' },
    { value: 'por hora', label: 'Por hora', labelEn: 'Per hour' },
    { value: 'por servicio', label: 'Por servicio', labelEn: 'Per service' },
    { value: 'por metro2', label: 'Por metro²', labelEn: 'Per m²' },
    { value: 'por punto', label: 'Por punto', labelEn: 'Per unit' },
    { value: 'por equipo', label: 'Por equipo', labelEn: 'Per equipment' },
    { value: 'por dia', label: 'Por día', labelEn: 'Per day' },
    { value: 'presupuesto', label: 'Por presupuesto', labelEn: 'By quote' },
  ],

  /** Obtener catálogo completo del técnico */
  async list(technicianId) {
    const { data, error } = await supabase
      .from('service_catalog')
      .select('*')
      .eq('technician_id', technicianId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  /** Obtener solo los activos (para perfil público) */
  async listActive(technicianId) {
    const { data, error } = await supabase
      .from('service_catalog')
      .select('*')
      .eq('technician_id', technicianId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  /** Crear servicio */
  async create(technicianId, item) {
    const { data, error } = await supabase
      .from('service_catalog')
      .insert({
        technician_id: technicianId,
        name: item.name.trim(),
        name_en: item.name_en?.trim() || null,
        description: item.description?.trim() || null,
        price: parseFloat(item.price),
        price_unit: item.price_unit || 'por visita',
        is_active: item.is_active !== false,
        sort_order: item.sort_order ?? 0,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Actualizar servicio */
  async update(itemId, technicianId, updates) {
    const { data, error } = await supabase
      .from('service_catalog')
      .update({
        name: updates.name?.trim(),
        name_en: updates.name_en?.trim() || null,
        description: updates.description?.trim() || null,
        price: parseFloat(updates.price),
        price_unit: updates.price_unit,
        is_active: updates.is_active !== false,
        sort_order: updates.sort_order ?? 0,
      })
      .eq('id', itemId)
      .eq('technician_id', technicianId)
      .select()
      .single()
    if (error) throw error
    if (!data) throw new Error('Sin permiso para editar este servicio.')
    return data
  },

  /** Eliminar servicio */
  async delete(itemId, technicianId) {
    const { error } = await supabase
      .from('service_catalog')
      .delete()
      .eq('id', itemId)
      .eq('technician_id', technicianId)
    if (error) throw error
  },

  /** Reordenar servicios */
  async reorder(technicianId, itemIds) {
    const updates = itemIds.map((id, idx) =>
      supabase.from('service_catalog').update({ sort_order: idx })
        .eq('id', id).eq('technician_id', technicianId)
    )
    await Promise.all(updates)
  },
}

// ─────────────────────────────────────────────
// CHAT helpers (mensajería por solicitud)
// ─────────────────────────────────────────────
export const chatApi = {
  /** Listar mensajes de una solicitud */
  async list(requestId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  /** Enviar mensaje */
  async send(requestId, senderId, body) {
    const { data, error } = await supabase
      .from('messages')
      .insert({ request_id: requestId, sender_id: senderId, body: body.trim() })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Marcar como leídos todos los mensajes que NO son del usuario actual */
  async markRead(requestId, userId) {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('request_id', requestId)
      .neq('sender_id', userId)
      .eq('is_read', false)
  },

  /** Contar mensajes no leídos de una solicitud (de la otra parte) */
  async countUnread(requestId, userId) {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('request_id', requestId)
      .neq('sender_id', userId)
      .eq('is_read', false)
    return count ?? 0
  },

  /** Suscribirse en tiempo real a nuevos mensajes de una solicitud */
  subscribe(requestId, onInsert) {
    const channel = supabase
      .channel(`messages:${requestId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `request_id=eq.${requestId}`,
      }, (payload) => onInsert(payload.new))
      .subscribe()
    return () => supabase.removeChannel(channel)
  },
}

// ─────────────────────────────────────────────
// ARCHIVE helpers
// ─────────────────────────────────────────────
export const archiveApi = {
  /** Archivar una solicitud (solo si tiene recibo) */
  async archiveRequest(requestId, userId) {
    // Verificar que tiene recibo
    const { data: receipt } = await supabase
      .from('receipts')
      .select('id')
      .eq('service_request_id', requestId)
      .single()

    if (!receipt) {
      throw new Error('Genera y descarga el recibo antes de archivar.')
    }

    const { data, error } = await supabase
      .from('service_requests')
      .update({ archive_status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', requestId)
      .or(`client_id.eq.${userId},technician_id.eq.${userId}`)
      .select('id, archive_status')
    if (error) throw error
    if (!data?.length) throw new Error('Sin permiso para archivar esta solicitud.')
    return data[0]
  },

  /** Eliminar definitivamente una solicitud archivada */
  async deleteArchivedRequest(requestId, userId) {
    // Verificar que está archivada y tiene recibo
    const { data: req } = await supabase
      .from('service_requests')
      .select('id, archive_status, title')
      .eq('id', requestId)
      .single()
    if (!req) throw new Error('Solicitud no encontrada.')
    if (req.archive_status !== 'archived') throw new Error('Solo se pueden eliminar solicitudes archivadas.')

    // Marcar como deleted (no eliminar físicamente para mantener integridad)
    const { error } = await supabase
      .from('service_requests')
      .update({ archive_status: 'deleted' })
      .eq('id', requestId)
    if (error) throw error
  },

  /** Cargar solicitudes separadas por estado */
  async listByStatus(userId, archiveStatus = 'active') {
    const { data: asClient, error: e1 } = await supabase
      .from('service_requests')
      .select('*')
      .eq('client_id', userId)
      .eq('archive_status', archiveStatus)
      .neq('archive_status', 'deleted')
      .order('created_at', { ascending: false })
    if (e1) throw e1

    const { data: asTech, error: e2 } = await supabase
      .from('service_requests')
      .select('*')
      .eq('technician_id', userId)
      .eq('archive_status', archiveStatus)
      .neq('archive_status', 'deleted')
      .order('created_at', { ascending: false })
    if (e2) throw e2

    const all = [...(asClient ?? []), ...(asTech ?? [])]
    const seen = new Set()
    const unique = all.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true })
    unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    // Enriquecer con nombres
    const techIds = [...new Set(unique.map(r => r.technician_id).filter(Boolean))]
    const clientIds = [...new Set(unique.map(r => r.client_id).filter(Boolean))]

    const [techProfiles, clientProfiles] = await Promise.all([
      techIds.length > 0
        ? supabase.from('technicians_full').select('user_id, full_name, avatar_url, professional_title').in('user_id', techIds).then(r => r.data ?? [])
        : Promise.resolve([]),
      clientIds.length > 0
        ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', clientIds).then(r => r.data ?? [])
        : Promise.resolve([]),
    ])

    const techMap = Object.fromEntries(techProfiles.map(t => [t.user_id, t]))
    const clientMap = Object.fromEntries(clientProfiles.map(c => [c.id, c]))

    return unique.map(r => ({
      ...r,
      technician_name: techMap[r.technician_id]?.full_name ?? 'Técnico',
      technician_avatar: techMap[r.technician_id]?.avatar_url ?? null,
      technician_title: techMap[r.technician_id]?.professional_title ?? '',
      client_name: clientMap[r.client_id]?.full_name ?? 'Cliente',
      client_avatar: clientMap[r.client_id]?.avatar_url ?? null,
    }))
  },
}

// ─────────────────────────────────────────────
// RECEIPTS LIST helpers
// ─────────────────────────────────────────────
export const receiptsApi = {
  /** Todos los recibos del usuario (como cliente o técnico) */
  async listForUser(userId) {
    const { data: asClient, error: e1 } = await supabase
      .from('receipts')
      .select('*')
      .eq('client_id', userId)
      .order('issued_at', { ascending: false })
    if (e1) throw e1

    const { data: asTech, error: e2 } = await supabase
      .from('receipts')
      .select('*')
      .eq('technician_id', userId)
      .order('issued_at', { ascending: false })
    if (e2) throw e2

    const all = [...(asClient ?? []), ...(asTech ?? [])]
    const seen = new Set()
    return all.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true })
      .sort((a, b) => new Date(b.issued_at) - new Date(a.issued_at))
  },

  /** Marcar recibo como descargado */
  async markDownloaded(receiptId, userId, role) {
    const field = role === 'technician' ? 'downloaded_by_tech' : 'downloaded_by_client'
    await supabase
      .from('receipts')
      .update({
        [field]: true,
        download_count: supabase.rpc ? undefined : undefined, // incrementado via trigger en prod
      })
      .eq('id', receiptId)
      .or(`client_id.eq.${userId},technician_id.eq.${userId}`)
  },
}

// ─────────────────────────────────────────────
// CONTRACTS helpers
// ─────────────────────────────────────────────
export const contracts = {
  TERMS_TEXT: `
CONTRATO DE PRESTACIÓN DE SERVICIOS TÉCNICOS — CHANGUINOLA PRO
Versión 1.0

PARTES: El presente contrato se celebra entre el USUARIO (cliente) y el TÉCNICO, ambos identificados en la plataforma TECNIFIX.

OBJETO: El Técnico se compromete a prestar el servicio solicitado conforme a los estándares profesionales y las especificaciones acordadas.

PRECIO: El precio final será acordado entre ambas partes antes del inicio del servicio. El precio mínimo referencial es el indicado en el perfil del Técnico.

RESPONSABILIDADES DEL TÉCNICO: Responde por daños causados por negligencia comprobada. Deberá presentarse en el tiempo acordado y con las herramientas necesarias.

RESPONSABILIDADES DEL USUARIO: Facilitar el acceso al lugar del servicio y proporcionar información veraz sobre el problema.

INTERMEDIARIO: TECNIFIX actúa únicamente como plataforma de conexión y no es responsable de la ejecución del servicio.

DISPUTAS: Ante cualquier conflicto, ambas partes se comprometen a resolver primero mediante mediación a través de TECNIFIX antes de acudir a instancias legales.

VIGENCIA: Este contrato entra en vigor al ser aceptado digitalmente por el Usuario y es válido hasta la finalización del servicio.

Nota legal: Este contrato es de carácter referencial. Para servicios de alta envergadura se recomienda consultar con un abogado.
  `.trim(),

  async create({ serviceRequestId, clientId, technicianId, clientIp }) {
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${clientId}${technicianId}${Date.now()}`)
    )
    const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        service_request_id: serviceRequestId,
        client_id: clientId,
        technician_id: technicianId,
        terms_snapshot: contracts.TERMS_TEXT,
        client_signed_at: new Date().toISOString(),
        client_ip: clientIp ?? null,
        client_user_agent: navigator.userAgent,
        status: 'signed_client',
        signature_hash: hashHex,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getForRequest(serviceRequestId) {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('service_request_id', serviceRequestId)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data ?? null
  },
}

// ─────────────────────────────────────────────
// NOTIFICATIONS helpers
// ─────────────────────────────────────────────
export const notifications = {
  async list(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data ?? []
  },

  async markRead(notifId) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId)
  },

  async markAllRead(userId) {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
  },

  /** Suscripción en tiempo real */
  subscribe(userId, callback) {
    return supabase
      .channel(`notifs:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => callback(payload.new))
      .subscribe()
  },

  /** Crear una notificación (desde admin o trigger) */
  async create(userId, { type, title, body, data: dataJson }) {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId, type, title, body, data: dataJson,
    })
    if (error) throw error
  },
}

// ─────────────────────────────────────────────
// PAYMENTS / YAPPY helpers
// ─────────────────────────────────────────────
export const payments = {
  /**
   * Genera un deep link de Yappy para pagar.
   * Yappy no tiene API pública REST — el flujo es:
   *   1. Abrir deep link → usuario paga en app Yappy
   *   2. Yappy redirige de vuelta (si se configura en comercio)
   *   3. Registrar el pago manualmente o via webhook futuro
   *
   * Deep link oficial de Yappy Panamá:
   *   yappy://pay?phone=NUMBER&amount=AMOUNT&description=TEXT
   */
  generateYappyLink({ phone, amount, description }) {
    const desc = encodeURIComponent(description.slice(0, 80))
    return `yappy://pay?phone=${phone}&amount=${amount}&description=${desc}`
  },

  /** También genera link web por si no tienen la app */
  generateYappyWebLink({ phone, amount, description }) {
    const desc = encodeURIComponent(description.slice(0, 80))
    return `https://yappy.com.pa/pay?phone=${phone}&amount=${amount}&description=${desc}`
  },

  /** Registrar un pago en la BD */
  async record({ serviceRequestId, payerId, technicianId, amount, yappyPhone, yappyReference }) {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        service_request_id: serviceRequestId,
        payer_id: payerId,
        technician_id: technicianId,
        amount,
        method: 'yappy',
        yappy_phone: yappyPhone,
        yappy_reference: yappyReference ?? null,
        status: 'completed',
        paid_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    // Actualizar estado de solicitud
    await supabase.from('service_requests')
      .update({ payment_status: 'paid', payment_method: 'yappy', payment_ref: yappyReference ?? null })
      .eq('id', serviceRequestId)
    return data
  },

  async listForUser(userId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*, service_request:service_request_id(title, status)')
      .or(`payer_id.eq.${userId},technician_id.eq.${userId}`)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },
}

// ─────────────────────────────────────────────
// ADMIN helpers
// ─────────────────────────────────────────────
export const admin = {
  async listAllUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async listAllTechnicians() {
    const { data, error } = await supabase
      .from('technicians_full')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async listPendingReviews() {
    // reviewer_id → profiles (full_name directo)
    // technician_id → technician_profiles → profiles (full_name via join)
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:reviewer_id ( full_name, avatar_url ),
        tech_profile:technician_id (
          user_id,
          profiles!technician_profiles_user_id_fkey ( full_name, avatar_url )
        )
      `)
      .eq('moderation_status', 'pending')
      .order('created_at', { ascending: false })
    if (error) throw error

    // Normalizar para que r.technician.full_name siempre funcione
    return (data ?? []).map(r => ({
      ...r,
      technician: {
        full_name: r.tech_profile?.profiles?.full_name ?? 'Técnico',
        avatar_url: r.tech_profile?.profiles?.avatar_url ?? null,
      }
    }))
  },

  async approveReview(reviewId) {
    await supabase.from('reviews').update({ moderation_status: 'approved' }).eq('id', reviewId)
  },

  async rejectReview(reviewId) {
    await supabase.from('reviews').update({ moderation_status: 'rejected' }).eq('id', reviewId)
  },

  async verifyTechnician(userId) {
    const { data, error } = await supabase
      .from('technician_profiles')
      .update({ verification_status: 'verified' })
      .eq('user_id', userId)
      .select('user_id, verification_status')
    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('Sin permiso. Ejecuta fix_admin_rls.sql en Supabase.')
    }
    return data[0]
  },

  async suspendUser(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ account_status: 'suspended' })
      .eq('id', userId)
      .select('id, account_status')
    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('Sin permiso. Ejecuta fix_admin_rls.sql en Supabase.')
    }
    return data[0]
  },

  async featureTechnician(userId, featured) {
    const { data, error } = await supabase
      .from('technician_profiles')
      .update({ is_featured: featured })
      .eq('user_id', userId)
      .select('user_id, is_featured')  // confirmar que se actualizó
    if (error) throw error
    // Si data está vacío, RLS bloqueó la operación sin error explícito
    if (!data || data.length === 0) {
      throw new Error('Sin permiso para modificar este técnico. Verifica las políticas RLS en Supabase.')
    }
    return data[0]
  },

  async log(adminId, action, entityType, entityId, details) {
    await supabase.from('admin_audit_logs').insert({
      admin_id: adminId, action, entity_type: entityType,
      entity_id: entityId?.toString(), details,
    })
  },

  async getDashboardStats() {
    try {
      const [
        users, techs, requests, reviews_,
        pendingReviews, pendingCerts, pendingDisputes, pendingTechs,
        completedRequests, paidPayments, recentRequests, recentUsers,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('technician_profiles').select('user_id', { count: 'exact', head: true }),
        supabase.from('service_requests').select('id', { count: 'exact', head: true }),
        supabase.from('reviews').select('id', { count: 'exact', head: true }),
        supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
        supabase.from('certificates').select('id', { count: 'exact', head: true }).eq('is_verified', false),
        supabase.from('disputes').select('id', { count: 'exact', head: true }).in('status', ['open', 'under_review']),
        supabase.from('technician_profiles').select('user_id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
        supabase.from('service_requests').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('payments').select('amount').eq('status', 'completed'),
        supabase.from('service_requests')
          .select('id, title, status, created_at, client_id, technician_id')
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles')
          .select('id, full_name, role, created_at')
          .order('created_at', { ascending: false }).limit(5),
      ])

      const totalRevenue = (paidPayments.data ?? [])
        .reduce((sum, p) => sum + Number(p.amount ?? 0), 0)

      return {
        totalUsers: users.count ?? 0,
        totalTechs: techs.count ?? 0,
        totalRequests: requests.count ?? 0,
        totalReviews: reviews_.count ?? 0,
        completedRequests: completedRequests.count ?? 0,
        totalRevenue,
        pending: {
          reviews: pendingReviews.count ?? 0,
          certs: pendingCerts.count ?? 0,
          disputes: pendingDisputes.count ?? 0,
          techs: pendingTechs.count ?? 0,
        },
        recentRequests: recentRequests.data ?? [],
        recentUsers: recentUsers.data ?? [],
      }
    } catch {
      return {
        totalUsers: 0, totalTechs: 0, totalRequests: 0, totalReviews: 0,
        completedRequests: 0, totalRevenue: 0,
        pending: { reviews: 0, certs: 0, disputes: 0, techs: 0 },
        recentRequests: [], recentUsers: [],
      }
    }
  },

  /** Exportar usuarios o técnicos a CSV (descarga directa en el navegador) */
  exportToCSV(rows, columns, filename) {
    const header = columns.map(c => `"${c.label}"`).join(',')
    const lines = rows.map(row =>
      columns.map(c => {
        let val = row[c.key]
        if (val === null || val === undefined) val = ''
        val = String(val).replace(/"/g, '""')
        return `"${val}"`
      }).join(',')
    )
    const csv = [header, ...lines].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },
}