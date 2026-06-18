// ============================================================
//  ServiceCatalogScreen.jsx
//  Técnico: crear, editar y ordenar su catálogo de servicios
// ============================================================
import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, Btn, Input, Spinner, Toast, EmptyState } from '../components/UI.jsx'
import { serviceCatalog } from '../lib/supabase.js'
import { T } from '../i18n/translations.js'

// Emojis temáticos por unidad — NO strings de nombres de icono
const UNIT_ICONS = {
  'por visita': '🚗',
  'por hora': '⏱️',
  'por servicio': '🛠️',
  'por metro2': '📐',
  'por punto': '📍',
  'por equipo': '🖥️',
  'por dia': '📅',
  'presupuesto': '💬',
}

// ─── Formulario de item ───────────────────────────────────────
function ItemForm({ initial, onSave, onCancel, th, lang }) {
  const UNITS = serviceCatalog.PRICE_UNITS
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    name_en: initial?.name_en ?? '',
    description: initial?.description ?? '',
    price: initial?.price ? String(initial.price) : '',
    price_unit: initial?.price_unit ?? 'por visita',
    is_active: initial?.is_active ?? true,
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'El nombre es requerido.'
    if (!form.price || isNaN(form.price) || parseFloat(form.price) <= 0)
      e.price = 'Ingresa un precio válido mayor a 0.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try { await onSave(form) }
    finally { setLoading(false) }
  }

  const F = (k) => ({
    value: form[k],
    onChange: (v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) },
    error: errors[k],
  })

  return (
    <div style={{
      background: th.surface, borderRadius: 16, padding: 16,
      border: `1px solid ${th.border}`, marginBottom: 14
    }}>
      <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 15, color: th.text }}>
        {initial ? 'Editar servicio' : 'Nuevo servicio'}
      </p>

      <Input label="Nombre del servicio *" placeholder="Ej: Instalación de toma corriente" {...F('name')} />
      <Input label="Nombre en inglés (opcional)" placeholder="Ej: Power outlet installation" {...F('name_en')} />
      <Input label="Descripción breve" placeholder="Ej: Materiales no incluidos" rows={2} {...F('description')} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {/* Precio */}
        <div>
          <label style={{
            display: 'block', fontSize: 13, fontWeight: 600,
            color: th.text, marginBottom: 6
          }}>Precio ($) *</label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', fontSize: 14, color: th.textSec
            }}>$</span>
            <input type="number" min="0" step="0.50" value={form.price}
              onChange={e => { setForm(f => ({ ...f, price: e.target.value })); setErrors(er => ({ ...er, price: '' })) }}
              placeholder="0.00"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '11px 14px 11px 26px',
                borderRadius: 12, border: `1.5px solid ${errors.price ? th.red : th.inputBorder}`,
                fontSize: 15, fontWeight: 700, background: th.inputBg, color: th.primaryText,
                outline: 'none', fontFamily: 'inherit'
              }}
              onFocus={e => e.target.style.borderColor = th.primary}
              onBlur={e => e.target.style.borderColor = errors.price ? th.red : th.inputBorder}
            />
          </div>
          {errors.price && <p style={{ margin: '4px 0 0', fontSize: 12, color: th.red }}>{errors.price}</p>}
        </div>

        {/* Unidad */}
        <div>
          <label style={{
            display: 'block', fontSize: 13, fontWeight: 600,
            color: th.text, marginBottom: 6
          }}>Unidad de cobro</label>
          <select value={form.price_unit}
            onChange={e => setForm(f => ({ ...f, price_unit: e.target.value }))}
            style={{
              width: '100%', padding: '11px 12px', borderRadius: 12,
              border: `1.5px solid ${th.inputBorder}`, fontSize: 13,
              background: th.inputBg, color: th.text, outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box'
            }}>
            {UNITS.map(u => (
              <option key={u.value} value={u.value}>
                {UNIT_ICONS[u.value]} {lang === 'en' ? u.labelEn : u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activo toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', background: th.surface2, borderRadius: 10,
        marginBottom: 14, border: `1px solid ${th.border}`
      }}>
        <div>
          <p style={{ margin: '0 0 1px', fontSize: 13, fontWeight: 600, color: th.text }}>
            Visible en mi perfil
          </p>
          <p style={{ margin: 0, fontSize: 11, color: th.textSec }}>
            {form.is_active ? 'Los clientes pueden ver este servicio' : 'Servicio oculto temporalmente'}
          </p>
        </div>
        <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none',
            cursor: 'pointer', background: form.is_active ? th.primary : th.border,
            position: 'relative', transition: 'background 0.2s', flexShrink: 0
          }}>
          <div style={{
            width: 18, height: 18, borderRadius: 9, background: '#fff',
            position: 'absolute', top: 3, left: form.is_active ? 23 : 3,
            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }} />
        </button>
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="ghost" onClick={onCancel} style={{ flex: 1 }}>Cancelar</Btn>
        <Btn onClick={handleSubmit} loading={loading} style={{ flex: 2 }}>
          {initial ? 'Guardar cambios' : 'Agregar servicio'}
        </Btn>
      </div>
    </div>
  )
}

// ─── Pantalla principal ───────────────────────────────────────
export function ServiceCatalogScreen() {
  const { th, user, lang } = useApp()
  const t = T[lang]

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)   // item siendo editado
  const [deleting, setDeleting] = useState(null)   // id siendo eliminado
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!user) return
    serviceCatalog.list(user.id)
      .then(setItems).catch(() => showToast('Error al cargar catálogo', 'error'))
      .finally(() => setLoading(false))
  }, [user])

  const handleCreate = async (form) => {
    try {
      const newItem = await serviceCatalog.create(user.id, {
        ...form,
        sort_order: items.length,
      })
      setItems(prev => [...prev, newItem])
      setShowForm(false)
      showToast('Servicio agregado')
    } catch (err) { showToast(err?.message ?? 'Error al crear', 'error') }
  }

  const handleUpdate = async (form) => {
    try {
      const updated = await serviceCatalog.update(editing.id, user.id, {
        ...form,
        sort_order: editing.sort_order,
      })
      setItems(prev => prev.map(x => x.id === editing.id ? updated : x))
      setEditing(null)
      showToast('Servicio actualizado')
    } catch (err) { showToast(err?.message ?? 'Error al actualizar', 'error') }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.name}" del catálogo?`)) return
    setDeleting(item.id)
    try {
      await serviceCatalog.delete(item.id, user.id)
      setItems(prev => prev.filter(x => x.id !== item.id))
      showToast('Servicio eliminado')
    } catch (err) {
      showToast(err?.message ?? 'Error al eliminar', 'error')
    } finally { setDeleting(null) }
  }

  const toggleActive = async (item) => {
    try {
      const updated = await serviceCatalog.update(item.id, user.id, {
        ...item, is_active: !item.is_active
      })
      setItems(prev => prev.map(x => x.id === item.id ? updated : x))
      showToast(updated.is_active ? 'Servicio activado' : 'Servicio ocultado')
    } catch (err) { showToast(err?.message ?? 'Error', 'error') }
  }

  const activeCount = items.filter(x => x.is_active).length
  const inactiveCount = items.filter(x => !x.is_active).length

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 40 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader title="Catálogo de servicios"
        right={
          !showForm && !editing && (
            <button onClick={() => setShowForm(true)}
              style={{
                background: th.primary, color: '#fff', border: 'none',
                borderRadius: 12, padding: '8px 14px', fontSize: 13,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
              }}>
              + Agregar
            </button>
          )
        }
      />

      <div style={{ padding: '16px 16px 0' }}>
        {/* Tip informativo */}
        <div style={{
          background: '#eff6ff', borderRadius: 14, padding: 14,
          border: '1px solid #bfdbfe', marginBottom: 20
        }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: th.primary }}>
            💡 ¿Para qué sirve el catálogo?
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#1e3a8a', lineHeight: 1.6 }}>
            Los clientes ven tus servicios con precios exactos en tu perfil y al hacer una solicitud.
            Pon precios claros y reduce negociaciones innecesarias.
          </p>
        </div>

        {/* Stats */}
        {items.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: 10, marginBottom: 20
          }}>
            {[
              { val: items.length, label: 'Total', color: th.primaryLight, text: th.primary },
              { val: activeCount, label: 'Activos', color: th.verifiedLight, text: th.verifiedText },
              { val: inactiveCount, label: 'Ocultos', color: th.surface2, text: '#475569' },
            ].map((s, i) => (
              <div key={i} style={{
                background: s.color, borderRadius: 12,
                padding: '10px 12px', textAlign: 'center', border: `1px solid ${th.border}`
              }}>
                <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 900, color: th.ink }}>
                  {s.val}
                </p>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: s.text }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Formulario de creación */}
        {showForm && (
          <ItemForm
            th={th} lang={lang}
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Lista de servicios */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
            <Spinner />
          </div>
        ) : items.length === 0 && !showForm ? (
          <EmptyState emoji="💰" title="Sin servicios aún"
            sub="Agrega tu primer servicio para que los clientes vean tus precios."
            action={
              <Btn onClick={() => setShowForm(true)} style={{ maxWidth: 200, margin: '0 auto' }}>
                + Agregar primer servicio
              </Btn>
            }
          />
        ) : (
          items.map(item => {
            const isEditing = editing?.id === item.id
            const isDeleting_ = deleting === item.id

            if (isEditing) return (
              <ItemForm key={item.id} initial={item} th={th} lang={lang}
                onSave={handleUpdate} onCancel={() => setEditing(null)} />
            )

            return (
              <div key={item.id} style={{
                background: th.surface, borderRadius: 16, border: `1px solid ${th.border}`,
                marginBottom: 10, overflow: 'hidden',
                opacity: isDeleting_ ? 0.4 : item.is_active ? 1 : 0.65,
                transition: 'opacity 0.2s',
              }}>
                {/* Fila principal */}
                <div style={{
                  padding: '14px 16px', display: 'flex',
                  gap: 12, alignItems: 'flex-start'
                }}>
                  {/* Ícono de unidad */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: item.is_active ? th.primaryLight : th.surface2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22
                  }}>
                    {UNIT_ICONS[item.price_unit] || '🔧'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', alignItems: 'flex-start',
                      justifyContent: 'space-between', gap: 8, marginBottom: 3
                    }}>
                      <p style={{
                        margin: 0, fontWeight: 700, fontSize: 15,
                        color: th.text, flex: 1
                      }}>
                        {item.name}
                        {!item.is_active && (
                          <span style={{
                            marginLeft: 8, fontSize: 11, color: th.textSec,
                            background: th.surface2, padding: '1px 7px', borderRadius: 20,
                            fontWeight: 500
                          }}>Oculto</span>
                        )}
                      </p>
                      {/* Precio grande */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{
                          margin: 0, fontSize: 20, fontWeight: 900,
                          color: th.primaryText
                        }}>
                          ${Number(item.price).toFixed(2)}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: th.textSec }}>
                          {serviceCatalog.PRICE_UNITS.find(u => u.value === item.price_unit)
                            ?.[lang === 'en' ? 'labelEn' : 'label'] ?? item.price_unit}
                        </p>
                      </div>
                    </div>

                    {item.description && (
                      <p style={{
                        margin: '0 0 6px', fontSize: 12,
                        color: th.textSec, lineHeight: 1.5
                      }}>
                        {item.description}
                      </p>
                    )}

                    {item.name_en && (
                      <p style={{
                        margin: 0, fontSize: 11, color: th.textSec,
                        fontStyle: 'italic'
                      }}>
                        EN: {item.name_en}
                      </p>
                    )}
                  </div>
                </div>

                {/* Botones de acción */}
                <div style={{ display: 'flex', borderTop: `1px solid ${th.border}` }}>
                  <button onClick={() => toggleActive(item)}
                    style={{
                      flex: 1, padding: '10px 0', background: 'none', border: 'none',
                      borderRight: `1px solid ${th.border}`, cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                      color: item.is_active ? th.textSec : th.primary
                    }}>
                    {item.is_active ? '👁️ Ocultar' : '👁️ Activar'}
                  </button>
                  <button onClick={() => setEditing(item)}
                    style={{
                      flex: 1, padding: '10px 0', background: 'none', border: 'none',
                      borderRight: `1px solid ${th.border}`, cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                      color: th.text
                    }}>
                    Editar
                  </button>
                  <button onClick={() => handleDelete(item)} disabled={isDeleting_}
                    style={{
                      flex: 1, padding: '10px 0', background: 'none', border: 'none',
                      cursor: isDeleting_ ? 'not-allowed' : 'pointer',
                      fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                      color: th.red
                    }}>
                    {isDeleting_ ? '...' : 'Eliminar'}
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