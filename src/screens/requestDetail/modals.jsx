// ============================================================
//  requestDetail/modals.jsx
//  Modales y diálogos de la pantalla de detalle de solicitud
//  (extraídos de RequestDetailScreen.jsx para reducir su tamaño).
// ============================================================
import { useState, useEffect, useRef } from 'react'
import { Btn, Input } from '../../components/UI.jsx'
import { supabase } from '../../lib/supabase.js'
import SignatureCanvas from 'react-signature-canvas'
import {
  paymentActions, receiptActions, disputeActions, conformityActions,
  REQUEST_STATUS,
} from '../../lib/payments.js'
import { T } from '../../i18n/translations.js'

export function PayModal({ request, user, th, onClose, onSuccess }) {
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
      } else if (method === 'escrow') {
        await supabase.from('service_requests').update({ payment_status: 'escrow', payment_method: 'escrow' }).eq('id', request.id)
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
            { v: 'escrow', icon: '🛡️', label: 'Depósito en Garantía', desc: 'Tecnifix retiene el dinero hasta que escanees el QR' },
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
                <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#1e40af', fontSize: 14 }}>
                  💚 Instrucciones Yappy
                </p>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#1e40af' }}>1. Toca el botón para abrir Yappy</p>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#1e40af' }}>2. El monto y número ya están prellenados</p>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#1e40af' }}>3. Completa el pago en Yappy</p>
                <p style={{ margin: 0, fontSize: 13, color: '#1e40af' }}>4. Copia la referencia que te da Yappy y pégala aquí</p>
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

          {method === 'escrow' && (
            <div>
              <div style={{
                background: '#f0fdf4', borderRadius: 14, padding: 16,
                border: '1px solid #bbf7d0', marginBottom: 16
              }}>
                <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#166534', fontSize: 14 }}>
                  🛡️ ¿Cómo funciona la garantía?
                </p>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#15803d' }}>1. Simulas un pago por adelantado a Tecnifix.</p>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#15803d' }}>2. Los fondos quedan retenidos (El técnico ve que el dinero existe).</p>
                <p style={{ margin: 0, fontSize: 13, color: '#15803d' }}>3. Escaneas el QR del técnico cuando termine para enviarle el dinero.</p>
              </div>
              <Btn onClick={handleConfirm} loading={loading}>
                🔒 Asegurar Fondos — ${Number(amount).toFixed(2)}
              </Btn>
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
export function ProofModal({ request, user, th, onClose, onSuccess }) {
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
export function PhotoUploadModal({ request, user, th, onClose, onSuccess }) {
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
export function DisputeModal({ request, user, th, onClose, onSuccess }) {
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
          Al abrir una disputa el equipo de soporte de Tecnifix revisará el caso y tomará una decisión.
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
export function ReceiptDetailModal({ receipt, th, onClose, onDownload }) {
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
            <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: 16, color: '#1e40af' }}>
              {receipt.receipt_number}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#1e40af' }}>
              {new Date(receipt.issued_at).toLocaleString('es-PA')}
            </p>
          </div>
          <span style={{
            background: '#dbeafe', color: '#1e40af', fontSize: 12,
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
            <span style={{ fontSize: 13, color: '#1e40af' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', maxWidth: '60%', textAlign: 'right' }}>{val}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1e40af' }}>Total pagado</span>
          <span style={{ fontWeight: 900, fontSize: 22, color: '#1e40af' }}>
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
// ─────────────────────────────────────────────────────────────
// MODAL: ACTA DE CONFORMIDAD (firma de obra verificable)
// El cliente firma + se captura geo/timestamp + fotos antes/después.
// Sella todo con un hash de integridad y completa el servicio.
// ─────────────────────────────────────────────────────────────
export function ConformityModal({ request, user, photos = [], th, onClose, onSuccess }) {
  const sigRef = useRef(null)
  const [hasSig, setHasSig] = useState(false)
  const [geo, setGeo] = useState(null)
  const [geoState, setGeoState] = useState('pidiendo') // pidiendo | ok | sin
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const before = photos.find(p => p.photo_type === 'before')?.image_url ?? request.before_photo_url ?? null
  const after = photos.find(p => p.photo_type === 'after')?.image_url ?? request.after_photo_url ?? null

  useEffect(() => {
    let alive = true
    conformityActions.getGeo().then(g => {
      if (!alive) return
      setGeo(g); setGeoState(g ? 'ok' : 'sin')
    })
    return () => { alive = false }
  }, [])

  const clearSig = () => { sigRef.current?.clear(); setHasSig(false) }

  const confirm = async () => {
    if (!hasSig || sigRef.current?.isEmpty()) { setErr('Firma en el recuadro para confirmar.'); return }
    setLoading(true); setErr('')
    try {
      const signatureDataUrl = sigRef.current.toDataURL('image/png')
      const act = await conformityActions.sign({
        request, clientId: user.id, signatureDataUrl, geo,
        beforePhotoUrl: before, afterPhotoUrl: after,
      })
      // Completar el servicio + recibo (igual que el flujo normal).
      await requestActions.updateStatus(
        request.id, REQUEST_STATUS.COMPLETED,
        request.technician_id, user.full_name, request.title
      )
      let receipt = null
      try {
        receipt = await receiptActions.generate({
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
      } catch (e) { console.warn('Recibo:', e?.message) }
      onSuccess({ act, receipt })
    } catch (e) {
      setErr('Error: ' + (e?.message ?? 'intenta de nuevo'))
      setLoading(false)
    }
  }

  return (
    <Modal title="✍️ Acta de conformidad" onClose={onClose} th={th}>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: th.textSec, lineHeight: 1.5 }}>
        Al firmar declaras que <strong>{request.title}</strong> quedó a tu conformidad. El acta queda sellada con tu firma, fecha, ubicación y fotos — prueba verificable para ambas partes.
      </p>

      {(before || after) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {before && <PhotoThumb th={th} label="Antes" url={before} />}
          {after && <PhotoThumb th={th} label="Después" url={after} />}
        </div>
      )}

      <div style={{ fontSize: 12, fontWeight: 800, color: th.textSec, marginBottom: 6 }}>Tu firma</div>
      <div style={{ border: `2px solid ${th.border}`, borderRadius: 12, background: '#fff', overflow: 'hidden', marginBottom: 6 }}>
        <SignatureCanvas
          ref={sigRef}
          penColor="#0f172a"
          canvasProps={{ width: 380, height: 150, style: { width: '100%', height: 150, display: 'block', touchAction: 'none' } }}
          onEnd={() => setHasSig(true)}
        />
      </div>
      <button onClick={clearSig} style={{ background: 'none', border: 'none', color: th.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}>
        ↺ Borrar firma
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: th.textSec, marginBottom: 14 }}>
        {geoState === 'pidiendo' && <span>📍 Obteniendo ubicación…</span>}
        {geoState === 'ok' && <span>📍 Ubicación capturada (±{Math.round(geo.accuracy || 0)} m)</span>}
        {geoState === 'sin' && <span>📍 Sin ubicación (opcional — el acta igual es válida)</span>}
      </div>

      {err && <p style={{ color: th.red, fontSize: 13, margin: '0 0 10px' }}>{err}</p>}

      <Btn onClick={confirm} loading={loading} disabled={loading} style={{ width: '100%' }}>
        ✅ Firmar y completar servicio
      </Btn>
    </Modal>
  )
}

export function PhotoThumb({ th, label, url }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: th.textSec, marginBottom: 4 }}>{label}</div>
      <img src={url} alt={label} style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 10, border: `1px solid ${th.border}` }} />
    </div>
  )
}

export function Modal({ title, children, onClose, th }) {
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
