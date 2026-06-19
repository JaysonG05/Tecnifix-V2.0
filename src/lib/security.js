// ============================================================
//  security.js — CORS + Security Headers para TECNIFIX
//  Se aplica en: index.html (meta tags), netlify.toml y
//  en el cliente para validar respuestas del servidor.
// ============================================================

// ── ORÍGENES PERMITIDOS POR ENTORNO ──────────────────────────
const ALLOWED_ORIGINS = {
  production: [
    'https://tecnifix.pa',
    'https://www.tecnifix.pa',
    'https://tecnifix.netlify.app',
  ],
  preview: [
    /^https:\/\/deploy-preview-\d+--tecnifix\.netlify\.app$/,
  ],
  development: [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
  ],
}

// ── VALIDAR ORIGEN ────────────────────────────────────────────
export function isOriginAllowed(origin) {
  if (!origin) return false

  const isDev = import.meta.env.DEV
  
  // En desarrollo, permitir localhost
  if (isDev) {
    return ALLOWED_ORIGINS.development.includes(origin)
  }

  // Producción: verificar lista fija y patrones de preview
  const inProduction = ALLOWED_ORIGINS.production.includes(origin)
  const inPreview = ALLOWED_ORIGINS.preview.some(pattern =>
    pattern instanceof RegExp ? pattern.test(origin) : pattern === origin
  )
  
  return inProduction || inPreview
}

// ── VALIDAR RESPUESTA (protección contra ataques de origen cruzado) ──
export function validateResponseOrigin(response) {
  // Verificar que la respuesta venga de Supabase o de nuestro dominio
  const url = response.url
  const allowedHosts = [
    'supabase.co',
    'supabase.com',
    'tecnifix.pa',
    'netlify.app',
  ]
  
  try {
    const { hostname } = new URL(url)
    return allowedHosts.some(host => hostname.endsWith(host))
  } catch {
    return false
  }
}

// ── CONTENT SECURITY POLICY ──────────────────────────────────
// Genera el valor del header CSP
export function buildCSP() {
  const isDev = import.meta.env.DEV

  const directives = {
    'default-src':     ["'self'"],
    'script-src':      [
      "'self'",
      // Librerías cargadas dinámicamente (Leaflet, jsPDF)
      'https://unpkg.com',
      'https://cdnjs.cloudflare.com',
      isDev ? "'unsafe-eval'" : '',  // Vite HMR en desarrollo
    ].filter(Boolean),
    'style-src':       [
      "'self'",
      "'unsafe-inline'",             // Necesario para estilos inline de React
      'https://fonts.googleapis.com',
      'https://unpkg.com',
    ],
    'font-src':        [
      "'self'",
      'https://fonts.gstatic.com',
    ],
    'img-src':         [
      "'self'",
      'data:',
      'blob:',
      'https://*.supabase.co',
      'https://*.supabase.com',
      'https://*.openstreetmap.org', // Tiles del mapa
      'https://unpkg.com',
    ],
    'connect-src':     [
      "'self'",
      'https://*.supabase.co',
      'https://*.supabase.com',
      'wss://*.supabase.co',         // WebSocket para Realtime
      'https://fonts.googleapis.com',
      isDev ? 'ws://localhost:*' : '',
      isDev ? 'http://localhost:*' : '',
    ].filter(Boolean),
    'frame-src':       ["'none'"],
    'object-src':      ["'none'"],
    'base-uri':        ["'self'"],
    'form-action':     ["'self'"],
    'manifest-src':    ["'self'"],
    'worker-src':      ["'self'", 'blob:'],
    'media-src':       ["'self'", 'blob:'],
    'upgrade-insecure-requests': [],
  }

  return Object.entries(directives)
    .map(([key, values]) =>
      values.length ? `${key} ${values.join(' ')}` : key
    )
    .join('; ')
}

// ── SECURITY HEADERS COMPLETOS ────────────────────────────────
// Para usar en netlify.toml (se exporta como objeto)
export const SECURITY_HEADERS = {
  // Previene que el sitio sea embebido en iframes (clickjacking)
  'X-Frame-Options': 'DENY',

  // Previene que el navegador "adivine" el tipo de contenido
  'X-Content-Type-Options': 'nosniff',

  // Protección XSS del navegador (legacy pero útil)
  'X-XSS-Protection': '1; mode=block',

  // Controla cuánta información de referrer se comparte
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Restringe APIs del navegador disponibles para la app
  'Permissions-Policy': [
    'camera=(self)',          // Solo para fotos de perfil/trabajos
    'microphone=()',          // No se usa
    'geolocation=(self)',     // Mapa de técnicos cercanos
    'payment=()',             // No se procesa pago directo
    'usb=()',
    'fullscreen=(self)',
  ].join(', '),

  // HSTS: forzar HTTPS por 1 año (activar tras confirmar que HTTPS funciona)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // CSP dinámico según entorno
  'Content-Security-Policy': buildCSP(),

  // Previene que información de la app se filtre via Timing-Allow-Origin
  'Timing-Allow-Origin': 'none',

  // Controla el compartir información entre origenes (CORP)
  'Cross-Origin-Resource-Policy': 'same-origin',

  // Opener policy (previene ataques via window.opener)
  'Cross-Origin-Opener-Policy': 'same-origin',

  // Embedder policy
  'Cross-Origin-Embedder-Policy': 'unsafe-none', // 'require-corp' rompe Supabase Storage
}

// ── GENERAR netlify.toml ACTUALIZADO ─────────────────────────
// Devuelve el bloque de headers listo para copiar a netlify.toml
export function generateNetlifyHeaders() {
  const lines = [
    '# ── Security Headers ──────────────────────────────',
    '[[headers]]',
    '  for = "/*"',
    '  [headers.values]',
    ...Object.entries(SECURITY_HEADERS).map(
      ([k, v]) => `    ${k} = "${v}"`
    ),
    '',
    '# ── MIME correcto para Service Worker ─────────────',
    '[[headers]]',
    '  for = "/sw.js"',
    '  [headers.values]',
    '    Content-Type = "application/javascript; charset=utf-8"',
    '    Cache-Control = "no-cache"',
    '    Service-Worker-Allowed = "/"',
    '',
    '# ── Assets con hash (cache permanente) ────────────',
    '[[headers]]',
    '  for = "/assets/*"',
    '  [headers.values]',
    '    Cache-Control = "public, max-age=31536000, immutable"',
    '',
    '# ── CORS para manifest.json ────────────────────────',
    '[[headers]]',
    '  for = "/manifest.json"',
    '  [headers.values]',
    '    Access-Control-Allow-Origin = "*"',
    '    Content-Type = "application/manifest+json"',
  ]
  return lines.join('\n')
}

// ── MIDDLEWARE DE SEGURIDAD PARA EL CLIENTE ───────────────────
// Wrapper de fetch que añade headers de seguridad y valida respuestas
export function createSecureFetch() {
  return async function secureFetch(url, options = {}) {
    // Añadir headers de seguridad a todas las peticiones
    const secureOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest', // Previene CSRF simple
        ...options.headers,
      },
      // Incluir cookies solo para el mismo origen
      credentials: options.credentials ?? 'same-origin',
    }

    // Validar que la URL es de un origen permitido
    try {
      const { hostname } = new URL(url)
      const TRUSTED_HOSTS = ['supabase.co', 'supabase.com', 'anthropic.com']
      const isTrusted = TRUSTED_HOSTS.some(h => hostname.endsWith(h))
      if (!isTrusted && !import.meta.env.DEV) {
        console.warn(`[Security] Petición a host no confiable: ${hostname}`)
      }
    } catch {
      throw new Error('URL inválida')
    }

    const response = await fetch(url, secureOptions)
    return response
  }
}

// Instancia global para usar en la app
export const secureFetch = createSecureFetch()

// ── RATE LIMITING EN CLIENTE (protección básica) ─────────────
const requestCounts = new Map()

export function checkRateLimit(action, maxRequests = 10, windowMs = 60000) {
  const key = action
  const now = Date.now()

  if (!requestCounts.has(key)) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  const entry = requestCounts.get(key)

  // Resetear ventana si expiró
  if (now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  // Incrementar contador
  entry.count++

  if (entry.count > maxRequests) {
    const waitSec = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, remaining: 0, retryAfter: waitSec }
  }

  return { allowed: true, remaining: maxRequests - entry.count }
}

// Límites predefinidos por acción
export const RATE_LIMITS = {
  login:          { max: 5,  window: 15 * 60 * 1000 }, // 5 intentos / 15 min
  register:       { max: 3,  window: 60 * 60 * 1000 }, // 3 registros / hora
  resetPassword:  { max: 3,  window: 60 * 60 * 1000 }, // 3 resets / hora
  uploadFile:     { max: 20, window: 60 * 60 * 1000 }, // 20 uploads / hora
  sendMessage:    { max: 30, window: 60 * 1000 },       // 30 mensajes / min
  openDispute:    { max: 3,  window: 24 * 60 * 60 * 1000 }, // 3 / día
  createRequest:  { max: 10, window: 60 * 60 * 1000 }, // 10 solicitudes / hora
}
