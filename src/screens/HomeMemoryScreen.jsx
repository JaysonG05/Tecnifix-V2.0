import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, Btn, EmptyState, Modal } from '../components/UI.jsx'
import {
  getAssets, addAsset, removeAsset, markServiced,
  maintenanceTips, STATUS_META, ASSET_SUGGESTIONS,
  remindersSupported, remindersEnabled, enableReminders, disableReminders,
} from '../lib/homeMemory.js'

const CATS = [
  { slug: 'climatizacion', label: '❄️ Climatización' },
  { slug: 'electricidad', label: '⚡ Electricidad' },
  { slug: 'plomeria', label: '🔧 Plomería' },
  { slug: 'cerrajeria', label: '🔐 Cerrajería' },
  { slug: 'pintura', label: '🎨 Pintura' },
  { slug: 'limpieza', label: '🧹 Limpieza' },
  { slug: 'albanileria', label: '🧱 Albañilería' },
  { slug: 'tecnologia', label: '💻 Tecnología' },
]

export function HomeMemoryScreen() {
  const { th, goBack, setSelectedCategory, navigate } = useApp()
  const [assets, setAssets] = useState(getAssets())
  const [form, setForm] = useState({ name: '', slug: 'climatizacion', lastServiceAt: '' })
  const [showForm, setShowForm] = useState(getAssets().length === 0)
  const [remindOn, setRemindOn] = useState(remindersEnabled())
  const [showQR, setShowQR] = useState(null)

  const toggleReminders = async () => {
    if (remindOn) { disableReminders(); setRemindOn(false) }
    else { const ok = await enableReminders(); setRemindOn(ok); if (!ok) alert('Activa las notificaciones del navegador para recibir recordatorios.') }
  }

  const refresh = () => setAssets(getAssets())

  const add = () => {
    if (!form.name.trim()) return
    addAsset({ name: form.name, slug: form.slug, lastServiceAt: form.lastServiceAt || null })
    setForm({ name: '', slug: 'climatizacion', lastServiceAt: '' })
    setShowForm(false)
    refresh()
  }

  const tips = maintenanceTips(assets)
  const pending = tips.filter((t) => t.status === 'vencido' || t.status === 'toca-ahora')

  const searchFor = (slug, label) => {
    setSelectedCategory({ slug: slug || null, onlyVerified: true, query: slug ? '' : label })
    navigate('search')
  }

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 90 }}>
      <PageHeader title="🏠 Mi Hogar" onBack={goBack} />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '8px 16px' }}>
        <p style={{ color: th.textSec, fontSize: 14, margin: '0 0 12px' }}>
          Registra tus equipos y te avisamos cuándo toca mantenimiento. Todo se guarda en este dispositivo.
        </p>

        {remindersSupported() && (
          <button onClick={toggleReminders} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginBottom: 16, cursor: 'pointer',
            padding: '11px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, textAlign: 'left',
            border: `1px solid ${remindOn ? th.primary : th.border}`,
            background: remindOn ? th.primaryLight : th.surface, color: remindOn ? th.primaryText : th.text,
          }}>
            <span style={{ fontSize: 18 }}>{remindOn ? '🔔' : '🔕'}</span>
            {remindOn ? 'Recordatorios activados — te avisaré cuando un equipo venza' : 'Activar recordatorios de mantenimiento'}
          </button>
        )}

        {/* Resumen proactivo */}
        {pending.length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 800, color: '#92400e', fontSize: 14 }}>
              🔔 {pending.length} equipo{pending.length === 1 ? '' : 's'} necesita{pending.length === 1 ? '' : 'n'} atención
            </div>
            <div style={{ fontSize: 13, color: '#a16207', marginTop: 4 }}>
              Revisa las tarjetas marcadas abajo y agenda con un técnico verificado.
            </div>
          </div>
        )}

        {/* Formulario de alta */}
        {showForm ? (
          <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 16, padding: 16, marginBottom: 18 }}>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nombre del equipo (ej. Aire de la sala)"
              style={inp(th)}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
              {ASSET_SUGGESTIONS.map((s) => (
                <button key={s.name} onClick={() => setForm((f) => ({ ...f, name: s.name, slug: s.slug }))}
                  style={{ fontSize: 12, padding: '5px 10px', borderRadius: 16, border: `1px solid ${th.border}`, background: th.surface2, color: th.textSec, cursor: 'pointer' }}>
                  {s.name}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <select value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} style={{ ...inp(th), flex: 1 }}>
                {CATS.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
              </select>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: th.textSec, display: 'block', marginBottom: 2 }}>Último servicio</label>
                <input type="date" value={form.lastServiceAt} onChange={(e) => setForm((f) => ({ ...f, lastServiceAt: e.target.value }))} style={inp(th)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Btn onClick={add} disabled={!form.name.trim()} style={{ flex: 1 }}>Guardar equipo</Btn>
              {assets.length > 0 && <Btn variant="ghost" onClick={() => setShowForm(false)} style={{ width: 'auto', padding: '0 18px' }}>Cancelar</Btn>}
            </div>
          </div>
        ) : (
          <Btn variant="outline" onClick={() => setShowForm(true)} style={{ width: '100%', marginBottom: 18 }}>＋ Agregar equipo</Btn>
        )}

        {/* Lista de equipos con estado de mantenimiento */}
        {assets.length === 0 && !showForm ? (
          <EmptyState emoji="🏠" title="Aún no tienes equipos" sub="Agrega tu primer equipo para recibir recordatorios de mantenimiento." />
        ) : (
          tips.map((t) => {
            const sm = STATUS_META[t.status]
            return (
              <div key={t.asset.id} style={{ background: th.surface, border: `1px solid ${th.border}`, borderLeft: `4px solid ${sm.color}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: th.text, fontSize: 15 }}>{t.icon} {t.asset.name}</div>
                    <div style={{ fontSize: 12, color: th.textSec, marginTop: 2 }}>
                      {t.label} · cada {t.intervalMonths} meses
                      {t.monthsSince != null && ` · último hace ${t.monthsSince} mes${t.monthsSince === 1 ? '' : 'es'}`}
                    </div>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color: sm.color, background: sm.bg, padding: '4px 9px', borderRadius: 20 }}>{sm.label}</span>
                </div>

                <div style={{ fontSize: 13, color: th.text, marginTop: 10, background: th.surface2, borderRadius: 10, padding: 10 }}>
                  🤖 {t.tip}
                  {t.monthsLeft != null && t.monthsLeft > 0 && t.status === 'pronto' && ` (sugerido en ~${t.monthsLeft} mes${t.monthsLeft === 1 ? '' : 'es'})`}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {(t.status === 'vencido' || t.status === 'toca-ahora' || t.status === 'sin-fecha') && (
                    <Btn size="sm" onClick={() => searchFor(t.slug, t.asset.name)} style={{ width: 'auto', padding: '8px 14px' }}>Buscar técnico →</Btn>
                  )}
                  <Btn size="sm" variant="ghost" onClick={() => { markServiced(t.asset.id); refresh() }} style={{ width: 'auto', padding: '8px 14px' }}>✓ Mantenido hoy</Btn>
                  <button onClick={() => setShowQR(t.asset)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: th.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>🧬 QR</button>
                  <button onClick={() => { removeAsset(t.asset.id); refresh() }} style={{ background: 'none', border: 'none', color: th.textSec, fontSize: 12, cursor: 'pointer' }}>Eliminar</button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {showQR && (
        <Modal title="🧬 Pasaporte QR" onClose={() => setShowQR(null)}>
          <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
            <p style={{ fontSize: 14, color: th.textSec, marginBottom: 20 }}>
              Pega este QR en el equipo. Cualquiera que lo escanee podrá ver su historial e importarlo a Tecnifix.
            </p>
            <div style={{ background: '#fff', padding: 20, borderRadius: 16, display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/?qr=${btoa(JSON.stringify({ name: showQR.name, slug: showQR.slug, installedAt: showQR.installedAt, lastServiceAt: showQR.lastServiceAt }))}`)}`} 
                alt="QR Code" 
                style={{ display: 'block', width: 200, height: 200 }} 
              />
            </div>
            <h3 style={{ margin: '20px 0 8px', color: th.text, fontSize: 20 }}>{showQR.name}</h3>
            <p style={{ margin: 0, fontSize: 12, color: th.textSec, maxWidth: 260, margin: '0 auto' }}>
              Los datos se guardan en el mismo código, manteniendo tu privacidad 100% protegida sin depender de servidores.
            </p>
            <Btn onClick={() => setShowQR(null)} style={{ width: '100%', marginTop: 24 }}>Cerrar</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

const inp = (th) => ({
  width: '100%', boxSizing: 'border-box', padding: 11, borderRadius: 10,
  border: `1px solid ${th.border}`, background: th.surface, color: th.text, fontSize: 14,
})
