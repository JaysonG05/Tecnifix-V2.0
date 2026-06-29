import { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────
// VoiceInput — botón de micrófono que usa la Web Speech API del
// navegador (sin backend). Transcribe en vivo y entrega el texto
// vía onResult. Pensado para alimentar el concierge / detectServiceIntent.
//
// Degradación: si el navegador no soporta SpeechRecognition (p.ej. Firefox),
// el componente no se renderiza y deja el flujo de texto intacto.
// ─────────────────────────────────────────────────────────────

const SR = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null

export const voiceSupported = Boolean(SR)

// ── Voz de salida (Text-to-Speech) ───────────────────────────
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
export const ttsSupported = Boolean(synth)

/** Lee un texto en voz alta (es-PA). Limpia markdown básico. */
export function speak(text, { lang = 'es-PA' } = {}) {
  if (!synth || !text) return
  try {
    synth.cancel()
    const clean = String(text).replace(/[*_#>`]/g, '').replace(/\s+/g, ' ').trim()
    const u = new SpeechSynthesisUtterance(clean)
    u.lang = lang
    u.rate = 1.02
    u.pitch = 1
    synth.speak(u)
  } catch { /* noop */ }
}

export function stopSpeaking() {
  try { synth?.cancel() } catch { /* noop */ }
}

export function VoiceInput({ onResult, onInterim, lang = 'es-PA', title = 'Dictar por voz' }) {
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)

  useEffect(() => {
    return () => { try { recRef.current?.abort() } catch { /* noop */ } }
  }, [])

  if (!SR) return null

  const start = () => {
    if (listening) { try { recRef.current?.stop() } catch { /* noop */ } return }

    const rec = new SR()
    rec.lang = lang
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 1

    let finalText = ''
    rec.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += chunk
        else interim += chunk
      }
      if (interim && onInterim) onInterim(interim)
      if (finalText && onResult) onResult(finalText.trim())
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)

    recRef.current = rec
    setListening(true)
    try { rec.start() } catch { setListening(false) }
  }

  return (
    <button
      type="button"
      onClick={start}
      title={title}
      aria-label={title}
      aria-pressed={listening}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 44, height: 44, borderRadius: '50%', cursor: 'pointer',
        border: 'none', flexShrink: 0, fontSize: 20, lineHeight: 1,
        color: listening ? '#fff' : '#1d4ed8',
        background: listening ? '#ef4444' : '#dbeafe',
        boxShadow: listening ? '0 0 0 0 rgba(239,68,68,.6)' : 'none',
        animation: listening ? 'tf-mic-pulse 1.3s infinite' : 'none',
        transition: 'background .2s, color .2s',
      }}
    >
      {listening ? '⏹️' : '🎙️'}
      <style>{`@keyframes tf-mic-pulse{0%{box-shadow:0 0 0 0 rgba(239,68,68,.55)}70%{box-shadow:0 0 0 12px rgba(239,68,68,0)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}`}</style>
    </button>
  )
}
