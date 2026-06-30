import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { installGlobalErrorReporting } from './lib/report.js'

// Captura errores no manejados desde el arranque.
installGlobalErrorReporting()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// ─── Registro del Service Worker (PWA, solo en producción) ────
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('No se pudo registrar el Service Worker:', err)
    })
  })
}
