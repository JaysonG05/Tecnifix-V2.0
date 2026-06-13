// ============================================================
//  RequestDetailScreen.jsx
//  Pantalla completa de detalle de solicitud:
//  - Cliente: ver estado, pagar, subir comprobante, confirmar, descargar recibo
//  - Técnico: aceptar, cambiar estado, subir fotos, verificar pago, generar recibo
// ============================================================
import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Avatar, Btn, Badge, Spinner, Toast, Input } from '../components/UI.jsx'
import { supabase, chatApi } from '../lib/supabase.js'
import {
  requestActions, paymentActions, receiptActions, disputeActions,
  REQUEST_STATUS, STATUS_LABELS, STATUS_COLORS,
} from '../lib/payments.js'
import { T } from '../i18n/translations.js'

// ── Colores de estado ─────────────────────────────────────────
function StatusChip({ status, lang }) {
  const label = STATUS_LABELS[lang]?.[status] ?? status
  const colors = STATUS_COLORS[status] ?? { bg: '#f1f5f9', text: '#64748b' }
  return (
    <span style={{
      background: colors.bg, color: colors.text, fontSize: 12,
      fontWeight: 600, padding: '4px 10px', borderRadius: 20
    }}>
      {label}
    </span>
  )
}

// ── Sección con título ────────────────────────────────────────
function Section({ title, children, th }) {
  return (
    <div style={{
      background: th.surface, borderRadius: 16,
      border: `1px solid ${th.border}`, padding: 16, marginBottom: 14
    }}>
      <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 15, color: th.text }}>{title}</p>
      {children}
    </div>
  )
}

// ── Fila info ─────────────────────────────────────────────────
function InfoRow({ label, value, th }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '7px 0', borderBottom: `1px solid ${th.border}`
    }}>
      <span style={{ fontSize: 13, color: th.textSec }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: th.text, maxWidth: '60%', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
export function RequestDetailScreen() {
  const { th, user, goBack, lang, navigate } = useApp()
  const t = T[lang]

  // La solicitud se pasa como prop global desde ProfileScreen
  const [request, setRequest] = useState(useApp().selectedRequest)
  const [photos, setPhotos] = useState([])
  const [proofs, setProofs] = useState([])
  const [receipt, setReceipt] = useState(null)
  const [dispute, setDispute] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)

  // Modales
  const [showPayModal, setShowPayModal] = useState(false)
  const [showProofModal, setShowProofModal] = useState(false)
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)

  const isClient = user?.id === request?.client_id
  const isTech = user?.id === request?.technician_id

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Cargar datos ────────────────────────────────────────────
  useEffect(() => {
    if (!request) return
    Promise.all([
      requestActions.getJobPhotos(request.id).catch(() => []),
      paymentActions.getProofs(request.id).catch(() => []),
      receiptActions.getForRequest(request.id).catch(() => null),
      disputeActions.getForRequest(request.id).catch(() => null),
    ]).then(([p, pr, rec, dis]) => {
      setPhotos(p); setProofs(pr); setReceipt(rec); setDispute(dis)
    }).finally(() => setLoading(false))
  }, [request?.id])

  // ── Suscripción realtime al estado de la solicitud ──────────
  useEffect(() => {
    if (!request) return
    const channel = supabase
      .channel(`request:${request.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'service_requests', filter: `id=eq.${request.id}`,
      }, payload => setRequest(r => ({ ...r, ...payload.new })))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [request?.id])

  if (!request) {
    goBack()
    return null
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <Spinner />
    </div>
  )

  const isPendingConfirmation = request.payment_status === 'pending_confirmation'
  const canPay = isClient && request.status === REQUEST_STATUS.PENDING_PAYMENT
    && !['paid', 'pending_confirmation'].includes(request.payment_status)
  const canComplete = isClient && request.payment_status === 'paid' && request.status !== REQUEST_STATUS.COMPLETED
  const canDispute = (isClient || isTech) && !['completed', 'cancelled', 'disputed'].includes(request.status)
  const isPaid = request.payment_status === 'paid'
  const isDone = request.status === REQUEST_STATUS.COMPLETED

  const methodLabel = { yappy: '💚 Yappy', cash: '💵 Efectivo', transfer: '🏦 Transferencia' }

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 40 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{
        background: th.surface, padding: '14px 16px', borderBottom: `1px solid ${th.border}`,
        position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', gap: 12
      }}>
        <button onClick={goBack} style={{
          background: th.surface2, border: 'none',
          borderRadius: 20, width: 36, height: 36, fontSize: 18, cursor: 'pointer', color: th.text,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>←</button>
        <div style={{ flex: 1 }}>
          <h2 style={{
            margin: 0, fontSize: 16, fontWeight: 800, color: th.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {request.title}
          </h2>
          <StatusChip status={request.status} lang={lang} />
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* ── Barra de progreso visual ── */}
        <ProgressBar status={request.status} th={th} lang={lang} />

        {/* ── Info general ── */}
        <Section title="📋 Detalles del servicio" th={th}>
          <InfoRow label="Servicio" value={request.title} th={th} />
          {request.description && <InfoRow label="Descripción" value={request.description} th={th} />}
          {request.address && <InfoRow label="Dirección" value={request.address} th={th} />}
          <InfoRow label="Fecha" value={new Date(request.created_at).toLocaleDateString()} th={th} />
          {request.agreed_price && <InfoRow label="Precio acordado" value={`$${request.agreed_price}`} th={th} />}
          <InfoRow label="Método de pago"
            value={methodLabel[request.payment_method] ?? 'No definido'} th={th} />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: th.textSec }}>Estado del pago</span>
            <StatusChip status={isPaid ? 'paid' : 'unpaid'} lang={lang} />
          </div>
          {/* Info bancaria del técnico (para transferencia) */}
          {request.payment_method === 'transfer' && request.technician_bank_account && (
            <div style={{ marginTop: 10, background: th.surface2, borderRadius: 12, padding: 12 }}>
              <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: th.textSec }}>
                🏦 Cuenta bancaria del técnico
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: th.text, flex: 1 }}>
                  {request.technician_bank_account}
                </p>
                <button onClick={() => {
                  navigator.clipboard.writeText(request.technician_bank_account)
                  showToast('Cuenta copiada al portapapeles')
                }} style={{
                  background: th.primaryLight, color: th.primaryText, border: 'none',
                  borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                }}>
                  📋 Copiar
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* ── Partes involucradas ── */}
        <Section title="👥 Partes del servicio" th={th}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
            <Avatar photo={request.client_avatar} name={request.client_name} size={44} />
            <div>
              <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 14, color: th.text }}>{request.client_name}</p>
              <p style={{ margin: 0, fontSize: 12, color: th.textSec }}>👤 Cliente</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Avatar photo={request.technician_avatar} name={request.technician_name} size={44} />
            <div>
              <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 14, color: th.text }}>{request.technician_name}</p>
              <p style={{ margin: 0, fontSize: 12, color: th.textSec }}>🛠️ Técnico · {request.technician_title}</p>
            </div>
          </div>
        </Section>

        {/* ── Chat interno ── */}
        <ChatSection request={request} user={user} isClient={isClient} th={th} lang={lang} />

        {/* ── Fotos del trabajo ── */}
        <Section title="📸 Fotos del trabajo" th={th}>
          {photos.length === 0
            ? <p style={{ color: th.textSec, fontSize: 13, margin: 0 }}>Sin fotos aún.</p>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {photos.map(p => (
                  <div key={p.id} style={{
                    position: 'relative', aspectRatio: '1',
                    borderRadius: 10, overflow: 'hidden', border: `1px solid ${th.border}`
                  }}>
                    <img src={p.image_url} alt={p.photo_type}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'rgba(0,0,0,0.5)', padding: '3px 6px'
                    }}>
                      <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>
                        {p.photo_type === 'before' ? '🔴 Antes' : p.photo_type === 'after' ? '🟢 Después' : '🔵 Progreso'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
          {/* Técnico puede subir fotos */}
          {isTech && ['accepted', 'in_progress', 'pending_payment'].includes(request.status) && (
            <button onClick={() => setShowPhotoModal(true)}
              style={{
                width: '100%', marginTop: 12, padding: '10px', background: th.surface2,
                border: `2px dashed ${th.border}`, borderRadius: 12, fontSize: 13,
                color: th.textSec, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
              }}>
              📷 Subir foto del trabajo
            </button>
          )}
        </Section>

        {/* ── Comprobantes de pago ── */}
        {proofs.length > 0 && (
          <Section title="🧾 Comprobantes de pago" th={th}>
            {proofs.map(proof => (
              <div key={proof.id} style={{
                display: 'flex', gap: 12, alignItems: 'center',
                padding: '10px 0', borderBottom: `1px solid ${th.border}`
              }}>
                {proof.image_url && (
                  <img src={proof.image_url} alt="comprobante"
                    style={{
                      width: 56, height: 56, borderRadius: 10, objectFit: 'cover',
                      border: `1px solid ${th.border}`
                    }} />
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: th.text }}>
                    {proof.proof_type === 'transfer' ? '🏦 Transferencia' : '💚 Yappy'}
                  </p>
                  {proof.reference_number && (
                    <p style={{ margin: 0, fontSize: 12, color: th.textSec }}>Ref: {proof.reference_number}</p>
                  )}
                  {proof.amount && (
                    <p style={{ margin: 0, fontSize: 12, color: th.primaryText, fontWeight: 600 }}>${proof.amount}</p>
                  )}
                </div>
                {proof.verified_by_tech
                  ? <span style={{
                    fontSize: 11, fontWeight: 700, color: '#166534',
                    background: '#dcfce7', padding: '3px 8px', borderRadius: 20
                  }}>✓ Verificado</span>
                  : isTech && (
                    <button onClick={async () => {
                      setBusy(true)
                      try {
                        await paymentActions.verifyProof(proof.id, user.id, request.id)
                        setProofs(prev => prev.map(p => p.id === proof.id
                          ? { ...p, verified_by_tech: true } : p))
                        setRequest(r => ({ ...r, payment_status: 'paid' }))
                        showToast('✅ Pago verificado correctamente')
                      } catch { showToast('Error al verificar', 'error') }
                      finally { setBusy(false) }
                    }} style={{
                      background: '#dcfce7', color: '#166534', border: 'none',
                      borderRadius: 10, padding: '6px 12px', fontSize: 12,
                      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                    }}>
                      Verificar ✓
                    </button>
                  )
                }
              </div>
            ))}
          </Section>
        )}

        {/* ── Recibo digital ── */}
        {receipt && (
          <Section title="🧾 Recibo de pago" th={th}>
            <div style={{
              background: '#f0fdf4', borderRadius: 12, padding: 14,
              border: '1px solid #bbf7d0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15, color: '#15803d' }}>
                    {receipt.receipt_number}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#166534' }}>
                    {new Date(receipt.issued_at).toLocaleDateString('es-PA', { dateStyle: 'medium' })}
                  </p>
                </div>
                <span style={{
                  background: '#dcfce7', color: '#166534', fontSize: 12,
                  fontWeight: 700, padding: '4px 10px', borderRadius: 20, alignSelf: 'flex-start'
                }}>
                  ✓ Pagado
                </span>
              </div>
              <div style={{
                borderTop: '1px solid #bbf7d0', paddingTop: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: 14, color: '#166534' }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#15803d' }}>${Number(receipt.amount).toFixed(2)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Btn onClick={() => setShowReceiptModal(true)} variant="ghost" size="sm" style={{ flex: 1 }}>
                👁️ Ver detalles
              </Btn>
              <Btn onClick={async () => {
                setBusy(true)
                try { await receiptActions.downloadPDF(receipt) }
                catch { showToast('Error al generar PDF', 'error') }
                finally { setBusy(false) }
              }} variant="primary" size="sm" style={{ flex: 1 }} loading={busy}>
                ⬇️ Descargar PDF
              </Btn>
            </div>
          </Section>
        )}

        {/* ── Disputa activa ── */}
        {dispute && (
          <div style={{
            background: '#fff7ed', borderRadius: 16, padding: 16,
            border: '1px solid #fed7aa', marginBottom: 14
          }}>
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15, color: '#9a3412' }}>
              ⚠️ Disputa abierta
            </p>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: '#9a3412' }}>Motivo: {dispute.reason}</p>
            {dispute.description && (
              <p style={{ margin: 0, fontSize: 12, color: '#c2410c' }}>{dispute.description}</p>
            )}
            <p style={{ margin: '8px 0 0', fontSize: 11, color: '#9a3412' }}>
              Estado: <strong>{dispute.status === 'open' ? 'Pendiente de revisión' : dispute.status}</strong>
            </p>
          </div>
        )}

        {/* ── ACCIONES SEGÚN ROL Y ESTADO ── */}
        <ActionButtons
          request={request} setRequest={setRequest}
          isClient={isClient} isTech={isTech} isPendingConfirmation={isPendingConfirmation}
          canPay={canPay} canComplete={canComplete}
          canDispute={canDispute} isPaid={isPaid} isDone={isDone}
          receipt={receipt} setReceipt={setReceipt}
          user={user} th={th} lang={lang}
          setBusy={setBusy} busy={busy}
          showToast={showToast}
          setShowPayModal={setShowPayModal}
          setShowProofModal={setShowProofModal}
          setShowDisputeModal={setShowDisputeModal}
          setProofs={setProofs}
          goBack={goBack}
        />
      </div>

      {/* ── MODALES ── */}
      {showPayModal && (
        <PayModal
          request={request} user={user} th={th} lang={lang}
          onClose={() => setShowPayModal(false)}
          onSuccess={(method, ref) => {
            setRequest(r => ({ ...r, payment_status: 'paid', payment_method: method, payment_ref: ref }))
            setShowPayModal(false)
            showToast('✅ Pago registrado correctamente')
            // Generar recibo
            receiptActions.generate({
              requestId: request.id,
              clientId: request.client_id,
              technicianId: request.technician_id,
              serviceTitle: request.title,
              serviceDescription: request.description,
              amount: request.agreed_price ?? 0,
              paymentMethod: method,
              paymentReference: ref,
              clientName: request.client_name,
              technicianName: request.technician_name,
            }).then(rec => setReceipt(rec)).catch(e => console.warn('Recibo:', e))
          }}
        />
      )}

      {showProofModal && (
        <ProofModal
          request={request} user={user} th={th}
          onClose={() => setShowProofModal(false)}
          onSuccess={(proof) => {
            setProofs(prev => [proof, ...prev])
            setShowProofModal(false)
            showToast('✅ Comprobante subido correctamente')
          }}
        />
      )}

      {showDisputeModal && (
        <DisputeModal
          request={request} user={user} th={th}
          onClose={() => setShowDisputeModal(false)}
          onSuccess={(d) => {
            setDispute(d)
            setRequest(r => ({ ...r, status: 'disputed' }))
            setShowDisputeModal(false)
            showToast('⚠️ Disputa abierta. El equipo de soporte revisará el caso.')
          }}
        />
      )}

      {showPhotoModal && (
        <PhotoUploadModal
          request={request} user={user} th={th}
          onClose={() => setShowPhotoModal(false)}
          onSuccess={(photo) => {
            setPhotos(prev => [...prev, photo])
            setShowPhotoModal(false)
            showToast('📸 Foto subida correctamente')
          }}
        />
      )}

      {showReceiptModal && receipt && (
        <ReceiptDetailModal
          receipt={receipt} th={th}
          onClose={() => setShowReceiptModal(false)}
          onDownload={async () => {
            setBusy(true)
            try { await receiptActions.downloadPDF(receipt) }
            catch { showToast('Error al generar PDF', 'error') }
            finally { setBusy(false) }
          }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// BARRA DE PROGRESO
// ─────────────────────────────────────────────────────────────
function ProgressBar({ status, th, lang }) {
  const steps = [
    { key: 'pending', icon: '📤', label: lang === 'en' ? 'Sent' : 'Enviada' },
    { key: 'accepted', icon: '✅', label: lang === 'en' ? 'Accepted' : 'Aceptada' },
    { key: 'in_progress', icon: '🔧', label: lang === 'en' ? 'Working' : 'En progreso' },
    { key: 'pending_payment', icon: '💳', label: lang === 'en' ? 'Payment' : 'Pago' },
    { key: 'completed', icon: '🎉', label: lang === 'en' ? 'Done' : 'Completo' },
  ]
  const order = steps.map(s => s.key)
  const currentIdx = order.indexOf(status)

  if (['cancelled', 'disputed'].includes(status)) return (
    <div style={{
      background: status === 'cancelled' ? '#fee2e2' : '#fff7ed',
      borderRadius: 14, padding: '12px 16px', marginBottom: 16, textAlign: 'center'
    }}>
      <p style={{
        margin: 0, fontWeight: 700, fontSize: 14,
        color: status === 'cancelled' ? '#991b1b' : '#9a3412'
      }}>
        {status === 'cancelled' ? '❌ Solicitud cancelada' : '⚠️ En disputa — soporte revisando'}
      </p>
    </div>
  )

  return (
    <div style={{
      background: th.surface, borderRadius: 14, padding: '14px 16px',
      marginBottom: 16, border: `1px solid ${th.border}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {steps.map((step, i) => {
          const done = i < currentIdx
          const current = i === currentIdx
          const future = i > currentIdx
          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 16,
                  background: done ? th.primary : current ? th.primaryLight : th.surface2,
                  border: `2px solid ${done || current ? th.primary : th.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: done ? 14 : 16,
                }}>
                  {done ? '✓' : step.icon}
                </div>
                <span style={{
                  fontSize: 9, fontWeight: current ? 700 : 400,
                  color: done || current ? th.primaryText : th.textSec, textAlign: 'center', lineHeight: 1.2
                }}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  flex: 1, height: 2, background: done ? th.primary : th.border,
                  margin: '0 4px', marginBottom: 14
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// BOTONES DE ACCIÓN
// ─────────────────────────────────────────────────────────────
function ActionButtons({ request, setRequest, isClient, isTech, canPay, canComplete,
  canDispute, isPaid, isDone, isPendingConfirmation, receipt, setReceipt, user, th, lang,
  setBusy, busy, showToast, setShowPayModal, setShowProofModal,
  setShowDisputeModal, setProofs, goBack }) {

  const changeStatus = async (newStatus) => {
    setBusy(true)
    try {
      await requestActions.updateStatus(
        request.id, newStatus,
        isClient ? request.technician_id : request.client_id,
        user.full_name, request.title
      )
      setRequest(r => ({ ...r, status: newStatus }))
      if (newStatus === REQUEST_STATUS.COMPLETED) {
        showToast('🎉 Servicio completado')
      }
    } catch (err) {
      showToast('Error: ' + (err?.message ?? 'intenta de nuevo'), 'error')
    } finally { setBusy(false) }
  }

  const handleComplete = async () => {
    setBusy(true)
    try {
      await changeStatus(REQUEST_STATUS.COMPLETED)
      // Generar recibo si no existe
      if (!receipt) {
        const rec = await receiptActions.generate({
          requestId: request.id,
          clientId: request.client_id,
          technicianId: request.technician_id,
          serviceTitle: request.title,
          serviceDescription: request.description,
          amount: request.agreed_price ?? 0,
          paymentMethod: request.payment_method ?? 'cash',
          paymentReference: request.payment_ref ?? null,
          clientName: request.client_name,
          technicianName: request.technician_name,
        })
        setReceipt(rec)
      }
    } catch (err) {
      showToast('Error: ' + (err?.message ?? ''), 'error')
    } finally { setBusy(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar esta solicitud cancelada? Esta acción no se puede deshacer.')) return
    setBusy(true)
    try {
      await supabase.from('service_requests').delete().eq('id', request.id)
      goBack()
    } catch { showToast('Error al eliminar', 'error') }
    finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 32 }}>

      {/* ── TÉCNICO ── */}
      {isTech && request.status === REQUEST_STATUS.PENDING && (
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={() => changeStatus(REQUEST_STATUS.ACCEPTED)} loading={busy} style={{ flex: 1 }}>
            ✅ Aceptar solicitud
          </Btn>
          <Btn onClick={() => changeStatus(REQUEST_STATUS.CANCELLED)} variant="danger" loading={busy} style={{ flex: 1 }}>
            ✗ Rechazar
          </Btn>
        </div>
      )}

      {isTech && request.status === REQUEST_STATUS.ACCEPTED && (
        <Btn onClick={() => changeStatus(REQUEST_STATUS.IN_PROGRESS)} loading={busy}>
          🔧 Iniciar trabajo
        </Btn>
      )}

      {isTech && request.status === REQUEST_STATUS.IN_PROGRESS && (
        <Btn onClick={() => changeStatus(REQUEST_STATUS.PENDING_PAYMENT)} loading={busy}>
          💳 Marcar como listo — solicitar pago
        </Btn>
      )}

      {/* Técnico: aún no hay ningún pago reportado */}
      {isTech && request.status === REQUEST_STATUS.PENDING_PAYMENT
        && !isPaid && !isPendingConfirmation && (
          <div style={{
            background: '#fef9c3', borderRadius: 14, padding: 14,
            border: '1px solid #fde047', marginBottom: 4
          }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#854d0e' }}>
              ⏳ Esperando que el cliente pague
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#92400e' }}>
              Cuando el cliente reporte su pago (Yappy, efectivo o transferencia), aparecerá aquí para que lo confirmes.
            </p>
          </div>
        )}

      {/* Técnico: el cliente reportó pago Yappy/efectivo — requiere CONFIRMAR */}
      {isTech && isPendingConfirmation && (
        <div style={{
          background: '#eff6ff', borderRadius: 14, padding: 14,
          border: '1px solid #bfdbfe', marginBottom: 4
        }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#1e40af' }}>
            💰 El cliente reportó un pago de ${request.agreed_price ?? '0.00'} por {request.payment_method === 'yappy' ? 'Yappy' : 'efectivo'}
          </p>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#1e3a8a' }}>
            {request.payment_method === 'yappy'
              ? 'Revisa tu app Yappy y confirma si recibiste el dinero.'
              : 'Confirma que recibiste el efectivo en mano antes de continuar.'}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={async () => {
              setBusy(true)
              try {
                await paymentActions.confirmPayment(request.id, user.id)
                setRequest(r => ({ ...r, payment_status: 'paid' }))
                showToast('✅ Pago confirmado')
              } catch (err) { showToast(err?.message ?? 'Error', 'error') }
              finally { setBusy(false) }
            }} loading={busy} style={{ flex: 1 }}>
              ✓ Confirmar recepción
            </Btn>
            <Btn onClick={async () => {
              if (!window.confirm('¿Confirmas que NO recibiste este pago? Se notificará al cliente para que lo intente de nuevo.')) return
              setBusy(true)
              try {
                await paymentActions.rejectPayment(request.id, user.id)
                setRequest(r => ({ ...r, payment_status: 'unpaid' }))
                showToast('Pago rechazado. Se notificó al cliente.')
              } catch (err) { showToast(err?.message ?? 'Error', 'error') }
              finally { setBusy(false) }
            }} loading={busy} variant="danger" style={{ flex: 1 }}>
              ✗ No lo recibí
            </Btn>
          </div>
        </div>
      )}

      {isTech && isPaid && !isDone && (
        <Btn onClick={handleComplete} loading={busy}>
          🎉 Confirmar servicio completado
        </Btn>
      )}

      {/* ── CLIENTE ── */}
      {isClient && request.status === REQUEST_STATUS.PENDING_PAYMENT && !isPaid && !isPendingConfirmation && (
        <>
          <Btn onClick={() => setShowPayModal(true)}>
            💳 Realizar pago — ${request.agreed_price ?? '0.00'}
          </Btn>
          {request.payment_method === 'transfer' && (
            <Btn onClick={() => setShowProofModal(true)} variant="outline">
              📎 Subir comprobante de transferencia
            </Btn>
          )}
        </>
      )}

      {/* Cliente: ya reportó el pago, esperando que el técnico confirme */}
      {isClient && isPendingConfirmation && (
        <div style={{
          background: '#fef9c3', borderRadius: 14, padding: 14,
          border: '1px solid #fde047'
        }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#854d0e' }}>
            ⏳ Esperando confirmación del técnico
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#92400e' }}>
            Reportaste tu pago de ${request.agreed_price ?? '0.00'}. El técnico debe confirmar que lo recibió.
          </p>
        </div>
      )}

      {isClient && isPaid && !isDone && (
        <Btn onClick={handleComplete} loading={busy}>
          ✅ Confirmar que el trabajo quedó bien
        </Btn>
      )}

      {/* ── DISPUTA ── */}
      {canDispute && !isDone && request.status !== 'cancelled' && (
        <Btn onClick={() => setShowDisputeModal(true)} variant="danger">
          ⚠️ Abrir disputa
        </Btn>
      )}

      {/* ── ELIMINAR si está cancelada ── */}
      {request.status === REQUEST_STATUS.CANCELLED && (
        <Btn onClick={handleDelete} variant="danger" loading={busy}>
          🗑️ Eliminar solicitud cancelada
        </Btn>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: PAGAR
// ─────────────────────────────────────────────────────────────
function PayModal({ request, user, th, onClose, onSuccess }) {
  const [method, setMethod] = useState(request.payment_method ?? 'yappy')
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1=elegir, 2=instrucciones, 3=confirmar

  const yappyPhone = (request.technician_whatsapp ?? '').replace(/\D/g, '')
  const amount = request.agreed_price ?? 0

  const handleConfirm = async () => {
    setLoading(true)
    try {
      if (method === 'yappy') {
        await paymentActions.recordYappy(request.id, user.id, request.technician_id,
          amount, yappyPhone, reference)
      } else if (method === 'cash') {
        await paymentActions.recordCash(request.id, user.id, request.technician_id, amount)
      }
      onSuccess(method, reference)
    } catch (err) {
      alert('Error al registrar pago: ' + (err?.message ?? ''))
    } finally { setLoading(false) }
  }

  return (
    <Modal title="💳 Realizar pago" onClose={onClose} th={th}>
      {step === 1 && (
        <>
          <p style={{ fontSize: 13, color: th.textSec, margin: '0 0 16px' }}>
            Monto a pagar: <strong style={{ fontSize: 18, color: th.primary }}>${Number(amount).toFixed(2)}</strong>
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: th.text, margin: '0 0 10px' }}>Elige método de pago:</p>
          {[
            { v: 'yappy', icon: '💚', label: 'Yappy', desc: 'Billetera digital — más rápido y seguro' },
            { v: 'transfer', icon: '🏦', label: 'Transferencia', desc: 'Transferencia bancaria con comprobante' },
            { v: 'cash', icon: '💵', label: 'Efectivo', desc: 'Pago en mano al técnico' },
          ].map(m => (
            <button key={m.v} onClick={() => setMethod(m.v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 14, cursor: 'pointer', marginBottom: 8,
                border: `2px solid ${method === m.v ? th.primary : th.border}`,
                background: method === m.v ? th.primaryLight : 'transparent',
                fontFamily: 'inherit', textAlign: 'left'
              }}>
              <span style={{ fontSize: 28 }}>{m.icon}</span>
              <div>
                <p style={{
                  margin: '0 0 2px', fontWeight: 700, fontSize: 14,
                  color: method === m.v ? th.primaryText : th.text
                }}>{m.label}</p>
                <p style={{ margin: 0, fontSize: 12, color: th.textSec }}>{m.desc}</p>
              </div>
              {method === m.v && <span style={{ marginLeft: 'auto', color: th.primary, fontSize: 18 }}>✓</span>}
            </button>
          ))}
          <div style={{ height: 8 }} />
          <Btn onClick={() => setStep(2)}>Continuar →</Btn>
        </>
      )}

      {step === 2 && (
        <>
          {method === 'yappy' && (
            <div>
              <div style={{
                background: '#f0fdf4', borderRadius: 14, padding: 16,
                border: '1px solid #bbf7d0', marginBottom: 16
              }}>
                <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#15803d', fontSize: 14 }}>
                  💚 Instrucciones Yappy
                </p>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#166534' }}>1. Toca el botón para abrir Yappy</p>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#166534' }}>2. El monto y número ya están prellenados</p>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#166534' }}>3. Completa el pago en Yappy</p>
                <p style={{ margin: 0, fontSize: 13, color: '#166534' }}>4. Copia la referencia que te da Yappy y pégala aquí</p>
              </div>
              <Btn variant="whatsapp" onClick={() => {
                const link = `yappy://pay?phone=${yappyPhone}&amount=${amount}&description=${encodeURIComponent(request.title)}`
                window.location.href = link
                setTimeout(() => window.open(`https://yappy.com.pa/pay?phone=${yappyPhone}&amount=${amount}&description=${encodeURIComponent(request.title)}`, '_blank'), 1500)
              }}>
                💚 Abrir Yappy — ${Number(amount).toFixed(2)}
              </Btn>
              <div style={{ height: 12 }} />
              <Input label="Referencia Yappy (ej: YAP-123456)"
                value={reference} onChange={setReference} placeholder="YAP-XXXXXX" icon="🔢" />
            </div>
          )}

          {method === 'transfer' && (
            <div>
              <div style={{
                background: '#eff6ff', borderRadius: 14, padding: 16,
                border: '1px solid #bfdbfe', marginBottom: 16
              }}>
                <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#1e40af', fontSize: 14 }}>
                  🏦 Datos bancarios del técnico
                </p>
                {request.technician_bank_account ? (
                  <>
                    <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#1e40af' }}>
                      {request.technician_bank_account}
                    </p>
                    <button onClick={() => {
                      navigator.clipboard.writeText(request.technician_bank_account)
                    }} style={{
                      background: '#dbeafe', color: '#1e40af', border: 'none',
                      borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer'
                    }}>📋 Copiar cuenta</button>
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: '#1e40af' }}>
                    El técnico no ha configurado su cuenta bancaria aún.
                    Contáctalo por WhatsApp para obtener los datos.
                  </p>
                )}
                <p style={{ margin: '12px 0 0', fontSize: 12, color: '#3730a3' }}>
                  Monto a transferir: <strong>${Number(amount).toFixed(2)}</strong>
                </p>
              </div>
              <Input label="Número de referencia de la transferencia"
                value={reference} onChange={setReference}
                placeholder="Ej: 20240525-001234" icon="🔢" />
              <p style={{ fontSize: 12, color: th.textSec, margin: '0 0 12px' }}>
                ⚠️ También debes subir la foto del comprobante en la siguiente pantalla.
              </p>
            </div>
          )}

          {method === 'cash' && (
            <div style={{
              background: '#fef9c3', borderRadius: 14, padding: 16,
              border: '1px solid #fde047', marginBottom: 16
            }}>
              <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#854d0e', fontSize: 14 }}>
                💵 Pago en efectivo
              </p>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#92400e' }}>
                Monto: <strong>${Number(amount).toFixed(2)}</strong>
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#92400e' }}>
                Entrégale el dinero al técnico en persona. Se generará un recibo digital como comprobante para ambas partes.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>← Atrás</Btn>
            <Btn onClick={() => setStep(3)} style={{ flex: 2 }}>Confirmar pago →</Btn>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>
              {method === 'yappy' ? '💚' : method === 'transfer' ? '🏦' : '💵'}
            </div>
            <p style={{ fontWeight: 800, fontSize: 18, color: th.text, margin: '0 0 6px' }}>
              Confirmar pago de ${Number(amount).toFixed(2)}
            </p>
            <p style={{ fontSize: 13, color: th.textSec, margin: 0 }}>
              {method === 'yappy' && `Método: Yappy${reference ? ` · Ref: ${reference}` : ''}`}
              {method === 'transfer' && `Método: Transferencia bancaria${reference ? ` · Ref: ${reference}` : ''}`}
              {method === 'cash' && 'Método: Efectivo en mano'}
            </p>
          </div>
          <div style={{
            background: '#fef3c7', borderRadius: 12, padding: 12,
            border: '1px solid #fde68a', marginBottom: 16
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#92400e' }}>
              ⚠️ Al confirmar declaras que realizaste el pago. Se generará un recibo digital como comprobante.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="ghost" onClick={() => setStep(2)} style={{ flex: 1 }}>← Atrás</Btn>
            <Btn onClick={handleConfirm} loading={loading} style={{ flex: 2 }}>
              ✅ Confirmar pago
            </Btn>
          </div>
        </>
      )}
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: SUBIR COMPROBANTE
// ─────────────────────────────────────────────────────────────
function ProofModal({ request, user, th, onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [reference, setReference] = useState('')
  const [amount, setAmount] = useState(String(request.agreed_price ?? ''))
  const [loading, setLoading] = useState(false)

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleUpload = async () => {
    if (!file) { alert('Selecciona una foto del comprobante'); return }
    setLoading(true)
    try {
      const proof = await paymentActions.uploadTransferProof(
        request.id, user.id, file, amount, reference)
      onSuccess(proof)
    } catch (err) {
      alert('Error al subir: ' + (err?.message ?? ''))
    } finally { setLoading(false) }
  }

  return (
    <Modal title="📎 Subir comprobante" onClose={onClose} th={th}>
      <p style={{ fontSize: 13, color: th.textSec, margin: '0 0 16px' }}>
        Sube la foto del comprobante de transferencia bancaria. El técnico la verificará.
      </p>
      <label style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 10, padding: '20px',
        background: preview ? 'transparent' : th.surface2, borderRadius: 14,
        border: `2px dashed ${th.border}`, cursor: 'pointer', marginBottom: 14
      }}>
        {preview
          ? <img src={preview} alt="comprobante"
            style={{ width: '100%', borderRadius: 12, maxHeight: 200, objectFit: 'contain' }} />
          : <>
            <span style={{ fontSize: 36 }}>📷</span>
            <span style={{ fontSize: 13, color: th.textSec, fontWeight: 600 }}>
              Toca para elegir foto del comprobante
            </span>
          </>
        }
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      </label>
      <Input label="Número de referencia (opcional)"
        value={reference} onChange={setReference} placeholder="Ej: TXN-20240525" icon="🔢" />
      <Input label="Monto transferido ($)"
        value={amount} onChange={setAmount} type="number" icon="💲" />
      <Btn onClick={handleUpload} loading={loading} disabled={!file}>
        📤 Subir comprobante
      </Btn>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: FOTO DE TRABAJO
// ─────────────────────────────────────────────────────────────
function PhotoUploadModal({ request, user, th, onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [photoType, setPhotoType] = useState('after')
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleUpload = async () => {
    if (!file) { alert('Selecciona una foto'); return }
    setLoading(true)
    try {
      const photo = await requestActions.uploadJobPhoto(
        request.id, user.id, file, photoType, caption)
      onSuccess(photo)
    } catch (err) {
      alert('Error al subir: ' + (err?.message ?? ''))
    } finally { setLoading(false) }
  }

  return (
    <Modal title="📸 Subir foto del trabajo" onClose={onClose} th={th}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['before', '🔴 Antes'], ['progress', '🔵 Progreso'], ['after', '🟢 Después']].map(([v, label]) => (
          <button key={v} onClick={() => setPhotoType(v)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer',
              border: `2px solid ${photoType === v ? th.primary : th.border}`,
              background: photoType === v ? th.primaryLight : 'transparent',
              color: photoType === v ? th.primaryText : th.textSec,
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit'
            }}>
            {label}
          </button>
        ))}
      </div>
      <label style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 10, padding: '20px',
        background: preview ? 'transparent' : th.surface2, borderRadius: 14,
        border: `2px dashed ${th.border}`, cursor: 'pointer', marginBottom: 14
      }}>
        {preview
          ? <img src={preview} alt="trabajo"
            style={{ width: '100%', borderRadius: 12, maxHeight: 220, objectFit: 'contain' }} />
          : <>
            <span style={{ fontSize: 36 }}>📷</span>
            <span style={{ fontSize: 13, color: th.textSec, fontWeight: 600 }}>Toca para elegir foto</span>
          </>
        }
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      </label>
      <Input label="Descripción (opcional)" value={caption} onChange={setCaption}
        placeholder="Ej: Instalación terminada, probado y funcionando" />
      <Btn onClick={handleUpload} loading={loading} disabled={!file}>
        📤 Subir foto
      </Btn>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: DISPUTA
// ─────────────────────────────────────────────────────────────
function DisputeModal({ request, user, th, onClose, onSuccess }) {
  const REASONS = [
    'El técnico no se presentó',
    'El trabajo no quedó bien terminado',
    'Se cobró más de lo acordado',
    'El técnico causó daños adicionales',
    'El cliente no quiere pagar',
    'El cliente no facilita el acceso',
    'Otro motivo',
  ]
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOpen = async () => {
    if (!reason) { alert('Selecciona un motivo'); return }
    setLoading(true)
    try {
      const d = await disputeActions.open(request.id, user.id, reason, description)
      onSuccess(d)
    } catch (err) {
      alert('Error: ' + (err?.message ?? ''))
    } finally { setLoading(false) }
  }

  return (
    <Modal title="⚠️ Abrir disputa" onClose={onClose} th={th}>
      <div style={{
        background: '#fff7ed', borderRadius: 12, padding: 14,
        border: '1px solid #fed7aa', marginBottom: 16
      }}>
        <p style={{ margin: 0, fontSize: 13, color: '#9a3412' }}>
          Al abrir una disputa el equipo de soporte de Changuinola Pro revisará el caso y tomará una decisión.
          El pago quedará congelado hasta resolución.
        </p>
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: th.text, margin: '0 0 10px' }}>Motivo de la disputa:</p>
      {REASONS.map(r => (
        <button key={r} onClick={() => setReason(r)}
          style={{
            width: '100%', padding: '10px 14px', marginBottom: 8, borderRadius: 12,
            border: `1.5px solid ${reason === r ? '#ef4444' : th.border}`,
            background: reason === r ? '#fee2e2' : 'transparent',
            color: reason === r ? '#991b1b' : th.text,
            fontSize: 13, fontWeight: reason === r ? 700 : 400,
            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit'
          }}>
          {reason === r ? '● ' : '○ '}{r}
        </button>
      ))}
      <div style={{ height: 8 }} />
      <Input label="Descripción adicional (opcional)" value={description} onChange={setDescription}
        placeholder="Explica en detalle lo que ocurrió..." rows={3} />
      <Btn onClick={handleOpen} loading={loading} disabled={!reason} variant="danger">
        ⚠️ Abrir disputa formalmente
      </Btn>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: RECIBO COMPLETO
// ─────────────────────────────────────────────────────────────
function ReceiptDetailModal({ receipt, th, onClose, onDownload }) {
  const METHOD = { yappy: '💚 Yappy', transfer: '🏦 Transferencia bancaria', cash: '💵 Efectivo' }
  return (
    <Modal title="🧾 Recibo de pago" onClose={onClose} th={th}>
      <div style={{
        background: '#f0fdf4', borderRadius: 14, padding: 16,
        border: '1px solid #bbf7d0', marginBottom: 16
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginBottom: 14,
          paddingBottom: 14, borderBottom: '1px solid #bbf7d0'
        }}>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: 16, color: '#15803d' }}>
              {receipt.receipt_number}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#166534' }}>
              {new Date(receipt.issued_at).toLocaleString('es-PA')}
            </p>
          </div>
          <span style={{
            background: '#dcfce7', color: '#166534', fontSize: 12,
            fontWeight: 700, padding: '4px 12px', borderRadius: 20, alignSelf: 'flex-start'
          }}>
            ✓ Pagado
          </span>
        </div>
        {[
          ['Servicio', receipt.service_title],
          ['Descripción', receipt.service_description || '—'],
          ['Cliente', receipt.client_name],
          ['Técnico', receipt.technician_name],
          ['Método de pago', METHOD[receipt.payment_method] ?? receipt.payment_method],
          ['Referencia', receipt.payment_reference || '—'],
        ].map(([label, val]) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '6px 0', borderBottom: '1px solid #d1fae5'
          }}>
            <span style={{ fontSize: 13, color: '#166534' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d', maxWidth: '60%', textAlign: 'right' }}>{val}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#15803d' }}>Total pagado</span>
          <span style={{ fontWeight: 900, fontSize: 22, color: '#15803d' }}>
            ${Number(receipt.amount).toFixed(2)}
          </span>
        </div>
      </div>
      <p style={{ fontSize: 10, color: th.textSec, margin: '0 0 16px', wordBreak: 'break-all' }}>
        Firma digital: {receipt.signature_hash?.slice(0, 40)}...
      </p>
      <Btn onClick={onDownload}>⬇️ Descargar PDF</Btn>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// Modal genérico (reutiliza el de UI.jsx pero inline aquí)
// ─────────────────────────────────────────────────────────────
function Modal({ title, children, onClose, th }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}
      onClick={onClose}>
      <div style={{
        background: th.surface, borderRadius: '20px 20px 0 0',
        padding: '20px 20px 40px', width: '100%', maxWidth: 430,
        maxHeight: '88vh', overflowY: 'auto', animation: 'slideUp 0.3s ease'
      }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ flex: 1, margin: 0, fontSize: 17, fontWeight: 800, color: th.text }}>{title}</h3>
          <button onClick={onClose} style={{
            background: th.surface2, border: 'none',
            borderRadius: 20, width: 32, height: 32, fontSize: 18, cursor: 'pointer',
            color: th.textSec, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CHAT SECTION — mensajería interna entre cliente y técnico
// ─────────────────────────────────────────────────────────────
function ChatSection({ request, user, isClient, th, lang }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)

  const otherName = isClient ? request.technician_name : request.client_name

  // Cargar mensajes + marcar leídos
  useEffect(() => {
    if (!request?.id) return
    chatApi.list(request.id)
      .then(setMessages)
      .catch(() => { })
      .finally(() => setLoading(false))
    chatApi.markRead(request.id, user.id).catch(() => { })
  }, [request?.id])

  // Suscripción realtime a nuevos mensajes
  useEffect(() => {
    if (!request?.id) return
    const unsub = chatApi.subscribe(request.id, (msg) => {
      setMessages(prev => [...prev, msg])
      if (msg.sender_id !== user.id) {
        chatApi.markRead(request.id, user.id).catch(() => { })
      }
    })
    return unsub
  }, [request?.id, user.id])

  // Auto-scroll al fondo cuando llegan mensajes nuevos
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setText('')
    try {
      const msg = await chatApi.send(request.id, user.id, body)
      // Optimista: ya llegará también por realtime, pero evita duplicar visualmente
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
    } catch {
      setText(body) // restaurar si falla
    } finally { setSending(false) }
  }

  const formatTime = (iso) => new Date(iso).toLocaleTimeString('es-PA', {
    hour: '2-digit', minute: '2-digit',
  })

  const formatDateSep = (iso) => new Date(iso).toLocaleDateString('es-PA', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  // Agrupar por día para mostrar separadores de fecha
  let lastDate = null

  return (
    <Section title={`💬 ${lang === 'en' ? 'Chat with' : 'Chat con'} ${otherName}`} th={th}>
      {/* Aviso informativo */}
      <div style={{
        background: '#eff6ff', borderRadius: 10, padding: '8px 10px',
        marginBottom: 10, border: '1px solid #bfdbfe'
      }}>
        <p style={{ margin: 0, fontSize: 11, color: '#1e40af', lineHeight: 1.5 }}>
          ℹ️ {lang === 'en'
            ? 'Messages are kept as evidence for this service request.'
            : 'Los mensajes quedan registrados como evidencia de esta solicitud.'}
        </p>
      </div>

      {/* Lista de mensajes */}
      <div ref={scrollRef} style={{
        maxHeight: 320, overflowY: 'auto', display: 'flex',
        flexDirection: 'column', gap: 6, marginBottom: 10,
        padding: '4px 2px',
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: 13, color: th.textSec, padding: '16px 0' }}>
            {lang === 'en'
              ? 'No messages yet. Say hello! 👋'
              : 'Sin mensajes aún. ¡Saluda! 👋'}
          </p>
        ) : (
          messages.map(m => {
            const mine = m.sender_id === user.id
            const dateLabel = formatDateSep(m.created_at)
            const showDateSep = dateLabel !== lastDate
            lastDate = dateLabel

            return (
              <div key={m.id}>
                {showDateSep && (
                  <div style={{ textAlign: 'center', margin: '8px 0 4px' }}>
                    <span style={{
                      fontSize: 10, color: th.textSec,
                      background: th.surface2, padding: '2px 10px', borderRadius: 20
                    }}>
                      {dateLabel}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '78%', padding: '8px 12px', borderRadius: 14,
                    background: mine ? th.primary : th.surface2,
                    color: mine ? '#fff' : th.text,
                    borderBottomRightRadius: mine ? 4 : 14,
                    borderBottomLeftRadius: mine ? 14 : 4,
                  }}>
                    <p style={{
                      margin: 0, fontSize: 13, lineHeight: 1.4,
                      wordBreak: 'break-word', whiteSpace: 'pre-wrap'
                    }}>
                      {m.body}
                    </p>
                    <p style={{
                      margin: '3px 0 0', fontSize: 10,
                      textAlign: 'right',
                      color: mine ? 'rgba(255,255,255,0.7)' : th.textSec
                    }}>
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input de mensaje */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder={lang === 'en' ? 'Type a message...' : 'Escribe un mensaje...'}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 20,
            border: `1.5px solid ${th.inputBorder}`, background: th.inputBg,
            color: th.text, fontSize: 14, outline: 'none', fontFamily: 'inherit'
          }}
        />
        <button onClick={handleSend} disabled={!text.trim() || sending}
          style={{
            width: 42, height: 42, borderRadius: 21, border: 'none',
            background: text.trim() ? th.primary : th.border,
            color: '#fff', fontSize: 18, cursor: text.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontFamily: 'inherit'
          }}>
          {sending ? <Spinner size={16} /> : '➤'}
        </button>
      </div>
    </Section>
  )
}