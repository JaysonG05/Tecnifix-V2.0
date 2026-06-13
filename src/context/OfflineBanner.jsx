// ============================================================
//  OfflineBanner.jsx
//  Muestra un aviso fijo cuando el usuario pierde la conexión
//  a internet, y otro breve cuando se recupera.
// ============================================================
import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'

export function OfflineBanner() {
  const { th, lang } = useApp()
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowReconnected(true)
      setTimeout(() => setShowReconnected(false), 2500)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && !showReconnected) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430, zIndex: 400,
      padding: '10px 16px',
      background: isOnline ? '#16a34a' : '#dc2626',
      color: '#fff', textAlign: 'center',
      fontSize: 13, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      animation: 'slideDown 0.3s ease',
    }}>
      {isOnline
        ? <>✅ {lang === 'en' ? 'Back online' : 'Conexión restablecida'}</>
        : <>📡 {lang === 'en'
              ? 'No internet connection — some features may not work'
              : 'Sin conexión a internet — algunas funciones pueden no funcionar'}
          </>
      }
    </div>
  )
}
