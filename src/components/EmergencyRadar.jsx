import { useEffect, useState, useRef } from 'react'
import { sosApi } from '../lib/supabase.js'
import { useApp } from '../context/AppContext.jsx'

export function EmergencyRadar() {
  const { user, th } = useApp()
  const [emergency, setEmergency] = useState(null)
  const [accepting, setAccepting] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    if (user?.role !== 'technician') return

    // Sonido corto de alerta
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg')

    const sub = sosApi.subscribe((payload) => {
      const newReq = payload.new
      if (newReq.status === 'pending') {
        setEmergency(newReq)
        if ('vibrate' in navigator) navigator.vibrate([500, 200, 500, 200, 500])
        audioRef.current?.play().catch(() => {})
      }
    })

    return () => {
      sub.unsubscribe()
    }
  }, [user])

  const handleAccept = async () => {
    if (!emergency) return
    setAccepting(true)
    try {
      await sosApi.accept(emergency.id, user.id)
      alert(`¡Emergencia aceptada! Dirígete a la ubicación de ${emergency.client_name}.`)
      setEmergency(null)
    } catch (err) {
      alert(err.message)
      setEmergency(null)
    } finally {
      setAccepting(false)
    }
  }

  if (!emergency || user?.role !== 'technician') return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(239, 68, 68, 0.95)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 20, backdropFilter: 'blur(4px)'
    }}>
      <style>{`
        @keyframes radarPing {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
      
      <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 40 }}>
        <div style={{
          position: 'absolute', inset: 0, border: '6px solid white', borderRadius: '50%',
          animation: 'radarPing 1.5s infinite ease-out'
        }} />
        <div style={{
          position: 'absolute', inset: 0, border: '6px solid white', borderRadius: '50%',
          animation: 'radarPing 1.5s infinite ease-out', animationDelay: '0.75s'
        }} />
        <div style={{
          position: 'absolute', inset: 0, background: 'white', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48,
          boxShadow: '0 0 30px rgba(255,255,255,0.5)'
        }}>
          🚨
        </div>
      </div>

      <h1 style={{ color: 'white', textAlign: 'center', margin: '0 0 16px', fontSize: 28, textTransform: 'uppercase', letterSpacing: 1 }}>
        ¡Emergencia Detectada!
      </h1>
      
      <div style={{
        background: th.surface, padding: 24, borderRadius: 16, width: '100%', maxWidth: 400,
        boxShadow: th.shadowLg, textAlign: 'center'
      }}>
        <p style={{ margin: '0 0 8px', color: th.textSec, fontSize: 14 }}>Cliente:</p>
        <p style={{ margin: '0 0 24px', color: th.text, fontSize: 22, fontWeight: 'bold' }}>{emergency.client_name}</p>
        
        <p style={{ margin: '0 0 8px', color: th.textSec, fontSize: 14 }}>Detalles:</p>
        <p style={{ margin: '0 0 32px', color: th.text, fontSize: 16 }}>{emergency.description}</p>

        <button
          onClick={handleAccept}
          disabled={accepting}
          style={{
            width: '100%', padding: 18, borderRadius: 12, background: '#ef4444', color: 'white',
            border: 'none', fontSize: 18, fontWeight: 'bold', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
            opacity: accepting ? 0.7 : 1
          }}
        >
          {accepting ? 'Aceptando...' : 'ACEPTAR TRABAJO'}
        </button>
        
        <button
          onClick={() => setEmergency(null)}
          style={{
            width: '100%', padding: 16, marginTop: 16, borderRadius: 12, background: 'transparent',
            color: th.textSec, border: `2px solid ${th.border}`, fontSize: 16, cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Ignorar
        </button>
      </div>
    </div>
  )
}
