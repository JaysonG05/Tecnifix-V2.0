// ============================================================
//  sanitize.js — Sanitización de inputs y prevención de inyecciones
//  Protege contra: SQL Injection, XSS, NoSQL Injection, Path Traversal
//
//  NOTA IMPORTANTE: Supabase usa PostgREST con consultas parametrizadas,
//  por lo que la inyección SQL clásica (concatenar strings en una query)
//  no es posible desde supabase-js. Esta capa es defensa adicional:
//  - Evita que texto malicioso quede ALMACENADO en la base de datos
//    (XSS persistente que luego se renderiza en otro navegador).
//  - Acota longitudes y tipos antes de que el dato llegue a Postgres.
//  - Detecta patrones de inyección para loguear intentos de abuso.
// ============================================================

// ── Patrones peligrosos ──────────────────────────────────────
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|TRUNCATE|REPLACE)\b)/gi,
  /(--|;|\/\*|\*\/|xp_|sp_)/g,
  /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi,
  /'\s*(OR|AND)\s*'/gi,
]

const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<[^>]*on\w+\s*=\s*["'][^"']*["'][^>]*>/gi,
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /<iframe[\s\S]*?>/gi,
  /<object[\s\S]*?>/gi,
  /<embed[\s\S]*?>/gi,
]

// ── String estricto (nombres, títulos cortos) ─────────────────
export function sanitizeString(value, opts = {}) {
  if (value === null || value === undefined) return ''
  let str = String(value)
  if (opts.trim !== false) str = str.trim()
  const maxLen = opts.maxLength ?? 200
  if (str.length > maxLen) str = str.slice(0, maxLen)
  for (const pattern of XSS_PATTERNS) str = str.replace(pattern, '')
  str = str.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  return str
}

// ── Texto libre (bio, descripción, mensajes de chat) ───────────
export function sanitizeText(value, opts = {}) {
  if (!value) return ''
  let str = String(value).trim()
  const maxLen = opts.maxLength ?? 5000
  if (str.length > maxLen) str = str.slice(0, maxLen)
  for (const pattern of XSS_PATTERNS) str = str.replace(pattern, '')
  str = str.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  return str
}

// ── Email ──────────────────────────────────────────────────────
export function sanitizeEmail(value) {
  if (!value) return ''
  const str = String(value).trim().toLowerCase()
  return str.replace(/[^a-z0-9@._+\-]/g, '').slice(0, 254)
}

// ── Teléfono ───────────────────────────────────────────────────
export function sanitizePhone(value) {
  if (!value) return ''
  return String(value).replace(/[^0-9+\-\s()]/g, '').trim().slice(0, 20)
}

// ── Número ─────────────────────────────────────────────────────
export function sanitizeNumber(value, opts = {}) {
  const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''))
  if (isNaN(num)) return opts.default ?? null
  const min = opts.min ?? -999999
  const max = opts.max ?? 999999
  return Math.min(Math.max(num, min), max)
}

// ── UUID ───────────────────────────────────────────────────────
export function sanitizeUUID(value) {
  if (!value) return null
  const uuid = String(value).trim()
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid) ? uuid : null
}

// ── URL (solo http/https) ────────────────────────────────────
export function sanitizeURL(value) {
  if (!value) return ''
  const str = String(value).trim().slice(0, 2048)
  if (!/^https?:\/\//i.test(str)) return ''
  try {
    const url = new URL(str)
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    return url.toString()
  } catch { return '' }
}

// ── Nombre de archivo (previene path traversal) ───────────────
export function sanitizeFilename(value) {
  if (!value) return ''
  return String(value)
    .replace(/[^a-zA-Z0-9._\-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255)
}

// ── Búsqueda (texto para filtros ilike) ────────────────────────
export function sanitizeSearch(value) {
  if (!value) return ''
  let str = String(value).trim().slice(0, 200)
  for (const pattern of SQL_PATTERNS) str = str.replace(pattern, '')
  str = str.replace(/[;'"\\%,]/g, '')
  return str
}

// ── Rol de usuario (whitelist) ─────────────────────────────────
const VALID_ROLES = ['user', 'technician', 'admin']
export function sanitizeRole(value) {
  const role = String(value || '').toLowerCase().trim()
  return VALID_ROLES.includes(role) ? role : 'user'
}

// ── Código numérico corto (ej. código de confirmación efectivo) ─
export function sanitizeDigits(value, len) {
  const digits = String(value || '').replace(/\D/g, '')
  return len ? digits.slice(0, len) : digits
}

// ── Detección de patrones maliciosos (para logging/auditoría) ──
export function detectMaliciousInput(value) {
  const str = String(value ?? '')
  for (const pattern of SQL_PATTERNS) {
    if (pattern.test(str)) return { detected: true, type: 'sql_injection' }
  }
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(str)) return { detected: true, type: 'xss' }
  }
  if (/\.\.[/\\]/g.test(str)) return { detected: true, type: 'path_traversal' }
  if (/\$where|\$gt|\$lt|\$ne|\$in|\$regex/i.test(str)) {
    return { detected: true, type: 'nosql_injection' }
  }
  return { detected: false }
}

// ── Guard: lanza error si detecta intento de inyección ─────────
// Se usa antes de insertar texto sensible (mensajes, reseñas, disputas)
export function assertSafe(value, fieldName = 'input') {
  const check = detectMaliciousInput(value)
  if (check.detected) {
    console.warn(`[Security] Posible ${check.type} detectado en "${fieldName}"`)
    throw new Error('Entrada inválida. Revisa el texto e intenta de nuevo.')
  }
}

// ── Sanitizar objeto completo según schema ──────────────────────
export function sanitizeFormData(data, schema) {
  if (!data || typeof data !== 'object') return {}
  const result = {}
  for (const [key, rules] of Object.entries(schema)) {
    const raw = data[key]
    switch (rules.type) {
      case 'email': result[key] = sanitizeEmail(raw); break
      case 'phone': result[key] = sanitizePhone(raw); break
      case 'number': result[key] = sanitizeNumber(raw, rules); break
      case 'uuid': result[key] = sanitizeUUID(raw); break
      case 'url': result[key] = sanitizeURL(raw); break
      case 'text': result[key] = sanitizeText(raw, rules); break
      case 'role': result[key] = sanitizeRole(raw); break
      case 'boolean': result[key] = Boolean(raw); break
      default: result[key] = sanitizeString(raw, rules)
    }
    if ((result[key] === '' || result[key] === null) && rules.default !== undefined) {
      result[key] = rules.default
    }
  }
  return result
}

// ── Sanitizar objeto de actualización MIXTO ──────────────────
// A diferencia de sanitizeFormData (que solo procesa claves definidas
// en el schema), este recorre TODAS las claves del objeto recibido:
// - Si la clave está en el schema, aplica la regla específica.
// - Si es un string libre fuera del schema, igual le quita XSS/control
//   chars (catch-all) sin truncado agresivo.
// - Si no es string (boolean, number, null, url ya validada), la deja igual.
// Útil para updates parciales tipo profiles.update(id, { ...mezcla... }).
export function sanitizeUpdatePayload(updates, schema = {}) {
  if (!updates || typeof updates !== 'object') return {}
  const result = {}
  for (const [key, value] of Object.entries(updates)) {
    const rules = schema[key]
    if (rules) {
      const single = sanitizeFormData({ [key]: value }, { [key]: rules })
      result[key] = single[key]
    } else if (typeof value === 'string') {
      result[key] = sanitizeText(value, { maxLength: 5000 })
    } else {
      result[key] = value
    }
  }
  return result
}

// ── Schemas reutilizables por entidad de TECNIFIX ───────────────
export const SCHEMAS = {
  profile: {
    full_name: { type: 'string', maxLength: 100 },
    phone: { type: 'phone' },
    whatsapp_phone: { type: 'phone' },
  },
  techProfile: {
    professional_title: { type: 'string', maxLength: 150 },
    professional_title_en: { type: 'string', maxLength: 150 },
    bio: { type: 'text', maxLength: 2000 },
    bio_en: { type: 'text', maxLength: 2000 },
    slogan: { type: 'string', maxLength: 200 },
    company_name: { type: 'string', maxLength: 150 },
    national_id: { type: 'string', maxLength: 20 },
    public_phone: { type: 'phone' },
    public_whatsapp: { type: 'phone' },
    public_email: { type: 'email' },
    website: { type: 'url' },
    instagram: { type: 'string', maxLength: 50 },
    facebook: { type: 'string', maxLength: 100 },
    city: { type: 'string', maxLength: 100 },
    province: { type: 'string', maxLength: 100 },
    address_text: { type: 'string', maxLength: 300 },
    bank_account: { type: 'string', maxLength: 100 },
  },
  serviceRequest: {
    title: { type: 'string', maxLength: 200 },
    description: { type: 'text', maxLength: 2000 },
    address: { type: 'string', maxLength: 300 },
  },
  review: { comment: { type: 'text', maxLength: 1000 } },
  certificate: {
    name: { type: 'string', maxLength: 200 },
    issuer: { type: 'string', maxLength: 200 },
    description: { type: 'text', maxLength: 1000 },
  },
  catalogItem: {
    name: { type: 'string', maxLength: 200 },
    name_en: { type: 'string', maxLength: 200 },
    description: { type: 'text', maxLength: 500 },
  },
  dispute: {
    reason: { type: 'string', maxLength: 200 },
    description: { type: 'text', maxLength: 2000 },
  },
  message: { body: { type: 'text', maxLength: 2000 } },
}