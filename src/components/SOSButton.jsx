import { useState, useEffect } from 'react'
import { sosApi } from '../lib/supabase.js'
import { useApp } from '../context/AppContext.jsx'

export function SOSButton() {
  const { user, th } = useApp()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSOS = async () => {
    if (!user) {
      alert('Debes iniciar sesión para pedir una emergencia.')
      return
    }
    
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada por el navegador.')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await sosApi.trigger(
            user.id,
            user.full_name,
            pos.coords.latitude,
            pos.coords.longitude,
            'Emergencia General. Requiere asistencia inmediata.'
          )
          setSuccess(true)
          setTimeout(() => setSuccess(false), 5000)
        } catch (error) {
          alert('Error al enviar SOS: ' + error.message)
        } finally {
          setLoading(false)
        }
      },
      (err) => {
        alert('No pudimos obtener tu ubicación: ' + err.message)
        setLoading(false)
      }
    )
  }

  useEffect(() => {
    const triggerSOS = () => {
      if (!loading && !success) handleSOS();
    };
    window.addEventListener('tecnifix:sos', triggerSOS);
    return () => window.removeEventListener('tecnifix:sos', triggerSOS);
  }, [loading, success]);

  // Si es técnico, no mostramos el botón (a menos que queramos que técnicos pidan SOS, pero la idea es para clientes)
  if (user?.role === 'technician') return null;

  return (
    <div style={{ position: 'fixed', bottom: 90, right: 20, zIndex: 1000 }}>
      <style>{`
        @keyframes pulseSOS {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
      
      {success && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 10,
          background: th.surface, color: th.text, padding: '12px 16px',
          borderRadius: 12, boxShadow: th.shadowLg, whiteSpace: 'nowrap',
          fontWeight: 'bold', border: `1px solid ${th.border}`,
          animation: 'slideUp 0.3s ease-out'
        }}>
          ¡Alerta enviada a los técnicos! 🚨
        </div>
      )}

      <button
        onClick={handleSOS}
        disabled={loading || success}
        style={{
          width: 64, height: 64, borderRadius: 32,
          background: loading ? '#fca5a5' : '#ef4444',
          color: '#fff', border: 'none',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, cursor: 'pointer',
          animation: (loading || success) ? 'none' : 'pulseSOS 2s infinite'
        }}
      >
        {loading ? <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span> : '🆘'}
      </button>
    </div>
  )
}
