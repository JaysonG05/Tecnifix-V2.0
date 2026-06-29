import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

// Gradientes deterministas para el avatar de respaldo (según el nombre),
// para que cada técnico tenga un color propio en vez de un círculo plano.
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#2563eb,#1d4ed8)',
  'linear-gradient(135deg,#3b82f6,#2563eb)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#8b5cf6,#6d28d9)',
  'linear-gradient(135deg,#ec4899,#be185d)',
  'linear-gradient(135deg,#06b6d4,#0891b2)',
  'linear-gradient(135deg,#ef4444,#b91c1c)',
  'linear-gradient(135deg,#14b8a6,#0d9488)',
]
function gradientFor(name) {
  const s = String(name || '?')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}

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
        <div style={{ width: size, height: size, borderRadius: size / 2, background: gradientFor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.floor(size * 0.4), fontWeight: 700, color: '#fff', border: `2px solid ${th.surface}`, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', letterSpacing: 0 }}>
          {(name || '?').charAt(0).toUpperCase()}
        </div>
      )}
      {online !== undefined && (
        <div style={{ position: 'absolute', bottom: 1, right: 1, width: Math.max(size * 0.22, 8), height: Math.max(size * 0.22, 8), background: online ? '#2563eb' : '#94a3b8', borderRadius: '50%', border: `2px solid ${th.surface}` }} />
      )}
    </div>
  )
}

// ── Stars ──────────────────────────────────────────────────
export function StarRating({ rating, size = 14, interactive = false, onChange }) {
  const [hovered, setHovered] = useState(0)
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i}
          onClick={() => interactive && onChange?.(i)}
          onMouseEnter={() => interactive && setHovered(i)}
          onMouseLeave={() => interactive && setHovered(0)}
          style={{ fontSize: size, color: i <= (hovered || Math.round(rating)) ? '#fbbf24' : '#d1d5db', cursor: interactive ? 'pointer' : 'default', transition: 'color 0.1s' }}>★</span>
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
export function Toggle({ value, onChange, disabled = false }) {
  const { th } = useApp()
  return (
    <button onClick={() => !disabled && onChange(!value)} disabled={disabled} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1, background: value ? th.primary : th.border, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
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
export function Input({ label, value, onChange, placeholder, type = 'text', icon, error, rows, style: wrapStyle = {}, inputStyle = {}, helper }) {
  const { th } = useApp()
  const base = {
    width: '100%', boxSizing: 'border-box', borderRadius: 16,
    border: `1px solid ${error ? th.red : '#e8edf5'}`,
    fontSize: 14, outline: 'none', background: '#f6f8fc', color: th.text,
    transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
    fontFamily: 'inherit', fontWeight: 600,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.8)',
    ...inputStyle,
  }
  return (
    <div style={{ marginBottom: 16, ...wrapStyle }}>
      {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#17213a', marginBottom: 8 }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 12, top: rows ? 12 : '50%', transform: rows ? 'none' : 'translateY(-50%)', fontSize: 16, zIndex: 1 }}>{icon}</span>}
        {rows ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
            style={{ ...base, padding: icon ? '13px 15px 13px 40px' : '13px 15px', resize: 'vertical', minHeight: Math.max(rows * 42, 104) }}
            onFocus={e => { e.target.style.borderColor = error ? th.red : '#ff9b21'; e.target.style.boxShadow = '0 0 0 4px rgba(255,155,33,.14)' }}
            onBlur={e => { e.target.style.borderColor = error ? th.red : '#e8edf5'; e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,.8)' }}
          />
        ) : (
          <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={{ ...base, height: 44, padding: icon ? '0 15px 0 40px' : '0 15px' }}
            onFocus={e => { e.target.style.borderColor = error ? th.red : '#ff9b21'; e.target.style.boxShadow = '0 0 0 4px rgba(255,155,33,.14)' }}
            onBlur={e => { e.target.style.borderColor = error ? th.red : '#e8edf5'; e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,.8)' }}
          />
        )}
      </div>
      {helper && !error && <p style={{ margin: '6px 0 0', fontSize: 11, color: th.textSec, lineHeight: 1.45 }}>{helper}</p>}
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: th.red }}>{error}</p>}
    </div>
  )
}

// ── Button ─────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', disabled, loading: isLoading, style: s = {}, size = 'md' }) {
  const { th } = useApp()
  const variants = {
    primary:   { background: disabled || isLoading ? th.textSec : th.primary, color: '#fff', border: 'none' },
    outline:   { background: 'transparent', color: th.primary, border: `2px solid ${th.primary}` },
    danger:    { background: 'transparent', color: th.red, border: `2px solid ${th.red}` },
    ghost:     { background: th.surface2, color: th.text, border: `1px solid ${th.border}` },
    whatsapp:  { background: '#25d366', color: '#fff', border: 'none' },
    dark:      { background: '#0f172a', color: '#fff', border: 'none' },
  }
  const sizes = {
    sm: { padding: '8px 16px', fontSize: 13, borderRadius: 10 },
    md: { padding: '13px 0',   fontSize: 15, borderRadius: 14 },
    lg: { padding: '16px 0',   fontSize: 17, borderRadius: 16 },
  }
  return (
    <button onClick={onClick} disabled={disabled || isLoading} style={{
      width: '100%', fontWeight: 700, cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      transition: 'opacity 0.15s, transform 0.1s', opacity: disabled || isLoading ? 0.7 : 1,
      fontFamily: 'inherit',
      ...variants[variant], ...sizes[size], ...s,
    }}
    onMouseEnter={e => { if (!disabled && !isLoading) e.currentTarget.style.opacity = '0.88' }}
    onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
    onMouseDown={e => { if (!disabled && !isLoading) e.currentTarget.style.transform = 'scale(0.98)' }}
    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {isLoading ? <Spinner size={18} color="#fff" /> : children}
    </button>
  )
}

// ── Spinner ────────────────────────────────────────────────
export function Spinner({ size = 24, color }) {
  const { th } = useApp()
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, border: `3px solid ${color || th.border}`, borderTopColor: color || th.primary, animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
  )
}

// ── Toast ──────────────────────────────────────────────────
export function Toast({ message, type = 'success', onClose }) {
  const { th } = useApp()
  const colors = { success: th.primary, error: th.red, info: th.blue }
  return (
    <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: colors[type] || th.primary, color: '#fff', padding: '12px 20px', borderRadius: 14, fontWeight: 600, fontSize: 14, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', maxWidth: 320, textAlign: 'center', cursor: 'pointer', animation: 'slideDown 0.3s ease' }}
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
      <div style={{ background: th.surface, borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', width: '100%', maxWidth: 430, maxHeight: '85vh', overflowY: 'auto', animation: 'slideUp 0.3s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ flex: 1, margin: 0, fontSize: 17, fontWeight: 800, color: th.text }}>{title}</h3>
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
    <div style={{
      position: 'sticky', top: 0, zIndex: 50, overflow: 'hidden',
      padding: '16px 16px', display: 'flex', alignItems: 'center', gap: 12,
      background: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 55%,#2563eb 100%)',
    }}>
      {/* Blob decorativo */}
      <div style={{ position: 'absolute', top: -40, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle,#60a5fa,transparent 70%)', filter: 'blur(8px)', opacity: 0.45, pointerEvents: 'none' }} />
      <button onClick={onBack || goBack} style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, width: 36, height: 36, fontSize: 18, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
      <h2 style={{ flex: 1, margin: 0, fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: 0, position: 'relative', zIndex: 1, textShadow: '0 1px 8px rgba(0,0,0,0.2)' }}>{title}</h2>
      <div style={{ position: 'relative', zIndex: 1 }}>{right}</div>
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
export function EmptyState({ emoji, title, sub, action }) {
  const { th } = useApp()
  return (
    <div style={{
      textAlign: 'center', padding: '52px 24px',
      gridColumn: '1 / -1', // ocupa todo el ancho aunque esté dentro de una grilla
      animation: 'fadeIn 0.35s ease both',
    }}>
      {/* Disco suave detrás del emoji para darle peso visual */}
      <div style={{
        width: 104, height: 104, margin: '0 auto 18px',
        borderRadius: '50%',
        background: `radial-gradient(circle at 50% 40%, ${th.primaryLight}, ${th.surface2})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 52, boxShadow: th.shadow,
      }}>{emoji}</div>
      <p style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px', color: th.text, letterSpacing: 0 }}>{title}</p>
      {sub && <p style={{ fontSize: 14, margin: '0 auto 24px', color: th.textSec, maxWidth: 320, lineHeight: 1.5 }}>{sub}</p>}
      {action}
    </div>
  )
}

// ── StatusBadge ────────────────────────────────────────────
export function StatusBadge({ status, t }) {
  const map = {
    pending:          { bg: '#fef3c7', text: '#92400e', label: t?.pending || 'Pendiente' },
    accepted:         { bg: '#dbeafe', text: '#1e40af', label: t?.accepted || 'Aceptado' },
    in_progress:      { bg: '#ede9fe', text: '#5b21b6', label: t?.inProgress || 'En progreso' },
    completed:        { bg: '#dbeafe', text: '#1e40af', label: t?.completed || 'Completado' },
    cancelled:        { bg: '#fee2e2', text: '#991b1b', label: t?.cancelled || 'Cancelado' },
    disputed:         { bg: '#fef9c3', text: '#854d0e', label: t?.disputed || 'En disputa' },
    verified:         { bg: '#dbeafe', text: '#1e40af', label: t?.verified || 'Verificado' },
    pending_review:   { bg: '#fef3c7', text: '#92400e', label: 'En revisión' },
    paid:             { bg: '#dbeafe', text: '#1e40af', label: t?.paymentCompleted || 'Pagado' },
    unpaid:           { bg: '#fee2e2', text: '#991b1b', label: t?.paymentPending || 'Sin pagar' },
  }
  const s = map[status] || { bg: '#f1f5f9', text: '#64748b', label: status }
  return <Badge color={s.bg} textColor={s.text}>{s.label}</Badge>
}
