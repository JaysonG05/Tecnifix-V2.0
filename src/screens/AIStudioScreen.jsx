import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, Btn, Spinner } from '../components/UI.jsx'
import { technicians } from '../lib/supabase.js'
import { quoteFromPhoto, fileToBase64, triageStep, triageChat, compareTechnicians, fairPrice, TRIAGE_START } from '../lib/aiExotic.js'
import { CATEGORIES, PROVINCE_LIST } from '../lib/trust.js'
import { VoiceInput, voiceSupported, speak, stopSpeaking, ttsSupported } from '../components/VoiceInput.jsx'

export function AIStudioScreen() {
  const { th, goBack, setSelectedCategory, setSelectedTech, navigate } = useApp()
  const [tab, setTab] = useState(() => {
    if (typeof window === 'undefined') return 'foto'
    const saved = window.sessionStorage.getItem('tecnifix_ai_tab')
    window.sessionStorage.removeItem('tecnifix_ai_tab')
    return ['foto', 'triage', 'comparar', 'precio'].includes(saved) ? saved : 'foto'
  })

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 90 }}>
      <PageHeader title="🤖 Asistente IA" onBack={goBack} />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '8px 16px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <TabBtn th={th} active={tab === 'foto'} onClick={() => setTab('foto')}>📸 Cotizar</TabBtn>
          <TabBtn th={th} active={tab === 'triage'} onClick={() => setTab('triage')}>💬 Triage</TabBtn>
          <TabBtn th={th} active={tab === 'comparar'} onClick={() => setTab('comparar')}>⚖️ Comparar</TabBtn>
          <TabBtn th={th} active={tab === 'precio'} onClick={() => setTab('precio')}>💰 Precio</TabBtn>
        </div>

        {tab === 'foto' && <PhotoQuote th={th} onSearch={(d) => { setSelectedCategory(d); navigate('search') }} />}
        {tab === 'triage' && <Triage th={th} onSearch={(d) => { setSelectedCategory(d); navigate('search') }} />}
        {tab === 'comparar' && <CompareTechs th={th} onOpen={(tech) => { setSelectedTech(tech); navigate('tech-profile') }} />}
        {tab === 'precio' && <PriceTwin th={th} onSearch={(d) => { setSelectedCategory(d); navigate('search') }} />}
      </div>
    </div>
  )
}

function TabBtn({ th, active, children, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '11px 8px', borderRadius: 12, cursor: 'pointer', fontWeight: 800, fontSize: 14,
      border: `1px solid ${active ? th.primary : th.border}`,
      background: active ? th.primary : th.surface,
      color: active ? '#fff' : th.text,
      transition: 'all .15s',
    }}>{children}</button>
  )
}

// ─────────────────────────────────────────────────────────────
// FOTO → COTIZACIÓN
// ─────────────────────────────────────────────────────────────
function PhotoQuote({ th, onSearch }) {
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [quote, setQuote] = useState(null)
  const inputRef = useRef(null)

  const pick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setQuote(null)
    setPreview(URL.createObjectURL(f))
  }

  const estimate = async () => {
    setLoading(true)
    try {
      let imageBase64, mimeType
      if (file) {
        const r = await fileToBase64(file)
        imageBase64 = r.base64; mimeType = r.mimeType
      }
      const q = await quoteFromPhoto({ imageBase64, mimeType, note })
      setQuote(q)
    } catch {
      setQuote(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <p style={{ color: th.textSec, fontSize: 14, margin: '0 0 14px' }}>
        Sube una foto del problema y, si quieres, descríbelo. Te damos una estimación de oficio, materiales y rango de precio.
      </p>

      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={pick} style={{ display: 'none' }} />
      <button onClick={() => inputRef.current?.click()} style={{
        width: '100%', border: `2px dashed ${th.border}`, borderRadius: 16, background: th.surface,
        padding: preview ? 8 : 36, cursor: 'pointer', color: th.textSec, marginBottom: 12, position: 'relative', overflow: 'hidden'
      }}>
        {preview
          ? (
            <>
              <img src={preview} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 10, display: 'block' }} />
              {loading && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(37,99,235,0.1)', zIndex: 10, pointerEvents: 'none'
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                    background: '#2563eb', boxShadow: '0 0 15px #2563eb',
                    animation: 'scan 1.5s ease-in-out infinite alternate'
                  }} />
                  <style>{`@keyframes scan { 0% { top: 0%; } 100% { top: 100%; } }`}</style>
                </div>
              )}
            </>
          )
          : <div style={{ fontSize: 15, fontWeight: 700 }}>📷 Toca para tomar o subir una foto</div>}
      </button>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Opcional: cuéntanos qué pasa (ej. el aire no enfría y gotea)..."
        rows={2}
        style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 12, border: `1px solid ${th.border}`, background: th.surface, color: th.text, fontSize: 14, resize: 'vertical', marginBottom: 12 }}
      />

      <Btn onClick={estimate} disabled={loading || (!file && !note.trim())} loading={loading} style={{ width: '100%', background: loading ? th.primaryDark : th.primary }}>
        {loading ? '🔍 Escaneando problema...' : '✨ Generar pre-diagnóstico IA'}
      </Btn>

      {quote && <QuoteCard th={th} q={quote} onSearch={onSearch} />}
    </div>
  )
}

function QuoteCard({ th, q, onSearch }) {
  const sevColor = q.severity === 'alta' ? th.red : q.severity === 'media' ? '#d97706' : '#16a34a'
  return (
    <div style={{ marginTop: 18, background: th.surface, border: `1px solid ${th.border}`, borderRadius: 16, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 17, color: th.text }}>{q.icon || '🔧'} {q.category_label}</h3>
        <span style={{ fontSize: 12, fontWeight: 800, color: sevColor, background: `${sevColor}1a`, padding: '4px 10px', borderRadius: 20 }}>
          Riesgo {q.severity}
        </span>
      </div>

      <div style={{ fontSize: 28, fontWeight: 900, color: th.primary, margin: '4px 0' }}>
        ${q.price_min} – ${q.price_max} <span style={{ fontSize: 13, color: th.textSec, fontWeight: 600 }}>{q.currency}</span>
      </div>

      <p style={{ color: th.text, fontSize: 14, margin: '8px 0' }}>{q.problem_summary}</p>

      {q.likely_causes?.length > 0 && (
        <Section th={th} title="Causas probables">
          {q.likely_causes.map((c, i) => <li key={i}>{c}</li>)}
        </Section>
      )}
      {q.materials?.length > 0 && (
        <Section th={th} title="Materiales típicos">
          {q.materials.map((m, i) => <li key={i}>{m}</li>)}
        </Section>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0', fontSize: 12, color: th.textSec }}>
        <span>Confianza: {Math.round(q.confidence || 0)}%</span>
        {q.source === 'demo' && <span style={{ background: th.surface2, padding: '2px 8px', borderRadius: 10 }}>estimación local</span>}
      </div>

      <p style={{ fontSize: 11, color: th.textSec, fontStyle: 'italic', margin: '0 0 14px' }}>{q.disclaimer}</p>

      <Btn onClick={() => onSearch({ slug: q.category_slug || null, emergency: q.severity === 'alta', onlyVerified: q.severity === 'alta', query: q.category_slug ? '' : (q.category_label || '') })} style={{ width: '100%' }}>
        Buscar técnicos para esto →
      </Btn>
    </div>
  )
}

function Section({ th, title, children }) {
  return (
    <div style={{ margin: '10px 0' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: th.textSec, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 4 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, color: th.text, fontSize: 14, lineHeight: 1.6 }}>{children}</ul>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TRIAGE CHATBOT
// ─────────────────────────────────────────────────────────────
function Triage({ th, onSearch }) {
  const [messages, setMessages] = useState([{ from: 'bot', text: TRIAGE_START.reply }])
  const [answers, setAnswers] = useState([])              // respaldo del motor local
  const [step, setStep] = useState(TRIAGE_START)          // controla input/opciones
  const [input, setInput] = useState('')
  const [decision, setDecision] = useState(null)
  const [thinking, setThinking] = useState(false)
  const [voiceOn, setVoiceOn] = useState(false)
  const [usingAI, setUsingAI] = useState(true)
  const aiDeadRef = useRef(false)                         // si el backend falla, fijamos modo local
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinking])
  useEffect(() => () => stopSpeaking(), [])

  const say = (text) => {
    setMessages((m) => [...m, { from: 'bot', text }])
    if (voiceOn) speak(text)
  }

  const finish = (dec) => { setDecision(dec); setStep({}) }

  const submit = async (value) => {
    const text = String(value ?? input).trim()
    if (!text || thinking || decision) return
    setInput('')

    const nextAnswers = [...answers, { field: step.field || 'detalle', value: text }]
    setAnswers(nextAnswers)
    const history = [...messages, { from: 'user', text }]
    setMessages(history)
    setStep({})
    setThinking(true)

    // 1) Intentar el agente IA real (Edge Function). 2) Fallback al motor local.
    if (!aiDeadRef.current) {
      const apiHistory = history.map((m) => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text }))
      const res = await triageChat(apiHistory)
      if (res) {
        setThinking(false)
        say(res.reply)
        if (res.done && res.decision) finish(res.decision)
        else if (res.ask) setStep({ field: res.ask.field || 'detalle', options: res.ask.options || [], placeholder: 'Escribe tu respuesta...' })
        else setStep({ field: 'detalle', options: [], placeholder: 'Cuéntame más...' })
        return
      }
      aiDeadRef.current = true
      setUsingAI(false)
    }

    // Motor local (reglas) — siempre disponible, sin backend.
    const next = triageStep(nextAnswers)
    setThinking(false)
    say(next.reply)
    if (next.done) finish(next.decision)
    else setStep(next)
  }

  const canType = (step.field || (!decision && messages.length > 0)) && !thinking

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: th.textSec }}>
          {usingAI ? '🧠 Asistente IA' : '⚙️ Modo guiado'}
        </span>
        {ttsSupported && (
          <button
            onClick={() => { const v = !voiceOn; setVoiceOn(v); if (!v) stopSpeaking() }}
            style={{
              fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '5px 10px', borderRadius: 16,
              border: `1px solid ${voiceOn ? th.primary : th.border}`,
              background: voiceOn ? th.primaryLight : th.surface, color: voiceOn ? th.primaryText : th.textSec,
            }}
          >{voiceOn ? '🔊 Voz activa' : '🔇 Activar voz'}</button>
        )}
      </div>

      <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 16, padding: 14, minHeight: 280, maxHeight: 440, overflowY: 'auto' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
            <div style={{
              maxWidth: '82%', padding: '10px 13px', borderRadius: 14, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
              background: m.from === 'user' ? th.primary : th.surface2,
              color: m.from === 'user' ? '#fff' : th.text,
              borderBottomRightRadius: m.from === 'user' ? 4 : 14,
              borderBottomLeftRadius: m.from === 'user' ? 14 : 4,
            }}>{m.text}</div>
          </div>
        ))}
        {thinking && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
            <div style={{ padding: '10px 14px', borderRadius: 14, background: th.surface2, color: th.textSec, fontSize: 14 }}>
              escribiendo<span className="tf-dots">…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {step.options?.length > 0 && !thinking && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {step.options.map((opt) => (
            <button key={opt} onClick={() => submit(opt)} style={{
              padding: '9px 14px', borderRadius: 20, border: `1px solid ${th.primary}`,
              background: th.primaryLight, color: th.primaryText, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>{opt}</button>
          ))}
        </div>
      )}

      {canType && (
        <form onSubmit={(e) => { e.preventDefault(); submit() }} style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={step.placeholder || 'Escribe tu respuesta...'}
            style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${th.border}`, background: th.surface, color: th.text, fontSize: 14 }}
          />
          {voiceSupported && (
            <VoiceInput lang="es-PA" onResult={(t) => submit(t)} title="Responder por voz" />
          )}
          <Btn onClick={() => submit()} disabled={!input.trim()} style={{ width: 'auto', minWidth: 72, padding: '12px 16px' }}>Enviar</Btn>
        </form>
      )}

      {decision && (
        <div style={{ marginTop: 14 }}>
          <Btn onClick={() => onSearch(decision)} style={{ width: '100%' }}>
            {decision.icon} Buscar {decision.label.toLowerCase()} ahora →
          </Btn>
        </div>
      )}

      <style>{`.tf-dots{animation:tf-blink 1.2s infinite}@keyframes tf-blink{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// COMPARADOR IA — elige 2-3 técnicos y la IA dice cuál conviene
// ─────────────────────────────────────────────────────────────
function CompareTechs({ th, onOpen }) {
  const [pool, setPool] = useState([])
  const [loadingPool, setLoadingPool] = useState(true)
  const [picked, setPicked] = useState([])     // user_ids
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    technicians.list({ sortBy: 'average_rating' })
      .then((data) => setPool((data || []).slice(0, 12)))
      .catch(() => setPool([]))
      .finally(() => setLoadingPool(false))
  }, [])

  const toggle = (id) => {
    setResult(null)
    setPicked((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : (prev.length >= 3 ? prev : [...prev, id]))
  }

  const run = async () => {
    setBusy(true)
    try {
      const chosen = pool.filter((t) => picked.includes(t.user_id))
      const res = await compareTechnicians({ problem, technicians: chosen })
      setResult(res)
    } catch { setResult(null) }
    finally { setBusy(false) }
  }

  const chosen = pool.filter((t) => picked.includes(t.user_id))

  if (loadingPool) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>

  return (
    <div>
      <p style={{ color: th.textSec, fontSize: 14, margin: '0 0 12px' }}>
        Elige <strong>2 o 3</strong> técnicos y, si quieres, describe tu problema. La IA te dice cuál conviene y por qué.
      </p>

      <input
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
        placeholder="Opcional: ¿para qué los necesitas? (ej. instalar un aire)"
        style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 12, border: `1px solid ${th.border}`, background: th.surface, color: th.text, fontSize: 14, marginBottom: 14 }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
        {pool.map((t) => {
          const sel = picked.includes(t.user_id)
          const disabled = !sel && picked.length >= 3
          return (
            <button key={t.user_id} onClick={() => toggle(t.user_id)} disabled={disabled} style={{
              textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1,
              border: `2px solid ${sel ? th.primary : th.border}`, borderRadius: 14, padding: 10,
              background: sel ? th.primaryLight : th.surface, display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <img src={t.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: th.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.full_name}</div>
                <div style={{ fontSize: 11, color: th.textSec }}>⭐ {Number(t.average_rating || 0).toFixed(1)} · ${t.min_price ?? '?'}</div>
              </div>
            </button>
          )
        })}
      </div>

      <Btn onClick={run} disabled={busy || chosen.length < 2} loading={busy} style={{ width: '100%' }}>
        {chosen.length < 2 ? `Elige al menos 2 (${chosen.length}/3)` : `⚖️ Comparar ${chosen.length} técnicos`}
      </Btn>

      {result && (
        <div style={{ marginTop: 18 }}>
          <div style={{ background: th.primary, color: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: .85, marginBottom: 4 }}>🏆 RECOMENDADO {result.source === 'demo' && '· análisis local'}</div>
            <div style={{ fontSize: 19, fontWeight: 900 }}>{result.recommendation.name}</div>
            <div style={{ fontSize: 14, opacity: .95, marginTop: 4 }}>{result.recommendation.why}</div>
          </div>

          <p style={{ color: th.textSec, fontSize: 13, margin: '0 0 12px' }}>{result.summary}</p>

          {result.table.map((row, i) => {
            const tech = chosen.find((t) => t.full_name === row.name)
            return (
              <div key={i} style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong style={{ color: th.text, fontSize: 15 }}>{row.name}</strong>
                  <span style={{ fontSize: 12, fontWeight: 800, color: th.primary }}>{row.verdict}</span>
                </div>
                <div style={{ fontSize: 13, color: th.text, marginTop: 6 }}>✅ <strong>Mejor para:</strong> {row.best_for}</div>
                <div style={{ fontSize: 13, color: th.textSec, marginTop: 2 }}>👀 <strong>A considerar:</strong> {row.watch_out}</div>
                {tech && (
                  <button onClick={() => onOpen(tech)} style={{ marginTop: 10, background: 'none', border: 'none', color: th.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}>
                    Ver perfil de {row.name.split(' ')[0]} →
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// GEMELO DE PRECIOS JUSTOS — antes de contratar, cuánto cuesta de
// verdad un trabajo de tu oficio en tu provincia. Mata la asimetría
// de información típica del sector informal.
// ─────────────────────────────────────────────────────────────
function PriceTwin({ th, onSearch }) {
  const [category, setCategory] = useState(null)
  const [province, setProvince] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  const run = async () => {
    if (!category) return
    setBusy(true)
    try {
      const res = await fairPrice({ category, province: province || null, note })
      setResult(res)
    } catch { setResult(null) }
    finally { setBusy(false) }
  }

  const confColor = result?.confidence === 'alta' ? '#16a34a' : result?.confidence === 'media' ? '#d97706' : th.textSec

  return (
    <div>
      <p style={{ color: th.textSec, fontSize: 14, margin: '0 0 14px' }}>
        Antes de contratar, descubre el <strong>precio justo</strong> de un trabajo según las tarifas reales de los técnicos en tu provincia.
      </p>

      <div style={{ fontSize: 12, fontWeight: 800, color: th.textSec, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 8 }}>¿Qué necesitas?</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {CATEGORIES.map((c) => {
          const sel = category === c.slug
          return (
            <button key={c.slug} onClick={() => { setCategory(c.slug); setResult(null) }} style={{
              padding: '9px 13px', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 13,
              border: `1px solid ${sel ? th.primary : th.border}`,
              background: sel ? th.primaryLight : th.surface, color: sel ? th.primaryText : th.text,
            }}>{c.icon} {c.label}</button>
          )
        })}
      </div>

      <select
        value={province}
        onChange={(e) => { setProvince(e.target.value); setResult(null) }}
        style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 12, border: `1px solid ${th.border}`, background: th.surface, color: th.text, fontSize: 14, marginBottom: 12 }}
      >
        <option value="">Toda Panamá (cualquier provincia)</option>
        {PROVINCE_LIST.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Opcional: detalla el trabajo (ej. instalar un split de 24,000 BTU en segundo piso)..."
        rows={2}
        style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 12, border: `1px solid ${th.border}`, background: th.surface, color: th.text, fontSize: 14, resize: 'vertical', marginBottom: 12 }}
      />

      <Btn onClick={run} disabled={busy || !category} loading={busy} style={{ width: '100%' }}>
        {busy ? 'Calculando...' : !category ? 'Elige un oficio primero' : '💰 Ver precio justo'}
      </Btn>

      {result && (
        <div style={{ marginTop: 18, background: th.surface, border: `1px solid ${th.border}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: th.textSec, marginBottom: 2 }}>
            {result.headline}{result.source === 'demo' && ' · estimación local'}
          </div>
          <div style={{ fontSize: 13, color: th.textSec, marginBottom: 10 }}>{result.category_label} · {result.province}</div>

          <div style={{ fontSize: 12, fontWeight: 800, color: th.textSec, textTransform: 'uppercase', letterSpacing: .4 }}>Rango justo a pagar</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: th.primary, margin: '2px 0 4px' }}>
            B/.{result.fair_min} – B/.{result.fair_max}
          </div>
          {(result.market_min != null || result.market_max != null) && (
            <div style={{ fontSize: 12, color: th.textSec, marginBottom: 8 }}>
              Mercado total: B/.{result.market_min ?? '?'} – B/.{result.market_max ?? '?'}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 12px', fontSize: 12, color: th.textSec }}>
            <span style={{ fontWeight: 800, color: confColor }}>Confianza {result.confidence}</span>
            <span>· {result.sample_size} técnico{result.sample_size === 1 ? '' : 's'} en la muestra</span>
          </div>

          <p style={{ color: th.text, fontSize: 14, margin: '0 0 10px' }}>{result.reasoning}</p>

          {result.red_flags?.length > 0 && (
            <Section th={th} title="🚩 Señales de alerta">
              {result.red_flags.map((f, i) => <li key={i}>{f}</li>)}
            </Section>
          )}
          {result.tips?.length > 0 && (
            <Section th={th} title="💡 Para contratar bien">
              {result.tips.map((t, i) => <li key={i}>{t}</li>)}
            </Section>
          )}

          {result.disclaimer && (
            <p style={{ fontSize: 11, color: th.textSec, fontStyle: 'italic', margin: '8px 0 14px' }}>{result.disclaimer}</p>
          )}

          <Btn onClick={() => onSearch({ slug: result.category_slug || null, query: result.category_slug ? '' : (result.category_label || '') })} style={{ width: '100%' }}>
            Buscar {result.category_label?.toLowerCase()} para esto →
          </Btn>
        </div>
      )}
    </div>
  )
}
