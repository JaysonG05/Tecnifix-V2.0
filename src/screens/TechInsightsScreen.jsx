import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, Btn, Spinner, EmptyState } from '../components/UI.jsx'
import { technicians, certificatesApi, serviceRequests } from '../lib/supabase.js'
import { technicianInsights, computeTrustScore, getTrustTier } from '../lib/trust.js'
import { predictDemand, businessPulse } from '../lib/aiExotic.js'

// Computa los agregados del negocio del técnico (semana actual vs previa)
// a partir de SUS propias solicitudes. Solo cuenta como ingreso lo completado.
const DAY = 86400000
function computePulseStats(ownRequests = [], tech = {}) {
  const now = Date.now()
  const inWindow = (r, from, to) => {
    const t = new Date(r.updated_at || r.created_at).getTime()
    return t >= from && t < to
  }
  const completed = ownRequests.filter((r) => r.status === 'completed')
  const curC = completed.filter((r) => inWindow(r, now - 7 * DAY, now + DAY))
  const prevC = completed.filter((r) => inWindow(r, now - 14 * DAY, now - 7 * DAY))
  const sum = (arr) => arr.reduce((s, r) => s + Number(r.agreed_price || 0), 0)
  const openStatuses = ['pending', 'accepted', 'in_progress', 'pending_payment']
  const pending = ownRequests.filter((r) => openStatuses.includes(r.status)).length

  const zoneCount = {}
  for (const r of ownRequests) {
    const z = r.city || r.province
    if (z) zoneCount[z] = (zoneCount[z] || 0) + 1
  }
  const top_zone = Object.entries(zoneCount).sort((a, b) => b[1] - a[1])[0]?.[0] || tech.city || tech.province || null

  return {
    period_days: 7,
    category: tech.category_label || tech.category_slug || null,
    jobs_done: curC.length,
    jobs_done_prev: prevC.length,
    earnings: Math.round(sum(curC)),
    earnings_prev: Math.round(sum(prevC)),
    pending,
    avg_rating: Number(tech.average_rating || 0),
    total_reviews: Number(tech.total_reviews || 0),
    top_zone,
  }
}

const SEV = {
  alta: { color: '#dc2626', bg: '#fef2f2', label: 'Prioridad alta' },
  media: { color: '#d97706', bg: '#fffbeb', label: 'Mejora' },
  ok: { color: '#16a34a', bg: '#f0fdf4', label: 'Bien' },
}

export function TechInsightsScreen() {
  const { th, goBack, navigate, user } = useApp()
  const [tech, setTech] = useState(null)
  const [insights, setInsights] = useState([])
  const [trust, setTrust] = useState(0)
  const [loading, setLoading] = useState(true)
  const [demand, setDemand] = useState(null)
  const [demandLoading, setDemandLoading] = useState(false)
  const [pulse, setPulse] = useState(null)
  const [pulseLoading, setPulseLoading] = useState(false)

  const handlePulse = async () => {
    setPulseLoading(true)
    try {
      const all = await serviceRequests.listForUser(user.id).catch(() => [])
      const own = (all || []).filter((r) => r.technician_id === user.id)
      const stats = computePulseStats(own, tech || {})
      const res = await businessPulse({ stats })
      setPulse({ ...res, stats })
    } catch {
      setPulse(null)
    } finally {
      setPulseLoading(false)
    }
  }

  const handlePredict = async () => {
    setDemandLoading(true)
    try {
      const all = await serviceRequests.listForUser(user.id).catch(() => [])
      const own = (all || []).filter((r) => r.technician_id === user.id)
      const res = await predictDemand({
        category: tech?.category_slug || null,
        province: tech?.province || null,
        ownRequests: own,
      })
      setDemand(res)
    } catch {
      setDemand(null)
    } finally {
      setDemandLoading(false)
    }
  }

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let mounted = true
    ;(async () => {
      try {
        const me = await technicians.getOne(user.id)
        const certs = await certificatesApi.list(user.id).catch(() => [])
        const peers = await technicians.list({ categorySlug: me.category_slug }).catch(() => [])
        const valid = peers.filter((p) => p.user_id !== me.user_id)
        const market = {
          count: valid.length,
          avgPrice: valid.length ? valid.reduce((s, p) => s + Number(p.min_price || 0), 0) / valid.length : 0,
          avgRating: valid.length ? valid.reduce((s, p) => s + Number(p.average_rating || 0), 0) / valid.length : 0,
        }
        if (!mounted) return
        setTech(me)
        setTrust(computeTrustScore(me, certs.length))
        setInsights(technicianInsights(me, market, certs.length))
      } catch {
        if (mounted) setTech(null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [user])

  if (!user) return <EmptyState emoji="🔒" title="Inicia sesión" sub="Esta sección es para técnicos." />

  const tier = getTrustTier(trust)
  const todo = insights.filter((i) => i.severity !== 'ok').length

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 90 }}>
      <PageHeader title="📈 Insights de mi perfil" onBack={goBack} />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '8px 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Spinner /></div>
        ) : !tech ? (
          <EmptyState emoji="🛠️" title="Aún no tienes perfil de técnico" sub="Crea tu perfil profesional para ver tus insights."
            action={<Btn onClick={() => navigate('edit-tech-profile')} style={{ maxWidth: 240, margin: '0 auto' }}>Crear perfil</Btn>} />
        ) : (
          <>
            {/* Trust score */}
            <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 16, padding: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" style={{ width: 76, height: 76, transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="16" fill="none" stroke={th.surface2} strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="16" fill="none" stroke={tier.color} strokeWidth="3.5" strokeLinecap="round"
                    strokeDasharray={`${(trust / 100) * 100.5} 100.5`} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: th.text }}>{trust}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: th.textSec, fontWeight: 700 }}>ÍNDICE DE CONFIANZA</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: tier.color }}>Nivel {tier.label}</div>
                <div style={{ fontSize: 13, color: th.textSec, marginTop: 2 }}>
                  {todo === 0 ? '¡Tu perfil está optimizado!' : `${todo} acción${todo === 1 ? '' : 'es'} para subir de nivel.`}
                </div>
              </div>
            </div>

            {/* Lista de insights */}
            {insights.map((ins, i) => {
              const sv = SEV[ins.severity]
              return (
                <div key={i} style={{ background: th.surface, border: `1px solid ${th.border}`, borderLeft: `4px solid ${sv.color}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontWeight: 800, color: th.text, fontSize: 15 }}>{ins.icon} {ins.title}</div>
                    <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, color: sv.color, background: sv.bg, padding: '3px 8px', borderRadius: 20 }}>{sv.label}</span>
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: th.textSec, lineHeight: 1.55 }}>{ins.detail}</p>
                  {ins.actionScreen && (
                    <button onClick={() => navigate(ins.actionScreen)} style={{ marginTop: 8, background: 'none', border: 'none', color: th.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}>
                      Arreglar ahora →
                    </button>
                  )}
                </div>
              )
            })}

            {/* Pulso semanal del negocio (IA) */}
            <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 16, padding: 16, marginTop: 16 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 15, color: th.text }}>📊 Pulso de mi negocio</div>
                <div style={{ fontSize: 12, color: th.textSec, marginTop: 2 }}>Tu resumen de la semana con próximos pasos.</div>
              </div>

              {!pulse ? (
                <Btn onClick={handlePulse} loading={pulseLoading} style={{ marginTop: 12 }}>
                  Ver mi pulso semanal
                </Btn>
              ) : (
                <div style={{ marginTop: 12 }}>
                  {/* Métricas clave */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                    <PulseStat th={th} label="Trabajos (7d)" value={pulse.stats.jobs_done}
                      delta={pulse.stats.jobs_done - pulse.stats.jobs_done_prev} />
                    <PulseStat th={th} label="Ingresos (7d)" value={`B/.${pulse.stats.earnings}`}
                      delta={pulse.stats.earnings - pulse.stats.earnings_prev} money />
                    <PulseStat th={th} label="Pendientes" value={pulse.stats.pending} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: th.text }}>
                      {pulse.trend === 'up' ? '📈' : pulse.trend === 'down' ? '📉' : '➡️'} {pulse.greeting}
                    </span>
                    {pulse.source === 'demo' && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, color: th.textSec, background: th.surface2 }}>
                        Resumen local
                      </span>
                    )}
                  </div>

                  {pulse.summary && (
                    <p style={{ margin: '8px 0 0', fontSize: 13, color: th.textSec, lineHeight: 1.55 }}>{pulse.summary}</p>
                  )}

                  {pulse.highlight && (
                    <div style={{ marginTop: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 12px', fontSize: 13, color: '#166534' }}>
                      ⭐ {pulse.highlight}
                    </div>
                  )}

                  {(pulse.actions || []).length > 0 && (
                    <>
                      <div style={{ fontSize: 11, color: th.textSec, fontWeight: 700, marginTop: 12 }}>PRÓXIMOS PASOS</div>
                      <ul style={{ margin: '6px 0 0', padding: '0 0 0 18px' }}>
                        {pulse.actions.map((a, i) => (
                          <li key={i} style={{ fontSize: 13, color: th.text, lineHeight: 1.55, marginBottom: 4 }}>{a}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  <button onClick={handlePulse} disabled={pulseLoading} style={{ marginTop: 12, background: 'none', border: 'none', color: th.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}>
                    {pulseLoading ? 'Actualizando…' : 'Volver a calcular ↻'}
                  </button>
                </div>
              )}
            </div>

            {/* Predicción de demanda por zona (IA) */}
            <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 16, padding: 16, marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15, color: th.text }}>🔮 Predicción de demanda</div>
                  <div style={{ fontSize: 12, color: th.textSec, marginTop: 2 }}>Cuándo y dónde hay más solicitudes en tu oficio.</div>
                </div>
              </div>

              {!demand ? (
                <Btn onClick={handlePredict} loading={demandLoading} style={{ marginTop: 12 }}>
                  Predecir mi demanda
                </Btn>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: th.text }}>{demand.headline}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, color: '#fff', background: demand.confidence === 'alta' ? '#16a34a' : demand.confidence === 'media' ? '#d97706' : '#64748b' }}>
                      Confianza {demand.confidence}
                    </span>
                    {demand.source === 'demo' && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, color: th.textSec, background: th.surface2 }}>
                        Estimación
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 11, color: th.textSec, fontWeight: 700 }}>MEJORES DÍAS</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        {(demand.best_days || []).map((d, i) => (
                          <span key={i} style={{ fontSize: 12, fontWeight: 700, color: th.primaryText, background: th.primaryLight, padding: '4px 10px', borderRadius: 20 }}>{d}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: th.textSec, fontWeight: 700 }}>MEJOR FRANJA</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        {(demand.best_hours || []).map((h, i) => (
                          <span key={i} style={{ fontSize: 12, fontWeight: 700, color: th.text, background: th.surface2, padding: '4px 10px', borderRadius: 20 }}>{h}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {(demand.hot_zones || []).length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, color: th.textSec, fontWeight: 700 }}>ZONAS CON MÁS DEMANDA</div>
                      {demand.hot_zones.map((z, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 13, color: th.text }}>
                          <span>📍</span>
                          <span><strong>{z.name}</strong>{z.note ? ` — ${z.note}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {demand.reasoning && (
                    <p style={{ margin: '12px 0 0', fontSize: 13, color: th.textSec, lineHeight: 1.55 }}>{demand.reasoning}</p>
                  )}

                  {(demand.tips || []).length > 0 && (
                    <ul style={{ margin: '10px 0 0', padding: '0 0 0 18px' }}>
                      {demand.tips.map((tip, i) => (
                        <li key={i} style={{ fontSize: 13, color: th.text, lineHeight: 1.55, marginBottom: 4 }}>{tip}</li>
                      ))}
                    </ul>
                  )}

                  <button onClick={handlePredict} disabled={demandLoading} style={{ marginTop: 12, background: 'none', border: 'none', color: th.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}>
                    {demandLoading ? 'Actualizando…' : 'Volver a calcular ↻'}
                  </button>
                </div>
              )}
            </div>

            <p style={{ fontSize: 11, color: th.textSec, textAlign: 'center', marginTop: 14, fontStyle: 'italic' }}>
              Análisis basado en tu perfil y el promedio de tu categoría en Tecnifix.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function PulseStat({ th, label, value, delta, money }) {
  const showDelta = typeof delta === 'number' && delta !== 0
  const up = delta > 0
  const color = up ? '#16a34a' : '#dc2626'
  return (
    <div style={{ flex: 1, minWidth: 90, background: th.surface2, borderRadius: 12, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: th.textSec, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .3 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: th.text, marginTop: 2 }}>{value}</div>
      {showDelta && (
        <div style={{ fontSize: 11, fontWeight: 800, color, marginTop: 1 }}>
          {up ? '▲' : '▼'} {money ? `B/.${Math.abs(delta)}` : Math.abs(delta)} vs sem. previa
        </div>
      )}
    </div>
  )
}
