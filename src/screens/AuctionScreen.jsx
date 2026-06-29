import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, Btn, Spinner } from '../components/UI.jsx'
import { createAuction, subscribeBids, acceptBid, recommendBid, negotiateBid } from '../lib/auctions.js'
import { detectServiceIntent } from '../lib/trust.js'

const CATEGORIES = [
  { slug: '', label: 'Detectar automáticamente' },
  { slug: 'climatizacion', label: '❄️ Climatización' },
  { slug: 'electricidad', label: '⚡ Electricidad' },
  { slug: 'plomeria', label: '🔧 Plomería' },
  { slug: 'cerrajeria', label: '🔐 Cerrajería' },
  { slug: 'pintura', label: '🎨 Pintura' },
  { slug: 'limpieza', label: '🧹 Limpieza' },
  { slug: 'albanileria', label: '🧱 Albañilería' },
  { slug: 'tecnologia', label: '💻 Tecnología' },
]
const PROVINCES = ['Panamá', 'Panamá Oeste', 'Chiriquí', 'Bocas del Toro', 'Colón', 'Coclé', 'Veraguas', 'Herrera', 'Los Santos', 'Darién']

export function AuctionScreen() {
  const { th, goBack, user } = useApp()
  const [phase, setPhase] = useState('form') // form | live
  const [form, setForm] = useState({ title: '', description: '', slug: '', province: '', budgetMax: '' })
  const [auction, setAuction] = useState(null)
  const [bids, setBids] = useState([])
  const [awarded, setAwarded] = useState(null)
  const [busy, setBusy] = useState(false)
  const [advice, setAdvice] = useState(null)
  const [negotiation, setNegotiation] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [flash, setFlash] = useState(false)
  const unsubRef = useRef(null)

  useEffect(() => () => { unsubRef.current?.() }, [])

  useEffect(() => {
    if (phase !== 'live' || awarded || timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [phase, awarded, timeLeft])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const publish = async () => {
    if (!form.title.trim()) return
    setBusy(true)
    try {
      const slug = form.slug || detectServiceIntent(`${form.title} ${form.description}`).slug || null
      const a = await createAuction({
        clientId: user?.id,
        title: form.title.trim(),
        description: form.description.trim(),
        slug,
        province: form.province || null,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
      })
      setAuction(a)
      setPhase('live')
      setTimeLeft(180) // 3 minutos de muerte súbita
      unsubRef.current = subscribeBids(a.id, (bid) => {
        setBids((prev) => {
          const currentBest = prev[0]?.amount ?? Infinity
          const isBetter = bid.amount < currentBest
          
          if (isBetter && prev.length > 0) {
            setFlash(true)
            setTimeout(() => setFlash(false), 500)
            setTimeLeft(t => t < 30 ? 30 : t) // Muerte súbita: si faltan menos de 30s, vuelve a 30s
          }
          
          return [...prev, bid].sort((x, y) => x.amount - y.amount)
        })
      })
    } catch (e) {
      alert(e?.message || 'No se pudo publicar la subasta.')
    } finally {
      setBusy(false)
    }
  }

  const accept = async (bid) => {
    await acceptBid(auction.id, bid)
    unsubRef.current?.()
    setAwarded(bid)
  }

  const advise = () => setAdvice(recommendBid(bids))

  const negotiate = (bid) => {
    const res = negotiateBid(bid, auction?.budget_max)
    setNegotiation({ bidId: bid.id, ...res })
    if (res.accepted) {
      setBids((prev) => prev.map((b) => b.id === bid.id ? { ...b, amount: res.amount, message: 'Precio renegociado con asistente IA.' } : b).sort((x, y) => x.amount - y.amount))
      setAdvice(null)
    }
  }

  const best = bids[0]

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 90, position: 'relative' }}>
      {flash && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(34, 197, 94, 0.4)', pointerEvents: 'none', zIndex: 9999,
          animation: 'flashAnim 0.5s ease-out forwards'
        }}>
          <style>{`@keyframes flashAnim { 0% { opacity: 1; } 100% { opacity: 0; } }`}</style>
        </div>
      )}
      <PageHeader title="🎯 Subasta inversa" onBack={goBack} />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '8px 16px' }}>

        {phase === 'form' && (
          <>
            <p style={{ color: th.textSec, fontSize: 14, margin: '0 0 16px' }}>
              Publica tu trabajo y deja que los técnicos compitan ofreciendo su mejor precio. Tú eliges al ganador.
            </p>
            <Field th={th} label="¿Qué necesitas?">
              <input value={form.title} onChange={set('title')} placeholder="Ej: Instalar 2 abanicos de techo" style={inp(th)} />
            </Field>
            <Field th={th} label="Detalles (opcional)">
              <textarea value={form.description} onChange={set('description')} rows={3} placeholder="Materiales, ubicación exacta, horario preferido..." style={{ ...inp(th), resize: 'vertical' }} />
            </Field>
            <div style={{ display: 'flex', gap: 12 }}>
              <Field th={th} label="Categoría" style={{ flex: 1 }}>
                <select value={form.slug} onChange={set('slug')} style={inp(th)}>
                  {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                </select>
              </Field>
              <Field th={th} label="Provincia" style={{ flex: 1 }}>
                <select value={form.province} onChange={set('province')} style={inp(th)}>
                  <option value="">Cualquiera</option>
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <Field th={th} label="Presupuesto máximo (USD, opcional)">
              <input value={form.budgetMax} onChange={set('budgetMax')} type="number" inputMode="numeric" placeholder="Ej: 120" style={inp(th)} />
            </Field>
            <Btn onClick={publish} disabled={busy || !form.title.trim()} loading={busy} style={{ width: '100%', marginTop: 8 }}>
              🚀 Publicar y recibir ofertas
            </Btn>
          </>
        )}

        {phase === 'live' && (
          <>
            <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 800, color: th.text, fontSize: 16 }}>{auction.title}</div>
              <div style={{ color: th.textSec, fontSize: 13, marginTop: 2 }}>
                {auction.province || 'Cualquier provincia'}{auction.budget_max ? ` · tope $${auction.budget_max}` : ''}
              </div>
            </div>

            {!awarded && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: th.primary, fontWeight: 700, fontSize: 14 }}>
                  <Spinner size={16} /> Recibiendo ofertas... ({bids.length})
                </div>
                {timeLeft > 0 && (
                  <div style={{ 
                    fontWeight: 900, fontSize: 16, 
                    color: timeLeft <= 30 ? '#ef4444' : th.text,
                    animation: timeLeft <= 30 ? 'pulse 1s infinite' : 'none' 
                  }}>
                    ⏱ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </div>
                )}
              </div>
            )}

            {awarded && (
              <div style={{ background: '#16a34a', color: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>✅ Adjudicado a {awarded.bidder_name}</div>
                <div style={{ fontSize: 14, opacity: .92, marginTop: 4 }}>Por ${awarded.amount} · llega en ~{awarded.eta_minutes} min. Te conectaremos por chat.</div>
              </div>
            )}

            {bids.length === 0 && !awarded && (
              <div style={{ textAlign: 'center', color: th.textSec, padding: '30px 0', fontSize: 14 }}>
                Esperando que los técnicos pujen...
              </div>
            )}

            {/* Asesor IA de pujas */}
            {bids.length >= 2 && !awarded && (
              <div style={{ marginBottom: 14 }}>
                {!advice && (
                  <Btn variant="outline" onClick={advise} style={{ width: '100%' }}>
                    🤖 ¿Cuál me conviene? Pídele a la IA
                  </Btn>
                )}
                {advice && (
                  <div style={{ background: th.primaryLight, border: `1px solid ${th.primary}`, borderRadius: 14, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: th.primaryText, marginBottom: 4 }}>🤖 RECOMENDACIÓN IA</div>
                    <div style={{ fontSize: 14, color: th.text }}>{advice.why}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      <Btn size="sm" onClick={() => accept(advice.bid)} style={{ width: 'auto', padding: '8px 16px' }}>
                        Aceptar ${advice.bid.amount}
                      </Btn>
                      <Btn size="sm" variant="ghost" onClick={() => negotiate(advice.bid)} style={{ width: 'auto', padding: '8px 16px' }}>
                        🤝 Pedir mejor precio
                      </Btn>
                    </div>
                    {negotiation && (
                      <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: th.surface, fontSize: 13, color: th.text }}>
                        {negotiation.accepted ? '✅ ' : '💬 '}{negotiation.message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {bids.map((bid, i) => (
              <BidCard key={bid.id} th={th} bid={bid} best={!awarded && i === 0} disabled={!!awarded} onAccept={() => accept(bid)} />
            ))}

            {best && !awarded && (
              <p style={{ textAlign: 'center', color: th.textSec, fontSize: 12, marginTop: 14 }}>
                💡 La oferta más baja se resalta. Acepta cuando estés conforme.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function BidCard({ th, bid, best, disabled, onAccept }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10,
      background: th.surface, borderRadius: 14,
      border: `2px solid ${best ? '#16a34a' : th.border}`,
      boxShadow: best ? '0 6px 20px rgba(22,163,74,.18)' : 'none',
    }}>
      <img src={bid.bidder_avatar} alt="" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, color: th.text, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          {bid.bidder_name} {bid.verified && <span title="Verificado" style={{ color: th.primary }}>✓</span>}
          {best && <span style={{ fontSize: 10, background: '#16a34a', color: '#fff', padding: '2px 7px', borderRadius: 10 }}>MEJOR</span>}
        </div>
        <div style={{ fontSize: 12, color: th.textSec }}>⭐ {bid.rating} · llega en ~{bid.eta_minutes} min</div>
        {bid.message && <div style={{ fontSize: 12, color: th.textSec, marginTop: 2, fontStyle: 'italic' }}>"{bid.message}"</div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 900, fontSize: 20, color: best ? '#16a34a' : th.text }}>${bid.amount}</div>
        <Btn size="sm" onClick={onAccept} disabled={disabled} variant={best ? 'primary' : 'ghost'} style={{ marginTop: 4, width: 'auto', padding: '8px 16px' }}>Aceptar</Btn>
      </div>
    </div>
  )
}

function Field({ th, label, children, style }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: th.text, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const inp = (th) => ({
  width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 12,
  border: `1px solid ${th.border}`, background: th.surface, color: th.text, fontSize: 14,
})
