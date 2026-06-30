import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import {
  verificationAdminApi,
  verificationApi,
  VERIFICATION_GENERAL_STATUS,
  VERIFICATION_STEP_STATUS,
  PANAMA_PROVINCES,
} from '../../lib/supabase.js'
import { Avatar, Badge, Btn, Modal, Spinner, Toast } from '../../components/UI.jsx'

const STATUS_FILTERS = [
  ['all', 'Todos'],
  ['pending_review', 'Pendiente'],
  ['under_review', 'En revisión'],
  ['verified', 'Verificado'],
  ['needs_correction', 'Corrección'],
  ['rejected', 'Rechazado'],
  ['suspended', 'Suspendido'],
  ['expired', 'Vencido'],
]

function general(status) {
  return VERIFICATION_GENERAL_STATUS[status] || VERIFICATION_GENERAL_STATUS.unverified
}

function stepStatus(status) {
  return VERIFICATION_STEP_STATUS[status] || VERIFICATION_STEP_STATUS.not_started
}

export function AdminVerificationPanel() {
  const { th, user } = useApp()
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('all')
  const [province, setProvince] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [caseData, setCaseData] = useState(null)
  const [caseLoading, setCaseLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [tab, setTab] = useState('resumen')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  const load = async () => {
    setLoading(true)
    try {
      const data = await verificationAdminApi.list({ status, province })
      setRows(data)
    } catch (err) {
      showToast(err?.message || 'No se pudo cargar verificación. Ejecuta verification_center.sql.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [status, province])

  const openCase = async (row) => {
    setSelected(row)
    setCaseLoading(true)
    setTab('resumen')
    try {
      setCaseData(await verificationAdminApi.getCase(row.user_id))
    } catch (err) {
      showToast(err?.message || 'No se pudo abrir el expediente.', 'error')
      setCaseData(null)
    } finally {
      setCaseLoading(false)
    }
  }

  const refreshCase = async () => {
    if (!selected?.user_id) return
    setCaseData(await verificationAdminApi.getCase(selected.user_id))
    await load()
  }

  const doAction = async (action) => {
    if (!selected?.user_id) return
    try {
      if (action === 'under_review') await verificationAdminApi.markUnderReview(selected.user_id, user.id)
      if (action === 'approve') {
        if (!window.confirm('¿Aprobar este técnico y activar su insignia pública?')) return
        await verificationAdminApi.approveTechnician(selected.user_id, user.id)
      }
      if (action === 'reject') {
        const reason = window.prompt('Motivo del rechazo:')
        if (!reason) return
        await verificationAdminApi.rejectTechnician(selected.user_id, user.id, reason)
      }
      if (action === 'correction') {
        const stepKey = window.prompt('Step key que necesita corrección (ej: identity_document):', 'identity_document')
        if (!stepKey) return
        const reason = window.prompt('Motivo:', 'Imagen borrosa')
        if (!reason) return
        const correctionMessage = window.prompt('Mensaje para el técnico:', 'Sube nuevamente una imagen clara.')
        await verificationAdminApi.requestCorrection(selected.user_id, user.id, { stepKey, reason, correctionMessage })
      }
      if (action === 'suspend') {
        const reason = window.prompt('Motivo de suspensión:')
        if (!reason) return
        await verificationAdminApi.suspendTechnician(selected.user_id, user.id, reason)
      }
      if (action === 'reactivate') await verificationAdminApi.reactivateTechnician(selected.user_id, user.id)
      showToast('Acción guardada.')
      await refreshCase()
    } catch (err) {
      showToast(err?.message || 'No se pudo ejecutar la acción.', 'error')
    }
  }

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <p style={{ margin: '0 0 4px', color: '#1e40af', fontWeight: 900 }}>Verificación de Técnicos</p>
        <p style={{ margin: 0, color: '#1e3a8a', fontSize: 12, lineHeight: 1.5 }}>
          Revisa expedientes, documentos privados, pasos, historial y decide si un técnico puede aparecer como verificado.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <select value={status} onChange={e => setStatus(e.target.value)} style={selectStyle(th)}>
          {STATUS_FILTERS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <select value={province} onChange={e => setProvince(e.target.value)} style={selectStyle(th)}>
          <option value="all">Todas las provincias</option>
          {PANAMA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}><Spinner /></div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', color: th.textSec, padding: 34 }}>No hay expedientes con esos filtros.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map(row => {
            const info = general(row.verification_status)
            const profile = row.profiles || {}
            return (
              <article key={row.user_id} style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 14, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <Avatar photo={profile.avatar_url} name={profile.full_name || row.professional_title} size={46} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', color: th.text, fontWeight: 900 }}>{profile.full_name || 'Técnico'}</p>
                    <p style={{ margin: 0, color: th.textSec, fontSize: 12 }}>{row.national_id || row.application_data?.document_number || 'Sin cédula'} · {row.province || 'Sin provincia'}</p>
                  </div>
                  <Badge color={info.bg} textColor={info.color}>{info.label}</Badge>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: th.textSec, marginBottom: 10 }}>
                  <span>Progreso: <b style={{ color: th.text }}>{row.verification_progress || 0}%</b></span>
                  <span>Enviado: <b style={{ color: th.text }}>{row.verification_submitted_at ? new Date(row.verification_submitted_at).toLocaleDateString('es-PA') : '—'}</b></span>
                </div>
                <Btn size="sm" onClick={() => openCase(row)}>Ver expediente</Btn>
              </article>
            )
          })}
        </div>
      )}

      {selected && (
        <Modal title="Expediente de verificación" onClose={() => { setSelected(null); setCaseData(null) }}>
          {caseLoading ? <div style={{ display: 'grid', placeItems: 'center', padding: 30 }}><Spinner /></div> : (
            <div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                {['resumen', 'pasos', 'documentos', 'historial'].map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    border: `1px solid ${tab === t ? th.primary : th.border}`,
                    background: tab === t ? th.primaryLight : th.surface2,
                    color: tab === t ? th.primaryText : th.textSec,
                    borderRadius: 999,
                    padding: '7px 10px',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textTransform: 'capitalize',
                  }}>{t}</button>
                ))}
              </div>

              {tab === 'resumen' && <SummaryTab selected={selected} caseData={caseData} th={th} onAction={doAction} />}
              {tab === 'pasos' && <StepsTab caseData={caseData} th={th} user={user} refreshCase={refreshCase} showToast={showToast} />}
              {tab === 'documentos' && <DocumentsTab caseData={caseData} th={th} user={user} refreshCase={refreshCase} showToast={showToast} />}
              {tab === 'historial' && <LogsTab caseData={caseData} th={th} />}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

function selectStyle(th) {
  return {
    height: 42,
    borderRadius: 12,
    border: `1px solid ${th.border}`,
    background: th.inputBg,
    color: th.text,
    padding: '0 10px',
    fontWeight: 700,
    fontFamily: 'inherit',
  }
}

function SummaryTab({ selected, caseData, th, onAction }) {
  const info = general(caseData?.profile?.verification_status || selected.verification_status)
  return (
    <div>
      <div style={{ background: th.surface2, borderRadius: 14, padding: 12, marginBottom: 12 }}>
        <p style={{ margin: '0 0 6px', color: th.text, fontWeight: 900 }}>{selected.profiles?.full_name || 'Técnico'}</p>
        <Badge color={info.bg} textColor={info.color}>{info.label}</Badge>
        <p style={{ margin: '10px 0 0', color: th.textSec, fontSize: 12, lineHeight: 1.5 }}>
          {caseData?.profile?.professional_title || 'Sin título'} · {caseData?.profile?.province || 'Sin provincia'}
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <Btn size="sm" onClick={() => onAction('under_review')}>En revisión</Btn>
        <Btn size="sm" onClick={() => onAction('approve')}>Aprobar</Btn>
        <Btn size="sm" variant="ghost" onClick={() => onAction('correction')}>Pedir corrección</Btn>
        <Btn size="sm" variant="danger" onClick={() => onAction('reject')}>Rechazar</Btn>
        <Btn size="sm" variant="danger" onClick={() => onAction('suspend')}>Suspender</Btn>
        <Btn size="sm" variant="outline" onClick={() => onAction('reactivate')}>Rehabilitar</Btn>
      </div>
    </div>
  )
}

function StepsTab({ caseData, th, user, refreshCase, showToast }) {
  const review = async (step, status) => {
    const reason = ['rejected', 'needs_correction'].includes(status) ? window.prompt('Motivo o corrección:') : null
    if (['rejected', 'needs_correction'].includes(status) && !reason) return
    try {
      await verificationAdminApi.reviewStep(caseData.profile.user_id, step.step_key || step.key, {
        status,
        reason,
        correctionMessage: reason,
        adminId: user.id,
      })
      showToast('Paso actualizado.')
      await refreshCase()
    } catch (err) {
      showToast(err?.message || 'No se pudo actualizar.', 'error')
    }
  }
  return (
    <div style={{ display: 'grid', gap: 9 }}>
      {(caseData?.steps || []).map(step => {
        const info = stepStatus(step.status)
        return (
          <div key={step.step_key || step.key} style={{ border: `1px solid ${th.border}`, borderRadius: 12, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <b style={{ color: th.text, fontSize: 13 }}>{step.step_name || step.name}</b>
              <Badge color={info.bg} textColor={info.color}>{info.label}</Badge>
            </div>
            {step.payload && Object.keys(step.payload).length > 0 && (
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 11, color: th.textSec, background: th.surface2, borderRadius: 10, padding: 8, maxHeight: 120, overflow: 'auto' }}>
                {JSON.stringify(step.payload, null, 2)}
              </pre>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
              <button onClick={() => review(step, 'approved')} style={miniBtn('#dcfce7', '#166534')}>Aprobar</button>
              <button onClick={() => review(step, 'needs_correction')} style={miniBtn('#ffedd5', '#9a3412')}>Corrección</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DocumentsTab({ caseData, th, user, refreshCase, showToast }) {
  const openDoc = async (doc) => {
    try {
      const url = await verificationApi.signedDocumentUrl(doc.file_path)
      window.open(url, '_blank')
    } catch (err) {
      showToast(err?.message || 'No se pudo abrir documento firmado.', 'error')
    }
  }
  const reviewDoc = async (doc, status) => {
    const reason = ['rejected', 'needs_correction'].includes(status) ? window.prompt('Motivo:') : null
    if (['rejected', 'needs_correction'].includes(status) && !reason) return
    try {
      await verificationAdminApi.reviewDocument(doc.id, { status, reason, correctionMessage: reason, adminId: user.id })
      showToast('Documento actualizado.')
      await refreshCase()
    } catch (err) {
      showToast(err?.message || 'No se pudo actualizar documento.', 'error')
    }
  }
  return (
    <div style={{ display: 'grid', gap: 9 }}>
      {(caseData?.documents || []).length === 0 && <p style={{ color: th.textSec, fontSize: 13 }}>Sin documentos enviados.</p>}
      {(caseData?.documents || []).map(doc => {
        const info = stepStatus(doc.status)
        return (
          <div key={doc.id} style={{ border: `1px solid ${th.border}`, borderRadius: 12, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <b style={{ color: th.text, fontSize: 13 }}>{doc.document_type}</b>
              <Badge color={info.bg} textColor={info.color}>{info.label}</Badge>
            </div>
            <p style={{ margin: '5px 0 8px', color: th.textSec, fontSize: 11 }}>
              {doc.file_name} · {Math.round((doc.file_size || 0) / 1024)} KB
            </p>
            {doc.rejection_reason && <p style={{ color: '#991b1b', fontSize: 12 }}>Motivo: {doc.rejection_reason}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button onClick={() => openDoc(doc)} style={miniBtn('#dbeafe', '#1e40af')}>Ver seguro</button>
              <button onClick={() => reviewDoc(doc, 'approved')} style={miniBtn('#dcfce7', '#166534')}>Aprobar</button>
              <button onClick={() => reviewDoc(doc, 'needs_correction')} style={miniBtn('#ffedd5', '#9a3412')}>Corrección</button>
              <button onClick={() => reviewDoc(doc, 'rejected')} style={miniBtn('#fee2e2', '#991b1b')}>Rechazar</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LogsTab({ caseData, th }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {(caseData?.logs || []).length === 0 && <p style={{ color: th.textSec, fontSize: 13 }}>Sin historial todavía.</p>}
      {(caseData?.logs || []).map(log => (
        <div key={log.id} style={{ background: th.surface2, borderRadius: 12, padding: 10 }}>
          <p style={{ margin: '0 0 3px', color: th.text, fontWeight: 900, fontSize: 12 }}>{log.action}</p>
          <p style={{ margin: 0, color: th.textSec, fontSize: 11 }}>
            {new Date(log.created_at).toLocaleString('es-PA')} · {log.previous_status || '—'} → {log.new_status || '—'}
          </p>
          {(log.reason || log.comment) && <p style={{ margin: '5px 0 0', color: th.textSec, fontSize: 12 }}>{log.reason || log.comment}</p>}
        </div>
      ))}
    </div>
  )
}

function miniBtn(bg, color) {
  return {
    border: 'none',
    borderRadius: 10,
    background: bg,
    color,
    padding: '8px 6px',
    fontWeight: 900,
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'inherit',
  }
}
