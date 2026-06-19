import { useState } from 'react'
import { Icon } from './Icons.jsx'
import { useApp } from '../context/AppContext.jsx'

// ── Avatar ─────────────────────────────────────────────────
export function Avatar({ photo, name, size = 48, online = false }) {
  const { th } = useApp()
  const [err, setErr] = useState(false)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {photo && !err ? (
        <img src={photo} alt={name} onError={() => setErr(true)}
          style={{ width: size, height: size, borderRadius: size / 2, objectFit: 'cover', border: `2px solid ${th.border}` }} />
      ) : (
        <div style={{ width: size, height: size, borderRadius: size / 2, background: th.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.floor(size * 0.38), fontWeight: 700, fontFamily: th.fontDisplay, color: th.primaryText, border: `2px solid ${th.border}` }}>
          {(name || '?').charAt(0).toUpperCase()}
        </div>
      )}
      {online !== undefined && (
        <div style={{ position: 'absolute', bottom: 1, right: 1, width: Math.max(size * 0.22, 8), height: Math.max(size * 0.22, 8), background: online ? th.verified : '#9CA39E', borderRadius: '50%', border: `2px solid ${th.surface}` }} />
      )}
    </div>
  )
}

// ── Stars ──────────────────────────────────────────────────
export function StarRating({ rating, size = 14, interactive = false, onChange }) {
  const { th } = useApp()
  const [hovered, setHovered] = useState(0)
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i}
          onClick={() => interactive && onChange?.(i)}
          onMouseEnter={() => interactive && setHovered(i)}
          onMouseLeave={() => interactive && setHovered(0)}
          style={{ fontSize: size, color: i <= (hovered || Math.round(rating)) ? th.brass : th.border, cursor: interactive ? 'pointer' : 'default', transition: 'color 120ms var(--ease-out)' }}>★</span>
      ))}
    </span>
  )
}

// ── Badge ──────────────────────────────────────────────────
export function Badge({ children, color, textColor }) {
  const { th } = useApp()
  return (
    <span style={{ background: color || th.primaryLight, color: textColor || th.primaryText, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, display: 'inline-block', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

// ── Toggle ─────────────────────────────────────────────────
export function Toggle({ value, onChange }) {
  const { th } = useApp()
  return (
    <button onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: value ? th.primary : th.border, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: 9, background: '#fff', position: 'absolute', top: 3, left: value ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  )
}

// ── Skeleton ───────────────────────────────────────────────
export function SkeletonCard() {
  const { th } = useApp()
  const p = { animation: 'pulse 1.5s infinite', background: th.border, borderRadius: 8 }
  return (
    <div style={{ background: th.surface, borderRadius: 16, padding: 16, border: `1px solid ${th.border}`, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 60, height: 60, borderRadius: 30, ...p }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 16, marginBottom: 8, width: '70%', ...p }} />
          <div style={{ height: 12, width: '50%', ...p }} />
        </div>
      </div>
      <div style={{ height: 12, marginBottom: 8, ...p }} />
      <div style={{ height: 40, borderRadius: 12, ...p }} />
    </div>
  )
}

// ── Input ──────────────────────────────────────────────────
export function Input({ label, value, onChange, placeholder, type = 'text', icon, error, rows }) {
  const { th } = useApp()
  const base = {
    width: '100%', boxSizing: 'border-box', borderRadius: 12,
    border: `1.5px solid ${error ? th.red : th.inputBorder}`,
    fontSize: 14, outline: 'none', background: th.inputBg, color: th.text,
    transition: 'border-color 140ms var(--ease-out), box-shadow 140ms var(--ease-out)',
    fontFamily: 'inherit', boxShadow: '0 0 0 0 transparent',
  }
  const focus = (e) => {
    e.target.style.borderColor = error ? th.red : th.primary
    e.target.style.boxShadow = `0 0 0 3px ${error ? th.red + '22' : th.primaryLight}`
  }
  const blur = (e) => {
    e.target.style.borderColor = error ? th.red : th.inputBorder
    e.target.style.boxShadow = '0 0 0 0 transparent'
  }
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 600, fontFamily: th.fontDisplay, color: th.text, marginBottom: 6 }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 12, top: rows ? 12 : '50%', transform: rows ? 'none' : 'translateY(-50%)', fontSize: 16, zIndex: 1 }}>{icon}</span>}
        {rows ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
            style={{ ...base, padding: icon ? '12px 14px 12px 38px' : '12px 14px', resize: 'vertical' }}
            onFocus={focus} onBlur={blur}
          />
        ) : (
          <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={{ ...base, padding: icon ? '12px 14px 12px 38px' : '12px 14px' }}
            onFocus={focus} onBlur={blur}
          />
        )}
      </div>
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: th.red }}>{error}</p>}
    </div>
  )
}

// ── Button ─────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', disabled, loading: isLoading, style: s = {}, size = 'md' }) {
  const { th } = useApp()

  // Estilos por variante — TECNIFIX design system
  const V = {
    // Botón primario: azul navy sólido + texto blanco
    primary: {
      background: disabled || isLoading
        ? th.textSec
        : `linear-gradient(135deg, ${th.primary} 0%, ${th.primaryDark} 100%)`,
      color: '#fff', border: 'none',
      boxShadow: disabled || isLoading ? 'none' : `0 4px 14px ${th.primary}55`,
    },
    // Botón amarillo: acento TECNIFIX
    yellow: {
      background: disabled || isLoading ? th.textSec : `linear-gradient(135deg, ${th.yellow} 0%, ${th.yellowDark} 100%)`,
      color: th.ink, border: 'none',
      boxShadow: disabled || isLoading ? 'none' : `0 4px 14px ${th.yellow}66`,
    },
    // Outline: borde azul, fondo transparente
    outline: {
      background: 'transparent', color: th.primary,
      border: `2px solid ${th.primary}`,
      boxShadow: 'none',
    },
    // Peligro
    danger: {
      background: 'transparent', color: th.red,
      border: `2px solid ${th.red}`, boxShadow: 'none',
    },
    // Ghost: fondo suave
    ghost: {
      background: th.surface2, color: th.text,
      border: `1px solid ${th.border}`, boxShadow: 'none',
    },
    // WhatsApp
    whatsapp: {
      background: 'linear-gradient(135deg, #25d366 0%, #1DA851 100%)',
      color: '#fff', border: 'none',
      boxShadow: '0 4px 14px #25d36655',
    },
    // Oscuro
    dark: {
      background: th.ink, color: th.paper, border: 'none', boxShadow: 'none',
    },
    // Verde verificado
    success: {
      background: `linear-gradient(135deg, ${th.verified} 0%, #009A60 100%)`,
      color: '#fff', border: 'none',
      boxShadow: `0 4px 14px ${th.verified}55`,
    },
  }

  // Tamaños con pill (border-radius grande)
  const SZ = {
    sm: { padding: '8px 20px', fontSize: 13, borderRadius: 100, letterSpacing: 0.2 },
    md: { padding: '13px 0', fontSize: 15, borderRadius: 100, letterSpacing: 0.2 },
    lg: { padding: '15px 0', fontSize: 16, borderRadius: 100, letterSpacing: 0.3 },
  }

  return (
    <button onClick={onClick} disabled={disabled || isLoading} style={{
      width: '100%', fontWeight: 700, fontFamily: th.fontDisplay,
      cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      transition: 'opacity 160ms var(--ease-out), transform 160ms var(--ease-out), box-shadow 160ms var(--ease-out)',
      opacity: disabled || isLoading ? 0.65 : 1,
      ...(V[variant] || V.primary), ...SZ[size], ...s,
    }}
      onMouseEnter={e => { if (!disabled && !isLoading) { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0) scale(1)' }}
      onMouseDown={e => { if (!disabled && !isLoading) e.currentTarget.style.transform = 'scale(0.97) translateY(1px)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
    >
      {isLoading ? <Spinner size={18} color={V[variant]?.color || '#fff'} /> : children}
    </button>
  )
}

// ── Spinner ────────────────────────────────────────────────
export function Spinner({ size = 24, color }) {
  const { th } = useApp()
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, border: `3px solid ${color ? color + '33' : th.primaryLight}`, borderTopColor: color || th.primary, animation: 'spin 0.6s linear infinite', flexShrink: 0 }} />
  )
}

// ── Toast ──────────────────────────────────────────────────
export function Toast({ message, type = 'success', onClose }) {
  const { th } = useApp()
  const colors = { success: th.verified, error: th.red, info: th.blue }
  return (
    <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: colors[type] || th.verified, color: '#fff', padding: '12px 20px', borderRadius: 14, fontWeight: 600, fontFamily: th.fontDisplay, fontSize: 14, zIndex: 9999, boxShadow: th.shadow, maxWidth: 320, textAlign: 'center', cursor: 'pointer', animation: 'slideDown 220ms var(--ease-out)' }}
      onClick={onClose}>
      {type === 'success' ? '✓ ' : type === 'error' ? '✗ ' : 'ℹ '}{message}
    </div>
  )
}

// ── Modal ──────────────────────────────────────────────────
export function Modal({ title, children, onClose }) {
  const { th } = useApp()
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: th.surface, borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', width: '100%', maxWidth: 430, maxHeight: '85vh', overflowY: 'auto', animation: 'slideUp 280ms var(--ease-out)', boxShadow: th.shadow }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ flex: 1, margin: 0, fontSize: 17, fontWeight: 700, fontFamily: th.fontDisplay, color: th.text }}>{title}</h3>
          <button onClick={onClose} style={{ background: th.surface2, border: 'none', borderRadius: 20, width: 32, height: 32, fontSize: 18, cursor: 'pointer', color: th.textSec }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── PageHeader ─────────────────────────────────────────────
export function PageHeader({ title, onBack, right }) {
  const { th, goBack } = useApp()
  return (
    <div style={{ background: th.surface, padding: '14px 16px', borderBottom: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 50 }}>
      <button onClick={onBack || goBack} style={{ background: th.surface2, border: `1px solid ${th.border}`, borderRadius: 20, width: 36, height: 36, fontSize: 18, cursor: 'pointer', color: th.text, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 140ms var(--ease-out)' }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >←</button>
      <h2 style={{ flex: 1, margin: 0, fontSize: 17, fontWeight: 700, fontFamily: th.fontDisplay, color: th.text }}>{title}</h2>
      {right}
    </div>
  )
}

// ── SettingsRow ────────────────────────────────────────────
export function SettingsRow({ label, sub, right, onClick }) {
  const { th } = useApp()
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${th.border}`, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: th.text }}>{label}</p>
        {sub && <p style={{ margin: '2px 0 0', fontSize: 12, color: th.textSec }}>{sub}</p>}
      </div>
      {right}
    </div>
  )
}

// ── EmptyState ─────────────────────────────────────────────
// Acepta tanto emojis reales (⭐) como nombres de icono SVG ('star').
// Los nombres de icono (solo letras minúsculas y guiones) se renderizan
// como <Icon> dentro de un contenedor cuadrado azul claro.
export function EmptyState({ emoji, title, sub, action }) {
  const { th } = useApp()
  // Detectar si es nombre de icono SVG (solo a-z y guiones) o emoji real
  const isIconName = typeof emoji === 'string' && /^[a-z][a-z-]*$/.test(emoji)

  // Mapa de emojis temáticos TECNIFIX para estados vacíos con guía visual
  const THEMED_EMOJI = {
    pending: '⏳',
    completed: '✅',
    in_progress: '⚡',
    payment: '💳',
    certificate: '📜',
    dispute: '🚨',
    star: '⭐',
    receipt: '📄',
    money: '💰',
    document: '📋',
    wrench: '🛠️',
    search: '🔍',
    chat: '💬',
    map: '🗺️',
    photo: '📸',
    lock: '🔒',
    shield: '🛡️',
    archive: '📦',
    user: '👤',
    'user-group': '👥',
    bell: '🔔',
    settings: '⚙️',
    logout: '🚪',
    admin: '🖥️',
    edit: '✏️',
    trash: '🗑️',
    download: '⬇️',
    upload: '⬆️',
    share: '📤',
    close: '✖️',
    plus: '➕',
    filter: '🔽',
    check: '✅',
    'check-badge': '🛡️',
    'x-circle': '❌',
    warning: '⚠️',
    info: 'ℹ️',
    clock: '🕐',
    phone: '📞',
    location: '📍',
    send: '📨',
    bolt: '⚡',
    fire: '🔥',
    'arrow-right': '→',
    'chevron-right': '›',
    'chevron-left': '‹',
    home: '🏠',
    'star-filled': '⭐',
    wifi: '📶',
    'wifi-off': '📵',
    eye: '👁️',
  }

  return (
    <div style={{
      textAlign: 'center', paddingTop: 60, paddingBottom: 60,
      paddingLeft: 20, paddingRight: 20
    }}>
      <div style={{
        marginBottom: 16, display: 'flex',
        justifyContent: 'center', alignItems: 'center'
      }}>
        {isIconName ? (
          <div style={{
            width: 80, height: 80, borderRadius: 24,
            background: th.primaryLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ fontSize: 40, lineHeight: 1 }}>
              {THEMED_EMOJI[emoji] || '🔧'}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 64, lineHeight: 1 }}>{emoji}</span>
        )}
      </div>
      <p style={{
        fontSize: 18, fontWeight: 700, fontFamily: th.fontDisplay,
        margin: '0 0 8px 0', color: th.text
      }}>{title}</p>
      {sub && (
        <p style={{
          fontSize: 14, margin: '0 0 24px 0', color: th.textSec,
          lineHeight: 1.5
        }}>{sub}</p>
      )}
      {action}
    </div>
  )
}

// ── StatusBadge ────────────────────────────────────────────
// Paleta TECNIFIX hardcodeada + emojis temáticos por estado.
// NO usa th.* en scope de módulo — todos los colores son inline.
export function StatusBadge({ status, t }) {
  const { th } = useApp()

  // Paleta hardcodeada TECNIFIX (no depende de th en módulo)
  const map = {
    pending: {
      bg: '#FFF8E0', text: '#7A5E00', emoji: '⏳',
      label: t?.pending || 'Pendiente'
    },
    accepted: {
      bg: '#DDEEFF', text: '#00214D', emoji: '✅',
      label: t?.accepted || 'Aceptada'
    },
    in_progress: {
      bg: '#E8F0FF', text: '#0053A0', emoji: '⚡',
      label: t?.inProgress || 'En progreso'
    },
    pending_payment: {
      bg: '#FFF0D6', text: '#7A4500', emoji: '💳',
      label: t?.pendingPayment || 'Pend. pago'
    },
    completed: {
      bg: '#DFF7ED', text: '#00704A', emoji: '✅',
      label: t?.completed || 'Completada'
    },
    cancelled: {
      bg: '#FFE8E8', text: '#B00020', emoji: '✖️',
      label: t?.cancelled || 'Cancelada'
    },
    disputed: {
      bg: '#FFF0D6', text: '#7A4500', emoji: '🚨',
      label: t?.disputed || 'En disputa'
    },
    verified: {
      bg: '#DFF7ED', text: '#00704A', emoji: '🛡️',
      label: t?.verified || 'Verificado'
    },
    pending_review: {
      bg: '#FFF8E0', text: '#7A5E00', emoji: '⏳',
      label: 'En revisión'
    },
    under_review: {
      bg: '#FFF0D6', text: '#7A4500', emoji: '⏳',
      label: 'En revisión'
    },
    paid: {
      bg: '#DFF7ED', text: '#00704A', emoji: '✅',
      label: t?.paymentCompleted || 'Pagado'
    },
    unpaid: {
      bg: '#FFE8E8', text: '#B00020', emoji: '💳',
      label: t?.paymentPending || 'Sin pagar'
    },
    pending_confirmation: {
      bg: '#E8F0FF', text: '#0053A0', emoji: '⏳',
      label: 'Confirmando'
    },
    resolved_client: {
      bg: '#DDEEFF', text: '#00214D', emoji: '✅',
      label: 'Resuelto: cliente'
    },
    resolved_tech: {
      bg: '#DFF7ED', text: '#00704A', emoji: '✅',
      label: 'Resuelto: técnico'
    },
    closed: {
      bg: '#F0F5FA', text: '#4A6A8A', emoji: '🔒',
      label: 'Cerrada'
    },
    open: {
      bg: '#FFE8E8', text: '#B00020', emoji: '🚨',
      label: 'Abierta'
    },
    active: {
      bg: '#DFF7ED', text: '#00704A', emoji: '✅',
      label: 'Activo'
    },
    suspended: {
      bg: '#FFE8E8', text: '#B00020', emoji: '⚠️',
      label: 'Suspendido'
    },
    rejected: {
      bg: '#FFE8E8', text: '#B00020', emoji: '✖️',
      label: 'Rechazado'
    },
    featured: {
      bg: '#FFF8E0', text: '#7A5E00', emoji: '⭐',
      label: 'Destacado'
    },
  }

  const s = map[status] || {
    bg: th.surface2, text: th.textSec,
    emoji: '●', label: status ?? '—'
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      paddingTop: 3, paddingBottom: 3, paddingLeft: 8, paddingRight: 8,
      borderRadius: 100,
      background: s.bg, color: s.text,
      fontSize: 11, fontWeight: 700,
      fontFamily: "'Space Grotesk','Inter',sans-serif",
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 12, lineHeight: 1 }}>{s.emoji}</span>
      {s.label}
    </span>
  )
}

// ── TicketPerforation ───────────────────────────────────────
// Línea de "perforación" estilo boleto de servicio — fila de
// pequeños círculos que revelan el color de fondo de la página,
// usada como divisor entre secciones de una tarjeta tipo ticket.
export function TicketPerforation({ bg }) {
  const { th } = useApp()
  const holeColor = bg || th.bg
  return (
    <div style={{
      height: 14,
      background: `radial-gradient(circle, ${holeColor} 0 4px, transparent 4.5px) 6px 0 / 16px 14px repeat-x`,
      borderTop: `1px dashed ${th.border}`,
      borderBottom: `1px dashed ${th.border}`,
    }} />
  )
}

// ── Logo TECNIFIX ───────────────────────────────────────────
// TECNI en blanco + FIX en amarillo — icono llave+rayo
export function TecnifixLogo({ size = 32, showText = true, dark = false }) {
  const iconBg = dark ? '#FFD600' : '#00214D'
  const iconFg = dark ? '#00214D' : '#FFD600'
  const textWhite = dark ? '#00214D' : '#FFFFFF'
  const textYellow = '#FFD600'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Ícono: fondo cuadrado redondeado, llave SVG */}
      <img src="./favicon.png" alt="TECNIFIX" width="72" height="72" style={{ borderRadius: 18, objectFit: 'cover' }} />
      {showText && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: size * 0.6, color: textWhite, letterSpacing: -0.5, lineHeight: 1 }}>TECNI</span>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: size * 0.6, color: textYellow, letterSpacing: -0.5, lineHeight: 1 }}>FIX</span>
        </div>
      )}
    </div>
  )
}

// ── Badge moderno ───────────────────────────────────────────
export function Chip({ children, active, onClick, color, textColor }) {
  const { th } = useApp()
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '6px 14px', borderRadius: 100,
      border: active ? 'none' : `1.5px solid ${th.border}`,
      background: active ? (color || th.primary) : th.surface,
      color: active ? (textColor || '#fff') : th.textSec,
      fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
      cursor: 'pointer', whiteSpace: 'nowrap',
      transition: 'all 150ms var(--ease-out)',
    }}>
      {children}
    </button>
  )
}