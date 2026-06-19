// ============================================================
//  sanitize.js — Sanitización de inputs y prevención de inyecciones
//  Protege contra: SQL Injection, XSS, NoSQL Injection, Path Traversal
// ============================================================

// ── Caracteres y patrones peligrosos ─────────────────────────
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

// ── Sanitizador de strings ────────────────────────────────────
export function sanitizeString(value, opts = {}) {
  if (value === null || value === undefined) return ''
  
  let str = String(value)
  
  // Trim por defecto
  if (opts.trim !== false) str = str.trim()
  
  // Limitar longitud
  const maxLen = opts.maxLength ?? 2000
  if (str.length > maxLen) str = str.slice(0, maxLen)
  
  // Escapar HTML para prevenir XSS
  str = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
  
  return str
}

// ── Sanitizador de texto libre (bio, descripción, etc.) ───────
// Más permisivo pero elimina patrones peligrosos
export function sanitizeText(value, opts = {}) {
  if (!value) return ''
  
  let str = String(value).trim()
  const maxLen = opts.maxLength ?? 5000
  if (str.length > maxLen) str = str.slice(0, maxLen)
  
  // Eliminar scripts y eventos inline (XSS)
  for (const pattern of XSS_PATTERNS) {
    str = str.replace(pattern, '')
  }
  
  // Eliminar null bytes
  str = str.replace(/\0/g, '')
  
  // Eliminar caracteres de control excepto saltos de línea y tabs
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  
  return str
}

// ── Sanitizador de email ──────────────────────────────────────
export function sanitizeEmail(value) {
  if (!value) return ''
  const str = String(value).trim().toLowerCase()
  // Solo permitir caracteres válidos en un email
  return str.replace(/[^a-z0-9@._+\-]/g, '').slice(0, 254)
}

// ── Sanitizador de teléfono ───────────────────────────────────
export function sanitizePhone(value) {
  if (!value) return ''
  // Solo dígitos, +, -, espacios y paréntesis
  return String(value).replace(/[^0-9+\-\s()]/g, '').trim().slice(0, 20)
}

// ── Sanitizador de precio / número ───────────────────────────
export function sanitizeNumber(value, opts = {}) {
  const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''))
  if (isNaN(num)) return opts.default ?? 0
  
  const min = opts.min ?? 0
  const max = opts.max ?? 999999
  
  return Math.min(Math.max(num, min), max)
}

// ── Sanitizador de UUID ───────────────────────────────────────
export function sanitizeUUID(value) {
  if (!value) return null
  const uuid = String(value).trim()
  // Validar formato UUID v4
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid) ? uuid : null
}

// ── Sanitizador de URL ────────────────────────────────────────
export function sanitizeURL(value) {
  if (!value) return ''
  const str = String(value).trim().slice(0, 2048)
  
  // Solo permitir http y https
  if (!/^https?:\/\//i.test(str)) return ''
  
  // Eliminar caracteres peligrosos
  try {
    const url = new URL(str)
    // Bloquear javascript: y data: schemes
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    return url.toString()
  } catch {
    return ''
  }
}

// ── Sanitizador de nombre de archivo ─────────────────────────
export function sanitizeFilename(value) {
  if (!value) return ''
  return String(value)
    .replace(/[^a-zA-Z0-9._\-]/g, '_') // Solo alfanuméricos y ._-
    .replace(/\.{2,}/g, '.')             // Previene path traversal (..)
    .slice(0, 255)
}

// ── Sanitizador de búsqueda ───────────────────────────────────
// Para queries de búsqueda — evita inyección sin ser demasiado restrictivo
export function sanitizeSearch(value) {
  if (!value) return ''
  let str = String(value).trim().slice(0, 200)
  
  // Eliminar patrones SQL peligrosos
  for (const pattern of SQL_PATTERNS) {
    str = str.replace(pattern, '')
  }
  
  // Eliminar caracteres especiales SQL pero preservar letras, números y espacios
  str = str.replace(/[;'"\\]/g, '')
  
  return str
}

// ── Sanitizador de rol de usuario ────────────────────────────
const VALID_ROLES = ['user', 'technician', 'admin']
export function sanitizeRole(value) {
  const role = String(value || '').toLowerCase().trim()
  return VALID_ROLES.includes(role) ? role : 'user'
}

// ── Detección de patrones maliciosos (solo para logging) ──────
export function detectMaliciousInput(value) {
  const str = String(value)
  
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

// ── Sanitizador de objeto de formulario completo ─────────────
// Recibe un objeto y aplica sanitización según el tipo de cada campo
export function sanitizeFormData(data, schema) {
  if (!data || typeof data !== 'object') return {}
  
  const result = {}
  
  for (const [key, rules] of Object.entries(schema)) {
    const rawValue = data[key]
    
    switch (rules.type) {
      case 'email':
        result[key] = sanitizeEmail(rawValue)
        break
      case 'phone':
        result[key] = sanitizePhone(rawValue)
        break
      case 'number':
        result[key] = sanitizeNumber(rawValue, rules)
        break
      case 'uuid':
        result[key] = sanitizeUUID(rawValue)
        break
      case 'url':
        result[key] = sanitizeURL(rawValue)
        break
      case 'text':
        result[key] = sanitizeText(rawValue, rules)
        break
      case 'role':
        result[key] = sanitizeRole(rawValue)
        break
      case 'boolean':
        result[key] = Boolean(rawValue)
        break
      default:
        result[key] = sanitizeString(rawValue, rules)
    }
    
    // Aplicar valor por defecto si el resultado está vacío
    if ((result[key] === '' || result[key] === null) && rules.default !== undefined) {
      result[key] = rules.default
    }
  }
  
  return result
}

// ── Schemas predefinidos para las entidades de TECNIFIX ───────
export const SCHEMAS = {
  profile: {
    full_name:      { type: 'string', maxLength: 100 },
    phone:          { type: 'phone' },
    whatsapp_phone: { type: 'phone' },
    email:          { type: 'email' },
  },

  techProfile: {
    professional_title:    { type: 'string', maxLength: 150 },
    professional_title_en: { type: 'string', maxLength: 150 },
    bio:                   { type: 'text',   maxLength: 2000 },
    bio_en:                { type: 'text',   maxLength: 2000 },
    slogan:                { type: 'string', maxLength: 200 },
    years_experience:      { type: 'number', min: 0, max: 60 },
    company_name:          { type: 'string', maxLength: 150 },
    national_id:           { type: 'string', maxLength: 20 },
    min_price:             { type: 'number', min: 0, max: 99999 },
    max_price:             { type: 'number', min: 0, max: 99999 },
    public_phone:          { type: 'phone' },
    public_whatsapp:       { type: 'phone' },
    public_email:          { type: 'email' },
    website:               { type: 'url' },
    instagram:             { type: 'string', maxLength: 50 },
    facebook:              { type: 'string', maxLength: 100 },
    city:                  { type: 'string', maxLength: 100 },
    province:              { type: 'string', maxLength: 100 },
    address_text:          { type: 'string', maxLength: 300 },
    service_radius_km:     { type: 'number', min: 1,  max: 500 },
    response_time_minutes: { type: 'number', min: 1,  max: 10080 },
    bank_account:          { type: 'string', maxLength: 100 },
  },

  serviceRequest: {
    title:          { type: 'string', maxLength: 200 },
    description:    { type: 'text',   maxLength: 2000 },
    address:        { type: 'string', maxLength: 300 },
    agreed_price:   { type: 'number', min: 0, max: 99999 },
    technician_id:  { type: 'uuid' },
    client_id:      { type: 'uuid' },
  },

  review: {
    comment:        { type: 'text',   maxLength: 1000 },
    rating:         { type: 'number', min: 1, max: 5 },
    technician_id:  { type: 'uuid' },
    reviewer_id:    { type: 'uuid' },
  },

  certificate: {
    name:           { type: 'string', maxLength: 200 },
    issuer:         { type: 'string', maxLength: 200 },
    description:    { type: 'text',   maxLength: 1000 },
  },

  catalogItem: {
    name:           { type: 'string', maxLength: 200 },
    name_en:        { type: 'string', maxLength: 200 },
    description:    { type: 'text',   maxLength: 500 },
    price:          { type: 'number', min: 0, max: 99999 },
  },

  dispute: {
    reason:         { type: 'string', maxLength: 200 },
    description:    { type: 'text',   maxLength: 2000 },
    request_id:     { type: 'uuid' },
  },

  message: {
    body:           { type: 'text',   maxLength: 2000 },
    request_id:     { type: 'uuid' },
    sender_id:      { type: 'uuid' },
  },
}
