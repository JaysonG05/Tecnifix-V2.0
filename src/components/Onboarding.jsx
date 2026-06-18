// ============================================================
//  Onboarding.jsx
//  Tutorial breve para nuevos usuarios — se muestra una sola
//  vez (guardado en localStorage) la primera vez que abren la app.
// ============================================================
import { useState } from 'react'
import { Icon } from './Icons.jsx'
import { useApp } from '../context/AppContext.jsx'

const SLIDES_ES = [
  {
    icon: 'wrench',
    title: '¡Bienvenido a TECNIFIX!',
    body: 'Encuentra técnicos confiables en todo Panamá: electricistas, plomeros, técnicos en climatización y mucho más.',
  },
  {
    icon: 'search',
    title: 'Busca o explora por categoría',
    body: 'Usa la barra de búsqueda o toca un ícono de categoría en el inicio para ver técnicos disponibles en tu provincia.',
  },
  {
    icon: 'check-badge',
    title: 'Perfiles verificados y reseñas reales',
    body: 'Cada técnico muestra su calificación, reseñas de clientes anteriores y una insignia de verificado si fue aprobado.',
  },
  {
    icon: 'document',
    title: 'Solicita el servicio con un clic',
    body: 'Elige un servicio del catálogo del técnico, acuerda el precio y firma el contrato digital directamente en la app.',
  },
  {
    icon: 'chat',
    title: 'Chatea, paga y descarga tu recibo',
    body: 'Comunícate por el chat interno, paga por Yappy, transferencia o efectivo, y guarda tu recibo como comprobante.',
  },
]

const SLIDES_EN = [
  {
    icon: 'wrench',
    title: 'Welcome to TECNIFIX!',
    body: 'Find trusted technicians across Panama: electricians, plumbers, HVAC technicians, and more.',
  },
  {
    icon: 'search',
    title: 'Search or browse by category',
    body: 'Use the search bar or tap a category icon on the home screen to see available technicians in your province.',
  },
  {
    icon: 'check-badge',
    title: 'Verified profiles and real reviews',
    body: 'Every technician shows their rating, reviews from past clients, and a verified badge if approved.',
  },
  {
    icon: 'document',
    title: 'Request a service in one tap',
    body: 'Pick a service from the technician\'s catalog, agree on a price, and sign the digital contract right in the app.',
  },
  {
    icon: 'chat',
    title: 'Chat, pay, and download your receipt',
    body: 'Communicate through the in-app chat, pay via Yappy, transfer, or cash, and keep your receipt as proof.',
  },
]

const STORAGE_KEY = 'cp_onboarding_seen'

export function hasSeenOnboarding() {
  try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return true }
}

export function Onboarding({ onClose }) {
  const { th, lang } = useApp()
  const [index, setIndex] = useState(0)
  const slides = lang === 'en' ? SLIDES_EN : SLIDES_ES
  const isLast = index === slides.length - 1
  const slide = slides[index]

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true') } catch { }
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
      zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: th.surface, borderRadius: 24, padding: '32px 24px 24px',
        maxWidth: 380, width: '100%', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Skip */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <button onClick={finish}
            style={{
              background: 'none', border: 'none', color: th.textSec,
              fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
            }}>
            {lang === 'en' ? 'Skip' : 'Omitir'}
          </button>
        </div>

        {/* Icon SVG */}
        <div style={{
          width: 80, height: 80, borderRadius: 24, marginBottom: 16,
          background: th.primaryLight, display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 20px'
        }}>
          <Icon name={slide.icon} size={36} color={th.primary} />
        </div>

        {/* Title + body */}
        <h2 style={{ margin: '0 0 10px', fontSize: 19, fontWeight: 800, color: th.text }}>
          {slide.title}
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: th.textSec, lineHeight: 1.6 }}>
          {slide.body}
        </p>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {slides.map((_, i) => (
            <div key={i} style={{
              width: i === index ? 22 : 8, height: 8, borderRadius: 4,
              background: i === index ? th.primary : th.border,
              transition: 'all 0.25s',
            }} />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {index > 0 && (
            <button onClick={() => setIndex(i => i - 1)}
              style={{
                flex: 1, padding: '12px', borderRadius: 12,
                border: `1.5px solid ${th.border}`, background: 'transparent',
                color: th.text, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit'
              }}>
              {lang === 'en' ? 'Back' : 'Atrás'}
            </button>
          )}
          <button onClick={() => isLast ? finish() : setIndex(i => i + 1)}
            style={{
              flex: index > 0 ? 1 : undefined, width: index === 0 ? '100%' : undefined,
              padding: '12px', borderRadius: 12, border: 'none',
              background: th.primary, color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit'
            }}>
            {isLast
              ? (lang === 'en' ? "Let's go! 🚀" : '¡Vamos! 🚀')
              : (lang === 'en' ? 'Next' : 'Siguiente')}
          </button>
        </div>
      </div>
    </div>
  )
}