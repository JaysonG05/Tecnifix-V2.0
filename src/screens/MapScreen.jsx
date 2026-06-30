import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Avatar, StarRating, Spinner, Btn } from '../components/UI.jsx'
import { technicians } from '../lib/supabase.js'
import { T } from '../i18n/translations.js'

export function MapScreen() {
  const { th, navigate, setSelectedTech, lang } = useApp()
  const t = T[lang]

  const mapRef         = useRef(null)
  const mapInstance    = useRef(null)
  const markersRef     = useRef([])
  const [leafletReady, setLeafletReady] = useState(!!window.L)
  const [techList,     setTechList]     = useState([])
  const [userPos,      setUserPos]      = useState(null)
  const [locating,     setLocating]     = useState(false)
  const [loading,      setLoading]      = useState(true)

  // Cargar técnicos
  useEffect(() => {
    technicians.list()
      .then(data => setTechList(data.filter(x => x.latitude && x.longitude)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Cargar Leaflet dinámicamente si no está
  const loadLeaflet = useCallback(() => {
    if (window.L) { setLeafletReady(true); return }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setLeafletReady(true)
    document.head.appendChild(script)
  }, [])

  // Inicializar mapa cuando Leaflet y el div estén listos
  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstance.current) return
    const L = window.L

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([9.4390, -82.5177], 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    mapInstance.current = map
    addMarkers(map, techList)
  }, [leafletReady, techList])

  // Actualizar marcadores cuando cambia la lista de técnicos
  const addMarkers = useCallback((map, list) => {
    if (!map || !window.L) return
    const L = window.L

    // Limpiar marcadores previos
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    list.forEach(tech => {
      const color = tech.is_available ? '#1d4ed8' : '#64748b'
      const icon = L.divIcon({
        html: `
          <div style="
            background:${color};color:#fff;
            padding:5px 10px 5px 6px;border-radius:20px;
            font-weight:700;font-size:11px;
            white-space:nowrap;
            box-shadow:0 2px 8px rgba(0,0,0,0.25);
            display:flex;align-items:center;gap:6px;
            border:2px solid rgba(255,255,255,0.5)
          ">
            <img src="${tech.avatar_url || ''}" 
              style="width:22px;height:22px;border-radius:11px;object-fit:cover;background:#e2e8f0;flex-shrink:0"
              onerror="this.style.display='none'">
            ★${Number(tech.average_rating).toFixed(1)} ${tech.full_name?.split(' ')[0] || ''}
          </div>`,
        className: '',
        iconAnchor: [0, 0],
      })

      const marker = L.marker([tech.latitude, tech.longitude], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:system-ui;min-width:190px;padding:4px">
            <img src="${tech.avatar_url || ''}" 
              style="width:100%;height:90px;object-fit:cover;border-radius:10px;margin-bottom:8px;background:#f1f5f9"
              onerror="this.style.display='none'">
            <b style="font-size:14px;display:block;margin-bottom:2px">${tech.full_name}</b>
            <span style="font-size:12px;color:#64748b;display:block;margin-bottom:4px">${tech.professional_title || ''}</span>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
              <span style="color:#fbbf24">★ ${Number(tech.average_rating).toFixed(1)}</span>
              <span style="font-size:11px;color:#64748b">(${tech.total_reviews} reseñas)</span>
              <span style="margin-left:auto;font-weight:700;color:#1d4ed8">Desde $${tech.min_price}</span>
            </div>
            <a href="https://wa.me/${(tech.public_whatsapp || '').replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(tech.full_name || '')},%20vi%20tu%20perfil%20en%20Changuinola%20Pro"
              target="_blank"
              style="display:block;background:#25d366;color:#fff;text-align:center;padding:8px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">
              📱 WhatsApp
            </a>
          </div>
        `, { maxWidth: 220 })

      // Click en marcador → ver perfil
      marker.on('click', () => {
        setSelectedTech(tech)
      })

      markersRef.current.push(marker)
    })

    // Encuadrar el mapa a todos los técnicos (vista nacional si están repartidos)
    if (list.length > 1) {
      const bounds = L.latLngBounds(list.map(x => [x.latitude, x.longitude]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
    } else if (list.length === 1) {
      map.setView([list[0].latitude, list[0].longitude], 13)
    }
  }, [setSelectedTech])

  // Geolocalización del usuario
  const locateUser = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setUserPos({ lat, lng })
        setLocating(false)
        if (mapInstance.current && window.L) {
          const L = window.L
          // Marcador de posición del usuario
          const userIcon = L.divIcon({
            html: `<div style="width:16px;height:16px;background:#3b82f6;border-radius:8px;border:3px solid #fff;box-shadow:0 0 0 3px rgba(59,130,246,0.3)"></div>`,
            className: '',
            iconAnchor: [8, 8],
          })
          L.marker([lat, lng], { icon: userIcon })
            .addTo(mapInstance.current)
            .bindPopup('📍 Tu ubicación')
            .openPopup()
          mapInstance.current.setView([lat, lng], 14)

          // Cargar técnicos cercanos
          technicians.nearby(lat, lng, 20)
            .then(nearby => {
              if (nearby.length > 0) setTechList(nearby)
            })
            .catch(() => {})
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  return (
    <div style={{ background: th.bg, minHeight: '100vh' }}>
      {/* Header exótico (aurora + glass) */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '18px 16px 16px', background: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 55%,#2563eb 100%)', borderRadius: '0 0 24px 24px' }}>
        <div style={{ position: 'absolute', top: -40, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle,#60a5fa,transparent 70%)', filter: 'blur(8px)', opacity: 0.45, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: 0, textShadow: '0 1px 8px rgba(0,0,0,0.2)' }}>🗺️ {t.nearbyTechs}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
              {loading ? '…' : techList.length} {t.techsOnMap}
            </p>
          </div>
          <button onClick={locateUser} disabled={locating}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', flexShrink: 0 }}>
            {locating ? <Spinner size={14} /> : '📍'}
            {locating ? t.locating : t.useMyLocation}
          </button>
        </div>
      </div>

      {/* Mapa */}
      {!leafletReady ? (
        <div style={{ margin: 16, background: th.surface2, borderRadius: 18, height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, border: `1px dashed ${th.border}` }}>
          <span style={{ fontSize: 52 }}>🗺️</span>
          <p style={{ margin: 0, color: th.textSec, fontSize: 14, textAlign: 'center', maxWidth: 220 }}>
            Mapa interactivo con OpenStreetMap (gratuito, sin API key)
          </p>
          <Btn onClick={loadLeaflet} style={{ maxWidth: 220 }}>{t.loadMap}</Btn>
        </div>
      ) : (
        <div ref={mapRef} style={{ height: 360, width: '100%' }} />
      )}

      {/* Lista de técnicos debajo del mapa */}
      <div style={{ padding: '16px 16px 90px' }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: th.text, margin: '0 0 14px' }}>{t.techsInZone}</p>
        {loading
          ? <p style={{ color: th.textSec, fontSize: 14 }}>Cargando técnicos...</p>
          : techList.map(tech => (
            <div key={tech.user_id}
              onClick={() => { setSelectedTech(tech); navigate('tech-profile') }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${th.border}`, cursor: 'pointer' }}>
              <Avatar photo={tech.avatar_url} name={tech.full_name} size={50} online={tech.is_available} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: th.text }}>{tech.full_name}</p>
                <p style={{ margin: '1px 0', fontSize: 12, color: th.textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tech.professional_title}</p>
                <StarRating rating={tech.average_rating} size={12} />
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, color: th.primaryText, fontSize: 13 }}>Desde ${tech.min_price}</p>
                {tech.distance_km !== undefined && (
                  <p style={{ margin: 0, fontSize: 11, color: th.textSec }}>📍 {tech.distance_km} km</p>
                )}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
