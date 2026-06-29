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
import { AdminVerificationPanel } from './AdminVerificationPanel.jsx'
import { LayoutDashboard, Users, ShieldCheck, ClipboardList, Wrench, Star, FileBadge, AlertTriangle, LogOut, HelpCircle, Moon, Sun, Search, Bell } from 'lucide-react'

const DOC_LABELS = {
  cedula_front: 'Cédula (frontal)',
  cedula_back: 'Cédula (trasera)',
  selfie_id: 'Selfie con cédula',
  police_record: 'Récord policivo',
  address_proof: 'Comprobante de domicilio',
  license_or_certificate: 'Licencia / certificado',
}

export function AdminScreen() {
  const { th, user, navigate, lang } = useApp()
  const t = T[lang]
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [techs, setTechs] = useState([])
  const [applications, setApplications] = useState([])
  const [revs, setRevs] = useState([])
  const [certs, setCerts] = useState([])
  const [disputes, setDisputes] = useState([])
  const [resolvingId, setResolvingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tabLoad, setTabLoad] = useState(false)
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')
  const [docsTech, setDocsTech] = useState(null) // técnico cuyos documentos se revisan
  const [techDocs, setTechDocs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  // Crear cuenta de vendedor (el dueño genera credenciales)
  const [showCreateVendor, setShowCreateVendor] = useState(false)
  const [cvForm, setCvForm] = useState({ fullName: '', email: '', password: '' })
  const [cvLoading, setCvLoading] = useState(false)
  const [cvResult, setCvResult] = useState(null)
  const [cvError, setCvError] = useState('')

  const handleCreateVendor = async () => {
    setCvError('')
    if (!cvForm.fullName.trim()) { setCvError('Escribe el nombre del vendedor.'); return }
    if (!cvForm.email.includes('@')) { setCvError('Escribe un email válido.'); return }
    setCvLoading(true)
    try {
      const res = await admin.createVendorAccount(cvForm)
      setCvResult(res)
      showToast('Cuenta de vendedor creada ✓')
      if (tab === 'techs') loadTab('techs')
    } catch (err) {
      setCvError(err?.message?.includes('Failed to send')
        ? 'La función admin-create-vendor aún no está desplegada en Supabase.'
        : (err?.message || 'No se pudo crear la cuenta.'))
    } finally {
      setCvLoading(false)
    }
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Abrir revisión de documentos de verificación de un técnico
  const openDocs = async (tech) => {
    setDocsTech(tech)
    setLoadingDocs(true)
    try {
      const all = await certificatesApi.list(tech.user_id)
      setTechDocs(all)
    } catch { setTechDocs([]) }
    finally { setLoadingDocs(false) }
  }

  // Cargar datos iniciales del dashboard
  useEffect(() => {
    if (user?.role !== 'admin') { navigate('home'); return }
    loadTab('dashboard')
  }, [user])

  const loadTab = async (newTab) => {
    setTab(newTab)
    setTabLoad(true)
    setSearch('')
    try {
      if (newTab === 'dashboard') {
        const s = await admin.getDashboardStats()
        setStats(s)
      } else if (newTab === 'users') {
        const u = await admin.listAllUsers()
        setUsers(u)
      } else if (newTab === 'techs') {
        const tc = await admin.listAllTechnicians()
        setTechs(tc)
      } else if (newTab === 'applications') {
        const apps = await admin.listPendingTechnicians()
        setApplications(apps)
      } else if (newTab === 'reviews') {
        const rv = await admin.listPendingReviews()
        setRevs(rv)
      } else if (newTab === 'certs') {
        const { data } = await supabase
          .from('certificates')
          .select(`
            *,
            tech:technician_id (
              user_id,
              profiles!technician_profiles_user_id_fkey ( full_name, avatar_url )
            )
          `)
          .eq('is_verified', false)
          .order('created_at', { ascending: false })
        setCerts(data ?? [])
      } else if (newTab === 'disputes') {
        const d = await disputeActions.listAll()
        setDisputes(d)
      }
    } catch (err) {
      showToast('Error al cargar datos: ' + (err?.message ?? ''), 'error')
    } finally {
      setTabLoad(false)
      setLoading(false)
    }
  }

  if (user?.role !== 'admin') return null

  const TABS = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { id: 'users', icon: <Users size={18} />, label: 'Usuarios' },
    { id: 'verification', icon: <ShieldCheck size={18} />, label: 'Verificación' },
    { id: 'applications', icon: <ClipboardList size={18} />, label: 'Postulaciones' },
    { id: 'techs', icon: <Wrench size={18} />, label: 'Técnicos' },
    { id: 'reviews', icon: <Star size={18} />, label: 'Reseñas' },
    { id: 'certs', icon: <FileBadge size={18} />, label: 'Certificados' },
    { id: 'disputes', icon: <AlertTriangle size={18} />, label: 'Disputas' },
  ]

  const filterBySearch = (list, fields) => {
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(item => fields.some(f => String(item[f] ?? '').toLowerCase().includes(q)))
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: th.bg, color: th.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Sidebar */}
      <aside style={{
        width: 260, background: th.surface, borderRight: `1px solid ${th.border}`,
        display: 'flex', flexDirection: 'column', padding: '24px 16px', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px', marginBottom: 40 }}>
          <div style={{ background: '#6366f1', color: '#fff', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18 }}>T</div>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: th.text }}>Tecnifix</span>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TABS.map(tb => {
            const active = tab === tb.id
            return (
              <button key={tb.id} onClick={() => loadTab(tb.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                borderRadius: 12, background: active ? '#6366f1' : 'transparent',
                color: active ? '#fff' : th.textSec, border: 'none', cursor: 'pointer',
                fontWeight: active ? 600 : 500, fontSize: 14, textAlign: 'left', transition: 'all 0.2s'
              }}>
                {tb.icon} {tb.label}
              </button>
            )
          })}
        </nav>

        <div style={{ borderTop: `1px solid ${th.border}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', color: th.textSec, cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
            <HelpCircle size={18} /> Ayuda
          </button>
          <button onClick={() => navigate('home')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', color: th.textSec, cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
            <LogOut size={18} /> Salir
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
        {/* Top Header */}
        <header style={{
          height: 80, borderBottom: `1px solid ${th.border}`, display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', padding: '0 32px',
          background: th.surface, flexShrink: 0
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: th.text }}>
              {TABS.find(t => t.id === tab)?.label || 'Dashboard'}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: th.textSec }}>
              Administra Tecnifix y verifica usuarios.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {tab !== 'dashboard' && (
              <div style={{ position: 'relative' }}>
                <Search size={18} color={th.textSec} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en panel..."
                  style={{
                    padding: '10px 16px 10px 42px', borderRadius: 999, border: `1px solid ${th.border}`,
                    background: th.inputBg, fontSize: 14, outline: 'none', width: 280, color: th.text, fontFamily: 'inherit'
                  }}
                />
              </div>
            )}
            <Bell size={20} color={th.textSec} style={{ cursor: 'pointer' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar photo={user?.avatar_url} name={user?.full_name || 'Admin'} size={40} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: th.text }}>{user?.full_name || 'Admin'}</span>
                <span style={{ fontSize: 12, color: th.textSec }}>{user?.email}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        {(loading || tabLoad) ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', padding: 50, gap: 14
          }}>
            <Spinner />
            <p style={{ color: th.textSec, fontSize: 14 }}>Cargando...</p>
          </div>
        ) : (
          <>
            {/* ────── DASHBOARD ────── */}
            {tab === 'dashboard' && stats && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {[
                    { val: stats.totalUsers, label: 'Usuarios registrados', icon: '👥', color: '#dbeafe', text: '#1e40af' },
                    { val: stats.totalTechs, label: 'Técnicos activos', icon: '🛠️', color: '#dbeafe', text: '#1e40af' },
                    { val: stats.pendingTechs ?? 0, label: 'Postulaciones pendientes', icon: '✅', color: '#fef3c7', text: '#92400e' },
                    { val: stats.totalRequests, label: 'Solicitudes totales', icon: '📋', color: '#fef3c7', text: '#92400e' },
                    { val: stats.totalReviews, label: 'Reseñas publicadas', icon: '⭐', color: '#fce7f3', text: '#9d174d' },
                  ].map((s, i) => (
                    <div key={i} style={{
                      background: s.color, borderRadius: 16,
                      padding: '18px 16px', border: `1px solid ${th.border}`
                    }}>
                      <p style={{ margin: '0 0 6px', fontSize: 30 }}>{s.icon}</p>
                      <p style={{ margin: '0 0 4px', fontSize: 30, fontWeight: 900, color: '#0f172a' }}>
                        {s.val}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: s.text, fontWeight: 600 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Acciones rápidas */}
                <div style={{
                  background: th.surface, borderRadius: 16,
                  border: `1px solid ${th.border}`, padding: 16, marginBottom: 16
                }}>
                  <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 15, color: th.text }}>
                    ⚡ Acciones rápidas
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Admitir postulaciones', tab: 'applications', icon: '✅', color: '#fef3c7', text: '#92400e' },
                      { label: 'Ver todos los técnicos', tab: 'techs', icon: '🛠️', color: '#dbeafe', text: '#1e40af' },
                      { label: 'Moderar reseñas', tab: 'reviews', icon: '⭐', color: '#fef3c7', text: '#92400e' },
                      { label: 'Gestionar usuarios', tab: 'users', icon: '👥', color: '#dbeafe', text: '#1e40af' },
                      { label: 'Verificar certificados', tab: 'certs', icon: '📜', color: '#ede9fe', text: '#5b21b6' },
                    ].map(a => (
                      <button key={a.tab} onClick={() => loadTab(a.tab)}
                        style={{
                          padding: '12px', background: a.color, border: `1px solid ${th.border}`,
                          borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit'
                        }}>
                        <p style={{ margin: '0 0 4px', fontSize: 20 }}>{a.icon}</p>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: a.text }}>{a.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ────── VERIFICACIÓN NUEVA ────── */}
            {tab === 'verification' && <AdminVerificationPanel />}

            {/* ────── USUARIOS ────── */}
            {tab === 'users' && (
              <div>
                <p style={{ color: th.textSec, fontSize: 14, margin: '0 0 20px', fontWeight: 500 }}>
                  Total: {filterBySearch(users, ['id', 'full_name']).length} usuarios registrados. Vista privada del dueño: solo ID y nombre.
                </p>
                <div style={{ background: th.surface, borderRadius: 16, border: `1px solid ${th.border}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${th.border}` }}>
                        <th style={{ padding: '16px 24px', fontSize: 12, textTransform: 'uppercase', color: th.textSec, fontWeight: 700, width: 220 }}>ID</th>
                        <th style={{ padding: '16px 24px', fontSize: 12, textTransform: 'uppercase', color: th.textSec, fontWeight: 700 }}>Nombre</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterBySearch(users, ['id', 'full_name']).map(u => (
                        <tr key={u.id} style={{ borderBottom: `1px solid ${th.border}`, background: th.surface }}>
                          <td style={{ padding: '16px 24px', fontSize: 13, color: th.textSec, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                            {u.id}
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 700, color: th.text }}>
                            {u.full_name || 'Sin nombre'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ────── POSTULACIONES ────── */}
            {tab === 'applications' && (
              <div>
                <div style={{
                  background: '#eff6ff', border: '1px solid #bfdbfe',
                  borderRadius: 14, padding: '12px 14px', marginBottom: 14,
                }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 800, color: '#1e40af', fontSize: 14 }}>
                    Aquí decides quién puede aparecer en el sitio web.
                  </p>
                  <p style={{ margin: 0, color: '#1e3a8a', fontSize: 12, lineHeight: 1.5 }}>
                    Revisa el formulario, documentos e identidad. Al admitirlo, cambia a verificado y aparece en búsqueda, mapa, favoritos y destacados.
                  </p>
                </div>
                <p style={{ color: th.textSec, fontSize: 13, margin: '0 0 14px' }}>
                  {filterBySearch(applications, ['full_name', 'professional_title', 'city']).length} postulación{applications.length !== 1 ? 'es' : ''} pendiente{applications.length !== 1 ? 's' : ''}
                </p>
                {filterBySearch(applications, ['full_name', 'professional_title', 'city']).length === 0 ? (
                  <EmptyState emoji="✅" title="Sin postulaciones pendientes"
                    sub="Cuando un vendedor o técnico envíe su formulario, aparecerá aquí para que lo admitas o rechaces." />
                ) : filterBySearch(applications, ['full_name', 'professional_title', 'city']).map(tech => {
                  const submittedAt = tech.application_data?.submitted_at
                    ? new Date(tech.application_data.submitted_at).toLocaleDateString('es-PA')
                    : 'Sin fecha'
                  return (
                    <div key={tech.user_id} style={{
                      background: th.surface, borderRadius: 16,
                      padding: 16, marginBottom: 12, border: `1px solid ${th.border}`,
                      boxShadow: th.shadow,
                    }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                        <Avatar photo={tech.avatar_url} name={tech.full_name} size={58} online={tech.is_available} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 3 }}>
                            <p style={{ margin: 0, fontWeight: 900, fontSize: 16, color: th.text }}>
                              {tech.full_name || 'Sin nombre'}
                            </p>
                            <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#fef3c7', color: '#92400e' }}>
                              Pendiente
                            </span>
                          </div>
                          <p style={{ margin: '0 0 6px', fontSize: 13, color: th.textSec }}>
                            {tech.professional_title || 'Sin título profesional'} · {tech.city || 'Ciudad no indicada'}
                          </p>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: th.textSec, background: th.surface2, borderRadius: 999, padding: '3px 8px' }}>
                              Enviado: {submittedAt}
                            </span>
                            <span style={{ fontSize: 11, color: th.textSec, background: th.surface2, borderRadius: 999, padding: '3px 8px' }}>
                              Cédula: {tech.national_id || '—'}
                            </span>
                            <span style={{ fontSize: 11, color: th.textSec, background: th.surface2, borderRadius: 999, padding: '3px 8px' }}>
                              WhatsApp: {tech.public_whatsapp || '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ background: th.surface2, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                        <p style={{ margin: '0 0 8px', color: th.text, fontSize: 13, fontWeight: 800 }}>
                          Resumen del formulario
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {[
                            ['Nombre legal', tech.application_data?.legal_name],
                            ['Horario', tech.application_data?.work_schedule],
                            ['Transporte', tech.application_data?.transport],
                            ['Referencias', tech.application_data?.references ? 'Incluidas' : '—'],
                          ].map(([k, v]) => (
                            <div key={k}>
                              <p style={{ margin: 0, fontSize: 10, color: th.textSec, fontWeight: 800, textTransform: 'uppercase' }}>{k}</p>
                              <p style={{ margin: '2px 0 0', fontSize: 12, color: th.text, fontWeight: 600 }}>{v || '—'}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button onClick={() => openDocs(tech)} style={{
                        width: '100%', padding: '10px', marginBottom: 8, background: '#eef2ff',
                        color: '#1e40af', border: '1px solid #c7d2fe', borderRadius: 10,
                        fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit'
                      }}>
                        Ver formulario completo y documentos
                      </button>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button onClick={async () => {
                          if (!window.confirm(`¿Admitir a ${tech.full_name} para que aparezca en Tecnifix?`)) return
                          try {
                            await admin.verifyTechnician(tech.user_id)
                            notifications.create(tech.user_id, { type: 'verification', title: '¡Postulación aprobada!', body: 'Tu perfil fue admitido por Tecnifix. Ya puedes aparecer en el sitio web.' }).catch(() => { })
                            setApplications(prev => prev.filter(x => x.user_id !== tech.user_id))
                            setTechs(prev => prev.map(x => x.user_id === tech.user_id ? { ...x, verification_status: 'verified' } : x))
                            showToast(`${tech.full_name} admitido en el sitio ✓`)
                          } catch (err) { showToast(err.message, 'error') }
                        }} style={{
                          padding: '10px', background: '#dbeafe', color: '#1e40af',
                          border: '1px solid #bfdbfe', borderRadius: 10, fontSize: 13,
                          fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                          Admitir en el sitio
                        </button>
                        <button onClick={async () => {
                          if (!window.confirm(`¿Rechazar la postulación de ${tech.full_name}?`)) return
                          try {
                            const { error } = await supabase.from('technician_profiles')
                              .update({ verification_status: 'rejected' }).eq('user_id', tech.user_id)
                            if (error) throw error
                            notifications.create(tech.user_id, { type: 'verification', title: 'Postulación rechazada', body: 'Revisa tus datos y documentos antes de volver a enviar tu postulación.' }).catch(() => { })
                            setApplications(prev => prev.filter(x => x.user_id !== tech.user_id))
                            setTechs(prev => prev.map(x => x.user_id === tech.user_id ? { ...x, verification_status: 'rejected' } : x))
                            showToast('Postulación rechazada.')
                          } catch (err) { showToast(err.message, 'error') }
                        }} style={{
                          padding: '10px', background: '#fee2e2', color: '#991b1b',
                          border: '1px solid #fca5a5', borderRadius: 10, fontSize: 13,
                          fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                          Rechazar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ────── TÉCNICOS ────── */}
            {tab === 'techs' && (
              <div>
                <button onClick={() => { setCvForm({ fullName: '', email: '', password: '' }); setCvResult(null); setCvError(''); setShowCreateVendor(true) }}
                  style={{ width: '100%', padding: '11px', marginBottom: 12, background: th.primary, color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ➕ Crear cuenta de vendedor
                </button>
                <p style={{ color: th.textSec, fontSize: 13, margin: '0 0 14px' }}>
                  {filterBySearch(techs, ['full_name', 'professional_title', 'city']).length} técnicos
                </p>
                {filterBySearch(techs, ['full_name', 'professional_title', 'city']).map(tech => (
                  <div key={tech.user_id} style={{
                    background: th.surface, borderRadius: 14,
                    padding: '14px 16px', marginBottom: 12, border: `1px solid ${th.border}`
                  }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      <Avatar photo={tech.avatar_url} name={tech.full_name} size={52} online={tech.is_available} />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15, color: th.text }}>
                          {tech.full_name}
                        </p>
                        <p style={{ margin: '0 0 4px', fontSize: 12, color: th.textSec }}>
                          {tech.professional_title || 'Sin título'}
                        </p>
                        <p style={{ margin: '0 0 6px', fontSize: 11, color: th.textSec }}>
                          📍 {tech.city || 'Changuinola'} · ⭐ {Number(tech.average_rating).toFixed(1)}
                          ({tech.total_reviews} reseñas) · {tech.total_jobs} trabajos
                        </p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {/* Estado de verificación */}
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8px',
                            borderRadius: 20,
                            background: tech.verification_status === 'verified' ? '#dbeafe' :
                              tech.verification_status === 'rejected' ? '#fee2e2' : '#fef3c7',
                            color: tech.verification_status === 'verified' ? '#1e40af' :
                              tech.verification_status === 'rejected' ? '#991b1b' : '#92400e'
                          }}>
                            {tech.verification_status === 'verified' ? '✓ Verificado' :
                              tech.verification_status === 'rejected' ? '✗ Rechazado' : '⏳ Pendiente'}
                          </span>
                          {tech.is_featured && (
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 8px',
                              borderRadius: 20, background: '#fef9c3', color: '#92400e'
                            }}>
                              ⭐ Destacado
                            </span>
                          )}
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 20,
                            background: tech.is_available ? '#dbeafe' : '#f1f5f9',
                            color: tech.is_available ? '#1e40af' : '#64748b'
                          }}>
                            {tech.is_available ? '● Disponible' : '○ No disponible'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Revisar documentos de verificación */}
                    <button onClick={() => openDocs(tech)} style={{
                      width: '100%', padding: '9px', marginBottom: 8, background: '#eef2ff',
                      color: '#1e40af', border: '1px solid #c7d2fe', borderRadius: 10,
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                    }}>
                      📄 Ver documentos y postulación
                    </button>
                    {/* Botones */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {tech.verification_status !== 'verified' && (
                        <button onClick={async () => {
                          try {
                            await admin.verifyTechnician(tech.user_id)
                            setTechs(prev => prev.map(x => x.user_id === tech.user_id
                              ? { ...x, verification_status: 'verified' } : x))
                            showToast(`${tech.full_name} verificado. ✓`)
                          } catch (err) { showToast(err.message, 'error') }
                        }} style={{
                          padding: '9px', background: '#dbeafe', color: '#1e40af',
                          border: '1px solid #bbf7d0', borderRadius: 10, fontSize: 13,
                          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                          ✓ Verificar
                        </button>
                      )}
                      {tech.verification_status === 'verified' && (
                        <button onClick={async () => {
                          if (!window.confirm(`¿Quitar verificación de ${tech.full_name}?`)) return
                          try {
                            const { error } = await supabase.from('technician_profiles')
                              .update({ verification_status: 'pending_review' }).eq('user_id', tech.user_id)
                            if (error) throw error
                            setTechs(prev => prev.map(x => x.user_id === tech.user_id
                              ? { ...x, verification_status: 'pending_review' } : x))
                            showToast('Verificación removida.')
                          } catch (err) { showToast(err.message, 'error') }
                        }} style={{
                          padding: '9px', background: '#fef3c7', color: '#92400e',
                          border: '1px solid #fde68a', borderRadius: 10, fontSize: 12,
                          fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                          ↩ Quitar verif.
                        </button>
                      )}
                      <button onClick={async () => {
                        const newFeatured = !tech.is_featured
                        try {
                          await admin.featureTechnician(tech.user_id, newFeatured)
                          // Actualizar lista local inmediatamente
                          setTechs(prev => prev.map(x => x.user_id === tech.user_id
                            ? { ...x, is_featured: newFeatured } : x))
                          showToast(newFeatured
                            ? `⭐ ${tech.full_name} ahora aparece en Técnicos Destacados`
                            : `${tech.full_name} quitado de destacados`)
                        } catch (err) {
                          showToast('Error al guardar: ' + (err?.message ?? 'intenta de nuevo'), 'error')
                          // Recargar para mostrar estado real
                          admin.listAllTechnicians().then(setTechs).catch(() => { })
                        }
                      }} style={{
                        padding: '9px', background: tech.is_featured ? '#f1f5f9' : '#fef9c3',
                        color: tech.is_featured ? '#64748b' : '#92400e',
                        border: `1px solid ${tech.is_featured ? th.border : '#fde68a'}`,
                        borderRadius: 10, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit'
                      }}>
                        {tech.is_featured ? '★ Quitar destacado' : '⭐ Destacar'}
                      </button>
                      <button onClick={async () => {
                        if (!window.confirm(`¿Rechazar verificación de ${tech.full_name}?`)) return
                        try {
                          const { error } = await supabase.from('technician_profiles')
                            .update({ verification_status: 'rejected' }).eq('user_id', tech.user_id)
                          if (error) throw error
                          setTechs(prev => prev.map(x => x.user_id === tech.user_id
                            ? { ...x, verification_status: 'rejected' } : x))
                          showToast('Verificación rechazada.')
                        } catch (err) { showToast(err.message, 'error') }
                      }} style={{
                        padding: '9px', background: '#fee2e2', color: '#991b1b',
                        border: '1px solid #fca5a5', borderRadius: 10, fontSize: 12,
                        fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                      }}>
                        ✗ Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ────── RESEÑAS ────── */}
            {tab === 'reviews' && (
              <div>
                {revs.length === 0 ? (
                  <EmptyState emoji="⭐" title="Sin reseñas pendientes"
                    sub="Todas las reseñas han sido moderadas." />
                ) : (
                  <>
                    <p style={{ color: th.textSec, fontSize: 13, margin: '0 0 14px' }}>
                      {revs.length} reseña{revs.length !== 1 ? 's' : ''} pendiente{revs.length !== 1 ? 's' : ''}
                    </p>
                    {revs.map(r => (
                      <div key={r.id} style={{
                        background: th.surface, borderRadius: 14,
                        padding: 16, marginBottom: 12, border: `1px solid ${th.border}`
                      }}>
                        {/* Partes */}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'flex-start', marginBottom: 10
                        }}>
                          <div>
                            <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 13, color: th.text }}>
                              👤 {r.reviewer?.full_name || 'Usuario'}
                            </p>
                            <p style={{ margin: '0 0 6px', fontSize: 12, color: th.textSec }}>
                              → 🛠️ {r.technician?.full_name || 'Técnico'}
                            </p>
                            <StarRating rating={r.rating} size={16} />
                          </div>
                          <span style={{ fontSize: 11, color: th.textSec }}>
                            {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {/* Comentario */}
                        {r.comment && (
                          <div style={{
                            background: th.surface2, borderRadius: 10,
                            padding: '10px 12px', marginBottom: 12, border: `1px solid ${th.border}`
                          }}>
                            <p style={{
                              margin: 0, fontSize: 13, color: th.text,
                              fontStyle: 'italic', lineHeight: 1.6
                            }}>
                              "{r.comment}"
                            </p>
                          </div>
                        )}
                        {/* Botones */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={async () => {
                            try {
                              await admin.approveReview(r.id)
                              setRevs(prev => prev.filter(x => x.id !== r.id))
                              showToast('✅ Reseña aprobada y publicada.')
                            } catch (err) { showToast(err.message, 'error') }
                          }} style={{
                            flex: 1, padding: '10px', background: '#dbeafe',
                            color: '#1e40af', border: '1px solid #bbf7d0', borderRadius: 10,
                            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                          }}>
                            ✅ Aprobar
                          </button>
                          <button onClick={async () => {
                            try {
                              await admin.rejectReview(r.id)
                              setRevs(prev => prev.filter(x => x.id !== r.id))
                              showToast('Reseña rechazada.')
                            } catch (err) { showToast(err.message, 'error') }
                          }} style={{
                            flex: 1, padding: '10px', background: '#fee2e2',
                            color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 10,
                            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                          }}>
                            ✗ Rechazar
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ────── CERTIFICADOS ────── */}
            {tab === 'certs' && (
              <div>
                {certs.length === 0 ? (
                  <EmptyState emoji="📜" title="Sin certificados pendientes"
                    sub="Todos los documentos han sido revisados." />
                ) : (
                  <>
                    <p style={{ color: th.textSec, fontSize: 13, margin: '0 0 14px' }}>
                      {certs.length} documento{certs.length !== 1 ? 's' : ''} pendiente{certs.length !== 1 ? 's' : ''} de verificación
                    </p>
                    {certs.map(cert => {
                      const techName = cert.tech?.profiles?.full_name
                        || cert.tech?.full_name || 'Técnico'
                      const techAvatar = cert.tech?.profiles?.avatar_url || null
                      const TYPE_ICONS = {
                        certificate: '📜', title: '🎓',
                        license: '🪪', course: '📚', other: '📄'
                      }
                      return (
                        <div key={cert.id} style={{
                          background: th.surface, borderRadius: 14,
                          padding: 16, marginBottom: 12, border: `1px solid ${th.border}`
                        }}>
                          {/* Técnico */}
                          <div style={{
                            display: 'flex', alignItems: 'center',
                            gap: 10, marginBottom: 12
                          }}>
                            <Avatar photo={techAvatar} name={techName} size={40} />
                            <div>
                              <p style={{
                                margin: '0 0 2px', fontWeight: 700,
                                fontSize: 14, color: th.text
                              }}>{techName}</p>
                              <p style={{ margin: 0, fontSize: 11, color: th.textSec }}>🛠️ Técnico</p>
                            </div>
                          </div>
                          {/* Documento */}
                          <div style={{
                            background: th.surface2, borderRadius: 12,
                            padding: '12px 14px', marginBottom: 12,
                            border: `1px solid ${th.border}`
                          }}>
                            <div style={{
                              display: 'flex', alignItems: 'center',
                              gap: 10, marginBottom: 6
                            }}>
                              <span style={{ fontSize: 24 }}>
                                {TYPE_ICONS[cert.file_type] || '📄'}
                              </span>
                              <div>
                                <p style={{
                                  margin: '0 0 2px', fontWeight: 700,
                                  fontSize: 14, color: th.text
                                }}>{cert.name}</p>
                                {cert.issuer && (
                                  <p style={{ margin: 0, fontSize: 12, color: th.textSec }}>
                                    🏛️ {cert.issuer}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div style={{
                              display: 'flex', gap: 12, fontSize: 12,
                              color: th.textSec
                            }}>
                              {cert.issued_at && (
                                <span>📅 Emitido: {new Date(cert.issued_at + 'T00:00:00')
                                  .toLocaleDateString('es-PA', { year: 'numeric', month: 'short' })}</span>
                              )}
                              {cert.expires_at && (
                                <span>📆 Vence: {new Date(cert.expires_at + 'T00:00:00')
                                  .toLocaleDateString('es-PA', { year: 'numeric', month: 'short' })}</span>
                              )}
                            </div>
                            {cert.description && (
                              <p style={{
                                margin: '6px 0 0', fontSize: 12,
                                color: th.textSec
                              }}>{cert.description}</p>
                            )}
                          </div>
                          {/* Botones */}
                          <div style={{ display: 'flex', gap: 8 }}>
                            {cert.file_url && (
                              <button onClick={() => window.open(cert.file_url, '_blank')}
                                style={{
                                  flex: 1, padding: '10px', background: '#eff6ff',
                                  color: '#1e40af', border: '1px solid #bfdbfe',
                                  borderRadius: 10, fontSize: 13, fontWeight: 600,
                                  cursor: 'pointer', fontFamily: 'inherit'
                                }}>
                                👁️ Ver documento
                              </button>
                            )}
                            <button onClick={async () => {
                              try {
                                await certificatesApi.verify(cert.id)
                                // Notificar al técnico
                                await supabase.from('notifications').insert({
                                  user_id: cert.technician_id,
                                  type: 'system',
                                  title: '✓ Certificado verificado',
                                  body: `Tu documento "${cert.name}" fue verificado por el equipo de Tecnifix.`,
                                  data: JSON.stringify({ cert_id: cert.id }),
                                })
                                setCerts(prev => prev.filter(c => c.id !== cert.id))
                                showToast(`✅ "${cert.name}" verificado correctamente.`)
                              } catch (err) { showToast(err.message, 'error') }
                            }} style={{
                              flex: 1, padding: '10px', background: '#dbeafe',
                              color: '#1e40af', border: '1px solid #bbf7d0', borderRadius: 10,
                              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                            }}>
                              ✓ Verificar
                            </button>
                            <button onClick={async () => {
                              if (!window.confirm(`¿Rechazar "${cert.name}"?`)) return
                              try {
                                const { error } = await supabase.from('certificates')
                                  .delete().eq('id', cert.id)
                                if (error) throw error
                                setCerts(prev => prev.filter(c => c.id !== cert.id))
                                showToast('Documento rechazado y eliminado.')
                              } catch (err) { showToast(err.message, 'error') }
                            }} style={{
                              padding: '10px 14px', background: '#fee2e2',
                              color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 10,
                              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                            }}>
                              ✗
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )}

            {/* ────── DISPUTAS ────── */}
            {tab === 'disputes' && (
              <div>
                {disputes.length === 0 ? (
                  <EmptyState emoji="⚠️" title="Sin disputas"
                    sub="No hay disputas abiertas en este momento." />
                ) : (
                  <>
                    <p style={{ color: th.textSec, fontSize: 13, margin: '0 0 14px' }}>
                      {disputes.length} disputa{disputes.length !== 1 ? 's' : ''}
                    </p>
                    {disputes.map(d => {
                      const isResolving = resolvingId === d.id
                      const STATUS_INFO = {
                        open: { label: '🔴 Abierta', bg: '#fee2e2', text: '#991b1b' },
                        under_review: { label: '🟡 En revisión', bg: '#fef3c7', text: '#92400e' },
                        resolved_client: { label: '✅ A favor del cliente', bg: '#dbeafe', text: '#1e40af' },
                        resolved_tech: { label: '✅ A favor del técnico', bg: '#dbeafe', text: '#1e40af' },
                        closed: { label: '🔒 Cerrada', bg: '#f1f5f9', text: '#475569' },
                      }
                      const si = STATUS_INFO[d.status] ?? STATUS_INFO.open
                      const isFinal = ['resolved_client', 'resolved_tech', 'closed'].includes(d.status)

                      const handleResolve = async (resolution) => {
                        const labels = {
                          resolved_client: 'a favor del CLIENTE',
                          resolved_tech: 'a favor del TÉCNICO',
                          closed: 'cerrando sin responsabilidad',
                        }
                        if (!window.confirm(`¿Resolver esta disputa ${labels[resolution]}?\n\nEsto actualizará el estado de la solicitud y notificará a ambas partes.`)) return
                        setResolvingId(d.id)
                        try {
                          await disputeActions.resolve(d.id, d.service_request_id, resolution, d.resolution_notes, user.id)
                          setDisputes(prev => prev.map(x => x.id === d.id
                            ? { ...x, status: resolution, resolved_at: new Date().toISOString() } : x))
                          showToast('✅ Disputa resuelta correctamente')
                        } catch (err) {
                          showToast(err?.message ?? 'Error al resolver', 'error')
                        } finally { setResolvingId(null) }
                      }

                      const handleUnderReview = async () => {
                        setResolvingId(d.id)
                        try {
                          await disputeActions.markUnderReview(d.id, user.id)
                          setDisputes(prev => prev.map(x => x.id === d.id
                            ? { ...x, status: 'under_review' } : x))
                          showToast('Marcada como en revisión')
                        } catch (err) {
                          showToast(err?.message ?? 'Error', 'error')
                        } finally { setResolvingId(null) }
                      }

                      const handleDismiss = async () => {
                        if (!window.confirm('¿Eliminar esta disputa? La solicitud volverá a estado "Completada" y se notificará a ambas partes.')) return
                        setResolvingId(d.id)
                        try {
                          await disputeActions.dismiss(d.id, d.service_request_id)
                          setDisputes(prev => prev.filter(x => x.id !== d.id))
                          showToast('Disputa eliminada')
                        } catch (err) {
                          showToast(err?.message ?? 'Error al eliminar', 'error')
                        } finally { setResolvingId(null) }
                      }

                      return (
                        <div key={d.id} style={{
                          background: th.surface, borderRadius: 14,
                          padding: 16, marginBottom: 12, border: `1px solid ${th.border}`,
                          opacity: isResolving ? 0.6 : 1, transition: 'opacity 0.2s'
                        }}>

                          {/* Header: estado + fecha */}
                          <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', marginBottom: 10
                          }}>
                            <span style={{
                              fontSize: 12, fontWeight: 700, padding: '3px 10px',
                              borderRadius: 20, background: si.bg, color: si.text
                            }}>
                              {si.label}
                            </span>
                            <span style={{ fontSize: 11, color: th.textSec }}>
                              {new Date(d.created_at).toLocaleDateString('es-PA', {
                                day: '2-digit', month: 'short', year: 'numeric'
                              })}
                            </span>
                          </div>

                          {/* Servicio relacionado */}
                          <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 14, color: th.text }}>
                            {d.request?.title ?? 'Solicitud eliminada'}
                          </p>
                          {d.request?.agreed_price && (
                            <p style={{ margin: '0 0 8px', fontSize: 12, color: th.textSec }}>
                              💲 Monto acordado: ${Number(d.request.agreed_price).toFixed(2)} ·{' '}
                              {d.request.payment_status === 'paid' ? '✓ Pagado' : 'Sin pagar'}
                            </p>
                          )}

                          {/* Partes involucradas */}
                          <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Avatar photo={d.client?.avatar_url} name={d.client?.full_name} size={28} />
                              <div>
                                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: th.text }}>
                                  {d.client?.full_name ?? 'Cliente'}
                                </p>
                                <p style={{ margin: 0, fontSize: 10, color: th.textSec }}>Cliente</p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Avatar photo={d.technician?.avatar_url} name={d.technician?.full_name} size={28} />
                              <div>
                                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: th.text }}>
                                  {d.technician?.full_name ?? 'Técnico'}
                                </p>
                                <p style={{ margin: 0, fontSize: 10, color: th.textSec }}>Técnico</p>
                              </div>
                            </div>
                          </div>

                          {/* Quién abrió la disputa */}
                          <p style={{ margin: '0 0 6px', fontSize: 12, color: th.textSec }}>
                            🚩 Abierta por: <strong style={{ color: th.text }}>{d.opener?.full_name ?? '—'}</strong>
                          </p>

                          {/* Motivo y descripción */}
                          <div style={{
                            background: th.surface2, borderRadius: 10,
                            padding: '10px 12px', marginBottom: 10, border: `1px solid ${th.border}`
                          }}>
                            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: th.text }}>
                              Motivo: {d.reason}
                            </p>
                            {d.description && (
                              <p style={{
                                margin: 0, fontSize: 12, color: th.textSec,
                                lineHeight: 1.5, fontStyle: 'italic'
                              }}>
                                "{d.description}"
                              </p>
                            )}
                          </div>

                          {/* Notas de resolución (si ya fue resuelta) */}
                          {isFinal && d.resolution_notes && (
                            <div style={{
                              background: '#f0fdf4', borderRadius: 10,
                              padding: '10px 12px', marginBottom: 10, border: '1px solid #bbf7d0'
                            }}>
                              <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, color: '#1e40af' }}>
                                Notas de resolución:
                              </p>
                              <p style={{ margin: 0, fontSize: 12, color: '#1e40af' }}>
                                {d.resolution_notes}
                              </p>
                            </div>
                          )}

                          {isFinal && (
                            <p style={{ margin: '0 0 10px', fontSize: 11, color: th.textSec }}>
                              Resuelta el {new Date(d.resolved_at).toLocaleDateString('es-PA')}
                            </p>
                          )}

                          {/* Botones de acción — solo si no está resuelta */}
                          {!isFinal && (
                            <>
                              {d.status === 'open' && (
                                <button onClick={handleUnderReview} disabled={isResolving}
                                  style={{
                                    width: '100%', padding: '9px', marginBottom: 8,
                                    background: '#fef3c7', color: '#92400e',
                                    border: '1px solid #fde68a', borderRadius: 10,
                                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                    fontFamily: 'inherit'
                                  }}>
                                  🔍 Marcar como en revisión
                                </button>
                              )}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                <button onClick={() => handleResolve('resolved_client')} disabled={isResolving}
                                  style={{
                                    padding: '9px', background: '#dbeafe', color: '#1e40af',
                                    border: '1px solid #bfdbfe', borderRadius: 10, fontSize: 12,
                                    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                                  }}>
                                  👤 A favor del cliente
                                </button>
                                <button onClick={() => handleResolve('resolved_tech')} disabled={isResolving}
                                  style={{
                                    padding: '9px', background: '#dbeafe', color: '#1e40af',
                                    border: '1px solid #bbf7d0', borderRadius: 10, fontSize: 12,
                                    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                                  }}>
                                  🛠️ A favor del técnico
                                </button>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <button onClick={() => handleResolve('closed')} disabled={isResolving}
                                  style={{
                                    padding: '9px', background: th.surface2, color: th.textSec,
                                    border: `1px solid ${th.border}`, borderRadius: 10, fontSize: 12,
                                    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                                  }}>
                                  🔒 Cerrar sin culpa
                                </button>
                                <button onClick={handleDismiss} disabled={isResolving}
                                  style={{
                                    padding: '9px', background: '#fee2e2', color: '#991b1b',
                                    border: '1px solid #fca5a5', borderRadius: 10, fontSize: 12,
                                    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                                  }}>
                                  🗑️ Eliminar (inválida)
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
      </main>

      {/* ── MODAL: revisión de documentos y postulación ── */}
      {showCreateVendor && (
        <Modal title="➕ Crear cuenta de vendedor" onClose={() => setShowCreateVendor(false)}>
          {cvResult ? (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <p style={{ fontWeight: 800, fontSize: 16, color: th.text, margin: '6px 0 2px' }}>Cuenta creada</p>
                <p style={{ fontSize: 12, color: th.textSec, margin: 0 }}>Entrégale estas credenciales al vendedor. Que las cambie al entrar.</p>
              </div>
              <div style={{ background: th.surface2, borderRadius: 12, padding: 14, fontSize: 14, lineHeight: 1.8 }}>
                <div><span style={{ color: th.textSec }}>Email: </span><b style={{ color: th.text }}>{cvResult.email}</b></div>
                <div><span style={{ color: th.textSec }}>Contraseña: </span><b style={{ color: th.text }}>{cvResult.password}</b></div>
              </div>
              <Btn onClick={() => {
                navigator.clipboard?.writeText(`Tecnifix — acceso de vendedor\nEmail: ${cvResult.email}\nContraseña: ${cvResult.password}`).then(() => showToast('Credenciales copiadas')).catch(() => {})
              }} style={{ marginTop: 12 }}>📋 Copiar credenciales</Btn>
              <Btn variant="ghost" onClick={() => setShowCreateVendor(false)} style={{ marginTop: 8 }}>Cerrar</Btn>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 12, color: th.textSec, margin: '0 0 14px', lineHeight: 1.5 }}>
                Crea el acceso del vendedor tú mismo. Después él entra con estas credenciales y completa su postulación (cédula, oficios, documentos).
              </p>
              <Input label="Nombre completo" placeholder="Juan Pérez" value={cvForm.fullName} onChange={v => setCvForm(f => ({ ...f, fullName: v }))} />
              <Input label="Email" type="email" placeholder="vendedor@email.com" value={cvForm.email} onChange={v => setCvForm(f => ({ ...f, email: v }))} />
              <Input label="Contraseña (opcional)" placeholder="Vacío = se genera automáticamente" value={cvForm.password} onChange={v => setCvForm(f => ({ ...f, password: v }))} />
              {cvError && (
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#991b1b', background: '#fef2f2', border: '1px solid #fca5a5', padding: '10px 12px', borderRadius: 10, lineHeight: 1.5 }}>⚠️ {cvError}</p>
              )}
              <Btn onClick={handleCreateVendor} loading={cvLoading}>Crear cuenta</Btn>
            </div>
          )}
        </Modal>
      )}

      {docsTech && (
        <Modal title="📄 Revisión de postulación" onClose={() => setDocsTech(null)}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
            <Avatar photo={docsTech.avatar_url} name={docsTech.full_name} size={48} />
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: th.text }}>{docsTech.full_name}</p>
              <p style={{ margin: 0, fontSize: 12, color: th.textSec }}>{docsTech.professional_title || 'Sin título'}</p>
            </div>
          </div>

          <div style={{ background: th.surface2, borderRadius: 12, padding: 12, marginBottom: 14, fontSize: 13 }}>
            {[
              ['Cédula', docsTech.national_id],
              ['WhatsApp', docsTech.public_whatsapp],
              ['Ciudad', `${docsTech.city || '—'}${docsTech.province ? ', ' + docsTech.province : ''}`],
              ['Experiencia', docsTech.years_experience ? docsTech.years_experience + ' años' : '—'],
              ['Precio desde', docsTech.min_price ? `$${docsTech.min_price}` : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: th.textSec }}>{k}</span>
                <span style={{ fontWeight: 600, color: th.text }}>{v || '—'}</span>
              </div>
            ))}
          </div>

          {/* Formulario de postulación (datos del "Formulario para ser aceptado") */}
          {docsTech.application_data && typeof docsTech.application_data === 'object' && Object.keys(docsTech.application_data).length > 0 && (
            <div style={{ background: th.surface2, borderRadius: 12, padding: 12, marginBottom: 14 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: th.text, margin: '0 0 10px' }}>📝 Datos de la postulación</p>
              {[
                ['Nombre legal', docsTech.application_data.legal_name],
                ['Fecha de nacimiento', docsTech.application_data.birth_date],
                ['Horario disponible', docsTech.application_data.work_schedule],
                ['Herramientas', docsTech.application_data.tools],
                ['Transporte', docsTech.application_data.transport],
                ['Referencias', docsTech.application_data.references],
                ['Contacto de emergencia', docsTech.application_data.emergency_contact],
                ['Tel. emergencia', docsTech.application_data.emergency_phone],
                ['Autoriza revisión', docsTech.application_data.accepts_background_check ? 'Sí ✓' : 'No'],
                ['Confirma datos reales', docsTech.application_data.accepts_data_review ? 'Sí ✓' : 'No'],
              ].filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: th.textSec, flexShrink: 0 }}>{k}</span>
                  <span style={{ fontWeight: 600, color: th.text, textAlign: 'right' }}>{String(v)}</span>
                </div>
              ))}
            </div>
          )}

          <p style={{ fontWeight: 700, fontSize: 14, color: th.text, margin: '0 0 10px' }}>Documentos subidos</p>
          {loadingDocs
            ? <div style={{ textAlign: 'center', padding: 20 }}><Spinner /></div>
            : techDocs.length === 0
              ? <p style={{ fontSize: 13, color: th.textSec }}>No hay documentos (o no tienes permiso para verlos).</p>
              : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {techDocs.map(d => (
                    <a key={d.id} href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${th.border}`, aspectRatio: '4/3', background: th.surface2 }}>
                        {/\.(jpg|jpeg|png|webp|gif)/i.test(d.file_url || '')
                          ? <img src={d.file_url} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 32 }}>📄</div>}
                      </div>
                      <p style={{ margin: '5px 0 0', fontSize: 11, color: th.text, fontWeight: 600 }}>{DOC_LABELS[d.file_type] || d.name}</p>
                    </a>
                  ))}
                </div>
              )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={async () => {
              try {
                await admin.verifyTechnician(docsTech.user_id)
                notifications.create(docsTech.user_id, { type: 'verification', title: '¡Postulación aprobada!', body: 'Tu perfil fue verificado por Tecnifix. Ya apareces como técnico verificado.' }).catch(() => { })
                setTechs(prev => prev.map(x => x.user_id === docsTech.user_id ? { ...x, verification_status: 'verified' } : x))
                setApplications(prev => prev.filter(x => x.user_id !== docsTech.user_id))
                showToast(`${docsTech.full_name} aprobado ✓`)
                setDocsTech(null)
              } catch (err) { showToast(err.message, 'error') }
            }} style={{ flex: 1, padding: '12px', background: '#dbeafe', color: '#1e40af', border: '1px solid #bbf7d0', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              ✓ Aprobar
            </button>
            <button onClick={async () => {
              if (!window.confirm(`¿Rechazar la postulación de ${docsTech.full_name}?`)) return
              try {
                const { error } = await supabase.from('technician_profiles').update({ verification_status: 'rejected' }).eq('user_id', docsTech.user_id)
                if (error) throw error
                notifications.create(docsTech.user_id, { type: 'verification', title: 'Postulación rechazada', body: 'Revisa que tus documentos sean legibles y vuelve a enviar tu postulación.' }).catch(() => { })
                setTechs(prev => prev.map(x => x.user_id === docsTech.user_id ? { ...x, verification_status: 'rejected' } : x))
                setApplications(prev => prev.filter(x => x.user_id !== docsTech.user_id))
                showToast('Postulación rechazada.')
                setDocsTech(null)
              } catch (err) { showToast(err.message, 'error') }
            }} style={{ flex: 1, padding: '12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              ✗ Rechazar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
