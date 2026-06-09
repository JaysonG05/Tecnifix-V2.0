// ============================================================
//  CertificatesScreen.jsx
//  Pantalla para que el técnico gestione sus certificados,
//  títulos y licencias profesionales.
// ============================================================
import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Avatar, Btn, Input, Spinner, Toast, PageHeader } from '../components/UI.jsx'
import { certificatesApi } from '../lib/supabase.js'
import { T } from '../i18n/translations.js'

// Tipos de documento
const FILE_TYPES = [
  { v: 'certificate', icon: '📜', labelEs: 'Certificado', labelEn: 'Certificate' },
  { v: 'title', icon: '🎓', labelEs: 'Título universitario', labelEn: 'University degree' },
  { v: 'license', icon: '🪪', labelEs: 'Licencia profesional', labelEn: 'Professional license' },
  { v: 'course', icon: '📚', labelEs: 'Curso / Capacitación', labelEn: 'Course / Training' },
  { v: 'other', icon: '📄', labelEs: 'Otro documento', labelEn: 'Other document' },
]

const TYPE_COLORS = {
  certificate: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  title: { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' },
  license: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  course: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  other: { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
}

// ─────────────────────────────────────────────────────────────
export function CertificatesScreen() {
  const { th, user, goBack, lang } = useApp()
  const t = T[lang]

  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState(null)
  const [deleting, setDeleting] = useState(null) // id del cert siendo eliminado
  const [expandedId, setExpandedId] = useState(null) // cert expandido

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (!user) return
    certificatesApi.list(user.id)
      .then(setCerts).catch(() => { })
      .finally(() => setLoading(false))
  }, [user])

  const handleDelete = async (certId) => {
    if (!window.confirm('¿Eliminar este documento? No se puede deshacer.')) return
    setDeleting(certId)
    try {
      await certificatesApi.delete(certId)
      setCerts(prev => prev.filter(c => c.id !== certId))
      showToast('Documento eliminado.')
    } catch {
      showToast('Error al eliminar.', 'error')
    } finally { setDeleting(null) }
  }

  const getTypeInfo = (type, field) => {
    const found = FILE_TYPES.find(ft => ft.v === type)
    if (!found) return ''
    return lang === 'en' ? found[`label${field === 'label' ? 'En' : 'En'}`] : found[`label${field === 'label' ? 'Es' : 'Es'}`]
  }

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 40 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader
        title="📜 Mis certificados"
        right={
          <button onClick={() => setShowForm(true)}
            style={{
              background: th.primary, color: '#fff', border: 'none',
              borderRadius: 12, padding: '8px 14px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit'
            }}>
            + Agregar
          </button>
        }
      />

      <div style={{ padding: '16px 16px 0' }}>

        {/* Info banner */}
        <div style={{
          background: '#eff6ff', borderRadius: 14, padding: 14,
          border: '1px solid #bfdbfe', marginBottom: 20
        }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#1e40af' }}>
            🎓 ¿Por qué agregar tus títulos?
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#1e3a8a', lineHeight: 1.6 }}>
            Los técnicos verificados con certificados generan <strong>3× más confianza</strong> en los clientes.
            El admin revisará y marcará tus documentos como ✓ Verificados.
          </p>
        </div>

        {/* Lista de certificados */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spinner />
          </div>
        ) : certs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📜</div>
            <p style={{ fontWeight: 700, fontSize: 18, color: th.text, margin: '0 0 8px' }}>
              Sin documentos aún
            </p>
            <p style={{ fontSize: 14, color: th.textSec, margin: '0 0 24px' }}>
              Agrega tus títulos, certificados y licencias para generar más confianza.
            </p>
            <Btn onClick={() => setShowForm(true)} style={{ maxWidth: 200, margin: '0 auto' }}>
              + Agregar primer documento
            </Btn>
          </div>
        ) : (
          certs.map(cert => {
            const typeInfo = FILE_TYPES.find(ft => ft.v === cert.file_type) ?? FILE_TYPES[4]
            const colors = TYPE_COLORS[cert.file_type] ?? TYPE_COLORS.other
            const isExpanded = expandedId === cert.id
            const isDeleting = deleting === cert.id
            const expired = cert.expires_at && new Date(cert.expires_at) < new Date()

            return (
              <div key={cert.id} style={{
                background: th.surface, borderRadius: 16,
                border: `1px solid ${th.border}`, marginBottom: 12, overflow: 'hidden',
                transition: 'box-shadow 0.2s'
              }}>

                {/* Cabecera del certificado */}
                <div onClick={() => setExpandedId(isExpanded ? null : cert.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', cursor: 'pointer'
                  }}>

                  {/* Ícono del tipo */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: colors.bg, border: `1.5px solid ${colors.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, flexShrink: 0
                  }}>
                    {typeInfo.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <p style={{
                        margin: 0, fontWeight: 700, fontSize: 14, color: th.text,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {cert.name}
                      </p>
                      {cert.is_verified && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: '#166534',
                          background: '#dcfce7', padding: '2px 7px', borderRadius: 20, flexShrink: 0
                        }}>
                          ✓ Verificado
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px',
                        borderRadius: 20, background: colors.bg, color: colors.text
                      }}>
                        {lang === 'en' ? typeInfo.labelEn : typeInfo.labelEs}
                      </span>
                      {cert.issuer && (
                        <span style={{ fontSize: 11, color: th.textSec }}>{cert.issuer}</span>
                      )}
                      {expired && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: '#991b1b',
                          background: '#fee2e2', padding: '2px 7px', borderRadius: 20
                        }}>
                          ⚠️ Expirado
                        </span>
                      )}
                    </div>
                  </div>

                  <span style={{ color: th.textSec, fontSize: 18, flexShrink: 0 }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>

                {/* Detalle expandido */}
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${th.border}`, padding: '14px 16px' }}>

                    {/* Fechas */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                      {cert.issued_at && (
                        <div style={{ background: th.surface2, borderRadius: 10, padding: '10px 12px' }}>
                          <p style={{ margin: '0 0 2px', fontSize: 11, color: th.textSec }}>📅 Fecha de emisión</p>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: th.text }}>
                            {new Date(cert.issued_at + 'T00:00:00').toLocaleDateString('es-PA', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                      )}
                      {cert.expires_at && (
                        <div style={{ background: expired ? '#fee2e2' : th.surface2, borderRadius: 10, padding: '10px 12px' }}>
                          <p style={{ margin: '0 0 2px', fontSize: 11, color: expired ? '#991b1b' : th.textSec }}>
                            {expired ? '⚠️ Expiró el' : '📆 Vence el'}
                          </p>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: expired ? '#991b1b' : th.text }}>
                            {new Date(cert.expires_at + 'T00:00:00').toLocaleDateString('es-PA', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Descripción */}
                    {cert.description && (
                      <p style={{ margin: '0 0 12px', fontSize: 13, color: th.textSec, lineHeight: 1.6 }}>
                        {cert.description}
                      </p>
                    )}

                    {/* Visibilidad */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      marginBottom: 12, fontSize: 12, color: th.textSec
                    }}>
                      {cert.is_public
                        ? <><span style={{ color: th.primary }}>👁️</span> Visible en tu perfil público</>
                        : <><span>🔒</span> Solo tú y el admin pueden verlo</>
                      }
                    </div>

                    {/* Archivo */}
                    {cert.file_url && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <button onClick={() => window.open(cert.file_url, '_blank')}
                          style={{
                            flex: 1, padding: '10px', background: th.primaryLight,
                            color: th.primaryText, border: `1px solid ${th.primary}`,
                            borderRadius: 12, fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit'
                          }}>
                          👁️ Ver documento
                        </button>
                        <button onClick={() => {
                          const a = document.createElement('a')
                          a.href = cert.file_url
                          a.download = cert.name
                          a.click()
                        }} style={{
                          flex: 1, padding: '10px', background: th.surface2,
                          color: th.text, border: `1px solid ${th.border}`,
                          borderRadius: 12, fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                          ⬇️ Descargar
                        </button>
                      </div>
                    )}

                    {/* Estado verificación */}
                    {!cert.is_verified && (
                      <div style={{
                        background: '#fef9c3', borderRadius: 10, padding: '10px 12px',
                        marginBottom: 12, border: '1px solid #fde68a'
                      }}>
                        <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
                          ⏳ Pendiente de verificación por el equipo de Changuinola Pro.
                          Recibirás una notificación cuando sea verificado.
                        </p>
                      </div>
                    )}

                    {/* Botón eliminar */}
                    <button onClick={() => handleDelete(cert.id)} disabled={isDeleting}
                      style={{
                        width: '100%', padding: '10px', background: '#fee2e2',
                        color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 12,
                        fontSize: 13, fontWeight: 700, cursor: isDeleting ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 8
                      }}>
                      {isDeleting ? <Spinner size={16} /> : '🗑️ Eliminar documento'}
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* FORMULARIO: Agregar certificado */}
      {showForm && (
        <AddCertForm
          userId={user.id} th={th} lang={lang}
          onClose={() => setShowForm(false)}
          onSuccess={(newCert) => {
            setCerts(prev => [newCert, ...prev])
            setShowForm(false)
            showToast('✅ Documento agregado. El admin lo revisará pronto.')
          }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// FORMULARIO: AGREGAR CERTIFICADO
// ─────────────────────────────────────────────────────────────
function AddCertForm({ userId, th, lang, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    issuer: '',
    issued_at: '',
    expires_at: '',
    description: '',
    file_type: 'certificate',
    is_public: true,
  })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const F = (k) => ({
    value: form[k],
    onChange: (v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) },
    error: errors[k],
  })

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { setErrors({ file: 'Máximo 10 MB.' }); return }
    setFile(f)
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null) // PDF u otro
    }
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'El nombre es requerido.'
    if (!file) e.file = 'Debes adjuntar el archivo del documento.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const cert = await certificatesApi.upload(userId, file, form)
      onSuccess(cert)
    } catch (err) {
      setErrors({ file: 'Error al subir: ' + (err?.message ?? 'intenta de nuevo.') })
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}
      onClick={onClose}>
      <div style={{
        background: th.surface, borderRadius: '20px 20px 0 0',
        padding: '20px 20px 40px', width: '100%', maxWidth: 430,
        maxHeight: '92vh', overflowY: 'auto', animation: 'slideUp 0.3s ease'
      }}
        onClick={e => e.stopPropagation()}>

        {/* Header del modal */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ flex: 1, margin: 0, fontSize: 17, fontWeight: 800, color: th.text }}>
            📜 Agregar documento
          </h3>
          <button onClick={onClose} style={{
            background: th.surface2, border: 'none',
            borderRadius: 20, width: 32, height: 32, fontSize: 18, cursor: 'pointer',
            color: th.textSec, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>×</button>
        </div>

        {/* Tipo de documento */}
        <p style={{ fontSize: 13, fontWeight: 600, color: th.text, margin: '0 0 10px' }}>
          Tipo de documento
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          {FILE_TYPES.map(ft => {
            const active = form.file_type === ft.v
            const colors = TYPE_COLORS[ft.v]
            return (
              <button key={ft.v}
                onClick={() => setForm(f => ({ ...f, file_type: ft.v }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                  borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  border: `2px solid ${active ? colors.border : th.border}`,
                  background: active ? colors.bg : 'transparent',
                  transition: 'all 0.15s'
                }}>
                <span style={{ fontSize: 20 }}>{ft.icon}</span>
                <span style={{
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  color: active ? colors.text : th.textSec, lineHeight: 1.3
                }}>
                  {lang === 'en' ? ft.labelEn : ft.labelEs}
                </span>
              </button>
            )
          })}
        </div>

        {/* Nombre del documento */}
        <Input label="Nombre del documento *"
          placeholder="Ej: Técnico en Instalaciones Eléctricas" {...F('name')} />

        {/* Institución emisora */}
        <Input label="Institución / Entidad emisora"
          placeholder="Ej: INADEH, Universidad de Panamá" {...F('issuer')} />

        {/* Fechas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: th.text, marginBottom: 6
            }}>Fecha de emisión</label>
            <input type="date" value={form.issued_at}
              onChange={e => setForm(f => ({ ...f, issued_at: e.target.value }))}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '11px 12px',
                borderRadius: 12, border: `1.5px solid ${th.inputBorder}`,
                fontSize: 14, background: th.inputBg, color: th.text,
                outline: 'none', fontFamily: 'inherit'
              }} />
          </div>
          <div>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: th.text, marginBottom: 6
            }}>Fecha de vencimiento</label>
            <input type="date" value={form.expires_at}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '11px 12px',
                borderRadius: 12, border: `1.5px solid ${th.inputBorder}`,
                fontSize: 14, background: th.inputBg, color: th.text,
                outline: 'none', fontFamily: 'inherit'
              }} />
          </div>
        </div>

        {/* Descripción */}
        <Input label="Descripción (opcional)"
          placeholder="Ej: Certificado de 200 horas en instalaciones de baja tensión"
          rows={2} {...F('description')} />

        {/* Visibilidad */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', background: th.surface2, borderRadius: 12,
          marginBottom: 16, border: `1px solid ${th.border}`
        }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: th.text }}>
              Visible en mi perfil público
            </p>
            <p style={{ margin: 0, fontSize: 11, color: th.textSec }}>
              Los clientes podrán ver el nombre y la institución
            </p>
          </div>
          <button onClick={() => setForm(f => ({ ...f, is_public: !f.is_public }))}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: form.is_public ? th.primary : th.border, position: 'relative',
              transition: 'background 0.2s', flexShrink: 0
            }}>
            <div style={{
              width: 18, height: 18, borderRadius: 9, background: '#fff',
              position: 'absolute', top: 3, left: form.is_public ? 23 : 3,
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </button>
        </div>

        {/* Adjuntar archivo */}
        <p style={{ fontSize: 13, fontWeight: 600, color: th.text, margin: '0 0 8px' }}>
          Archivo del documento * <span style={{ fontSize: 11, color: th.textSec, fontWeight: 400 }}>(PDF, JPG, PNG — máx. 10 MB)</span>
        </p>
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 10, padding: preview ? '8px' : '24px',
          background: th.surface2, borderRadius: 14,
          border: `2px dashed ${errors.file ? th.red : th.border}`,
          cursor: 'pointer', marginBottom: errors.file ? 6 : 16
        }}>
          {preview ? (
            <img src={preview} alt="preview"
              style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 10 }} />
          ) : (
            <>
              <span style={{ fontSize: 40 }}>📎</span>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: th.text }}>
                  Toca para adjuntar
                </p>
                <p style={{ margin: 0, fontSize: 12, color: th.textSec }}>
                  Foto del título/certificado o archivo PDF
                </p>
              </div>
            </>
          )}
          {file && (
            <p style={{ margin: 0, fontSize: 12, color: th.primary, fontWeight: 600 }}>
              ✓ {file.name}
            </p>
          )}
          <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFile} />
        </label>
        {errors.file && (
          <p style={{ margin: '0 0 14px', fontSize: 12, color: th.red }}>{errors.file}</p>
        )}

        {/* Info de seguridad */}
        <div style={{
          background: '#f0fdf4', borderRadius: 12, padding: 12,
          border: '1px solid #bbf7d0', marginBottom: 20
        }}>
          <p style={{ margin: 0, fontSize: 12, color: '#166534', lineHeight: 1.6 }}>
            🔒 Tu documento se almacena de forma segura. Solo el admin de Changuinola Pro
            puede verlo para verificarlo. Los clientes solo ven el nombre y la institución,
            nunca el archivo completo a menos que lo marques como público.
          </p>
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Btn>
          <Btn onClick={handleSubmit} loading={loading} style={{ flex: 2 }}
            disabled={!form.name.trim() || !file}>
            📤 Guardar documento
          </Btn>
        </div>
      </div>
    </div>
  )
}
