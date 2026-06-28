// ============================================================
//  DesktopProfileScreen.jsx
//  Versión desktop del perfil de usuario — layout 2 columnas:
//  izquierda: info + menú de acciones
//  derecha:   solicitudes con tabs (Activas / Completadas / Archivadas)
// ============================================================
import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import {
  supabase, auth, profiles, technicians, serviceRequests, archiveApi, receiptsApi
} from '../../lib/supabase.js'
import { receiptActions } from '../../lib/payments.js'
import { T } from '../../i18n/translations.js'
import { Spinner, Toast, StatusBadge } from '../../components/UI.jsx'

// ── Helpers ────────────────────────────────────────────────
function Avatar({ photo, name, size = 64 }) {
  const [err, setErr] = useState(false)
  const initial = (name || '?').charAt(0).toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, position: 'relative' }}>
      {photo && !err
        ? <img src={photo} alt={name} onError={() => setErr(true)}
            style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover',
              border: '3px solid rgba(255,255,255,0.3)' }} />
        : <div style={{ width: size, height: size, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: Math.floor(size * 0.38), fontWeight: 700,
            color: '#fff', border: '3px solid rgba(255,255,255,0.3)',
            fontFamily: "'Space Grotesk',sans-serif" }}>
            {initial}
          </div>
      }
    </div>
  )
}

const STATUS_META = {
  pending:         { label: 'Enviada',     dot: '#0053A0', bg: '#DDEEFF', text: '#0053A0' },
  accepted:        { label: 'Aceptada',    dot: '#00C47D', bg: '#D6F7EC', text: '#00704A' },
  in_progress:     { label: 'En progreso', dot: '#f59e0b', bg: '#FEF3C7', text: '#92400e' },
  pending_payment: { label: 'Pend. pago',  dot: '#f59e0b', bg: '#FEF3C7', text: '#92400e' },
  completed:       { label: 'Completada',  dot: '#00C47D', bg: '#D6F7EC', text: '#00704A' },
  cancelled:       { label: 'Cancelada',   dot: '#E5282D', bg: '#fee2e2', text: '#991b1b' },
  disputed:        { label: 'En disputa',  dot: '#f97316', bg: '#ffedd5', text: '#9a3412' },
}

function StatusBadgeInline({ status }) {
  const m = STATUS_META[status] ?? { label: status, dot: '#9CA3AF', bg: '#F3F4F6', text: '#6B7280' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11,
      fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: m.bg, color: m.text }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot, flexShrink: 0, display: 'inline-block' }} />
      {m.label}
    </span>
  )
}

// ── Panel izquierdo: info del usuario ──────────────────────
function ProfileCard({ user, navigate, lang, onLogout }) {
  const t = T[lang]
  const roleLabel = user.role === 'admin' ? t.admin : user.role === 'technician' ? t.techRole : t.clientRole

  const menuItems = [
    { svg: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125', label: t.editProfile, screen: 'edit-profile' },
    { svg: 'M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z', label: lang === 'en' ? 'Receipts' : 'Mis recibos', screen: 'my-receipts' },
    ...(user.role === 'technician' ? [
      { svg: 'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63', label: t.editProfProfile, screen: 'edit-tech-profile' },
      { svg: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: lang === 'en' ? 'Service Catalog' : 'Catálogo de servicios', screen: 'service-catalog' },
      { svg: 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493', label: lang === 'en' ? 'Certificates' : 'Mis certificados', screen: 'certificates' },
    ] : []),
    ...(user.role === 'admin' ? [
      { svg: 'M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3', label: t.adminPanel, screen: 'admin' },
    ] : []),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Hero card */}
      <div style={{
        background: 'linear-gradient(145deg, #00214D 0%, #00369A 100%)',
        borderRadius: 20, padding: '24px 20px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -30, right: -20, width: 120, height: 120,
          borderRadius: '50%', background: 'rgba(255,214,0,0.07)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar photo={user.avatar_url} name={user.full_name} size={64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 18, color: '#fff',
              fontFamily: "'Space Grotesk',sans-serif", overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.full_name}
            </p>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
              {user.email}
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(255,255,255,0.12)', borderRadius: 100,
              padding: '4px 10px', border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: '#00C47D' }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)',
                fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 }}>
                {roleLabel}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => navigate('notifications')}
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                transition: 'background 150ms' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <button onClick={() => navigate('settings')}
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                transition: 'background 150ms' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Menú de acciones */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #D1E0ED',
        boxShadow: '0 1px 3px rgba(0,33,77,0.06)', overflow: 'hidden' }}>
        {menuItems.map((item, idx) => (
          <button key={item.screen} onClick={() => navigate(item.screen)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 16px', background: 'none', border: 'none',
              borderBottom: idx < menuItems.length - 1 ? '1px solid #D1E0ED' : 'none',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'background 100ms' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F0F5FA'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: '#DDEEFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#0053A0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.svg} />
                </svg>
              </span>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#00214D' }}>{item.label}</span>
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8FAFC5" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        ))}
      </div>

      {/* Botón cerrar sesión */}
      <button onClick={onLogout}
        style={{ width: '100%', padding: '11px', background: 'transparent', color: '#E5282D',
          border: '1.5px solid #fca5a5', borderRadius: 12, fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 8 }}
        onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </svg>
        {T[lang === 'en' ? 'en' : 'es'].logout}
      </button>
    </div>
  )
}

// ── Panel derecho: solicitudes con tabs ────────────────────
function RequestsPanel({ user, navigate, setSelectedRequest, lang }) {
  const [tab, setTab] = useState('active')
  const [lists, setLists] = useState({ active: [], completed: [], archived: [] })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [archiving, setArchiving] = useState(null)
  const [downloading, setDownloading] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!user) return
    Promise.all([
      archiveApi.listByStatus(user.id, 'active'),
      archiveApi.listByStatus(user.id, 'archived'),
    ]).then(([active, archived]) => {
      setLists({
        active: active.filter(r => r.status !== 'completed'),
        completed: active.filter(r => r.status === 'completed'),
        archived,
      })
    }).catch(() => showToast('Error al cargar solicitudes', 'error'))
      .finally(() => setLoading(false))
  }, [user])

  const handleArchive = async (r) => {
    setArchiving(r.id)
    try {
      await archiveApi.archiveRequest(r.id, user.id)
      setLists(prev => ({
        ...prev,
        completed: prev.completed.filter(x => x.id !== r.id),
        archived: [{ ...r, archive_status: 'archived' }, ...prev.archived],
      }))
      showToast('Solicitud archivada')
    } catch (err) { showToast(err?.message ?? 'Error al archivar', 'error') }
    finally { setArchiving(null) }
  }

  const downloadReceipt = async (req) => {
    setDownloading(req.id)
    try {
      const { data: receipt } = await supabase
        .from('receipts').select('*').eq('service_request_id', req.id).single()
      if (receipt) {
        await receiptActions.downloadPDF(receipt)
      } else {
        const rec = await receiptActions.generate({
          requestId: req.id, clientId: req.client_id, technicianId: req.technician_id,
          serviceTitle: req.title, serviceDescription: req.description,
          amount: req.agreed_price ?? 0, paymentMethod: req.payment_method || 'cash',
          paymentReference: req.payment_ref || null,
          clientName: req.client_name ?? 'Cliente', technicianName: req.technician_name ?? 'Técnico',
        })
        await receiptActions.downloadPDF(rec)
      }
      showToast('Recibo descargado')
    } catch (err) { showToast('Error al descargar: ' + (err?.message ?? ''), 'error') }
    finally { setDownloading(null) }
  }

  const TABS = [
    { id: 'active',    emoji: '⚡', label: 'Activas',     list: lists.active },
    { id: 'completed', emoji: '✅', label: 'Completadas', list: lists.completed },
    { id: 'archived',  emoji: '📦', label: 'Archivadas',  list: lists.archived },
  ]
  const currentList = TABS.find(t => t.id === tab)?.list ?? []

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #D1E0ED',
      boxShadow: '0 1px 3px rgba(0,33,77,0.06)', overflow: 'hidden' }}>

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#E5282D' : '#00C47D', color: '#fff',
          padding: '10px 18px', borderRadius: 12, fontWeight: 600, fontSize: 13, zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}

      {/* Header con tabs */}
      <div style={{ padding: '16px 20px 0', borderBottom: '1px solid #D1E0ED' }}>
        <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 15, color: '#00214D',
          fontFamily: "'Space Grotesk',sans-serif" }}>
          {user?.role === 'technician' ? 'Solicitudes recibidas' : 'Mis solicitudes'}
        </p>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer',
                fontWeight: tab === t.id ? 700 : 400,
                color: tab === t.id ? '#0053A0' : '#4A6A8A',
                borderBottom: tab === t.id ? '2.5px solid #0053A0' : '2.5px solid transparent',
                fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
              {t.emoji} {t.label}
              {t.list.length > 0 && (
                <span style={{ background: tab === t.id ? '#0053A0' : '#D1E0ED',
                  color: tab === t.id ? '#fff' : '#4A6A8A', fontSize: 10, fontWeight: 700,
                  padding: '1px 6px', borderRadius: 20, minWidth: 18, textAlign: 'center' }}>
                  {t.list.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de solicitudes */}
      <div style={{ padding: '0 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Spinner />
          </div>
        ) : currentList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: '#4A6A8A' }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>
              {tab === 'active' ? '📋' : tab === 'completed' ? '✅' : '📦'}
            </p>
            <p style={{ fontSize: 13, margin: 0 }}>
              {tab === 'active' ? 'Sin solicitudes activas' :
                tab === 'completed' ? 'Sin solicitudes completadas' : 'Sin solicitudes archivadas'}
            </p>
          </div>
        ) : (
          // Tabla de solicitudes
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Servicio', 'Técnico / Cliente', 'Fecha', 'Monto', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700,
                    color: '#4A6A8A', textAlign: 'left', letterSpacing: 0.6,
                    textTransform: 'uppercase', borderBottom: '1px solid #D1E0ED',
                    fontFamily: "'Space Grotesk',sans-serif" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentList.map((r, i) => {
                const isLast = i === currentList.length - 1
                const otherName = user.role === 'technician' ? r.client_name : r.technician_name
                const otherAvatar = user.role === 'technician' ? r.client_avatar : r.technician_avatar
                const isArchiving = archiving === r.id
                const isDownloading = downloading === r.id

                return (
                  <tr key={r.id}
                    style={{ borderBottom: isLast ? 'none' : '1px solid #D1E0ED',
                      transition: 'background 100ms', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { setSelectedRequest(r); navigate('request-detail') }}>
                    <td style={{ padding: '11px 12px', maxWidth: 220 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#00214D',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title}
                      </div>
                      {r.description && (
                        <div style={{ fontSize: 11, color: '#4A6A8A', marginTop: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          background: '#DDEEFF', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#0053A0',
                          overflow: 'hidden', border: '1.5px solid #D1E0ED' }}>
                          {otherAvatar
                            ? <img src={otherAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (otherName || '?').charAt(0).toUpperCase()
                          }
                        </div>
                        <span style={{ fontSize: 12.5, color: '#00214D', fontWeight: 500,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxWidth: 110 }}>
                          {otherName}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 12px', fontSize: 12, color: '#4A6A8A', whiteSpace: 'nowrap' }}>
                      {new Date(r.created_at).toLocaleDateString('es-PA', { day: '2-digit', month: 'short' })}
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      {r.agreed_price
                        ? <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
                            fontSize: 13, color: '#0053A0' }}>${Number(r.agreed_price).toFixed(2)}</span>
                        : <span style={{ color: '#8FAFC5', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <StatusBadgeInline status={r.status} />
                    </td>
                    <td style={{ padding: '11px 12px' }}
                      onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {tab === 'completed' && (
                          <>
                            <button onClick={() => downloadReceipt(r)} disabled={isDownloading}
                              style={{ padding: '5px 10px', background: '#DDEEFF', color: '#0053A0',
                                border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 11,
                                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                                whiteSpace: 'nowrap' }}>
                              {isDownloading ? '...' : '⬇ PDF'}
                            </button>
                            <button onClick={() => handleArchive(r)} disabled={isArchiving}
                              style={{ padding: '5px 10px', background: '#F0F5FA', color: '#4A6A8A',
                                border: '1px solid #D1E0ED', borderRadius: 8, fontSize: 11,
                                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                              {isArchiving ? '...' : '📦'}
                            </button>
                          </>
                        )}
                        {tab === 'archived' && (
                          <button onClick={() => downloadReceipt(r)} disabled={isDownloading}
                            style={{ padding: '5px 10px', background: '#DDEEFF', color: '#0053A0',
                              border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 11,
                              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {isDownloading ? '...' : '⬇ PDF'}
                          </button>
                        )}
                        {tab === 'active' && (
                          <button
                            style={{ padding: '5px 10px', background: '#F0F5FA', color: '#0053A0',
                              border: '1px solid #D1E0ED', borderRadius: 8, fontSize: 11,
                              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Ver →
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── DESKTOP PROFILE SCREEN — componente principal ──────────
export function DesktopProfileScreen() {
  const { user, setUser, navigate, setSelectedRequest, lang } = useApp()
  const t = T[lang]

  const handleLogout = async () => {
    await auth.signOut()
    setUser(null)
    navigate('home')
  }

  if (!user) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 400, gap: 16 }}>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#00214D', fontFamily: "'Space Grotesk',sans-serif" }}>
        {t.login}
      </p>
      <p style={{ fontSize: 14, color: '#4A6A8A', marginBottom: 8 }}>{t.loginRequired}</p>
      <button onClick={() => navigate('login')}
        style={{ padding: '11px 28px', background: '#0053A0', color: '#fff', border: 'none',
          borderRadius: 100, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          fontFamily: "'Space Grotesk',sans-serif" }}>
        {t.login}
      </button>
    </div>
  )

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      gap: 20,
      alignItems: 'start',
    }}>
      {/* Columna izquierda: perfil + menú */}
      <ProfileCard
        user={user}
        navigate={navigate}
        lang={lang}
        onLogout={handleLogout}
      />

      {/* Columna derecha: solicitudes */}
      <RequestsPanel
        user={user}
        navigate={navigate}
        setSelectedRequest={setSelectedRequest}
        lang={lang}
      />
    </div>
  )
}
