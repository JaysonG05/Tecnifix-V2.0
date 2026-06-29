import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { TechnicianCard } from '../../components/TechnicianCard.jsx'
import {
  Avatar, StarRating, Badge, Btn, Input, Toggle, SkeletonCard,
  EmptyState, Modal, Toast, PageHeader, SettingsRow, StatusBadge, Spinner
} from '../../components/UI.jsx'
import {
  supabase, auth, profiles, technicians, techCategories, certificatesApi, serviceCatalog, favorites as favApi,
  serviceRequests, archiveApi, receiptsApi, admin, notifications
} from '../../lib/supabase.js'
import { T } from '../../i18n/translations.js'
import { receiptActions, disputeActions } from '../../lib/payments.js'

export function NotificationsScreen() {
  const { th, user, notifs, setNotifs, unreadCount, setUnreadCount,
    markNotifsRead, loadNotifs, lang } = useApp()
  const t = T[lang]
  const [deleting, setDeleting] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => { if (user) loadNotifs(user.id) }, [user])

  const TYPE_ICON = {
    new_request: '📋', request_accepted: '✅', review: '⭐',
    contract: '📄', payment: '💚', system: '🔔', dispute: '⚠️',
  }
  const TYPE_COLOR = {
    new_request: '#dbeafe', request_accepted: '#dbeafe', review: '#fef9c3',
    contract: '#ede9fe', payment: '#d1fae5', system: '#f1f5f9', dispute: '#fff7ed',
  }

  // ── Eliminar una notificación ──────────────────────────────
  const deleteOne = async (id) => {
    setDeleting(id)
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id)
      if (error) throw error
      const wasUnread = notifs.find(n => n.id === id && !n.is_read)
      setNotifs(prev => prev.filter(n => n.id !== id))
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      showToast('Error al eliminar', 'error')
    } finally { setDeleting(null) }
  }

  // ── Eliminar solo las leídas ───────────────────────────────
  const deleteAllRead = async () => {
    if (!window.confirm('¿Eliminar todas las notificaciones leídas?')) return
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('is_read', true)
      if (error) throw error
      setNotifs(prev => prev.filter(n => !n.is_read))
      showToast('Notificaciones leídas eliminadas')
    } catch (err) {
      showToast('Error: ' + (err?.message ?? ''), 'error')
    }
  }

  // ── Eliminar todas ─────────────────────────────────────────
  const deleteAll = async () => {
    if (!window.confirm('¿Eliminar TODAS las notificaciones? No se puede deshacer.')) return
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
      if (error) throw error
      setNotifs([])
      setUnreadCount(0)
      showToast('Todas las notificaciones eliminadas')
    } catch (err) {
      showToast('Error: ' + (err?.message ?? ''), 'error')
    }
  }

  const hasRead = notifs.some(n => n.is_read)
  const hasUnread = notifs.some(n => !n.is_read)

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 40 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader title={'🔔 ' + t.notificationsTitle}
        right={
          notifs.length > 0 ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {hasUnread && (
                <button onClick={markNotifsRead}
                  style={{
                    background: 'none', border: 'none', color: th.primary,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                  }}>
                  Marcar leídas
                </button>
              )}
              {hasRead && (
                <button onClick={deleteAllRead}
                  style={{
                    background: '#fee2e2', border: 'none', color: '#991b1b',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    padding: '5px 10px', borderRadius: 20
                  }}>
                  🗑️ Limpiar leídas
                </button>
              )}
            </div>
          ) : null
        }
      />

      {/* Barra de info + borrar todo */}
      {notifs.length > 0 && (
        <div style={{
          padding: '10px 16px', background: th.surface,
          borderBottom: '1px solid ' + th.border,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <p style={{ margin: 0, fontSize: 13, color: th.textSec }}>
            {notifs.length} notificación{notifs.length !== 1 ? 'es' : ''}
            {hasUnread
              ? ' · ' + notifs.filter(n => !n.is_read).length + ' sin leer'
              : ' · Todas leídas'}
          </p>
          <button onClick={deleteAll}
            style={{
              background: 'none', border: 'none', color: th.textSec,
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              textDecoration: 'underline'
            }}>
            Borrar todo
          </button>
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        {notifs.length === 0 ? (
          <EmptyState emoji="🔔" title={t.noNotifs}
            sub="Las notificaciones nuevas aparecerán aquí." />
        ) : (
          notifs.map(n => {
            const isBeingDeleted = deleting === n.id
            const iconBg = n.is_read ? th.surface2 : (TYPE_COLOR[n.type] ?? '#f1f5f9')
            return (
              <div key={n.id} style={{
                display: 'flex', gap: 12, padding: '14px 0',
                borderBottom: '1px solid ' + th.border,
                opacity: isBeingDeleted ? 0.4 : 1,
                transition: 'opacity 0.2s',
                background: n.is_read ? 'transparent' : th.primaryLight + '22',
              }}>

                {/* Ícono */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}>
                  {TYPE_ICON[n.type] || '🔔'}
                </div>

                {/* Contenido */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: '0 0 3px',
                    fontWeight: n.is_read ? 500 : 700,
                    fontSize: 14, color: th.text,
                  }}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p style={{
                      margin: '0 0 4px', fontSize: 13,
                      color: th.textSec, lineHeight: 1.4
                    }}>
                      {n.body}
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: 11, color: th.textSec }}>
                    {new Date(n.created_at).toLocaleString('es-PA', {
                      day: '2-digit', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Acciones */}
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0
                }}>
                  {/* Punto no leído */}
                  {!n.is_read && (
                    <div style={{
                      width: 8, height: 8, borderRadius: 4,
                      background: th.primary
                    }} />
                  )}
                  {/* Botón X eliminar */}
                  <button
                    onClick={() => deleteOne(n.id)}
                    disabled={isBeingDeleted}
                    title="Eliminar notificación"
                    style={{
                      width: 28, height: 28, borderRadius: 14,
                      background: th.surface2, border: '1px solid ' + th.border,
                      cursor: isBeingDeleted ? 'not-allowed' : 'pointer',
                      color: th.textSec, fontSize: 16, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                    {isBeingDeleted ? '…' : '×'}
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


// ─────────────────────────────────────────────────────────────
// REQUESTS TABS — Activas / Completadas / Archivadas
// ─────────────────────────────────────────────────────────────
