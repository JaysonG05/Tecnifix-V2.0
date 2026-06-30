// ============================================================
//  payments.js — helpers de pagos, recibos, fotos y disputas
// ============================================================
import { supabase } from './supabase.js'
import {
  sanitizeString, sanitizeText, sanitizePhone, sanitizeNumber,
  sanitizeUUID, sanitizeFilename, assertSafe, sanitizeFormData, SCHEMAS,
} from './sanitize.js'
import { checkRateLimit, RATE_LIMITS } from './security.js'

// ── ESTADOS DEL FLUJO ────────────────────────────────────────
export const REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  PENDING_PAYMENT: 'pending_payment',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
}

export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PENDING: 'pending',
  COMPLETED: 'completed',
  REFUNDED: 'refunded',
}

// ── LABELS para mostrar en UI ─────────────────────────────────
export const STATUS_LABELS = {
  es: {
    pending: 'Enviada',
    accepted: 'Aceptada',
    in_progress: 'En progreso',
    pending_payment: 'Pendiente de pago',
    completed: 'Completada',
    cancelled: 'Cancelada',
    disputed: 'En disputa',
    unpaid: 'Sin pagar',
    paid: 'Pagado',
    completed_pay: 'Pago exitoso',
    refunded: 'Reembolsado',
  },
  en: {
    pending: 'Sent',
    accepted: 'Accepted',
    in_progress: 'In progress',
    pending_payment: 'Awaiting payment',
    completed: 'Completed',
    cancelled: 'Cancelled',
    disputed: 'Disputed',
    unpaid: 'Unpaid',
    paid: 'Paid',
    completed_pay: 'Payment successful',
    refunded: 'Refunded',
  },
}

export const STATUS_COLORS = {
  pending: { bg: '#E6F1FB', text: '#185FA5' },
  accepted: { bg: '#EAF3DE', text: '#3B6D11' },
  in_progress: { bg: '#FAEEDA', text: '#854F0B' },
  pending_payment: { bg: '#EEEDFE', text: '#534AB7' },
  completed: { bg: '#EAF3DE', text: '#3B6D11' },
  cancelled: { bg: '#FCEBEB', text: '#A32D2D' },
  disputed: { bg: '#FAECE7', text: '#993C1D' },
  unpaid: { bg: '#FCEBEB', text: '#A32D2D' },
  paid: { bg: '#EAF3DE', text: '#3B6D11' },
  completed_pay: { bg: '#EAF3DE', text: '#3B6D11' },
}

// ── HELPERS DE SOLICITUDES ───────────────────────────────────
export const requestActions = {
  /** Técnico: actualizar estado con notificación al cliente */
  async updateStatus(requestId, newStatus, clientId, techName, requestTitle) {
    const cleanReqId = sanitizeUUID(requestId)
    if (!cleanReqId) throw new Error('ID de solicitud inválido.')
    const validStatuses = ['pending', 'accepted', 'in_progress', 'pending_payment', 'completed', 'cancelled', 'disputed']
    if (!validStatuses.includes(newStatus)) throw new Error('Estado inválido.')
    const cleanClientId = sanitizeUUID(clientId)
    const cleanTechName = sanitizeString(techName, { maxLength: 100 })
    const cleanTitle = sanitizeString(requestTitle, { maxLength: 200 })

    // 1. Actualizar estado
    const result = await supabase
      .from('service_requests')
      .update({ status: newStatus })
      .eq('id', cleanReqId)
      .select()
      .single()
    if (result.error) throw result.error

    // 2. Notificar al cliente (no bloquear si falla)
    const msgs = {
      accepted: { title: 'Solicitud aceptada', body: `${cleanTechName} aceptó tu solicitud "${cleanTitle}"` },
      in_progress: { title: 'Trabajo iniciado', body: `${cleanTechName} comenzó: "${cleanTitle}"` },
      pending_payment: { title: 'Listo para pagar', body: `${cleanTechName} terminó "${cleanTitle}". Realiza el pago.` },
      completed: { title: '🎉 Servicio completado', body: `"${cleanTitle}" completado exitosamente.` },
      cancelled: { title: '❌ Solicitud cancelada', body: `"${cleanTitle}" fue cancelada.` },
    }
    const msg = msgs[newStatus]
    if (msg && cleanClientId) {
      // Usar Promise separada para que no rompa el flujo principal
      const notifPayload = {
        user_id: cleanClientId,
        type: newStatus,
        title: msg.title,
        body: msg.body,
        data: JSON.stringify({ request_id: cleanReqId }),
      }
      supabase.from('notifications').insert(notifPayload)
        .then(res => { if (res.error) console.warn('Notif error:', res.error.message) })
        .catch(e => console.warn('Notif catch:', e?.message))
    }
    return result.data
  },

  /** Subir foto de trabajo (antes/después/progreso) */
  async uploadJobPhoto(requestId, uploadedBy, file, photoType, caption = '') {
    const cleanReqId = sanitizeUUID(requestId)
    const cleanUserId = sanitizeUUID(uploadedBy)
    if (!cleanReqId) throw new Error('ID de solicitud inválido.')
    if (!cleanUserId) throw new Error('ID de usuario inválido.')
    const validTypes = ['before', 'after', 'progress']
    const cleanType = validTypes.includes(photoType) ? photoType : 'progress'
    const cleanCaption = sanitizeText(caption, { maxLength: 500 })
    assertSafe(caption, 'photo_caption')

    const ext = file.name.split('.').pop()
    const path = `${cleanReqId}/${cleanType}_${Date.now()}.${sanitizeFilename(ext)}`
    const { error: upErr } = await supabase.storage
      .from('job-photos')
      .upload(path, file, { upsert: false })
    if (upErr) throw upErr
    const { data: { publicUrl } } = supabase.storage.from('job-photos').getPublicUrl(path)

    const { data, error } = await supabase.from('job_photos').insert({
      service_request_id: cleanReqId,
      uploaded_by: cleanUserId,
      photo_type: cleanType,
      image_url: publicUrl,
      caption: cleanCaption,
    }).select().single()
    if (error) throw error

    // Actualizar columna de resumen si es before/after
    if (cleanType === 'before') {
      await supabase.from('service_requests').update({ before_photo_url: publicUrl }).eq('id', cleanReqId)
    } else if (cleanType === 'after') {
      await supabase.from('service_requests').update({ after_photo_url: publicUrl }).eq('id', cleanReqId)
    }
    return data
  },

  /** Obtener fotos de un trabajo */
  async getJobPhotos(requestId) {
    const { data, error } = await supabase
      .from('job_photos')
      .select('*')
      .eq('service_request_id', requestId)
      .order('created_at')
    if (error) throw error
    return data ?? []
  },
}

// ── HELPERS DE PAGOS ─────────────────────────────────────────
export const paymentActions = {
  /** Subir comprobante de transferencia bancaria */
  async uploadTransferProof(requestId, uploadedBy, file, amount, reference = '') {
    const cleanReqId = sanitizeUUID(requestId)
    const cleanUserId = sanitizeUUID(uploadedBy)
    if (!cleanReqId) throw new Error('ID de solicitud inválido.')
    if (!cleanUserId) throw new Error('ID de usuario inválido.')

    const ext = file.name.split('.').pop()
    const path = `${cleanReqId}/proof_${Date.now()}.${sanitizeFilename(ext)}`
    const { error: upErr } = await supabase.storage
      .from('pay-proofs')
      .upload(path, file, { upsert: false })
    if (upErr) throw upErr
    const { data: { publicUrl } } = supabase.storage.from('pay-proofs').getPublicUrl(path)

    const cleanRef = sanitizeString(reference, { maxLength: 100 })
    const { data, error } = await supabase.from('payment_proofs').insert({
      service_request_id: cleanReqId,
      uploaded_by: cleanUserId,
      proof_type: 'transfer',
      image_url: publicUrl,
      reference_number: cleanRef || null,
      amount: sanitizeNumber(amount, { min: 0, max: 999999, default: null }),
    }).select().single()
    if (error) throw error
    return data
  },

  /** Técnico verifica el comprobante de pago */
  async verifyProof(proofId, technicianId, requestId) {
    const cleanProofId = sanitizeUUID(proofId)
    const cleanReqId = sanitizeUUID(requestId)
    if (!cleanProofId) throw new Error('ID de comprobante inválido.')
    if (!cleanReqId) throw new Error('ID de solicitud inválido.')
    const { error } = await supabase
      .from('payment_proofs')
      .update({ verified_by_tech: true, verified_at: new Date().toISOString() })
      .eq('id', cleanProofId)
    if (error) throw error
    // Actualizar estado de pago en la solicitud
    await supabase.from('service_requests')
      .update({ payment_status: 'paid' })
      .eq('id', cleanReqId)
  },

  /** Obtener comprobantes de una solicitud */
  async getProofs(requestId) {
    const { data, error } = await supabase
      .from('payment_proofs')
      .select('*')
      .eq('service_request_id', requestId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  /**
   * Registrar pago Yappy — el CLIENTE reporta que pagó.
   * Queda en 'pending_confirmation' hasta que el TÉCNICO confirme
   * haber recibido el dinero en su cuenta Yappy.
   */
  async recordYappy(requestId, payerId, technicianId, amount, yappyPhone, reference) {
    const cleanReqId = sanitizeUUID(requestId)
    const cleanPayerId = sanitizeUUID(payerId)
    const cleanTechId = sanitizeUUID(technicianId)
    if (!cleanReqId) throw new Error('ID de solicitud inválido.')
    if (!cleanPayerId) throw new Error('ID de cliente inválido.')
    if (!cleanTechId) throw new Error('ID de técnico inválido.')

    const cleanAmount = sanitizeNumber(amount, { min: 0, max: 999999, default: 0 })
    const cleanPhone = sanitizePhone(yappyPhone)
    const cleanRef = sanitizeString(reference, { maxLength: 100 })

    await supabase.from('payments').insert({
      service_request_id: cleanReqId,
      payer_id: cleanPayerId,
      technician_id: cleanTechId,
      amount: cleanAmount,
      method: 'yappy',
      yappy_phone: cleanPhone,
      yappy_reference: cleanRef || null,
      status: 'pending_confirmation',
      paid_at: new Date().toISOString(),
    })
    await supabase.from('service_requests').update({
      payment_status: 'pending_confirmation',
      payment_method: 'yappy',
      payment_ref: cleanRef || null,
    }).eq('id', cleanReqId)

    // Notificar al técnico
    supabase.from('notifications').insert({
      user_id: cleanTechId, type: 'payment',
      title: 'El cliente reportó un pago por Yappy',
      body: `Monto: $${cleanAmount}. Verifica tu app Yappy y confirma la recepción.`,
      data: JSON.stringify({ request_id: cleanReqId }),
    }).then(() => { }).catch(() => { })
  },

  /**
   * Registrar pago en efectivo — el CLIENTE reporta que pagó.
   * Igual que Yappy, requiere confirmación del TÉCNICO.
   */
  async recordCash(requestId, payerId, technicianId, amount) {
    const cleanReqId = sanitizeUUID(requestId)
    const cleanPayerId = sanitizeUUID(payerId)
    const cleanTechId = sanitizeUUID(technicianId)
    if (!cleanReqId) throw new Error('ID de solicitud inválido.')
    if (!cleanPayerId) throw new Error('ID de cliente inválido.')
    if (!cleanTechId) throw new Error('ID de técnico inválido.')
    const cleanAmount = sanitizeNumber(amount, { min: 0, max: 999999, default: 0 })

    // Código de 4 dígitos: el cliente lo muestra al técnico EN PERSONA
    // al momento de entregar el dinero. El técnico debe ingresarlo
    // para confirmar — esto prueba el encuentro físico y reduce el
    // riesgo de que cualquiera de las partes reporte un pago falso.
    const code = String(Math.floor(1000 + Math.random() * 9000))

    await supabase.from('payments').insert({
      service_request_id: cleanReqId,
      payer_id: cleanPayerId,
      technician_id: cleanTechId,
      amount: cleanAmount,
      method: 'cash',
      status: 'pending_confirmation',
      paid_at: new Date().toISOString(),
    })
    await supabase.from('service_requests').update({
      payment_status: 'pending_confirmation',
      payment_method: 'cash',
      cash_confirmation_code: code,
      cash_code_attempts: 0,
    }).eq('id', cleanReqId)

    supabase.from('notifications').insert({
      user_id: cleanTechId, type: 'payment',
      title: 'El cliente reportó un pago en efectivo',
      body: `Monto: $${cleanAmount}. Pídele al cliente el código de 4 dígitos que aparece en su pantalla para confirmar la recepción.`,
      data: JSON.stringify({ request_id: cleanReqId }),
    }).then(() => { }).catch(() => { })

    return { code }
  },

  /**
   * TÉCNICO confirma que recibió el pago (Yappy o efectivo).
   * Solo entonces payment_status pasa a 'paid' y se habilita
   * marcar el servicio como completado.
   */
  /**
   * El técnico confirma haber recibido el pago.
   * Para efectivo, `enteredCode` es OBLIGATORIO y debe coincidir
   * con el código de 4 dígitos que el cliente le mostró en persona.
   */
  async confirmPayment(requestId, technicianId, enteredCode) {
    const cleanReqId = sanitizeUUID(requestId)
    const cleanTechId = sanitizeUUID(technicianId)
    if (!cleanReqId) throw new Error('ID de solicitud inválido.')
    if (!cleanTechId) throw new Error('ID de técnico inválido.')
    const cleanCode = enteredCode ? String(enteredCode).replace(/\D/g, '').slice(0, 4) : ''

    // Validar primero la solicitud y, si es efectivo, el código
    const { data: sr, error: srErr } = await supabase
      .from('service_requests')
      .select('id, client_id, title, payment_method, cash_confirmation_code, cash_code_attempts, technician_id')
      .eq('id', cleanReqId)
      .single()
    if (srErr || !sr) throw new Error('Solicitud no encontrada.')
    if (sr.technician_id !== cleanTechId) throw new Error('Sin permiso para confirmar este pago.')

    if (sr.payment_method === 'cash') {
      if (!cleanCode) {
        throw new Error('Ingresa el código de 4 dígitos que te mostró el cliente.')
      }
      if (cleanCode !== sr.cash_confirmation_code) {
        const attempts = (sr.cash_code_attempts ?? 0) + 1
        await supabase.from('service_requests')
          .update({ cash_code_attempts: attempts })
          .eq('id', cleanReqId)
        if (attempts >= 3) {
          throw new Error('Código incorrecto 3 veces. Si el cliente no tiene el código correcto, abre una disputa.')
        }
        throw new Error(`Código incorrecto. Pídele al cliente que te muestre el código de 4 dígitos. (Intento ${attempts}/3)`)
      }
    }

    const { data, error } = await supabase
      .from('service_requests')
      .update({ payment_status: 'paid', cash_confirmation_code: null })
      .eq('id', cleanReqId)
      .eq('technician_id', cleanTechId)
      .select('id, client_id, title, payment_method')
    if (error) throw error
    if (!data?.length) throw new Error('Sin permiso para confirmar este pago.')

    // Actualizar el registro en payments también
    await supabase.from('payments')
      .update({ status: 'completed' })
      .eq('service_request_id', cleanReqId)

    const req = data[0]
    supabase.from('notifications').insert({
      user_id: req.client_id, type: 'payment',
      title: 'Pago confirmado',
      body: `El técnico confirmó la recepción del pago de "${req.title}".`,
      data: JSON.stringify({ request_id: cleanReqId }),
    }).then(() => { }).catch(() => { })

    return req
  },

  /**
   * TÉCNICO rechaza el pago reportado (no recibió el dinero).
   * Regresa payment_status a 'unpaid' para que el cliente intente de nuevo.
   */
  async rejectPayment(requestId, technicianId, reasonNote) {
    const cleanReqId = sanitizeUUID(requestId)
    const cleanTechId = sanitizeUUID(technicianId)
    if (!cleanReqId) throw new Error('ID de solicitud inválido.')
    if (!cleanTechId) throw new Error('ID de técnico inválido.')
    const cleanNote = sanitizeText(reasonNote, { maxLength: 500 })
    assertSafe(reasonNote, 'reject_reason')

    const { data, error } = await supabase
      .from('service_requests')
      .update({ payment_status: 'unpaid', payment_ref: null, cash_confirmation_code: null, cash_code_attempts: 0 })
      .eq('id', cleanReqId)
      .eq('technician_id', cleanTechId)
      .select('id, client_id, title')
    if (error) throw error
    if (!data?.length) throw new Error('Sin permiso.')

    const req = data[0]
    supabase.from('notifications').insert({
      user_id: req.client_id, type: 'payment',
      title: 'El técnico no encontró tu pago',
      body: cleanNote || `Revisa el pago de "${req.title}" e intenta de nuevo o contacta al técnico.`,
      data: JSON.stringify({ request_id: cleanReqId }),
    }).then(() => { }).catch(() => { })

    return req
  },
}

// ── HELPERS DE RECIBOS ───────────────────────────────────────
export const receiptActions = {
  /** Generar recibo digital al completar el pago */
  async generate({ requestId, clientId, technicianId, serviceTitle,
    serviceDescription, amount, paymentMethod,
    paymentReference, clientName, technicianName }) {
    const cleanReqId = sanitizeUUID(requestId)
    const cleanClientId = sanitizeUUID(clientId)
    const cleanTechId = sanitizeUUID(technicianId)
    if (!cleanReqId) throw new Error('ID de solicitud inválido.')
    if (!cleanClientId) throw new Error('ID de cliente inválido.')
    if (!cleanTechId) throw new Error('ID de técnico inválido.')

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('receipts')
      .select('*')
      .eq('service_request_id', cleanReqId)
      .single()
    if (existing) return existing

    const cleanTitle = sanitizeString(serviceTitle, { maxLength: 200 })
    const cleanDesc = sanitizeText(serviceDescription, { maxLength: 2000 })
    const cleanRef = sanitizeString(paymentReference, { maxLength: 100 })
    const cleanClient = sanitizeString(clientName, { maxLength: 150 })
    const cleanTech = sanitizeString(technicianName, { maxLength: 150 })
    const cleanAmount = sanitizeNumber(amount, { min: 0, max: 999999, default: 0 })
    const validMethods = ['yappy', 'cash', 'transfer']
    const cleanMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'cash'

    // Crear hash de firma
    const hashInput = `${cleanClientId}${cleanTechId}${cleanReqId}${cleanAmount}${Date.now()}`
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput))
    const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    const { data, error } = await supabase.from('receipts').insert({
      service_request_id: cleanReqId,
      client_id: cleanClientId,
      technician_id: cleanTechId,
      service_title: cleanTitle,
      service_description: cleanDesc || null,
      amount: cleanAmount,
      payment_method: cleanMethod,
      payment_reference: cleanRef || null,
      client_name: cleanClient,
      technician_name: cleanTech,
      signature_hash: hash,
    }).select().single()
    if (error) throw error
    return data
  },

  async getForRequest(requestId) {
    const cleanReqId = sanitizeUUID(requestId)
    if (!cleanReqId) return null
    const { data } = await supabase
      .from('receipts')
      .select('*')
      .eq('service_request_id', cleanReqId)
      .single()
    return data ?? null
  },

  /** Generar PDF del recibo usando jsPDF (cargado dinámicamente) */
  async downloadPDF(receipt) {
    // Cargar jsPDF si no está
    if (!window.jspdf) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
        s.onload = resolve
        s.onerror = reject
        document.head.appendChild(s)
      })
    }
    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ unit: 'mm', format: 'a5' })

    const W = doc.internal.pageSize.getWidth()
    let y = 15

    // Encabezado
    doc.setFillColor(34, 197, 94)
    doc.rect(0, 0, W, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('TECNIFIX', W / 2, 12, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Recibo de servicio técnico', W / 2, 20, { align: 'center' })

    y = 36
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(`Recibo ${receipt.receipt_number}`, W / 2, y, { align: 'center' })

    y += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(
      new Date(receipt.issued_at).toLocaleString('es-PA', { dateStyle: 'long', timeStyle: 'short' }),
      W / 2, y, { align: 'center' }
    )

    // Línea separadora
    y += 8
    doc.setDrawColor(226, 232, 240)
    doc.line(10, y, W - 10, y)

    // Datos
    const rows = [
      ['Servicio', receipt.service_title],
      ['Descripción', receipt.service_description || '—'],
      ['Cliente', receipt.client_name],
      ['Técnico', receipt.technician_name],
      ['Método de pago', receipt.payment_method === 'yappy' ? 'Yappy' :
        receipt.payment_method === 'transfer' ? 'Transferencia bancaria' : 'Efectivo'],
      ['Referencia', receipt.payment_reference || '—'],
    ]
    y += 8
    rows.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 116, 139)
      doc.setFontSize(8)
      doc.text(label, 12, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(15, 23, 42)
      doc.setFontSize(9)
      doc.text(String(value), W - 12, y, { align: 'right' })
      y += 8
    })

    // Total
    y += 2
    doc.setFillColor(240, 253, 244)
    doc.roundedRect(10, y - 5, W - 20, 16, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(22, 163, 74)
    doc.text('Total pagado', 16, y + 5)
    doc.setFontSize(14)
    doc.text(`$${Number(receipt.amount).toFixed(2)}`, W - 16, y + 5, { align: 'right' })

    // Firma digital
    y += 24
    doc.setDrawColor(226, 232, 240)
    doc.line(10, y, W - 10, y)
    y += 6
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    doc.text(`Firma digital: ${receipt.signature_hash?.slice(0, 32)}...`, 12, y)
    y += 4
    doc.text('Este recibo es un documento digital válido generado por TECNIFIX.', 12, y)

    doc.save(`recibo-${receipt.receipt_number}.pdf`)
  },
}

// ── HELPERS DE DISPUTAS ──────────────────────────────────────
export const disputeActions = {
  async open(requestId, openedBy, reason, description) {
    const cleanReqId = sanitizeUUID(requestId)
    const cleanOpenedBy = sanitizeUUID(openedBy)
    if (!cleanReqId) throw new Error('ID de solicitud inválido.')
    if (!cleanOpenedBy) throw new Error('ID de usuario inválido.')

    const rl = checkRateLimit(`dispute_${cleanOpenedBy}`, RATE_LIMITS.openDispute.max, RATE_LIMITS.openDispute.window)
    if (!rl.allowed) throw new Error(`Límite de disputas alcanzado. Espera ${rl.retryAfter} segundos.`)

    const text = sanitizeFormData({ reason, description }, SCHEMAS.dispute)
    if (!text.reason?.trim()) throw new Error('El motivo es requerido.')
    assertSafe(reason, 'dispute_reason')
    assertSafe(description, 'dispute_description')

    const { data, error } = await supabase.from('disputes').insert({
      service_request_id: cleanReqId,
      opened_by: cleanOpenedBy,
      reason: text.reason,
      description: text.description,
      status: 'open',
    }).select().single()
    if (error) throw error
    // Cambiar estado de la solicitud
    await supabase.from('service_requests')
      .update({ status: 'disputed', dispute_id: data.id })
      .eq('id', cleanReqId)
    // Notificar al admin
    const { data: admins } = await supabase
      .from('profiles').select('id').eq('role', 'admin')
    if (admins?.length) {
      await supabase.from('notifications').insert(
        admins.map(a => ({
          user_id: a.id,
          type: 'dispute',
          title: 'Nueva disputa abierta',
          body: `Solicitud ID ${cleanReqId.slice(0, 8)}... necesita mediación.`,
          data: { request_id: cleanReqId, dispute_id: data.id },
        }))
      )
    }
    return data
  },

  async getForRequest(requestId) {
    const cleanReqId = sanitizeUUID(requestId)
    if (!cleanReqId) return null
    const { data } = await supabase
      .from('disputes')
      .select('*')
      .eq('service_request_id', cleanReqId)
      .single()
    return data ?? null
  },

  /** ADMIN: listar todas las disputas con info de la solicitud y las partes */
  async listAll() {
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        request:service_request_id (
          id, title, description, status, agreed_price, payment_status,
          client_id, technician_id, created_at
        )
      `)
      .order('created_at', { ascending: false })
    if (error) throw error

    const disputes = data ?? []
    if (disputes.length === 0) return []

    // Recolectar ids de clientes, técnicos y quien abrió la disputa
    const userIds = new Set()
    disputes.forEach(d => {
      if (d.request?.client_id) userIds.add(d.request.client_id)
      if (d.request?.technician_id) userIds.add(d.request.technician_id)
      if (d.opened_by) userIds.add(d.opened_by)
    })

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', [...userIds])

    const pMap = Object.fromEntries((profilesData ?? []).map(p => [p.id, p]))

    return disputes.map(d => ({
      ...d,
      client: pMap[d.request?.client_id] ?? null,
      technician: pMap[d.request?.technician_id] ?? null,
      opener: pMap[d.opened_by] ?? null,
    }))
  },

  /** ADMIN: marcar disputa como "en revisión" */
  async markUnderReview(disputeId, adminId) {
    const cleanDisputeId = sanitizeUUID(disputeId)
    const cleanAdminId = sanitizeUUID(adminId)
    if (!cleanDisputeId) throw new Error('ID de disputa inválido.')
    if (!cleanAdminId) throw new Error('ID de administrador inválido.')
    const { data, error } = await supabase
      .from('disputes')
      .update({ status: 'under_review', resolved_by: cleanAdminId })
      .eq('id', cleanDisputeId)
      .select()
    if (error) throw error
    if (!data?.length) throw new Error('Sin permiso para actualizar esta disputa.')
    return data[0]
  },

  /**
   * ADMIN: resolver una disputa.
   * resolution: 'resolved_client' | 'resolved_tech' | 'closed'
   * Además actualiza el estado de la solicitud relacionada.
   */
  async resolve(disputeId, requestId, resolution, notes, adminId) {
    const cleanDisputeId = sanitizeUUID(disputeId)
    const cleanReqId = sanitizeUUID(requestId)
    const cleanAdminId = sanitizeUUID(adminId)
    if (!cleanDisputeId) throw new Error('ID de disputa inválido.')
    if (!cleanReqId) throw new Error('ID de solicitud inválido.')
    if (!cleanAdminId) throw new Error('ID de administrador inválido.')
    const validResolutions = ['resolved_client', 'resolved_tech', 'closed']
    if (!validResolutions.includes(resolution)) throw new Error('Resolución inválida.')
    const cleanNotes = sanitizeText(notes, { maxLength: 2000 })
    assertSafe(notes, 'dispute_resolution_notes')

    const { data, error } = await supabase
      .from('disputes')
      .update({
        status: resolution,
        resolution_notes: cleanNotes || null,
        resolved_by: cleanAdminId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', cleanDisputeId)
      .select()
    if (error) throw error
    if (!data?.length) throw new Error('Sin permiso para resolver esta disputa.')

    // Determinar el nuevo estado de la solicitud según la resolución
    let newReqStatus = 'completed'
    if (resolution === 'resolved_tech') newReqStatus = 'completed'
    if (resolution === 'resolved_client') newReqStatus = 'cancelled'
    if (resolution === 'closed') newReqStatus = 'cancelled'

    await supabase.from('service_requests')
      .update({ status: newReqStatus, dispute_id: null })
      .eq('id', cleanReqId)

    // Notificar a ambas partes
    const { data: req } = await supabase
      .from('service_requests')
      .select('client_id, technician_id, title')
      .eq('id', cleanReqId)
      .single()

    if (req) {
      const RESOLUTION_MSG = {
        resolved_client: { title: 'Disputa resuelta a favor del cliente', body: `La disputa sobre "${req.title}" fue resuelta a favor del cliente.` },
        resolved_tech: { title: 'Disputa resuelta a favor del técnico', body: `La disputa sobre "${req.title}" fue resuelta a favor del técnico.` },
        closed: { title: 'Disputa cerrada', body: `La disputa sobre "${req.title}" fue cerrada por el equipo de TECNIFIX.` },
      }
      const msg = RESOLUTION_MSG[resolution]
      if (msg) {
        const payload = [req.client_id, req.technician_id].filter(Boolean).map(uid => ({
          user_id: uid, type: 'dispute', title: msg.title, body: msg.body,
          data: JSON.stringify({ request_id: cleanReqId, dispute_id: cleanDisputeId }),
        }))
        supabase.from('notifications').insert(payload)
          .then(() => { }).catch(() => { })
      }
    }

    return data[0]
  },

  /** ADMIN: eliminar disputa (casos inválidos/spam) y devolver la solicitud a su estado anterior */
  async dismiss(disputeId, requestId) {
    const cleanDisputeId = sanitizeUUID(disputeId)
    const cleanReqId = sanitizeUUID(requestId)
    if (!cleanDisputeId) throw new Error('ID de disputa inválido.')

    // 1. Primero quitar la referencia dispute_id de la solicitud
    //    (FK service_requests_dispute_id_fkey impide borrar la disputa mientras esté referenciada)
    if (cleanReqId) {
      const { error: srErr } = await supabase
        .from('service_requests')
        .update({ status: 'completed', dispute_id: null })
        .eq('id', cleanReqId)
      if (srErr) throw srErr
    }

    // 2. Ahora sí se puede borrar la disputa
    const { error: delErr } = await supabase
      .from('disputes')
      .delete()
      .eq('id', cleanDisputeId)
    if (delErr) throw delErr
  },
}