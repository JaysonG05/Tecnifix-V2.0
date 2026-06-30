// ─────────────────────────────────────────────────────────────
// Tecnifix — Memoria del Hogar
// El usuario registra sus equipos/instalaciones (aire, calentador,
// tablero...) y la IA local calcula cuándo toca mantenimiento, de
// forma proactiva. Persistencia en localStorage (sin backend; privado
// en el dispositivo). Pensado para migrar a una tabla `home_assets`.
// ─────────────────────────────────────────────────────────────
import { getCategoryMeta } from './trust.js'

const KEY = 'tecnifix_home_assets'

// Intervalos de mantenimiento recomendados (meses) + consejo por oficio.
const MAINTENANCE = {
  climatizacion: { months: 4, tip: 'Limpieza de filtros y chequeo de gas para que enfríe bien y gaste menos.' },
  electricidad: { months: 12, tip: 'Revisión del tablero, breakers y conexiones para prevenir cortos.' },
  plomeria: { months: 12, tip: 'Inspección de fugas, presión y sellos para evitar daños por agua.' },
  tecnologia: { months: 12, tip: 'Limpieza interna y revisión de redes/cámaras.' },
  albanileria: { months: 24, tip: 'Inspección de grietas, humedad y acabados.' },
  pintura: { months: 36, tip: 'Repintado o sellado para proteger las superficies.' },
  cerrajeria: { months: 24, tip: 'Lubricación y revisión de cerraduras y puertas.' },
  limpieza: { months: 3, tip: 'Limpieza profunda de mantenimiento.' },
}
const DEFAULT_RULE = { months: 12, tip: 'Revisión general de mantenimiento.' }

// Sugerencias de equipos comunes para el formulario.
export const ASSET_SUGGESTIONS = [
  { name: 'Aire acondicionado', slug: 'climatizacion' },
  { name: 'Calentador de agua', slug: 'plomeria' },
  { name: 'Tablero eléctrico', slug: 'electricidad' },
  { name: 'Bomba de agua', slug: 'plomeria' },
  { name: 'Cámaras de seguridad', slug: 'tecnologia' },
  { name: 'Cerradura principal', slug: 'cerrajeria' },
]

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* noop */ }
}

export function getAssets() {
  return read().sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

export function addAsset({ name, slug, installedAt = null, lastServiceAt = null }) {
  const list = read()
  const asset = {
    id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: String(name || '').trim(),
    slug: slug || null,
    installedAt: installedAt || null,
    lastServiceAt: lastServiceAt || installedAt || null,
    createdAt: new Date().toISOString(),
  }
  write([...list, asset])
  return asset
}

export function removeAsset(id) {
  write(read().filter((a) => a.id !== id))
}

export function markServiced(id, dateISO = new Date().toISOString()) {
  write(read().map((a) => a.id === id ? { ...a, lastServiceAt: dateISO } : a))
}

function monthsSince(dateISO) {
  if (!dateISO) return null
  const d = new Date(dateISO)
  if (isNaN(d)) return null
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
}

/**
 * Calcula el estado de mantenimiento de cada equipo.
 * Devuelve items ordenados por prioridad (lo más vencido primero).
 */
export function maintenanceTips(assets = getAssets()) {
  const items = assets.map((a) => {
    const rule = MAINTENANCE[a.slug] || DEFAULT_RULE
    const meta = getCategoryMeta(a.slug)
    const since = monthsSince(a.lastServiceAt)
    const ratio = since == null ? null : since / rule.months

    let status, urgency
    if (ratio == null) { status = 'sin-fecha'; urgency = 0.4 }
    else if (ratio >= 1.5) { status = 'vencido'; urgency = 1 }
    else if (ratio >= 1) { status = 'toca-ahora'; urgency = 0.8 }
    else if (ratio >= 0.8) { status = 'pronto'; urgency = 0.6 }
    else { status = 'al-dia'; urgency = 0.1 }

    const monthsLeft = ratio == null ? null : Math.round(rule.months - since)

    return {
      asset: a,
      slug: a.slug,
      label: meta?.label || 'Servicio',
      icon: meta?.icon || '🔧',
      status,
      urgency,
      tip: rule.tip,
      intervalMonths: rule.months,
      monthsSince: since == null ? null : Math.round(since),
      monthsLeft,
    }
  })
  return items.sort((a, b) => b.urgency - a.urgency)
}

// ─────────────────────────────────────────────────────────────
// RECORDATORIOS — Notification API del navegador (sin backend).
// Avisa de equipos con mantenimiento vencido/al límite, máx 1 vez/día.
// ─────────────────────────────────────────────────────────────
const PREF_KEY = 'tecnifix_reminders_on'
const LAST_KEY = 'tecnifix_last_reminder'

export function remindersSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function remindersEnabled() {
  try { return localStorage.getItem(PREF_KEY) === '1' && Notification.permission === 'granted' } catch { return false }
}

export async function enableReminders() {
  if (!remindersSupported()) return false
  let perm = Notification.permission
  if (perm === 'default') perm = await Notification.requestPermission()
  const ok = perm === 'granted'
  try { localStorage.setItem(PREF_KEY, ok ? '1' : '0') } catch { /* noop */ }
  if (ok) checkAndNotify(true)
  return ok
}

export function disableReminders() {
  try { localStorage.setItem(PREF_KEY, '0') } catch { /* noop */ }
}

/**
 * Revisa equipos vencidos y dispara una notificación.
 * @param {boolean} force ignora el límite de 1/día (uso al activar).
 */
export function checkAndNotify(force = false) {
  if (!remindersEnabled() && !force) return
  if (!remindersSupported() || Notification.permission !== 'granted') return

  if (!force) {
    try {
      const last = localStorage.getItem(LAST_KEY)
      if (last && (Date.now() - Number(last)) < 1000 * 60 * 60 * 20) return // ~1/día
    } catch { /* noop */ }
  }

  const due = maintenanceTips().filter((t) => t.status === 'vencido' || t.status === 'toca-ahora')
  if (!due.length) return

  const first = due[0]
  const body = due.length === 1
    ? `${first.asset.name}: ${first.tip}`
    : `${first.asset.name} y ${due.length - 1} equipo(s) más necesitan mantenimiento.`

  try {
    new Notification('🔧 Tecnifix · Mantenimiento pendiente', { body, tag: 'tecnifix-maintenance' })
    localStorage.setItem(LAST_KEY, String(Date.now()))
  } catch { /* noop */ }
}

export const STATUS_META = {
  'vencido': { label: 'Mantenimiento vencido', color: '#dc2626', bg: '#fef2f2' },
  'toca-ahora': { label: 'Toca ahora', color: '#d97706', bg: '#fffbeb' },
  'pronto': { label: 'Pronto', color: '#2563eb', bg: '#eff6ff' },
  'al-dia': { label: 'Al día', color: '#16a34a', bg: '#f0fdf4' },
  'sin-fecha': { label: 'Sin fecha registrada', color: '#64748b', bg: '#f8fafc' },
}
