import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Icon } from '../components/Icons.jsx'
import { Avatar, StarRating, Spinner, Btn } from '../components/UI.jsx'
import { supabase, technicians } from '../lib/supabase.js'
import { T } from '../i18n/translations.js'

export function MapScreen() {
  const { th, navigate, setSelectedTech, lang, isDesktop } = useApp()
  const t = T[lang]

  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const [leafletReady, setLeafletReady] = useState(!!window.L)
  const [techList, setTechList] = useState([])
  const [userPos, setUserPos] = useState(null)
  const [locating, setLocating] = useState(false)
  const [loading, setLoading] = useState(true)

  // Cargar técnicos
  useEffect(() => {
    technicians.list()
      .then(data => setTechList(data.filter(x => x.latitude && x.longitude)))
      .catch(() => { })
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
      const color = tech.is_available ? th.verified : th.textSec
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
              <span style="margin-left:auto;font-weight:700;color:#16a34a">Desde $${tech.min_price}</span>
            </div>
            <a href="https://wa.me/${(tech.public_whatsapp || '').replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(tech.full_name || '')},%20vi%20tu%20perfil%20en%20Panamá%20Pro"
              target="_blank"
              style="display:block;background:#25d366;color:#fff;text-align:center;padding:8px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">
              WhatsApp
            </a>
          </div>
        `, { maxWidth: 220 })

      // Click en marcador → ver perfil
      marker.on('click', () => {
        setSelectedTech(tech)
      })

      markersRef.current.push(marker)
    })
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
            .bindPopup(' Tu ubicación')
            .openPopup()
          mapInstance.current.setView([lat, lng], 14)

          // Cargar técnicos cercanos
          technicians.nearby(lat, lng, 20)
            .then(nearby => {
              if (nearby.length > 0) setTechList(nearby)
            })
            .catch(() => { })
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  return (
    <div style={{ background: th.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', background: th.surface, borderBottom: `1px solid ${th.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: th.text }}>{t.nearbyTechs}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: th.textSec }}>
              {loading ? '...' : techList.length} {t.techsOnMap}
            </p>
          </div>
          <button onClick={locateUser} disabled={locating}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: th.primaryLight, color: th.primaryText, border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
            {locating ? <Spinner size={14} /> : ''}
            {locating ? t.locating : t.useMyLocation}
          </button>
        </div>
      </div>

      {/* Mapa */}
      {!leafletReady ? (
        <div style={{ margin: 16, background: th.surface2, borderRadius: 18, height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, border: `1px dashed ${th.border}` }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>
          <p style={{ margin: 0, color: th.textSec, fontSize: 14, textAlign: 'center', maxWidth: 220 }}>
            Mapa interactivo con OpenStreetMap (gratuito, sin API key)
          </p>
          <Btn onClick={loadLeaflet} style={{ maxWidth: 220 }}>{t.loadMap}</Btn>
        </div>
      ) : (
        <div ref={mapRef} style={{ height: isDesktop ? 480 : 360, width: '100%' }} />
      )}

      {/* Lista de técnicos debajo del mapa */}
      <div style={{ padding: isDesktop ? '0' : '16px 16px 90px' }}>
       <p style={{ fontWeight: 700, fontSize: 15, color: th.text, margin: '0 0 14px' }}>{t.techsInZone}</p>
     {loading
    ? <p style={{ color: th.textSec, fontSize: 14 }}>Cargando técnicos...</p>
    : (
      <div style={isDesktop ? {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 12,
      } : undefined}>
        {techList.map(tech => (
          <div key={tech.user_id}
            onClick={() => { setSelectedTech(tech); navigate('tech-profile') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: isDesktop ? '12px' : '12px 0',
              borderBottom: isDesktop ? 'none' : `1px solid ${th.border}`,
              border: isDesktop ? `1px solid ${th.border}` : 'none',
              borderRadius: isDesktop ? 12 : 0,
              background: isDesktop ? th.surface : 'transparent',
              cursor: 'pointer',
            }}>
            <Avatar photo={tech.avatar_url} name={tech.full_name} size={50} online={tech.is_available} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: th.text }}>{tech.full_name}</p>
              <p style={{ margin: '1px 0', fontSize: 12, color: th.textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tech.professional_title}</p>
              <StarRating rating={tech.average_rating} size={12} />
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, color: th.primaryText, fontSize: 13 }}>Desde ${tech.min_price}</p>
              {tech.distance_km !== undefined && (
                <p style={{ margin: 0, fontSize: 11, color: th.textSec }}> {tech.distance_km} km</p>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
    </div>
    </div>
  )}
