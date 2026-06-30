// ─────────────────────────────────────────────────────────────
// Tecnifix — Subasta inversa (reverse auction)
// El cliente publica un trabajo y los técnicos pujan A LA BAJA.
// Transparencia de precio: el cliente ve ofertas en vivo y elige.
//
// Real (Supabase): tablas reverse_auctions + auction_bids (ver
//   reverse_auctions.sql) y realtime sobre auction_bids.
// Demo: store en memoria + pujas simuladas que llegan por timers,
//   para que la pantalla sea totalmente navegable sin backend.
// ─────────────────────────────────────────────────────────────
import { supabase, isSupabaseConfigured } from './supabase.js'

// ───────── DEMO ─────────
const DEMO_BIDDERS = [
  { name: 'Carlos Mendoza', avatar: 'https://i.pravatar.cc/120?img=12', rating: 4.9, verified: true, etaMin: 30 },
  { name: 'María Batista', avatar: 'https://i.pravatar.cc/120?img=32', rating: 4.8, verified: true, etaMin: 45 },
  { name: 'Luis Quintero', avatar: 'https://i.pravatar.cc/120?img=5', rating: 4.7, verified: false, etaMin: 60 },
  { name: 'Ana Pérez', avatar: 'https://i.pravatar.cc/120?img=45', rating: 4.6, verified: true, etaMin: 25 },
  { name: 'Jorge Saldaña', avatar: 'https://i.pravatar.cc/120?img=15', rating: 4.5, verified: false, etaMin: 90 },
]

const demoStore = new Map() // auctionId -> { auction, bids[] }
let demoSeq = 1

function makeDemoBid(auctionId, idx, budget) {
  const b = DEMO_BIDDERS[idx % DEMO_BIDDERS.length]
  // Pujas a la baja: cada una un poco más barata.
  const base = budget && budget > 0 ? budget : 200
  const amount = Math.max(15, Math.round(base * (0.92 - idx * 0.07)))
  return {
    id: `demo-bid-${auctionId}-${idx}`,
    auction_id: auctionId,
    bidder_name: b.name,
    bidder_avatar: b.avatar,
    rating: b.rating,
    verified: b.verified,
    eta_minutes: b.etaMin,
    amount,
    message: idx === 0 ? 'Puedo ir hoy mismo, llevo repuestos comunes.' : 'Disponible esta semana, trabajo garantizado.',
    created_at: new Date().toISOString(),
  }
}

// ───────── API ─────────

export async function createAuction({ clientId, title, description = '', slug = null, province = null, budgetMax = null }) {
  if (isSupabaseConfigured && clientId) {
    const { data, error } = await supabase
      .from('reverse_auctions')
      .insert({ client_id: clientId, title, description, category_slug: slug, province, budget_max: budgetMax, status: 'open' })
      .select()
      .single()
    if (error) throw error
    return data
  }
  // Demo
  const id = `demo-auc-${demoSeq++}`
  const auction = { id, client_id: clientId || 'demo-user', title, description, category_slug: slug, province, budget_max: budgetMax, status: 'open', created_at: new Date().toISOString() }
  demoStore.set(id, { auction, bids: [] })
  return auction
}

export async function listBids(auctionId) {
  if (isSupabaseConfigured && !String(auctionId).startsWith('demo-')) {
    const { data, error } = await supabase
      .from('auction_bids')
      .select('*')
      .eq('auction_id', auctionId)
      .order('amount', { ascending: true })
    if (error) throw error
    return data ?? []
  }
  return (demoStore.get(auctionId)?.bids ?? []).slice().sort((a, b) => a.amount - b.amount)
}

/**
 * Suscripción a pujas en vivo. Llama cb(bid) por cada puja nueva.
 * Devuelve función para cancelar.
 */
export function subscribeBids(auctionId, cb) {
  if (isSupabaseConfigured && !String(auctionId).startsWith('demo-')) {
    const channel = supabase
      .channel(`auction:${auctionId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'auction_bids',
        filter: `auction_id=eq.${auctionId}`,
      }, (payload) => cb(payload.new))
      .subscribe()
    return () => { try { supabase.removeChannel(channel) } catch { /* noop */ } }
  }

  // Demo: emite pujas simuladas a la baja cada ~2.4s (hasta 5).
  const entry = demoStore.get(auctionId)
  const budget = entry?.auction?.budget_max
  let idx = 0
  const timer = setInterval(() => {
    if (idx >= 5) { clearInterval(timer); return }
    const bid = makeDemoBid(auctionId, idx, budget)
    if (entry) entry.bids.push(bid)
    cb(bid)
    idx++
  }, 2400)
  return () => clearInterval(timer)
}

// ─────────────────────────────────────────────────────────────
// ASESOR IA DE PUJAS — evalúa precio vs rating vs llegada vs
// verificación y recomienda la mejor oferta (local, instantáneo).
// ─────────────────────────────────────────────────────────────
export function recommendBid(bids = []) {
  if (!bids.length) return null
  const amounts = bids.map((b) => Number(b.amount) || 0)
  const etas = bids.map((b) => Number(b.eta_minutes) || 0)
  const minP = Math.min(...amounts), maxP = Math.max(...amounts)
  const minE = Math.min(...etas), maxE = Math.max(...etas)
  const norm = (v, lo, hi) => (hi - lo ? (v - lo) / (hi - lo) : 1)

  const scored = bids.map((b) => {
    const priceScore = 1 - norm(Number(b.amount) || 0, minP, maxP)   // más barato = mejor
    const ratingScore = (Number(b.rating) || 0) / 5
    const etaScore = 1 - norm(Number(b.eta_minutes) || 0, minE, maxE) // llega antes = mejor
    const verified = b.verified ? 1 : 0
    const value = priceScore * 0.45 + ratingScore * 0.35 + etaScore * 0.12 + verified * 0.08
    return { bid: b, value, priceScore, ratingScore }
  }).sort((a, b) => b.value - a.value)

  const top = scored[0]
  const reasons = []
  if (top.priceScore >= 0.99) reasons.push('el precio más bajo')
  else if (top.priceScore >= 0.6) reasons.push('buen precio')
  if (top.bid.rating >= 4.7) reasons.push(`excelente reputación (${Number(top.bid.rating).toFixed(1)}★)`)
  if (top.bid.verified) reasons.push('identidad verificada')
  if (!reasons.length) reasons.push('el mejor balance entre precio y reputación')

  return {
    bid: top.bid,
    score: Math.round(top.value * 100),
    why: `Recomiendo a ${top.bid.bidder_name} por ${reasons.join(', ')}.`,
  }
}

/**
 * Simula pedir una contraoferta al postor (el técnico decide).
 * Devuelve { accepted, amount, message }. En una integración real esto
 * notificaría al técnico; aquí modela una respuesta plausible.
 */
export function negotiateBid(bid, budget = null) {
  const current = Number(bid.amount) || 0
  // Margen de regateo mayor si la puja está lejos del presupuesto.
  const floor = budget ? Math.max(current * 0.82, budget * 0.6) : current * 0.85
  const willing = Math.random() < 0.7
  if (!willing) {
    return { accepted: false, amount: current, message: `${bid.bidder_name}: "Es mi mejor precio por la calidad del trabajo."` }
  }
  const counter = Math.max(floor, Math.round(current * (0.88 + Math.random() * 0.06)))
  return {
    accepted: true,
    amount: counter,
    message: `${bid.bidder_name}: "Puedo dejártelo en $${counter} si confirmamos hoy."`,
  }
}

export async function acceptBid(auctionId, bid) {
  if (isSupabaseConfigured && !String(auctionId).startsWith('demo-')) {
    const { error } = await supabase
      .from('reverse_auctions')
      .update({ status: 'awarded', awarded_bid_id: bid.id })
      .eq('id', auctionId)
    if (error) throw error
    return true
  }
  const entry = demoStore.get(auctionId)
  if (entry) entry.auction.status = 'awarded'
  return true
}
