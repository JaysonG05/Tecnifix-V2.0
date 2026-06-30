import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, Btn } from '../components/UI.jsx'
import { getCategoryMeta } from '../lib/trust.js'
import { addAsset } from '../lib/homeMemory.js'

export function QRPassportScreen() {
  const { th, navigate } = useApp()
  const [asset, setAsset] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qrData = urlParams.get('qr');
    if (qrData) {
      try {
        const decoded = JSON.parse(atob(qrData));
        setAsset(decoded);
      } catch (e) {
        setError(true);
      }
    } else {
      setError(true);
    }
  }, []);

  const handleImport = () => {
    if (!asset) return;
    addAsset({
      name: asset.name,
      slug: asset.slug,
      installedAt: asset.installedAt,
      lastServiceAt: asset.lastServiceAt || new Date().toISOString()
    });
    // Limpiar url
    window.history.replaceState({}, document.title, window.location.pathname);
    navigate('home-memory');
  }

  const goHome = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
    navigate('home');
  }

  if (error) {
    return (
      <div style={{ background: th.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <h2 style={{ color: th.text }}>Código QR Inválido</h2>
        <p style={{ color: th.textSec, marginBottom: 24 }}>El código escaneado no contiene información válida de Tecnifix.</p>
        <Btn onClick={goHome}>Ir al inicio</Btn>
      </div>
    )
  }

  if (!asset) return null;

  const meta = getCategoryMeta(asset.slug) || { label: 'Equipo', icon: '🔧' };

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 90 }}>
      <PageHeader title="🧬 Pasaporte de Mantenimiento" onBack={goHome} />
      
      <div style={{ maxWidth: 500, margin: '40px auto 0', padding: '0 20px' }}>
        <div style={{ background: th.surface, border: `2px solid ${th.primary}`, borderRadius: 24, padding: 30, textAlign: 'center', boxShadow: '0 20px 40px rgba(37,99,235,0.15)' }}>
          <div style={{ fontSize: 60, marginBottom: 10 }}>{meta.icon}</div>
          <h2 style={{ margin: '0 0 8px', color: th.text, fontSize: 24, fontWeight: 900 }}>{asset.name}</h2>
          <p style={{ color: th.primary, fontWeight: 800, fontSize: 14, margin: '0 0 24px', textTransform: 'uppercase', letterSpacing: 1 }}>{meta.label}</p>
          
          <div style={{ background: th.surface2, borderRadius: 16, padding: 16, textAlign: 'left', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, borderBottom: `1px solid ${th.border}`, paddingBottom: 12 }}>
              <span style={{ color: th.textSec, fontSize: 13 }}>Fecha de Instalación</span>
              <span style={{ color: th.text, fontWeight: 700, fontSize: 13 }}>{asset.installedAt ? new Date(asset.installedAt).toLocaleDateString() : 'Desconocida'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: th.textSec, fontSize: 13 }}>Último Mantenimiento</span>
              <span style={{ color: th.text, fontWeight: 700, fontSize: 13 }}>{asset.lastServiceAt ? new Date(asset.lastServiceAt).toLocaleDateString() : 'Hoy'}</span>
            </div>
          </div>

          <p style={{ fontSize: 13, color: th.textSec, lineHeight: 1.6, marginBottom: 24 }}>
            Este es el pasaporte físico de esta máquina. Guárdalo en tu <strong>Home Memory</strong> para que Tecnifix te avise automáticamente cuándo toca el próximo mantenimiento.
          </p>

          <Btn onClick={handleImport} style={{ width: '100%', padding: 16, fontSize: 16 }}>
            🏠 Importar a Mi Hogar
          </Btn>
        </div>
      </div>
    </div>
  )
}
