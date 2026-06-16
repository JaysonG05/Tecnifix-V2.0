import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Avatar, StarRating, Badge, Btn, Spinner, Modal, Input, Toast, StatusBadge } from '../components/UI.jsx'
import { reviews as reviewsApi, technicians, contracts, serviceRequests, payments, certificatesApi, serviceCatalog } from '../lib/supabase.js'
import { T } from '../i18n/translations.js'

export function TechProfileScreen() {
  const { th, selectedTech: tech, navigate, goBack, favoriteIds, toggleFavorite, user, lang } = useApp()
  const t = T[lang]
  if (!tech) { navigate('home'); return null }

  const [tab, setTab] = useState('info')
  const [reviewList, setReviewList] = useState([])
  const [gallery, setGallery] = useState([])
  const [lightboxIdx, setLightboxIdx] = useState(null) // índice de foto abierta en pantalla completa
  const [loadingRevs, setLoadingRevs] = useState(false)
  const [loadingGal, setLoadingGal] = useState(false)
  const [showContract, setShowContract] = useState(false)
  const [showRequest, setShowRequest] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [certList, setCertList] = useState([])
  const [catalog, setCatalog] = useState([])
  const [toast, setToast] = useState(null)

  const isFav = favoriteIds.includes(tech.user_id)
  const title = lang === 'en' ? (tech.professional_title_en || tech.professional_title) : tech.professional_title
  const bio = lang === 'en' ? (tech.bio_en || tech.bio) : tech.bio

  useEffect(() => {
    if (tab === 'info') {
      certificatesApi.list(tech.user_id)
        .then(d => setCertList(d.filter(c => c.is_public)))
        .catch(() => { })
      serviceCatalog.listActive(tech.user_id)
        .then(setCatalog)
        .catch(() => { })
    }
    if (tab === 'reviews') {
      setLoadingRevs(true)
      reviewsApi.listForTechnician(tech.user_id)
        .then(setReviewList).catch(() => { }).finally(() => setLoadingRevs(false))
    }
    if (tab === 'gallery') {
      setLoadingGal(true)
      technicians.getGallery(tech.user_id)
        .then(setGallery).catch(() => { }).finally(() => setLoadingGal(false))
    }
  }, [tab, tech.user_id])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 80 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Hero */}
      <div style={{ position: 'relative', background: `linear-gradient(160deg, ${tech.category_color || '#f1f5f9'}ee, ${tech.category_color || '#f1f5f9'}88)`, padding: '16px 16px 70px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={goBack} style={{ background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: 20, width: 36, height: 36, fontSize: 18, cursor: 'pointer' }}>←</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => {
              const url = `${window.location.origin}/?tech=${tech.user_id}`
              const shareText = `${tech.full_name} — ${tech.professional_title || 'Técnico'} en TECNIFIX ⭐ ${Number(tech.average_rating).toFixed(1)}`
              if (navigator.share) {
                navigator.share({ title: shareText, url }).catch(() => { })
              } else {
                navigator.clipboard?.writeText(`${shareText}\n${url}`)
                showToast(lang === 'en' ? 'Link copied!' : '¡Enlace copiado!')
              }
            }} style={{ background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: 20, width: 36, height: 36, fontSize: 17, cursor: 'pointer' }}>
              📤
            </button>
            <button onClick={() => toggleFavorite(tech.user_id)} style={{ background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: 20, width: 36, height: 36, fontSize: 20, cursor: 'pointer' }}>
              {isFav ? '⭐' : '☆'}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <Avatar photo={tech.avatar_url} name={tech.full_name} size={88} online={tech.is_available} />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: th.ink }}>{tech.full_name}</h2>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#475569' }}>{title}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tech.verification_status === 'verified' && <Badge color="#16a34a" textColor="#fff">✓ {t.verified}</Badge>}
              {tech.is_featured && <Badge color="#fef9c3" textColor="#92400e">⭐ {t.featured}</Badge>}
              <Badge color={tech.is_available ? '#dcfce7' : '#f1f5f9'} textColor={tech.is_available ? '#166534' : '#64748b'}>
                {tech.is_available ? `● ${t.available}` : `○ ${t.busy}`}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Stats flotantes */}
      <div style={{ display: 'flex', gap: 10, padding: '0 16px', marginTop: -42, marginBottom: 16 }}>
        {[
          { val: Number(tech.average_rating).toFixed(1), label: t.rating },
          { val: tech.total_reviews, label: t.reviews },
          { val: tech.total_jobs, label: t.jobs },
          { val: `${tech.years_experience || 0}a`, label: t.experience },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, background: th.surface, borderRadius: 14, padding: '12px 6px', textAlign: 'center', border: `1px solid ${th.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: th.text }}>{s.val}</p>
            <p style={{ margin: 0, fontSize: 10, color: th.textSec }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${th.border}`, background: th.surface, marginBottom: 0 }}>
        {[['info', 'ℹ️ Info'], ['gallery', `📸 ${t.gallery}`], ['reviews', `⭐ ${t.reviews}`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: tab === key ? 700 : 400, color: tab === key ? th.primary : th.textSec, borderBottom: tab === key ? `2.5px solid ${th.primary}` : '2.5px solid transparent', fontSize: 14, fontFamily: 'inherit' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* ── TAB INFO ── */}
        {tab === 'info' && (
          <>
            {bio && (
              <Card title={`💬 ${t.aboutMe}`}>
                <p style={{ fontSize: 14, color: th.textSec, lineHeight: 1.7, margin: 0 }}>{bio}</p>
                {tech.slogan && <p style={{ fontStyle: 'italic', color: th.primary, margin: '10px 0 0', fontSize: 13 }}>"{tech.slogan}"</p>}
              </Card>
            )}

            <Card title={`💰 ${t.priceRange}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: th.textSec, fontSize: 14 }}>{t.priceRange}</span>
                <span style={{ fontWeight: 800, color: th.primary, fontSize: 18 }}>${tech.min_price} – ${tech.max_price}</span>
              </div>
              {tech.price_unit && <p style={{ margin: '4px 0 0', fontSize: 12, color: th.textSec }}>{tech.price_unit}</p>}
            </Card>

            <Card title="📍 Ubicación y disponibilidad">
              <Row label="Ciudad" val={`${tech.city || 'Panamá'}, ${tech.province || 'Panamá'}`} />
              <Row label="Radio de servicio" val={`${tech.service_radius_km || 15} km`} />
              <Row label="Tiempo de respuesta" val={`~${tech.response_time_minutes || 60} min`} />
              {tech.address_text && <Row label="Dirección" val={tech.address_text} />}
            </Card>

            {/* Catálogo de servicios */}
            {catalog.length > 0 && (
              <Card title="💰 Servicios y precios">
                {catalog.map(item => {
                  const UNIT_ICONS_ = {
                    'por visita': '🚗', 'por hora': '⏱️', 'por servicio': '🔧',
                    'por metro2': '📐', 'por punto': '📌', 'por equipo': '🖥️',
                    'por dia': '📅', 'presupuesto': '💬',
                  }
                  const unitLabel = serviceCatalog.PRICE_UNITS.find(u => u.value === item.price_unit)
                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 0', borderBottom: `1px solid ${th.border}`,
                    }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: th.primaryLight,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20
                      }}>
                        {UNIT_ICONS_[item.price_unit] || '🔧'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: '0 0 2px', fontWeight: 600,
                          fontSize: 14, color: th.text
                        }}>{item.name}</p>
                        {item.description && (
                          <p style={{
                            margin: 0, fontSize: 11,
                            color: th.textSec
                          }}>{item.description}</p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{
                          margin: '0 0 1px', fontSize: 18,
                          fontWeight: 900, color: th.primaryText
                        }}>
                          ${Number(item.price).toFixed(2)}
                        </p>
                        <p style={{ margin: 0, fontSize: 10, color: th.textSec }}>
                          {lang === 'en' ? unitLabel?.labelEn : unitLabel?.label}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </Card>
            )}

            {/* Certificados públicos */}
            {certList.length > 0 && (
              <Card title="📜 Certificados y títulos">
                {certList.map(cert => {
                  const TYPE_ICONS = { certificate: '📜', title: '🎓', license: '🪪', course: '📚', other: '📄' }
                  const TYPE_COLORS_MAP = { certificate: '#dbeafe', title: '#ede9fe', license: '#dcfce7', course: '#fef3c7', other: '#f1f5f9' }
                  const TYPE_TEXT = { certificate: '#1e40af', title: '#5b21b6', license: '#166534', course: '#92400e', other: '#475569' }
                  return (
                    <div key={cert.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 0', borderBottom: `1px solid ${th.border}`
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background: TYPE_COLORS_MAP[cert.file_type] || '#f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                      }}>
                        {TYPE_ICONS[cert.file_type] || '📄'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 13, color: th.text }}>{cert.name}</p>
                        {cert.issuer && <p style={{ margin: 0, fontSize: 11, color: th.textSec }}>{cert.issuer}</p>}
                        {cert.issued_at && <p style={{ margin: '2px 0 0', fontSize: 11, color: th.textSec }}>
                          Emitido: {new Date(cert.issued_at + 'T00:00:00').toLocaleDateString('es-PA', { year: 'numeric', month: 'short' })}
                        </p>}
                      </div>
                      {cert.is_verified && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: '#166534',
                          background: '#dcfce7', padding: '3px 8px', borderRadius: 20, flexShrink: 0
                        }}>
                          ✓ Verificado
                        </span>
                      )}
                    </div>
                  )
                })}
              </Card>
            )}

            {(tech.instagram || tech.facebook || tech.website) && (
              <Card title="🌐 Redes sociales">
                {tech.instagram && <SocialLink icon="📸" label="Instagram" href={`https://instagram.com/${tech.instagram.replace('@', '')}`} val={tech.instagram} />}
                {tech.facebook && <SocialLink icon="👤" label="Facebook" href={tech.facebook.startsWith('http') ? tech.facebook : `https://facebook.com/${tech.facebook}`} val={tech.facebook} />}
                {tech.website && <SocialLink icon="🌐" label="Sitio web" href={tech.website} val={tech.website} />}
              </Card>
            )}
          </>
        )}

        {/* ── TAB GALERÍA ── */}
        {tab === 'gallery' && (
          <div>
            {loadingGal
              ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
              : gallery.length === 0
                ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
                    <p style={{ fontWeight: 700, fontSize: 15, color: th.text, margin: '0 0 4px' }}>
                      {lang === 'en' ? 'No work photos yet' : 'Sin fotos de trabajos aún'}
                    </p>
                    <p style={{ fontSize: 13, color: th.textSec, margin: 0 }}>
                      {lang === 'en'
                        ? 'This technician hasn\'t shared photos of completed jobs.'
                        : 'Este técnico aún no ha compartido fotos de trabajos realizados.'}
                    </p>
                  </div>
                )
                : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                    {gallery.map((img, idx) => (
                      <button key={img.id} onClick={() => setLightboxIdx(idx)}
                        style={{
                          aspectRatio: '1', borderRadius: 12, overflow: 'hidden',
                          border: `1px solid ${th.border}`, padding: 0, cursor: 'pointer',
                          background: 'none'
                        }}>
                        <img src={img.image_url} alt={img.caption || 'Trabajo'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </button>
                    ))}
                  </div>
                )
            }
          </div>
        )}

        {/* ── LIGHTBOX: ver foto en pantalla completa ── */}
        {lightboxIdx !== null && gallery[lightboxIdx] && (
          <div onClick={() => setLightboxIdx(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
              zIndex: 300, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', padding: 16
            }}>

            {/* Cerrar */}
            <button onClick={() => setLightboxIdx(null)}
              style={{
                position: 'absolute', top: 16, right: 16, width: 40, height: 40,
                borderRadius: 20, background: 'rgba(255,255,255,0.15)', border: 'none',
                color: '#fff', fontSize: 22, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>×</button>

            {/* Anterior */}
            {gallery.length > 1 && (
              <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => (i - 1 + gallery.length) % gallery.length) }}
                style={{
                  position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                  width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.15)',
                  border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>‹</button>
            )}

            {/* Imagen */}
            <img src={gallery[lightboxIdx].image_url}
              alt={gallery[lightboxIdx].caption || 'Trabajo'}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '100%', maxHeight: '78vh', borderRadius: 12,
                objectFit: 'contain'
              }} />

            {/* Siguiente */}
            {gallery.length > 1 && (
              <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => (i + 1) % gallery.length) }}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.15)',
                  border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>›</button>
            )}

            {/* Caption + contador */}
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              {gallery[lightboxIdx].caption && (
                <p style={{ color: '#fff', fontSize: 14, margin: '0 0 4px' }}>
                  {gallery[lightboxIdx].caption}
                </p>
              )}
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0 }}>
                {lightboxIdx + 1} / {gallery.length}
              </p>
            </div>
          </div>
        )}

        {/* ── TAB RESEÑAS ── */}
        {tab === 'reviews' && (
          <div>
            {/* Resumen */}
            <div style={{ background: th.surface, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${th.border}`, textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: 44, fontWeight: 900, color: th.text }}>{Number(tech.average_rating).toFixed(1)}</p>
              <StarRating rating={tech.average_rating} size={22} />
              <p style={{ margin: '8px 0 0', fontSize: 13, color: th.textSec }}>{tech.total_reviews} {t.reviews}</p>
            </div>

            {user && user.role !== 'technician' && (
              <Btn onClick={() => setShowReview(true)} variant="outline" style={{ marginBottom: 16 }}>✍️ {t.writeReview}</Btn>
            )}

            {loadingRevs
              ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
              : reviewList.length === 0
                ? <p style={{ color: th.textSec, textAlign: 'center', padding: '20px 0' }}>{t.noReviews}</p>
                : reviewList.map(r => (
                  <div key={r.id} style={{ background: th.surface, borderRadius: 14, padding: 14, marginBottom: 10, border: `1px solid ${th.border}` }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
                      <Avatar photo={r.reviewer?.avatar_url} name={r.reviewer?.full_name} size={36} />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: th.text }}>{r.reviewer?.full_name || 'Usuario'}</p>
                        <StarRating rating={r.rating} size={12} />
                      </div>
                      <span style={{ fontSize: 11, color: th.textSec }}>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.comment && <p style={{ margin: 0, fontSize: 13, color: th.textSec, lineHeight: 1.6 }}>{r.comment}</p>}
                  </div>
                ))
            }
          </div>
        )}

        {/* Botones de acción */}
        <div style={{ paddingTop: 16, paddingBottom: 24 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <Btn variant="whatsapp" style={{ flex: 2 }}
              onClick={() => window.open(`https://wa.me/${(tech.public_whatsapp || '').replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(tech.full_name)},%20vi%20tu%20perfil%20en%20Panamá%20Pro`, '_blank')}>
              📱 WhatsApp
            </Btn>
            <Btn variant="ghost" style={{ flex: 1 }}
              onClick={() => window.open(`mailto:${tech.public_email || ''}?subject=Servicio via TECNIFIX`)}>
              ✉️ Email
            </Btn>
          </div>
          <Btn onClick={() => { if (!user) { navigate('login'); return } setShowRequest(true) }} style={{ marginBottom: 10 }}>
            {t.requestService}
          </Btn>
          <Btn variant="ghost" onClick={() => { if (!user) { navigate('login'); return } setShowPayment(true) }}>
            💳 {t.payWithYappy}
          </Btn>
        </div>
      </div>

      {/* ── MODAL: Solicitud + Contrato ── */}
      {showRequest && (
        <RequestModal tech={tech} catalog={catalog} onClose={() => setShowRequest(false)}
          onSuccess={() => { setShowRequest(false); showToast(t.requestSent) }}
          t={t} th={th} user={user}
        />
      )}

      {/* ── MODAL: Pago Yappy ── */}
      {showPayment && (
        <YappyModal tech={tech} onClose={() => setShowPayment(false)}
          onSuccess={() => { setShowPayment(false); showToast(t.paymentRecorded) }}
          t={t} th={th} user={user}
        />
      )}

      {/* ── MODAL: Reseña ── */}
      {showReview && (
        <ReviewModal tech={tech} onClose={() => setShowReview(false)}
          onSuccess={() => {
            setShowReview(false)
            showToast(t.reviewSent)
            setTab('reviews')
            reviewsApi.listForTechnician(tech.user_id).then(setReviewList).catch(() => { })
          }}
          t={t} th={th} user={user}
        />
      )}
    </div>
  )
}

// ── Sub-componentes ──────────────────────────────────────────

function Card({ title, children }) {
  const { th } = useApp()
  return (
    <div style={{ background: th.surface, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${th.border}` }}>
      <p style={{ fontWeight: 700, fontSize: 15, color: th.text, margin: '0 0 12px' }}>{title}</p>
      {children}
    </div>
  )
}

function Row({ label, val }) {
  const { th } = useApp()
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${th.border}` }}>
      <span style={{ fontSize: 13, color: th.textSec }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{val}</span>
    </div>
  )
}

function SocialLink({ icon, label, href, val }) {
  const { th } = useApp()
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${th.border}`, textDecoration: 'none' }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 13, color: th.primary, fontWeight: 500 }}>{val}</span>
    </a>
  )
}

function RequestModal({ tech, catalog, onClose, onSuccess, t, th, user }) {
  const [step, setStep] = useState(1) // 1=form, 2=contract, 3=done
  const [selectedItem, setSelectedItem] = useState(null) // item del catálogo
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [address, setAddress] = useState('')
  const [price, setPrice] = useState(String(tech.min_price || ''))
  const [payMethod, setPayMethod] = useState('yappy')
  const [loading, setLoading] = useState(false)
  const [request, setRequest] = useState(null)
  const [contractAccepted, setContractAccepted] = useState(false)

  const submitRequest = async () => {
    if (!title.trim()) return
    setLoading(true)
    try {
      const req = await serviceRequests.create({
        client_id: user.id,
        technician_id: tech.user_id,
        title: title.trim(),
        description: desc.trim(),
        address: address.trim(),
        agreed_price: parseFloat(price) || null,
        payment_method: payMethod,
        status: 'pending',
        catalog_item_id: selectedItem?.id ?? null,
      })
      setRequest(req)
      setStep(2)
    } catch (e) {
      alert(t.requestError)
    } finally {
      setLoading(false)
    }
  }

  const signContract = async () => {
    setLoading(true)
    try {
      await contracts.create({
        serviceRequestId: request.id,
        clientId: user.id,
        technicianId: tech.user_id,
        clientIp: null,
      })
      setContractAccepted(true)
      setStep(3)
    } catch (e) {
      alert('Error al firmar contrato.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={step === 1 ? t.newRequest : step === 2 ? `📄 ${t.serviceContract}` : '✅'} onClose={onClose}>
      {step === 1 && (
        <>
          {/* Selector de catálogo de servicios */}
          {catalog && catalog.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: th.text, margin: '0 0 8px' }}>
                📋 Elegir del catálogo (opcional)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {/* Opción "otro servicio" */}
                <button onClick={() => { setSelectedItem(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    border: `2px solid ${!selectedItem ? th.primary : th.border}`,
                    background: !selectedItem ? th.primaryLight : 'transparent'
                  }}>
                  <span style={{ fontSize: 20 }}>✏️</span>
                  <span style={{
                    fontSize: 13, fontWeight: !selectedItem ? 700 : 500,
                    color: !selectedItem ? th.primaryText : th.text
                  }}>
                    Describir mi propio servicio
                  </span>
                </button>
                {catalog.map(item => (
                  <button key={item.id}
                    onClick={() => {
                      setSelectedItem(item)
                      setTitle(item.name)
                      setDesc(item.description || '')
                      setPrice(String(item.price))
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      border: `2px solid ${selectedItem?.id === item.id ? th.primary : th.border}`,
                      background: selectedItem?.id === item.id ? th.primaryLight : 'transparent'
                    }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: '0 0 1px', fontSize: 13, fontWeight: 600,
                        color: selectedItem?.id === item.id ? th.primaryText : th.text
                      }}>
                        {item.name}
                      </p>
                      {item.description && (
                        <p style={{ margin: 0, fontSize: 11, color: th.textSec }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{
                        margin: 0, fontSize: 15, fontWeight: 900,
                        color: th.primaryText
                      }}>${Number(item.price).toFixed(2)}</p>
                      <p style={{ margin: 0, fontSize: 10, color: th.textSec }}>
                        {item.price_unit}
                      </p>
                    </div>
                    {selectedItem?.id === item.id && (
                      <span style={{ color: th.primary, fontSize: 18, flexShrink: 0 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Input label={t.requestTitle} value={title} onChange={setTitle} placeholder="Ej: Reparación eléctrica en sala" />
          <Input label={t.requestDesc} value={desc} onChange={setDesc} placeholder="Describe el problema..." rows={3} />
          <Input label={t.requestAddress} value={address} onChange={setAddress} placeholder="Calle, barrio..." />
          <Input label={t.agreedPrice} value={price} onChange={setPrice} type="number" icon="💲" />
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: th.text, marginBottom: 6 }}>{t.paymentMethod}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['yappy', '💚 Yappy'], ['cash', '💵 ' + t.cash], ['transfer', '🏦 ' + t.transfer]].map(([v, label]) => (
                <button key={v} onClick={() => setPayMethod(v)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: `1.5px solid ${payMethod === v ? th.primary : th.border}`, background: payMethod === v ? th.primaryLight : 'transparent', color: payMethod === v ? th.primaryText : th.textSec, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Btn onClick={submitRequest} loading={loading} disabled={!title.trim()}>{t.sendRequest} →</Btn>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ background: th.surface2, borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 13, color: th.textSec, lineHeight: 1.8, maxHeight: 260, overflowY: 'auto' }}>
            <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap', fontSize: 12 }}>
              {contracts.TERMS_TEXT}
            </pre>
          </div>
          <Btn onClick={signContract} loading={loading}>{t.acceptTerms}</Btn>
        </>
      )}

      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
          <p style={{ fontWeight: 800, fontSize: 18, color: th.primary, margin: '0 0 6px' }}>{t.contractAccepted}</p>
          <p style={{ fontSize: 14, color: th.textSec, marginBottom: 24 }}>{t.nowContact}</p>
          <Btn variant="whatsapp"
            onClick={() => window.open(`https://wa.me/${(tech.public_whatsapp || '').replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(tech.full_name)},%20firmé%20el%20contrato%20en%20Panamá%20Pro.%20Necesito%20tu%20servicio.`, '_blank')}>
            {t.openWhatsApp}
          </Btn>
          <div style={{ height: 10 }} />
          <Btn variant="ghost" onClick={onSuccess}>{t.cancel === 'Cancel' ? 'Close' : 'Cerrar'}</Btn>
        </div>
      )}
    </Modal>
  )
}

function YappyModal({ tech, onClose, onSuccess, t, th, user }) {
  const [amount, setAmount] = useState(String(tech.min_price || ''))
  const [desc, setDesc] = useState(`Servicio de ${tech.professional_title || 'técnico'} - TECNIFIX`)
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [paid, setPaid] = useState(false)

  const yappyPhone = (tech.public_whatsapp || '').replace(/\D/g, '')
  const deepLink = `yappy://pay?phone=${yappyPhone}&amount=${amount}&description=${encodeURIComponent(desc.slice(0, 80))}`
  const webLink = `https://yappy.com.pa/pay?phone=${yappyPhone}&amount=${amount}&description=${encodeURIComponent(desc.slice(0, 80))}`

  const confirmPayment = async () => {
    setLoading(true)
    try {
      await payments.record({
        serviceRequestId: null,
        payerId: user.id,
        technicianId: tech.user_id,
        amount: parseFloat(amount),
        yappyPhone,
        yappyReference: reference || null,
      })
      setPaid(true)
    } catch {
      alert('Error al registrar pago.')
    } finally {
      setLoading(false)
    }
  }

  if (paid) return (
    <Modal title={t.paymentTitle} onClose={onSuccess}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>💚</div>
        <p style={{ fontWeight: 800, fontSize: 18, color: th.primary }}>{t.paymentRecorded}</p>
        <Btn onClick={onSuccess} style={{ marginTop: 20 }}>Cerrar</Btn>
      </div>
    </Modal>
  )

  return (
    <Modal title={`💳 ${t.payWithYappy}`} onClose={onClose}>
      <div style={{ background: '#f0fdf4', borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid #bbf7d0' }}>
        <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#15803d', fontSize: 14 }}>💚 Pago por Yappy</p>
        <p style={{ margin: 0, fontSize: 12, color: '#166534' }}>
          Yappy es la billetera digital más usada en Panamá. El pago va directo al técnico.
        </p>
      </div>
      <Input label={t.paymentAmount} value={amount} onChange={setAmount} type="number" icon="💲" />
      <Input label={t.paymentDesc} value={desc} onChange={setDesc} placeholder="Descripción del servicio" />
      <Input label="Número Yappy del técnico" value={yappyPhone} onChange={() => { }} placeholder="+507..." />
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <Btn variant="whatsapp" onClick={() => { window.location.href = deepLink; setTimeout(() => window.open(webLink, '_blank'), 1500) }}>
          💚 {t.openYappy}
        </Btn>
      </div>
      <div style={{ height: 1, background: th.border, margin: '16px 0' }} />
      <p style={{ fontSize: 13, color: th.textSec, margin: '0 0 10px' }}>
        ¿Ya pagaste? Confirma aquí para registrar el pago y notificar al técnico.
      </p>
      <Input label="Referencia de pago Yappy (opcional)" value={reference} onChange={setReference} placeholder="Ej: YAP-123456" />
      <Btn onClick={confirmPayment} loading={loading}>{t.confirmPayment}</Btn>
    </Modal>
  )
}

function ReviewModal({ tech, onClose, onSuccess, t, th, user }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      await reviewsApi.create({
        reviewerId: user.id,
        technicianId: tech.user_id,
        rating,
        comment: comment.trim(),
      })
      onSuccess()
    } catch {
      alert('Error al publicar reseña.')
    } finally {
      setLoading(false)
    }
  }

  const { StarRating } = {
    StarRating: (props) => {
      const { th: th2 } = useApp()
      return null
    }
  }

  return (
    <Modal title={`✍️ ${t.writeReview}`} onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: th.text, margin: '0 0 10px' }}>{t.yourRating}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <button key={i} onClick={() => setRating(i)}
              style={{ background: 'none', border: 'none', fontSize: 36, cursor: 'pointer', transition: 'transform 0.1s', transform: i <= rating ? 'scale(1.1)' : 'scale(1)', color: i <= rating ? '#fbbf24' : '#d1d5db' }}>
              ★
            </button>
          ))}
        </div>
      </div>
      <Input label={t.yourComment} value={comment} onChange={setComment} placeholder="Cuéntanos tu experiencia..." rows={4} />
      <Btn onClick={submit} loading={loading} disabled={!comment.trim()}>{t.submitReview}</Btn>
    </Modal>
  )
}