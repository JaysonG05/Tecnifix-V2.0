import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { TechnicianCard } from '../../components/TechnicianCard.jsx'
import {
  Avatar, StarRating, Badge, Btn, Input, Toggle, SkeletonCard,
  EmptyState, Modal, Toast, PageHeader, SettingsRow, StatusBadge, Spinner
} from '../../components/UI.jsx'
import {
  supabase, auth, profiles, technicians, techCategories, certificatesApi, serviceCatalog, favorites as favApi,
  serviceRequests, archiveApi, receiptsApi, admin, notifications, ai, reviews
} from '../../lib/supabase.js'
import { T } from '../../i18n/translations.js'
import { receiptActions, disputeActions } from '../../lib/payments.js'

const CAT_NAME_BY_ID = { 1: 'Climatización', 2: 'Electricidad', 3: 'Plomería', 4: 'Albañilería', 5: 'Limpieza', 6: 'Cerrajería', 7: 'Pintura', 8: 'Tecnología' }
const TECH_VERIFY_BLUE = '#1950bb'
const TECH_VERIFY_YELLOW = '#ffd23f'

const VERIFICATION_DOCS = [
  { key: 'cedula_front', label: 'Foto frontal de cédula', hint: 'Debe verse nombre, número y foto completos.', required: true },
  { key: 'cedula_back', label: 'Foto trasera de cédula', hint: 'Sube la parte de atrás de la cédula.', required: true },
  { key: 'selfie_id', label: 'Selfie sosteniendo la cédula', hint: 'Tu rostro y la cédula deben verse claros.', required: true },
  { key: 'police_record', label: 'Récord policivo', hint: 'Recomendado para generar más confianza.', required: false },
  { key: 'address_proof', label: 'Comprobante de domicilio', hint: 'Recibo de luz, agua, internet o contrato.', required: false },
  { key: 'license_or_certificate', label: 'Licencia, título o certificado', hint: 'Carnet, diploma, licencia profesional o constancia.', required: false },
]

const techFormCss = `
  .tf-tech-form-page{
    min-height:100vh;
    box-sizing:border-box;
    padding:clamp(22px,4vw,42px) 16px 92px;
    background:
      radial-gradient(circle at 8% 8%, rgba(25,80,187,.14) 0 170px, transparent 172px),
      radial-gradient(circle at 92% 0%, rgba(255,210,63,.28) 0 150px, transparent 152px),
      linear-gradient(180deg,#f8fbff 0%,#eef4ff 42%,#f6f8fc 100%);
    font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
  }
  .tf-tech-form-shell{
    width:min(1180px,100%);
    margin:0 auto;
    position:relative;
    z-index:1;
  }
  .tf-tech-form-card{
    background:#fff;
    border:1px solid #dbe7f5;
    border-radius:28px;
    box-shadow:0 28px 70px rgba(25,80,187,.14);
    padding:clamp(20px,3.5vw,42px);
  }
  .tf-tech-form-top{
    display:grid;
    grid-template-columns:1fr auto 1fr;
    align-items:center;
    gap:16px;
    margin-bottom:26px;
  }
  .tf-tech-form-top h1{
    margin:0;
    color:#111b37;
    font-size:clamp(20px,2.3vw,30px);
    font-weight:900;
    text-align:center;
    line-height:1.05;
  }
  .tf-tech-back{
    width:40px;
    height:40px;
    border-radius:50%;
    border:1px solid #e8edf5;
    background:#fff;
    color:#111b37;
    cursor:pointer;
    box-shadow:0 8px 18px rgba(15,23,42,.08);
    font-size:19px;
  }
  .tf-tech-signin{
    justify-self:end;
    border:0;
    background:none;
    color:${TECH_VERIFY_BLUE};
    font:800 12px/1 Inter,system-ui,sans-serif;
    cursor:pointer;
    padding:0;
  }
  .tf-tech-steps{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:8px;
    margin:0 auto 30px;
    max-width:700px;
    position:relative;
  }
  .tf-tech-steps::before{
    content:'';
    position:absolute;
    left:10%;
    right:10%;
    top:12px;
    height:1px;
    background:#e5eaf2;
  }
  .tf-tech-steps div{
    position:relative;
    text-align:center;
    color:#98a2b3;
    font-size:11px;
    font-weight:800;
  }
  .tf-tech-steps span{
    width:24px;
    height:24px;
    border-radius:50%;
    background:#f2f5fa;
    color:#98a2b3;
    display:grid;
    place-items:center;
    margin:0 auto 6px;
    position:relative;
    z-index:1;
  }
  .tf-tech-steps .active span{
    background:${TECH_VERIFY_BLUE};
    color:#fff;
    box-shadow:0 8px 18px rgba(25,80,187,.24);
  }
  .tf-tech-steps .active{ color:#111b37; }
  .tf-tech-form-body{ max-width:840px; margin:0 auto; }
  .tf-verify-hero{
    max-width:960px;
    margin:0 auto 18px;
    background:linear-gradient(135deg,${TECH_VERIFY_BLUE},#2d72f6);
    border-radius:26px;
    color:#fff;
    padding:clamp(20px,3vw,30px);
    display:grid;
    grid-template-columns:minmax(0,1fr) minmax(230px,310px);
    gap:22px;
    align-items:end;
    box-shadow:0 24px 54px rgba(25,80,187,.24);
    overflow:hidden;
    position:relative;
  }
  .tf-verify-hero::after{
    content:'';
    position:absolute;
    width:240px;
    height:240px;
    right:-80px;
    top:-95px;
    border-radius:50%;
    background:rgba(255,210,63,.28);
  }
  .tf-verify-hero > *{ position:relative; z-index:1; }
  .tf-verify-kicker{
    margin:0 0 8px;
    color:${TECH_VERIFY_YELLOW};
    font-size:12px;
    font-weight:950;
    text-transform:uppercase;
    letter-spacing:.12em;
  }
  .tf-verify-hero h2{
    margin:0 0 10px;
    font-size:clamp(28px,4vw,44px);
    line-height:1.03;
    font-weight:950;
  }
  .tf-verify-hero p{
    margin:0;
    color:rgba(255,255,255,.86);
    font-size:14px;
    line-height:1.55;
    font-weight:700;
  }
  .tf-verify-status-card{
    background:rgba(255,255,255,.13);
    border:1px solid rgba(255,255,255,.25);
    border-radius:20px;
    padding:16px;
    backdrop-filter:blur(10px);
  }
  .tf-verify-status-card span{
    display:block;
    color:#bfdbfe;
    font-size:12px;
    font-weight:900;
    margin-bottom:4px;
  }
  .tf-verify-status-card strong{
    display:block;
    font-size:18px;
    font-weight:950;
    margin-bottom:12px;
  }
  .tf-verify-progress{
    height:10px;
    border-radius:999px;
    background:rgba(255,255,255,.22);
    overflow:hidden;
    margin-bottom:8px;
  }
  .tf-verify-progress i{
    display:block;
    height:100%;
    border-radius:999px;
    background:${TECH_VERIFY_YELLOW};
  }
  .tf-verify-checklist{
    max-width:960px;
    margin:0 auto 18px;
    display:grid;
    grid-template-columns:repeat(3,minmax(0,1fr));
    gap:12px;
  }
  .tf-verify-step-card{
    border:1px solid #e1e9f5;
    background:#fff;
    border-radius:18px;
    padding:14px;
    text-align:left;
    cursor:pointer;
    font-family:inherit;
    box-shadow:0 12px 26px rgba(15,23,42,.05);
  }
  .tf-verify-step-card b{
    width:34px;
    height:34px;
    border-radius:12px;
    display:grid;
    place-items:center;
    margin-bottom:10px;
    background:#eef4ff;
    color:${TECH_VERIFY_BLUE};
    font-size:15px;
  }
  .tf-verify-step-card.done b{ background:#dcfce7; color:#166534; }
  .tf-verify-step-card.active b{ background:${TECH_VERIFY_BLUE}; color:#fff; }
  .tf-verify-step-card strong{
    display:block;
    color:#111b37;
    font-size:13px;
    font-weight:950;
    margin-bottom:4px;
  }
  .tf-verify-step-card span{
    display:block;
    color:#64748b;
    font-size:11px;
    line-height:1.35;
    font-weight:750;
  }
  .tf-verify-step-card.done span{ color:#166534; }
  @media (max-width:720px){
    .tf-tech-form-page{ padding:18px 10px 80px; }
    .tf-tech-form-card{ border-radius:20px; padding:20px 14px; }
    .tf-tech-form-top{ grid-template-columns:auto 1fr auto; gap:10px; }
    .tf-tech-form-top h1{ font-size:16px; }
    .tf-tech-steps{ gap:0; }
    .tf-tech-steps b{ display:none; }
    .tf-verify-hero,.tf-verify-checklist{ grid-template-columns:1fr; }
  }
`

export function EditTechProfileScreen() {
  const { th, user, navigate, lang, setSelectedTech } = useApp()
  const t = T[lang]
  const [form, setForm] = useState({
    professional_title: '', professional_title_en: '',
    bio: '', bio_en: '', slogan: '',
    years_experience: '', company_name: '', national_id: '',
    min_price: '', max_price: '', price_unit: 'por visita',
    public_phone: '', public_whatsapp: '', public_email: '',
    website: '', instagram: '', facebook: '', bank_account: '',
    address_text: '', city: 'Changuinola', province: 'Bocas del Toro',
    latitude: '9.4390', longitude: '-82.5177',
    service_radius_km: '15', response_time_minutes: '60',
    is_available: true,
  })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState(null)
  const [galleryList, setGalleryList] = useState([])
  const [selectedCatIds, setSelectedCatIds] = useState([])
  const [certList, setCertList] = useState([])
  const [verificationFiles, setVerificationFiles] = useState({})
  // "✨ Escribir por mí": notas del técnico → IA redacta su perfil.
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  // Panel del vendedor: qué secciones de su perfil público se muestran al cliente.
  const [visibility, setVisibility] = useState({ prices: true, certificates: true, social: true, gallery: true, reviews: true, contact: true })
  const [application, setApplication] = useState({
    legal_name: '',
    birth_date: '',
    work_schedule: '',
    tools: '',
    transport: '',
    references: '',
    emergency_contact: '',
    emergency_phone: '',
    accepts_background_check: false,
    accepts_data_review: false,
  })

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  const A = (k) => ({
    value: application[k],
    onChange: (v) => setApplication(a => ({ ...a, [k]: v })),
  })
  const hasVerificationDoc = (key) => certList.some(c => c.file_type === key)
  const missingRequiredDocs = () => VERIFICATION_DOCS
    .filter(d => d.required && !verificationFiles[d.key] && !hasVerificationDoc(d.key))

  const uploadVerificationDocs = async () => {
    const entries = Object.entries(verificationFiles).filter(([, file]) => file)
    if (!entries.length) return

    for (const [key, file] of entries) {
      const doc = VERIFICATION_DOCS.find(d => d.key === key)
      await certificatesApi.upload(user.id, file, {
        name: doc?.label || 'Documento de verificación',
        issuer: 'Tecnifix',
        file_type: key,
        is_public: false,
        description: doc?.hint || 'Documento privado para revisión de Tecnifix.',
      })
    }
    const updated = await certificatesApi.list(user.id)
    setCertList(updated)
    setVerificationFiles({})
  }

  // Cargar datos existentes
  useEffect(() => {
    if (!user) return
    Promise.all([
      technicians.getOne(user.id).catch(() => null),
      technicians.getGallery(user.id).catch(() => []),
      techCategories.get(user.id).catch(() => []),
      certificatesApi.list(user.id).catch(() => []),
    ]).then(([tp, gal, cats, certs]) => {
      setCertList(certs)
      // Cargar IDs de categorías existentes
      if (cats.length > 0) {
        // Convertir slugs a IDs
        const catMap = { climatizacion: 1, electricidad: 2, plomeria: 3, albanileria: 4, limpieza: 5, cerrajeria: 6, pintura: 7, tecnologia: 8 }
        setSelectedCatIds(cats.map(c => catMap[c.slug]).filter(Boolean))
      }
      if (tp) {
        setForm(f => ({
          ...f,
          professional_title: tp.professional_title || '',
          professional_title_en: tp.professional_title_en || '',
          bio: tp.bio || '',
          bio_en: tp.bio_en || '',
          slogan: tp.slogan || '',
          years_experience: String(tp.years_experience || ''),
          company_name: tp.company_name || '',
          national_id: tp.national_id || '',
          min_price: String(tp.min_price || ''),
          max_price: String(tp.max_price || ''),
          price_unit: tp.price_unit || 'por visita',
          public_phone: tp.public_phone || '',
          public_whatsapp: tp.public_whatsapp || '',
          public_email: tp.public_email || '',
          website: tp.website || '',
          instagram: tp.instagram || '',
          facebook: tp.facebook || '',
          address_text: tp.address_text || '',
          city: tp.city || 'Changuinola',
          province: tp.province || 'Bocas del Toro',
          latitude: String(tp.latitude || '9.4390'),
          longitude: String(tp.longitude || '-82.5177'),
          service_radius_km: String(tp.service_radius_km || '15'),
          response_time_minutes: String(tp.response_time_minutes || '60'),
          is_available: tp.is_available !== false,
          bank_account: tp.bank_account || '',
        }))
        if (tp.profile_visibility && typeof tp.profile_visibility === 'object') {
          setVisibility(v => ({ ...v, ...tp.profile_visibility }))
        }
        if (tp.application_data && typeof tp.application_data === 'object') {
          // No re-cargamos submitted_at en el formulario; solo los campos editables.
          const { submitted_at, ...appFields } = tp.application_data
          setApplication(a => ({ ...a, ...appFields }))
        }
      }
      setGalleryList(gal)
    }).finally(() => setFetching(false))
  }, [user])

  const handleGenerateBio = async () => {
    if (!aiInput.trim() && selectedCatIds.length === 0) {
      showToast('Escribe unas notas o elige al menos una categoría primero.', 'error')
      return
    }
    setAiLoading(true)
    try {
      const trades = selectedCatIds.map(id => CAT_NAME_BY_ID[id]).filter(Boolean)
      // Datos reales del técnico para que la IA dé credibilidad basada en hechos.
      // Si algo falla (perfil nuevo, vista sin stats), seguimos sin métricas.
      const [tp, techReviews] = await Promise.all([
        technicians.getOne(user.id).catch(() => null),
        reviews.listForTechnician(user.id, 12).catch(() => []),
      ])
      const res = await ai.generateBio({
        name: user?.full_name || '',
        trades,
        years_experience: form.years_experience,
        city: form.city,
        notes: aiInput.trim(),
        average_rating: tp?.average_rating ?? null,
        total_reviews: tp?.total_reviews ?? null,
        total_jobs: tp?.total_jobs ?? null,
        response_time_minutes: form.response_time_minutes || tp?.response_time_minutes || null,
        reviews: (techReviews || []).map(r => ({ rating: r.rating, comment: r.comment })),
      })
      setForm(f => ({
        ...f,
        professional_title: res.professional_title || f.professional_title,
        professional_title_en: res.professional_title_en || f.professional_title_en,
        slogan: res.slogan || f.slogan,
        bio: res.bio || f.bio,
        bio_en: res.bio_en || f.bio_en,
      }))
      showToast('Listo: completé tu título, bio y slogan. Ajusta lo que quieras.')
    } catch (err) {
      console.error('generateBio error:', err)
      showToast('El asistente IA aún no está disponible. Despliega la función generate-bio en Supabase.', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSave = async () => {
    if (selectedCatIds.length === 0) {
      showToast('Selecciona al menos una categoria.', 'error')
      return
    }
    if (!form.professional_title.trim()) {
      showToast('Escribe tu título profesional.', 'error')
      return
    }
    if (!form.national_id.trim()) {
      showToast('Escribe tu número de cédula.', 'error')
      return
    }
    if (!form.public_whatsapp.trim()) {
      showToast('Agrega un WhatsApp público para que el cliente pueda contactarte.', 'error')
      return
    }
    const missingDocs = missingRequiredDocs()
    if (missingDocs.length > 0) {
      showToast(`Falta subir: ${missingDocs.map(d => d.label).join(', ')}.`, 'error')
      return
    }
    if (!application.accepts_background_check || !application.accepts_data_review) {
      showToast('Debes aceptar la revisión de identidad y datos para enviar la postulación.', 'error')
      return
    }
    setLoading(true)
    try {
      // 1. Preparar datos
      const payload = {
        ...form,
        category_id: selectedCatIds[0] ?? null,
        years_experience: parseInt(form.years_experience) || 0,
        min_price: parseFloat(form.min_price) || null,
        max_price: parseFloat(form.max_price) || null,
        latitude: parseFloat(form.latitude) || 9.4390,
        longitude: parseFloat(form.longitude) || -82.5177,
        service_radius_km: parseFloat(form.service_radius_km) || 15,
        response_time_minutes: parseInt(form.response_time_minutes) || 60,
        verification_status: 'pending_review',
      }

      // 2. Guardar perfil
      const exists = await technicians.getOne(user.id).catch(() => null)
      if (exists) {
        await technicians.update(user.id, payload)
      } else {
        await technicians.create(user.id, payload)
      }

      // 3. Guardar categorias multiples
      await techCategories.set(user.id, selectedCatIds)
      await uploadVerificationDocs()

      // 4. Guardar visibilidad del perfil (no rompe si aún no corres el SQL)
      try {
        await supabase.from('technician_profiles').update({ profile_visibility: visibility }).eq('user_id', user.id)
      } catch { /* columna profile_visibility aún no existe; se ignora */ }

      // 5. Guardar datos de la postulación para que el admin los revise
      //    (no rompe si aún no corres add_application_data.sql)
      try {
        await supabase.from('technician_profiles')
          .update({ application_data: { ...application, submitted_at: new Date().toISOString() } })
          .eq('user_id', user.id)
      } catch { /* columna application_data aún no existe; se ignora */ }

      showToast('Postulación enviada a revisión. El dueño/admin decidirá si te admite.')
    } catch (err) {
      console.error('Error guardando perfil tecnico:', err)
      showToast('Error al guardar: ' + (err?.message ?? 'intenta de nuevo.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files.slice(0, 5)) {
        await technicians.uploadGalleryImage(user.id, file)
      }
      const gal = await technicians.getGallery(user.id)
      setGalleryList(gal)
      showToast('Fotos subidas.')
    } catch {
      showToast('Error al subir fotos.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteGallery = async (imageId) => {
    try {
      await technicians.deleteGalleryImage(imageId)
      setGalleryList(g => g.filter(x => x.id !== imageId))
    } catch {
      showToast('Error al eliminar.', 'error')
    }
  }

  // Helper estable: NO definir componentes aquí dentro, solo funciones de valor
  const field = (k) => ({
    value: form[k],
    onChange: (v) => setForm(f => ({ ...f, [k]: v })),
  })

  if (fetching) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>

  // Estilos de sección como objeto, no como componente (evita remount)
  const sectionStyle = {
    background: '#f8fafc', borderRadius: 20,
    padding: 20, marginBottom: 16, border: '1px solid #e8edf5',
  }
  const sectionTitle = {
    fontWeight: 900, fontSize: 15, color: '#111b37', margin: '0 0 16px',
  }

  // Vista previa: arma un objeto técnico con los datos actuales del formulario
  // y abre el perfil público tal como lo verá un cliente al tocar la tarjeta.
  const previewProfile = () => {
    const CAT_SLUG_BY_ID = { 1: 'climatizacion', 2: 'electricidad', 3: 'plomeria', 4: 'albanileria', 5: 'limpieza', 6: 'cerrajeria', 7: 'pintura', 8: 'tecnologia' }
    const CAT_NAME = { climatizacion: 'Climatización', electricidad: 'Electricidad', plomeria: 'Plomería', albanileria: 'Albañilería', limpieza: 'Limpieza', cerrajeria: 'Cerrajería', pintura: 'Pintura', tecnologia: 'Tecnología' }
    const slugs = selectedCatIds.map(id => CAT_SLUG_BY_ID[id]).filter(Boolean)
    setSelectedTech({
      user_id: user.id,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      professional_title: form.professional_title,
      bio: form.bio,
      slogan: form.slogan,
      category_slug: slugs[0] || null,
      category_slugs: slugs,
      category_name_es: CAT_NAME[slugs[0]] || 'Técnico',
      city: form.city,
      province: form.province,
      min_price: form.min_price ? Number(form.min_price) : null,
      max_price: form.max_price ? Number(form.max_price) : null,
      public_whatsapp: form.public_whatsapp,
      public_email: form.public_email,
      instagram: form.instagram,
      website: form.website,
      facebook: form.facebook,
      years_experience: Number(form.years_experience) || 0,
      response_time_minutes: Number(form.response_time_minutes) || 60,
      service_radius_km: Number(form.service_radius_km) || 15,
      is_available: form.is_available,
      verification_status: 'pending_review',
      average_rating: 0,
      total_reviews: 0,
      total_jobs: 0,
      national_id: form.national_id,
      profile_visibility: visibility,
    })
    navigate('tech-profile')
  }

  const requiredDocsMissing = missingRequiredDocs()
  const verificationOverview = [
    {
      key: 'account',
      icon: '👤',
      title: 'Cuenta básica',
      text: user?.full_name && user?.email ? 'Datos principales listos' : 'Completa nombre y correo',
      done: Boolean(user?.full_name && user?.email),
      target: 'verify-account',
    },
    {
      key: 'professional',
      icon: '🛠️',
      title: 'Perfil profesional',
      text: form.professional_title && form.bio ? 'Título y descripción listos' : 'Agrega título, bio y experiencia',
      done: Boolean(form.professional_title && form.bio),
      target: 'verify-professional',
    },
    {
      key: 'identity',
      icon: '🪪',
      title: 'Identidad y documentos',
      text: requiredDocsMissing.length === 0 ? 'Documentos obligatorios cargados' : `${requiredDocsMissing.length} documento(s) faltante(s)`,
      done: requiredDocsMissing.length === 0,
      target: 'verify-identity',
    },
    {
      key: 'categories',
      icon: '🗂️',
      title: 'Categorías',
      text: selectedCatIds.length ? `${selectedCatIds.length} categoría(s) seleccionada(s)` : 'Selecciona tus oficios',
      done: selectedCatIds.length > 0,
      target: 'verify-categories',
    },
    {
      key: 'coverage',
      icon: '📍',
      title: 'Área de cobertura',
      text: form.province && form.city ? `${form.city}, ${form.province}` : 'Define dónde trabajas',
      done: Boolean(form.province && form.city),
      target: 'verify-coverage',
    },
    {
      key: 'consent',
      icon: '✅',
      title: 'Consentimiento',
      text: application.accepts_background_check && application.accepts_data_review ? 'Autorizaciones aceptadas' : 'Acepta revisión y veracidad',
      done: Boolean(application.accepts_background_check && application.accepts_data_review),
      target: 'verify-identity',
    },
  ]
  const overviewDone = verificationOverview.filter(item => item.done).length
  const overviewProgress = Math.round((overviewDone / verificationOverview.length) * 100)
  const statusText = overviewProgress === 100 ? 'Listo para enviar a revisión' : 'Verificación incompleta'
  const scrollToSection = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="tf-tech-form-page">
      <style>{techFormCss}</style>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="tf-tech-form-shell">
        <div className="tf-tech-form-card">
          <div className="tf-tech-form-top">
            <button onClick={() => navigate('profile')} className="tf-tech-back" aria-label="Volver">←</button>
            <h1>Centro de Verificación de Técnicos</h1>
            <button onClick={() => navigate('home')} className="tf-tech-signin">Inicio</button>
          </div>

          <div className="tf-tech-steps" aria-hidden="true">
            <div className="active"><span>1</span><b>Cuenta</b></div>
            <div className="active"><span>2</span><b>Perfil</b></div>
            <div className={overviewProgress >= 65 ? 'active' : ''}><span>3</span><b>Documentos</b></div>
            <div><span>4</span><b>Publicación</b></div>
          </div>

          <section className="tf-verify-hero">
            <div>
              <p className="tf-verify-kicker">Verificación por aprobación del dueño</p>
              <h2>Completa tu expediente para poder entrar al panel técnico</h2>
              <p>
                Esta pantalla reemplaza el formulario viejo: aquí completas perfil, identidad,
                documentos, cobertura y consentimiento para que Tecnifix pueda revisarte y admitirte.
              </p>
            </div>
            <div className="tf-verify-status-card">
              <span>Estado actual</span>
              <strong>{statusText}</strong>
              <div className="tf-verify-progress"><i style={{ width: `${overviewProgress}%` }} /></div>
              <p>{overviewProgress}% completado · {overviewDone}/{verificationOverview.length} pasos básicos listos</p>
            </div>
          </section>

          <section className="tf-verify-checklist" aria-label="Checklist de verificación">
            {verificationOverview.map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => scrollToSection(item.target)}
                className={`tf-verify-step-card ${item.done ? 'done' : 'active'}`}
              >
                <b>{item.done ? '✓' : item.icon}</b>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </button>
            ))}
          </section>

          <div className="tf-tech-form-body">
        {/* Disponibilidad */}
        <div id="verify-account" style={{ background: '#f8fbff', borderRadius: 18, padding: '14px 16px', marginBottom: 16, border: `1px solid #cfe0f7`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: th.text }}>Estado de disponibilidad</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: form.is_available ? th.primary : th.textSec }}>{form.is_available ? '● Disponible para trabajos' : '○ No disponible'}</p>
          </div>
          <Toggle value={form.is_available} onChange={v => setForm(f => ({ ...f, is_available: v }))} />
        </div>

        {/* Perfil profesional */}
        <div id="verify-professional" style={sectionStyle}>
          <p style={sectionTitle}>🛠️ Perfil profesional</p>

          {/* ✨ Escribir por mí: la IA redacta título, bio (ES/EN) y slogan */}
          <div style={{ background: th.surface2, border: `1.5px dashed ${th.primary}`, borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 13, color: th.text }}>✨ Escribir por mí</p>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: th.textSec, lineHeight: 1.5 }}>
              Escribe unas notas (oficio, años, lo que te diferencia) y la IA redacta tu título, bio en español e inglés, y tu slogan.
            </p>
            <Input rows={3} placeholder="Ej: 8 años en aires acondicionados, atiendo emergencias, doy garantía de 30 días..." value={aiInput} onChange={setAiInput} />
            <Btn variant="ghost" onClick={handleGenerateBio} loading={aiLoading}>✨ Generar con IA</Btn>
          </div>

          <Input label="Título profesional (ES)" placeholder="Electricista profesional certificado" {...field('professional_title')} />
          <Input label="Professional title (EN)" placeholder="Certified professional electrician"  {...field('professional_title_en')} />
          <Input label={`${t.bio} (ES)`} placeholder="Tu descripción en español..." rows={3}      {...field('bio')} />
          <Input label={`${t.bio} (EN)`} placeholder="Your description in English..." rows={3}    {...field('bio_en')} />
          <Input label={t.slogan} placeholder="Tu frase profesional"                        {...field('slogan')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label={t.yearsExp} type="number" {...field('years_experience')} />
            <Input label={t.nationalId} placeholder="8-123-456" {...field('national_id')} />
          </div>
          <Input label={t.company} placeholder="Nombre de tu empresa (opcional)" {...field('company_name')} />
        </div>

        {/* Postulación y verificación */}
        <div id="verify-identity" style={{ ...sectionStyle, borderColor: '#bfdbfe', background: 'linear-gradient(180deg,#f8fbff,#fff)' }}>
          <p style={sectionTitle}>✅ Formulario para ser aceptado en Tecnifix</p>
          <p style={{ margin: '-6px 0 16px', fontSize: 12, color: th.textSec, lineHeight: 1.6 }}>
            Completa estos datos y documentos para que Tecnifix revise tu identidad, experiencia y seguridad antes de mostrar tu perfil como aceptado.
          </p>

          <Input label="Nombre legal como aparece en la cédula" placeholder="Nombre completo legal" {...A('legal_name')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Fecha de nacimiento" type="date" {...A('birth_date')} />
            <Input label="Horario disponible" placeholder="Lun-Sáb 8am-6pm" {...A('work_schedule')} />
          </div>
          <Input label="Herramientas y equipo que tienes" rows={3} placeholder="Ej: escalera, multímetro, taladro, máquina de soldar..." {...A('tools')} />
          <Input label="Transporte o movilidad" placeholder="Auto propio, moto, bus, taxi, solo zona cercana..." {...A('transport')} />
          <Input label="Referencias laborales" rows={3} placeholder="Nombre, teléfono y relación de 1 o 2 clientes/empleadores anteriores." {...A('references')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Contacto de emergencia" placeholder="Nombre y parentesco" {...A('emergency_contact')} />
            <Input label="Teléfono de emergencia" placeholder="+507 6000-0000" {...A('emergency_phone')} />
          </div>

          <div style={{ marginTop: 8 }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: th.text }}>Documentos de verificación</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {VERIFICATION_DOCS.map(doc => (
                <FileUploadBox
                  key={doc.key}
                  doc={doc}
                  file={verificationFiles[doc.key]}
                  uploaded={hasVerificationDoc(doc.key)}
                  onChange={(file) => setVerificationFiles(f => ({ ...f, [doc.key]: file }))}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            {[
              ['accepts_background_check', 'Autorizo a Tecnifix a revisar mi identidad, referencias y documentos para decidir si puedo brindar servicios en la plataforma.'],
              ['accepts_data_review', 'Confirmo que la información enviada es real y acepto que mi perfil quede pendiente hasta revisión.'],
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', background: th.surface2, border: `1px solid ${th.border}`, borderRadius: 12, padding: 12 }}>
                <input
                  type="checkbox"
                  checked={application[key]}
                  onChange={(e) => setApplication(a => ({ ...a, [key]: e.target.checked }))}
                  style={{ marginTop: 2, accentColor: th.primary }}
                />
                <span style={{ fontSize: 12, color: th.textSec, lineHeight: 1.5 }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Categorías de servicio */}
        <div id="verify-categories" style={sectionStyle}>
          <p style={sectionTitle}>🗂️ Categorías de servicio</p>
          <p style={{ margin: '-6px 0 14px', fontSize: 12, color: th.textSec }}>
            Selecciona todos los servicios que ofreces (puedes elegir varios)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { id: 1, slug: 'climatizacion', icon: '❄️', nameEs: 'Climatización', nameEn: 'A/C & Cooling', color: '#dbeafe' },
              { id: 2, slug: 'electricidad', icon: '⚡', nameEs: 'Electricidad', nameEn: 'Electrical', color: '#fef9c3' },
              { id: 3, slug: 'plomeria', icon: '🔧', nameEs: 'Plomería', nameEn: 'Plumbing', color: '#e0f2fe' },
              { id: 4, slug: 'albanileria', icon: '🧱', nameEs: 'Albañilería', nameEn: 'Masonry', color: '#fef3c7' },
              { id: 5, slug: 'limpieza', icon: '🧹', nameEs: 'Limpieza', nameEn: 'Cleaning', color: '#d1fae5' },
              { id: 6, slug: 'cerrajeria', icon: '🔐', nameEs: 'Cerrajería', nameEn: 'Locksmith', color: '#ede9fe' },
              { id: 7, slug: 'pintura', icon: '🎨', nameEs: 'Pintura', nameEn: 'Painting', color: '#fce7f3' },
              { id: 8, slug: 'tecnologia', icon: '💻', nameEs: 'Técnico PC', nameEn: 'PC Tech', color: '#e0f2fe' },
            ].map(cat => {
              const active = selectedCatIds.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatIds(prev =>
                    prev.includes(cat.id)
                      ? prev.filter(x => x !== cat.id)
                      : [...prev, cat.id]
                  )}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${active ? th.primary : th.border}`,
                    background: active ? th.primaryLight : cat.color + '66',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: 22 }}>{cat.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? th.primaryText : '#334155', textAlign: 'left', lineHeight: 1.2 }}>
                    {lang === 'en' ? cat.nameEn : cat.nameEs}
                  </span>
                  {active && (
                    <span style={{ marginLeft: 'auto', fontSize: 16, color: th.primary }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>
          {selectedCatIds.length === 0 && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: th.red }}>
              ⚠️ Selecciona al menos una categoría para aparecer en las búsquedas.
            </p>
          )}
          {selectedCatIds.length > 0 && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: th.primary, fontWeight: 600 }}>
              ✓ {selectedCatIds.length} categoría{selectedCatIds.length > 1 ? 's' : ''} seleccionada{selectedCatIds.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Ubicación y zona */}
        <div id="verify-coverage" style={sectionStyle}>
          <p style={sectionTitle}>📍 Ubicación y zona</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label={t.city} placeholder="Changuinola"    {...field('city')} />
            <Input label={t.province} placeholder="Bocas del Toro" {...field('province')} />
          </div>
          <Input label={t.address} placeholder="Calle, barrio..." {...field('address_text')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Latitud" type="number" {...field('latitude')} />
            <Input label="Longitud" type="number" {...field('longitude')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label={t.serviceRadius} type="number" {...field('service_radius_km')} />
            <Input label={t.responseTime} type="number" {...field('response_time_minutes')} />
          </div>
        </div>

        {/* Contacto público */}
        <div style={sectionStyle}>
          <p style={sectionTitle}>📱 Contacto público</p>
          <Input label="Número de cuenta bancaria (para transferencias)"
            placeholder="Banco General · Cta 001-123456-7" {...field('bank_account')} />
          <p style={{ fontSize: 11, color: th.textSec, margin: '-8px 0 14px' }}>
            Los clientes verán este número al pagar por transferencia. No compartas CVC ni contraseñas.
          </p>
          <Input label={t.whatsappPublic} placeholder="50761234567"       {...field('public_whatsapp')} />
          <Input label={t.emailPublic} type="email" placeholder="tu@email.com" {...field('public_email')} />
          <Input label={t.phone} placeholder="+507 6000-0000"    {...field('public_phone')} />
          <Input label={t.instagram} placeholder="@usuario"          {...field('instagram')} />
          <Input label={t.facebook} placeholder="facebook.com/..."  {...field('facebook')} />
          <Input label={t.website} placeholder="https://..."       {...field('website')} />
        </div>

        {/* Galería */}
        <div id="verify-portfolio" style={sectionStyle}>
          <p style={sectionTitle}>📸 {t.galleryWork}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            {galleryList.map(img => (
              <div key={img.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: `1px solid ${th.border}` }}>
                <img src={img.image_url} alt="Trabajo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => handleDeleteGallery(img.id)}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', borderRadius: 10, width: 24, height: 24, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ×
                </button>
              </div>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: th.surface2, borderRadius: 12, border: `2px dashed ${th.border}`, cursor: 'pointer', fontSize: 14, color: th.textSec, fontWeight: 600 }}>
            {uploading ? <Spinner size={20} /> : '📷'} {uploading ? 'Subiendo...' : t.addPhoto}
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleGalleryUpload} disabled={uploading} />
          </label>
        </div>

        {/* Panel del vendedor: qué se muestra en el perfil público */}
        <div style={{ background: th.surface, borderRadius: 16, padding: '14px 16px', marginBottom: 14, border: `1px solid ${th.border}` }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 15, color: th.text }}>👁️ Qué se muestra en tu perfil</p>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: th.textSec }}>Elige qué ven los clientes cuando abren tu perfil.</p>
          {[
            ['prices', 'Precios y servicios'],
            ['gallery', 'Galería de trabajos'],
            ['certificates', 'Certificados y títulos'],
            ['reviews', 'Reseñas de clientes'],
          ].map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderTop: `1px solid ${th.border}` }}>
              <span style={{ fontSize: 14, color: th.text }}>{label}</span>
              <Toggle value={visibility[key] !== false} onChange={v => setVisibility(s => ({ ...s, [key]: v }))} />
            </div>
          ))}
        </div>

        <Btn variant="ghost" onClick={previewProfile} style={{ marginBottom: 10 }}>👁️ Vista previa — Así te ven los clientes</Btn>
        <Btn onClick={handleSave} loading={loading}>Enviar postulación a revisión</Btn>
        <p style={{ margin: '12px 2px 0', fontSize: 12, color: th.textSec, lineHeight: 1.5 }}>
          Cuando envíes la postulación, el dueño/admin podrá revisarla, aprobarla o pedir correcciones.
        </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FileUploadBox({ doc, file, uploaded, onChange }) {
  const { th } = useApp()
  const ready = Boolean(file || uploaded)
  return (
    <label style={{
      display: 'block',
      border: `1.5px dashed ${ready ? TECH_VERIFY_BLUE : '#d8e1ef'}`,
      background: ready ? '#f8fbff' : '#fff',
      borderRadius: 18,
      padding: 14,
      cursor: 'pointer',
      minHeight: 142,
      boxShadow: ready ? '0 10px 24px rgba(25,80,187,.10)' : '0 8px 20px rgba(15,23,42,.04)',
    }}>
      <input
        type="file"
        accept="image/*,.pdf"
        style={{ display: 'none' }}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ width: 42, height: 42, borderRadius: 16, background: ready ? TECH_VERIFY_BLUE : '#f3f6fb', color: ready ? '#fff' : th.textSec, display: 'grid', placeItems: 'center', fontSize: 22 }}>{ready ? '✓' : '📄'}</span>
        {doc.required && (
          <span style={{ fontSize: 10, fontWeight: 800, color: '#92400e', background: '#fef3c7', borderRadius: 999, padding: '3px 7px' }}>
            Obligatorio
          </span>
        )}
      </div>
      <p style={{ margin: '12px 0 4px', color: '#111b37', fontSize: 13, fontWeight: 900, lineHeight: 1.25 }}>{doc.label}</p>
      <p style={{ margin: 0, color: th.textSec, fontSize: 11, lineHeight: 1.45 }}>{doc.hint}</p>
      <p style={{ margin: '10px 0 0', color: ready ? th.primary : th.textSec, fontSize: 11, fontWeight: 700, lineHeight: 1.3 }}>
        {file ? file.name : uploaded ? 'Documento ya subido' : 'Toca para subir foto o PDF'}
      </p>
    </label>
  )
}

// ─────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────
