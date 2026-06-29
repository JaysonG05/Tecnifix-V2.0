// ============================================================
//  RequestDetailScreen.jsx
//  Pantalla completa de detalle de solicitud:
//  - Cliente: ver estado, pagar, subir comprobante, confirmar, descargar recibo
//  - Técnico: aceptar, cambiar estado, subir fotos, verificar pago, generar recibo
// ============================================================
import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Avatar, Btn, Spinner, Toast } from '../components/UI.jsx'
import { supabase } from '../lib/supabase.js'
import {
  requestActions, paymentActions, receiptActions, disputeActions, conformityActions,
  REQUEST_STATUS, STATUS_LABELS, STATUS_COLORS,
} from '../lib/payments.js'
import { T } from '../i18n/translations.js'
import {
  PayModal, ProofModal, PhotoUploadModal, DisputeModal,
  ReceiptDetailModal, ConformityModal, Modal,
} from './requestDetail/modals.jsx'

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
  const [act, setAct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)

  // Modales
  const [showPayModal, setShowPayModal] = useState(false)
  const [showProofModal, setShowProofModal] = useState(false)
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [showConformityModal, setShowConformityModal] = useState(false)
  const [showQREscrowModal, setShowQREscrowModal] = useState(false)

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
      conformityActions.getForRequest(request.id).catch(() => null),
    ]).then(([p, pr, rec, dis, ac]) => {
      setPhotos(p); setProofs(pr); setReceipt(rec); setDispute(dis); setAct(ac)
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

  // El cliente reportó un pago (Yappy/efectivo) y falta que el técnico lo
  // confirme. Mientras tanto NO se considera pagado ni se puede re-pagar.
  const isPendingConfirmation = request.payment_status === 'pending_confirmation'
  const canPay = isClient && request.status === REQUEST_STATUS.PENDING_PAYMENT
    && !['paid', 'pending_confirmation'].includes(request.payment_status)
  const canComplete = isClient && request.payment_status === 'paid' && request.status !== REQUEST_STATUS.COMPLETED
  const canDispute = (isClient || isTech) && !['completed', 'cancelled', 'disputed'].includes(request.status)
  const isPaid = request.payment_status === 'paid'
  const isEscrow = request.payment_status === 'escrow'
  const isDone = request.status === REQUEST_STATUS.COMPLETED

  const methodLabel = { yappy: '💚 Yappy', cash: '💵 Efectivo', transfer: '🏦 Transferencia', escrow: '🛡️ En Garantía' }

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
            <StatusChip status={isPaid ? 'paid' : isEscrow ? 'escrow' : 'unpaid'} lang={lang} />
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
                    fontSize: 11, fontWeight: 700, color: '#1e40af',
                    background: '#dbeafe', padding: '3px 8px', borderRadius: 20
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
                      background: '#dbeafe', color: '#1e40af', border: 'none',
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
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15, color: '#1e40af' }}>
                    {receipt.receipt_number}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#1e40af' }}>
                    {new Date(receipt.issued_at).toLocaleDateString('es-PA', { dateStyle: 'medium' })}
                  </p>
                </div>
                <span style={{
                  background: '#dbeafe', color: '#1e40af', fontSize: 12,
                  fontWeight: 700, padding: '4px 10px', borderRadius: 20, alignSelf: 'flex-start'
                }}>
                  ✓ Pagado
                </span>
              </div>
              <div style={{
                borderTop: '1px solid #bbf7d0', paddingTop: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: 14, color: '#1e40af' }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#1e40af' }}>${Number(receipt.amount).toFixed(2)}</span>
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

        {/* ── Acta de conformidad verificable ── */}
        {act && (
          <Section title="✍️ Acta de conformidad" th={th}>
            <div style={{ background: '#eff6ff', borderRadius: 12, padding: 14, border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#1e40af' }}>🔒 Trabajo aceptado y sellado</span>
              </div>
              {act.signature_data && (
                <img src={act.signature_data} alt="Firma" style={{ width: '100%', maxHeight: 90, objectFit: 'contain', background: '#fff', borderRadius: 8, border: '1px solid #bfdbfe', marginBottom: 8 }} />
              )}
              <InfoRow th={th} label="Firmado" value={new Date(act.signed_at).toLocaleString('es-PA', { dateStyle: 'medium', timeStyle: 'short' })} />
              {(act.geo_lat != null) && (
                <InfoRow th={th} label="Ubicación" value={`${Number(act.geo_lat).toFixed(5)}, ${Number(act.geo_lng).toFixed(5)}`} />
              )}
              <div style={{ marginTop: 8, fontSize: 10, color: '#64748b', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                Sello de integridad (SHA-256):<br />{act.integrity_hash}
              </div>
              {act.stored === false && (
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#92400e', fontStyle: 'italic' }}>
                  Acta calculada localmente — corre <code>conformity_acts.sql</code> para archivarla de forma permanente.
                </p>
              )}
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
          isClient={isClient} isTech={isTech}
          canPay={canPay} canComplete={canComplete}
          canDispute={canDispute} isPaid={isPaid} isEscrow={isEscrow} isDone={isDone}
          isPendingConfirmation={isPendingConfirmation}
          receipt={receipt} setReceipt={setReceipt}
          user={user} th={th} lang={lang}
          setBusy={setBusy} busy={busy}
          showToast={showToast}
          setShowPayModal={setShowPayModal}
          setShowProofModal={setShowProofModal}
          setShowDisputeModal={setShowDisputeModal}
          setShowConformityModal={setShowConformityModal}
          setShowQREscrowModal={setShowQREscrowModal}
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
            // Yappy/efectivo quedan 'pending_confirmation': NO se marca pagado
            // ni se genera recibo hasta que el técnico confirme la recepción
            // (paymentActions.confirmPayment). El recibo se emite al completar.
            const nextStatus = method === 'escrow' ? 'escrow' : 'pending_confirmation'
            setRequest(r => ({ ...r, payment_status: nextStatus, payment_method: method, payment_ref: ref }))
            setShowPayModal(false)
            showToast(
              method === 'escrow'
                ? '🛡️ Fondos depositados en garantía'
                : '📨 Pago reportado. El técnico debe confirmar que lo recibió.'
            )
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

      {showConformityModal && (
        <ConformityModal
          request={request} user={user} photos={photos} th={th}
          onClose={() => setShowConformityModal(false)}
          onSuccess={({ act: newAct, receipt: newReceipt }) => {
            setAct(newAct)
            if (newReceipt) setReceipt(newReceipt)
            setRequest(r => ({ ...r, status: REQUEST_STATUS.COMPLETED }))
            setShowConformityModal(false)
            showToast(newAct?.stored
              ? '✅ Acta firmada y archivada. Servicio completado.'
              : '✅ Servicio completado (acta no archivada: falta correr conformity_acts.sql).')
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
      {showQREscrowModal && (
        <Modal title="🛡️ QR de Liberación" onClose={() => setShowQREscrowModal(false)}>
          <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
            <p style={{ fontSize: 14, color: th.textSec, marginBottom: 20 }}>
              Muestra este código al cliente cara a cara. Cuando lo escanee con su celular, los fondos en garantía serán transferidos inmediatamente a tu cuenta.
            </p>
            <div style={{ background: '#fff', padding: 20, borderRadius: 16, display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/?release=${request.id}`)}`} 
                alt="QR Code" 
                style={{ display: 'block', width: 200, height: 200 }} 
              />
            </div>
            <h3 style={{ margin: '20px 0 8px', color: th.text, fontSize: 20 }}>Monto a liberar: ${request.agreed_price}</h3>
          </div>
        </Modal>
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
  canDispute, isPaid, isEscrow, isDone, isPendingConfirmation, receipt, setReceipt, user, th, lang,
  setBusy, busy, showToast, setShowPayModal, setShowProofModal,
  setShowDisputeModal, setShowConformityModal, setShowQREscrowModal, setProofs, goBack }) {

  // El técnico confirma o rechaza un pago reportado por el cliente.
  const handleConfirmPayment = async () => {
    setBusy(true)
    try {
      await paymentActions.confirmPayment(request.id, user.id)
      setRequest(r => ({ ...r, payment_status: 'paid' }))
      showToast('✅ Pago confirmado')
    } catch (err) {
      showToast('Error: ' + (err?.message ?? 'intenta de nuevo'), 'error')
    } finally { setBusy(false) }
  }

  const handleRejectPayment = async () => {
    if (!window.confirm('¿Confirmas que NO recibiste este pago? El cliente deberá intentar de nuevo.')) return
    setBusy(true)
    try {
      await paymentActions.rejectPayment(request.id, user.id)
      setRequest(r => ({ ...r, payment_status: 'unpaid', payment_ref: null }))
      showToast('Pago marcado como no recibido', 'error')
    } catch (err) {
      showToast('Error: ' + (err?.message ?? ''), 'error')
    } finally { setBusy(false) }
  }

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

      {isTech && request.status === REQUEST_STATUS.PENDING_PAYMENT && isPendingConfirmation && (
        <div style={{
          background: '#ecfccb', borderRadius: 14, padding: 14,
          border: '1px solid #bef264', marginBottom: 4
        }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#3f6212' }}>
            💚 El cliente reportó un pago {request.payment_method === 'cash' ? 'en efectivo' : 'por Yappy'}
          </p>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: '#4d7c0f' }}>
            Verifica que el dinero esté en tu cuenta antes de confirmar.
            {request.payment_ref ? ` Referencia: ${request.payment_ref}.` : ''}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={handleConfirmPayment} loading={busy} style={{ flex: 1 }}>
              ✅ Sí, lo recibí
            </Btn>
            <Btn onClick={handleRejectPayment} variant="danger" loading={busy} style={{ flex: 1 }}>
              ✗ No lo recibí
            </Btn>
          </div>
        </div>
      )}

      {isTech && request.status === REQUEST_STATUS.PENDING_PAYMENT && !isPaid && !isPendingConfirmation && (
        <div style={{
          background: '#fef9c3', borderRadius: 14, padding: 14,
          border: '1px solid #fde047', marginBottom: 4
        }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#854d0e' }}>
            ⏳ Esperando confirmación de pago
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#92400e' }}>
            El cliente debe realizar el pago. Cuando suba el comprobante, podrás verificarlo aquí.
          </p>
        </div>
      )}

      {isClient && isPendingConfirmation && (
        <div style={{
          background: '#ecfccb', borderRadius: 14, padding: 14,
          border: '1px solid #bef264', marginBottom: 4
        }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#3f6212' }}>
            📨 Pago reportado
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#4d7c0f' }}>
            Avisamos al técnico. En cuanto confirme que recibió el dinero, podrás firmar la conformidad y completar el servicio.
          </p>
        </div>
      )}

      {isTech && isEscrow && !isDone && (
        <Btn onClick={() => setShowQREscrowModal(true)} style={{ background: '#0f766e' }}>
          🛡️ Generar QR de Cobro (Liberación)
        </Btn>
      )}

      {isTech && isPaid && !isDone && (
        <Btn onClick={handleComplete} loading={busy}>
          🎉 Confirmar servicio completado
        </Btn>
      )}

      {/* ── CLIENTE ── */}
      {isClient && request.status === REQUEST_STATUS.PENDING_PAYMENT && !isPaid && !isEscrow && (
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

      {isClient && isEscrow && !isDone && (
        <div style={{
          background: '#f0fdf4', borderRadius: 14, padding: 14,
          border: '1px solid #bbf7d0', marginBottom: 4
        }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#166534' }}>
            🛡️ Fondos en Garantía
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#15803d' }}>
            Tu dinero está protegido. Escanea el código QR del técnico cuando termine para liberar los fondos.
          </p>
        </div>
      )}

      {isClient && isPaid && !isDone && (
        <Btn onClick={() => setShowConformityModal(true)} loading={busy}>
          ✍️ Firmar conformidad y completar
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
