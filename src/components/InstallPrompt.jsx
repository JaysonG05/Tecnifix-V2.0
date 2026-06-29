import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'

// Banner discreto para instalar la PWA.
// - Android / Chrome desktop: usa el evento beforeinstallprompt (instalación nativa).
// - iOS Safari: no hay evento; mostramos la instrucción manual (Compartir → Agregar a inicio).
// Es descartable y recuerda la elección en localStorage para no molestar.
export function InstallPrompt() {
  const { th } = useApp()
  const [deferred, setDeferred] = useState(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('cp_install_dismissed') === 'true') return

    // Ya instalada (modo standalone) → no mostrar.
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (standalone) return

    // iOS: detectar Safari en iPhone/iPad (no soporta beforeinstallprompt).
    const ua = window.navigator.userAgent || ''
    const ios = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
    if (ios) { setIsIOS(true); setShow(true); return }

    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', () => setShow(false))
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const dismiss = () => {
    setShow(false)
    localStorage.setItem('cp_install_dismissed', 'true')
  }

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    try { await deferred.userChoice } catch { /* ignore */ }
    setDeferred(null)
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 9999,
      maxWidth: 460, margin: '0 auto',
      background: th.surface, border: `1px solid ${th.border}`, borderRadius: 16,
      boxShadow: th.shadowLg, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      animation: 'slideUp 0.25s ease',
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: th.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🔧</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: 14, color: th.text }}>Instala Tecnifix</p>
        <p style={{ margin: 0, fontSize: 12, color: th.textSec, lineHeight: 1.4 }}>
          {isIOS
            ? 'Toca Compartir (⬆️) y luego “Agregar a inicio”.'
            : 'Acceso directo en tu teléfono, abre más rápido.'}
        </p>
      </div>
      {!isIOS && (
        <button onClick={install} style={{
          flexShrink: 0, padding: '9px 16px', borderRadius: 12, border: 'none',
          background: th.primary, color: '#fff', fontWeight: 700, fontSize: 13,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Instalar
        </button>
      )}
      <button onClick={dismiss} aria-label="Cerrar" style={{
        flexShrink: 0, width: 28, height: 28, borderRadius: 14, border: 'none',
        background: th.surface2, color: th.textSec, fontSize: 16, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
      }}>
        ×
      </button>
    </div>
  )
}
