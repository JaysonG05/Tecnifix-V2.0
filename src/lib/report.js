// ─────────────────────────────────────────────────────────────
// Tecnifix — Reporte de errores ligero (observabilidad)
//
// Sin dependencias ni servicio de pago. Si defines VITE_ERROR_WEBHOOK en
// .env (un endpoint que reciba JSON: tu propia Edge Function, un webhook de
// Slack/Discord, o un Sentry "tunnel"), los errores se envían ahí. Si no está
// configurado, solo quedan en la consola. A PRUEBA DE FALLOS: el reporter
// nunca lanza ni rompe la app.
// ─────────────────────────────────────────────────────────────
const ENDPOINT = import.meta.env.VITE_ERROR_WEBHOOK || ''
let installed = false

/** Envía un error con contexto opcional. No bloquea la UI. */
export function reportError(error, context = {}) {
  try {
    const payload = {
      app: 'tecnifix',
      message: error?.message ?? String(error),
      stack: error?.stack ?? null,
      context,
      url: typeof location !== 'undefined' ? location.href : null,
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      ts: new Date().toISOString(),
    }
    // Siempre deja rastro local (útil con F12 aunque no haya webhook).
    console.error('[Tecnifix]', payload.message, context)
    if (!ENDPOINT) return

    const body = JSON.stringify(payload)
    // sendBeacon no bloquea la navegación; fetch keepalive como respaldo.
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, body)
    } else if (typeof fetch !== 'undefined') {
      fetch(ENDPOINT, {
        method: 'POST', body, keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {})
    }
  } catch { /* el reporter jamás debe romper la app */ }
}

/** Captura errores no manejados y promesas rechazadas a nivel global. */
export function installGlobalErrorReporting() {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener('error', (e) => reportError(e.error || e.message, { type: 'window.onerror' }))
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, { type: 'unhandledrejection' }))
}
