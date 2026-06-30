import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'

export function GlobalVoiceListener() {
  const { navigate, th } = useApp()
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      return
    }
    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'es-ES'

    rec.onresult = (event) => {
      const current = event.resultIndex
      const transcript = event.results[current][0].transcript.toLowerCase().trim()
      
      console.log('🗣️ Voz detectada:', transcript)

      // Comandos "gatillo"
      if (transcript.includes('tecnifix emergencia') || transcript.includes('tecnifix sos')) {
        // Disparar evento global capturado por SOSButton
        window.dispatchEvent(new CustomEvent('tecnifix:sos'))
      } else if (transcript.includes('tecnifix ayuda') || transcript.includes('tecnifix estudio')) {
        navigate('ai-studio')
      }
    }

    rec.onerror = (e) => {
      console.error('Error de voz:', e.error)
      if (e.error === 'not-allowed') setListening(false)
    }

    rec.onend = () => {
      // Intentar reiniciar si el usuario quería que siguiera escuchando
      if (listening) {
        try { rec.start() } catch { setListening(false) }
      }
    }

    recognitionRef.current = rec
    return () => { rec.stop() }
  }, [navigate, listening])

  const toggle = () => {
    if (!supported) {
      alert('Tu navegador no soporta comandos de voz. Intenta en Chrome o Safari modernos.')
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
    } else {
      try {
        recognitionRef.current?.start()
        setListening(true)
      } catch (e) {
        console.error(e)
      }
    }
  }

  if (!supported) return null

  return (
    <button 
      onClick={toggle}
      title="Modo Manos Sucias (Comandos de Voz)"
      style={{
        position: 'fixed',
        bottom: 164,
        right: 20,
        width: 64,
        height: 64,
        borderRadius: 32,
        background: listening ? '#3b82f6' : th.surface,
        border: `2px solid ${listening ? '#3b82f6' : th.border}`,
        color: listening ? '#fff' : th.textSec,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
        boxShadow: listening ? '0 0 20px rgba(59, 130, 246, 0.6)' : th.shadowLg,
        cursor: 'pointer',
        zIndex: 999,
        transition: 'all 0.3s ease',
        animation: listening ? 'pulseVoice 2s infinite' : 'none'
      }}
    >
      <style>{`
        @keyframes pulseVoice {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>
      {listening ? '🎙️' : '🎤'}
    </button>
  )
}
