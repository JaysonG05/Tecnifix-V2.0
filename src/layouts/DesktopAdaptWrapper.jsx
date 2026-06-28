// ============================================================
//  DesktopAdaptWrapper.jsx  — v3 SIMPLE
//  Hace que las pantallas mobile se vean como web en desktop:
//  - Oculta el sticky PageHeader mobile (topbar lo reemplaza)
//  - Centra el contenido a un ancho web apropiado
//  - Elimina el minHeight:100vh del contenedor mobile
// ============================================================
import { useApp } from '../context/AppContext.jsx'

// Ancho máximo por tipo de pantalla
const MAX_WIDTHS = {
  // Formularios / configuración → columna centrada (como GitHub Settings)
  'settings':            720,
  'edit-profile':        720,
  'edit-tech-profile':   860,
  'legal':               760,
  // Listas con tabla → más ancho
  'my-receipts':         960,
  'certificates':        860,
  'service-catalog':     860,
  'notifications':       780,
  // Pantallas de detalle → ancho completo
  'request-detail':      960,
  'tech-profile':        880,
  'login':               480,
  'register':            520,
}

export function DesktopAdaptWrapper({ screen, children }) {
  const { th } = useApp()
  const maxW = MAX_WIDTHS[screen] ?? 860

  return (
    <>
      <style>{`
        /* ── Adaptaciones para pantallas mobile dentro del shell desktop ── */

        /* 1. Ocultar sticky PageHeader mobile — el topbar desktop lo cubre */
        .tf-adapted > div:first-child > div[style*="sticky"],
        .tf-adapted > div:first-child > div[style*="position: sticky"],
        .tf-adapted > div:first-child > div:first-child[style*="zIndex: 50"],
        .tf-adapted > div:first-child > div:first-child[style*="z-index: 50"] {
          position: relative !important;
          top: auto !important;
          box-shadow: none !important;
        }

        /* 2. Quitar el fondo gris duplicado del contenedor mobile */
        .tf-adapted > div:first-child {
          background: transparent !important;
          min-height: unset !important;
          padding-bottom: 16px !important;
        }

        /* 3. Quitar padding-bottom del NavBar (no existe en desktop) */
        .tf-adapted > div {
          padding-bottom: 0 !important;
        }

        /* 4. Cards y secciones con sombra sutil en desktop */
        .tf-adapted [style*="borderRadius: 16px"],
        .tf-adapted [style*="border-radius: 16px"],
        .tf-adapted [style*="borderRadius: 14px"] {
          box-shadow: 0 1px 4px rgba(0,33,77,0.07) !important;
        }
      `}</style>

      <div
        className="tf-adapted"
        style={{
          width:     '100%',
          maxWidth:  maxW,
          margin:    '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </>
  )
}