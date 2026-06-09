// ============================================================
//  MyReceiptsScreen.jsx
//  Historial permanente de recibos — cliente y técnico
//  Los recibos persisten aunque se archive o elimine la solicitud
// ============================================================
import { useState, useEffect } from 'react'
import { useApp }       from '../context/AppContext.jsx'
import { PageHeader, Spinner, EmptyState, Toast } from '../components/UI.jsx'
import { receiptsApi }  from '../lib/supabase.js'
import { receiptActions } from '../lib/payments.js'

const METHOD_LABEL = {
  yappy:    '💚 Yappy',
  transfer: '🏦 Transferencia',
  cash:     '💵 Efectivo',
}

export function MyReceiptsScreen() {
  const { th, user, lang } = useApp()

  const [receipts,  setReceipts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [toast,     setToast]     = useState(null)
  const [downloading, setDownloading] = useState(null)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('all') // all | as_client | as_tech

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!user) return
    receiptsApi.listForUser(user.id)
      .then(setReceipts)
      .catch(() => showToast('Error al cargar recibos', 'error'))
      .finally(() => setLoading(false))
  }, [user])

  const handleDownload = async (receipt) => {
    setDownloading(receipt.id)
    try {
      await receiptActions.downloadPDF(receipt)
      await receiptsApi.markDownloaded(receipt.id, user.id, user.role)
      showToast('✅ Recibo descargado correctamente')
    } catch {
      showToast('Error al generar PDF', 'error')
    } finally { setDownloading(null) }
  }

  // Filtrar
  let filtered = receipts
  if (filter === 'as_client') filtered = receipts.filter(r => r.client_id === user.id)
  if (filter === 'as_tech')   filtered = receipts.filter(r => r.technician_id === user.id)
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(r =>
      r.service_title?.toLowerCase().includes(q)      ||
      r.receipt_number?.toLowerCase().includes(q)     ||
      r.client_name?.toLowerCase().includes(q)        ||
      r.technician_name?.toLowerCase().includes(q)
    )
  }

  const totalAmount = filtered.reduce((sum, r) => sum + Number(r.amount ?? 0), 0)

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 40 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader title="🧾 Mis recibos" />

      {/* Buscador */}
      <div style={{ padding: '12px 16px', background: th.surface,
        borderBottom: `1px solid ${th.border}` }}>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por servicio, número o nombre..."
            style={{ width: '100%', boxSizing: 'border-box',
              padding: '10px 14px 10px 38px', borderRadius: 12,
              border: `1.5px solid ${th.inputBorder}`, fontSize: 14,
              background: th.inputBg, color: th.text, outline: 'none',
              fontFamily: 'inherit' }} />
        </div>
        {/* Filtros */}
        {user?.role === 'technician' && (
          <div style={{ display: 'flex', gap: 8 }}>
            {[['all','Todos'],['as_client','Como cliente'],['as_tech','Como técnico']].map(([v, label]) => (
              <button key={v} onClick={() => setFilter(v)}
                style={{ padding: '5px 12px', borderRadius: 20,
                  border: `1.5px solid ${filter === v ? th.primary : th.border}`,
                  background: filter === v ? th.primaryLight : 'transparent',
                  color: filter === v ? th.primaryText : th.textSec,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resumen */}
      {filtered.length > 0 && (
        <div style={{ padding: '12px 16px', background: th.surface,
          borderBottom: `1px solid ${th.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, color: th.textSec }}>
            {filtered.length} recibo{filtered.length !== 1 ? 's' : ''}
          </p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.primaryText }}>
            Total: ${totalAmount.toFixed(2)}
          </p>
        </div>
      )}

      <div style={{ padding: '16px 16px 0' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState emoji="🧾" title="Sin recibos aún"
            sub={search ? 'No hay recibos que coincidan con tu búsqueda.'
              : 'Los recibos aparecerán aquí cuando completes servicios.'} />
        ) : (
          filtered.map(receipt => {
            const isClient     = receipt.client_id === user?.id
            const isDownloading = downloading === receipt.id
            const date = new Date(receipt.issued_at)
            return (
              <div key={receipt.id} style={{ background: th.surface, borderRadius: 16,
                border: `1px solid ${th.border}`, marginBottom: 12, overflow: 'hidden' }}>

                {/* Cabecera verde */}
                <div style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                  padding: '12px 16px', display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14,
                      color: '#fff' }}>{receipt.receipt_number}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11,
                      color: 'rgba(255,255,255,0.85)' }}>
                      {date.toLocaleDateString('es-PA', {
                        day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontWeight: 900, fontSize: 20,
                      color: '#fff' }}>
                      ${Number(receipt.amount).toFixed(2)}
                    </p>
                    <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.25)',
                      color: '#fff', padding: '2px 8px', borderRadius: 20 }}>
                      ✓ Pagado
                    </span>
                  </div>
                </div>

                {/* Detalle */}
                <div style={{ padding: '12px 16px' }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 14,
                    color: th.text }}>{receipt.service_title}</p>

                  {/* Info en grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
                    gap: '6px 10px', marginBottom: 12 }}>
                    {[
                      ['👤 Cliente',    receipt.client_name],
                      ['🛠️ Técnico',    receipt.technician_name],
                      ['💳 Método',     METHOD_LABEL[receipt.payment_method] ?? receipt.payment_method],
                      ['🔢 Referencia', receipt.payment_reference || '—'],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <p style={{ margin: '0 0 1px', fontSize: 11,
                          color: th.textSec }}>{label}</p>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600,
                          color: th.text, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Rol del usuario en esta transacción */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12,
                    alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px',
                      borderRadius: 20,
                      background: isClient ? '#dbeafe' : '#dcfce7',
                      color: isClient ? '#1e40af' : '#166534' }}>
                      {isClient ? '👤 Tú eres el cliente' : '🛠️ Tú eres el técnico'}
                    </span>
                    {/* Indicador de si ya descargó */}
                    {((isClient && receipt.downloaded_by_client) ||
                      (!isClient && receipt.downloaded_by_tech)) && (
                      <span style={{ fontSize: 11, color: th.textSec }}>
                        ✓ Ya descargado
                      </span>
                    )}
                  </div>

                  {/* Firma digital (truncada) */}
                  {receipt.signature_hash && (
                    <p style={{ margin: '0 0 12px', fontSize: 10,
                      color: th.textSec, wordBreak: 'break-all',
                      fontFamily: 'monospace' }}>
                      🔐 {receipt.signature_hash.slice(0, 32)}...
                    </p>
                  )}

                  {/* Botón descargar */}
                  <button
                    onClick={() => handleDownload(receipt)}
                    disabled={isDownloading}
                    style={{ width: '100%', padding: '11px', background: th.primaryLight,
                      color: th.primaryText, border: `1px solid ${th.primary}`,
                      borderRadius: 12, fontWeight: 700, fontSize: 14,
                      cursor: isDownloading ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {isDownloading
                      ? <><Spinner size={16} /> Generando PDF...</>
                      : '⬇️ Descargar PDF del recibo'
                    }
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
