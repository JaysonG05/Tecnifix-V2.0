// ─────────────────────────────────────────────
// MODO DEMO — datos de ejemplo y query-builder simulado
// Se activa automáticamente cuando faltan credenciales de Supabase.
// Permite navegar toda la app (home, búsqueda, mapa, perfiles, reseñas)
// sin backend real. NO persiste cambios.
// ─────────────────────────────────────────────

const AVATARS = [
  'https://i.pravatar.cc/300?img=12',
  'https://i.pravatar.cc/300?img=32',
  'https://i.pravatar.cc/300?img=5',
  'https://i.pravatar.cc/300?img=45',
  'https://i.pravatar.cc/300?img=15',
  'https://i.pravatar.cc/300?img=60',
]

// Coordenadas alrededor de Changuinola, Bocas del Toro, Panamá
const BASE_LAT = 9.4302
const BASE_LNG = -82.5176

export const demoCategories = [
  { id: 'c1', slug: 'climatizacion', name_es: 'Climatización', name_en: 'A/C', icon: '❄️', color: '#dbeafe' },
  { id: 'c2', slug: 'electricidad', name_es: 'Electricidad', name_en: 'Electrical', icon: '⚡', color: '#fef9c3' },
  { id: 'c3', slug: 'plomeria', name_es: 'Plomería', name_en: 'Plumbing', icon: '🔧', color: '#e0f2fe' },
  { id: 'c4', slug: 'albanileria', name_es: 'Albañilería', name_en: 'Masonry', icon: '🧱', color: '#fef3c7' },
  { id: 'c5', slug: 'limpieza', name_es: 'Limpieza', name_en: 'Cleaning', icon: '🧹', color: '#d1fae5' },
  { id: 'c6', slug: 'cerrajeria', name_es: 'Cerrajería', name_en: 'Locksmith', icon: '🔐', color: '#ede9fe' },
  { id: 'c7', slug: 'pintura', name_es: 'Pintura', name_en: 'Painting', icon: '🎨', color: '#fce7f3' },
  { id: 'c8', slug: 'tecnologia', name_es: 'Técnico PC', name_en: 'PC Tech', icon: '💻', color: '#e0f2fe' },
]

export const demoTechnicians = [
  {
    user_id: 't1', full_name: 'Carlos Mendoza',
    professional_title: 'Técnico en Aire Acondicionado', professional_title_en: 'A/C Technician',
    slogan: 'Frío garantizado en menos de 24h', bio: 'Más de 12 años instalando y reparando equipos de climatización residencial y comercial en toda la región de Bocas del Toro.',
    bio_en: '12+ years installing and repairing residential and commercial A/C systems across Bocas del Toro.',
    avatar_url: AVATARS[0], category_slug: 'climatizacion', category_slugs: ['climatizacion', 'electricidad'],
    category_color: '#dbeafe', average_rating: 4.9, total_reviews: 87, total_jobs: 213, years_experience: 12,
    min_price: 25, max_price: 350, price_unit: 'servicio', is_available: true, is_featured: true,
    verification_status: 'verified', response_time_minutes: 30, service_radius_km: 25,
    whatsapp_phone: '50760001111', public_whatsapp: '50760001111', public_email: 'carlos@demo.pa',
    instagram: 'carlosfrio', facebook: 'carlosfrio', website: 'https://demo.pa',
    address_text: 'Finca 30, Changuinola', city: 'Changuinola', province: 'Bocas del Toro',
    lat: BASE_LAT + 0.004, lng: BASE_LNG + 0.003,
  },
  {
    user_id: 't2', full_name: 'María Batista',
    professional_title: 'Electricista Certificada', professional_title_en: 'Certified Electrician',
    slogan: 'Instalaciones seguras y a tiempo', bio: 'Electricista residencial y comercial. Especialista en paneles, cableado y energía solar.',
    bio_en: 'Residential and commercial electrician. Specialist in panels, wiring and solar.',
    avatar_url: AVATARS[1], category_slug: 'electricidad', category_slugs: ['electricidad'],
    category_color: '#fef9c3', average_rating: 4.8, total_reviews: 64, total_jobs: 150, years_experience: 9,
    min_price: 20, max_price: 500, price_unit: 'servicio', is_available: true, is_featured: true,
    verification_status: 'verified', response_time_minutes: 45, service_radius_km: 20,
    whatsapp_phone: '50760002222', public_whatsapp: '50760002222', public_email: 'maria@demo.pa',
    instagram: 'mariaelec', facebook: 'mariaelec', website: '',
    address_text: 'Barrio Francés, Changuinola', city: 'Changuinola', province: 'Bocas del Toro',
    lat: BASE_LAT - 0.005, lng: BASE_LNG + 0.002,
  },
  {
    user_id: 't3', full_name: 'José Rodríguez',
    professional_title: 'Plomero Profesional', professional_title_en: 'Professional Plumber',
    slogan: 'Sin fugas, sin sorpresas', bio: 'Reparación de fugas, instalación de tuberías y sistemas de agua. Servicio de emergencia 24/7.',
    bio_en: 'Leak repair, pipe installation and water systems. 24/7 emergency service.',
    avatar_url: AVATARS[2], category_slug: 'plomeria', category_slugs: ['plomeria'],
    category_color: '#e0f2fe', average_rating: 4.7, total_reviews: 41, total_jobs: 98, years_experience: 7,
    min_price: 15, max_price: 250, price_unit: 'servicio', is_available: false, is_featured: true,
    verification_status: 'verified', response_time_minutes: 60, service_radius_km: 15,
    whatsapp_phone: '50760003333', public_whatsapp: '50760003333', public_email: 'jose@demo.pa',
    instagram: '', facebook: 'joseplomeria', website: '',
    address_text: 'Empalme, Changuinola', city: 'Changuinola', province: 'Bocas del Toro',
    lat: BASE_LAT + 0.006, lng: BASE_LNG - 0.004,
  },
  {
    user_id: 't4', full_name: 'Ana Gómez',
    professional_title: 'Servicios de Limpieza', professional_title_en: 'Cleaning Services',
    slogan: 'Tu hogar impecable', bio: 'Limpieza profunda de hogares y oficinas. Equipo confiable y productos ecológicos.',
    bio_en: 'Deep cleaning for homes and offices. Reliable team and eco-friendly products.',
    avatar_url: AVATARS[3], category_slug: 'limpieza', category_slugs: ['limpieza'],
    category_color: '#d1fae5', average_rating: 5.0, total_reviews: 52, total_jobs: 120, years_experience: 5,
    min_price: 30, max_price: 120, price_unit: 'servicio', is_available: true, is_featured: false,
    verification_status: 'verified', response_time_minutes: 90, service_radius_km: 18,
    whatsapp_phone: '50760004444', public_whatsapp: '50760004444', public_email: 'ana@demo.pa',
    instagram: 'analimpio', facebook: '', website: '',
    address_text: 'Finca 6, Changuinola', city: 'Changuinola', province: 'Bocas del Toro',
    lat: BASE_LAT - 0.003, lng: BASE_LNG - 0.005,
  },
  {
    user_id: 't5', full_name: 'Luis Ortega',
    professional_title: 'Técnico de Computadoras', professional_title_en: 'Computer Technician',
    slogan: 'Tu PC como nueva', bio: 'Reparación de laptops y PCs, recuperación de datos, redes y soporte remoto.',
    bio_en: 'Laptop and PC repair, data recovery, networking and remote support.',
    avatar_url: AVATARS[4], category_slug: 'tecnologia', category_slugs: ['tecnologia', 'electricidad'],
    category_color: '#e0f2fe', average_rating: 4.6, total_reviews: 38, total_jobs: 75, years_experience: 6,
    min_price: 10, max_price: 200, price_unit: 'servicio', is_available: true, is_featured: false,
    verification_status: 'pending', response_time_minutes: 40, service_radius_km: 30,
    whatsapp_phone: '50760005555', public_whatsapp: '50760005555', public_email: 'luis@demo.pa',
    instagram: '', facebook: '', website: 'https://demo.pa',
    address_text: 'Centro, Changuinola', city: 'Changuinola', province: 'Bocas del Toro',
    lat: BASE_LAT + 0.002, lng: BASE_LNG + 0.006,
  },
  {
    user_id: 't6', full_name: 'Pedro Sánchez',
    professional_title: 'Pintor y Acabados', professional_title_en: 'Painter & Finishes',
    slogan: 'Color que transforma', bio: 'Pintura residencial y comercial, acabados decorativos e impermeabilización.',
    bio_en: 'Residential and commercial painting, decorative finishes and waterproofing.',
    avatar_url: AVATARS[5], category_slug: 'pintura', category_slugs: ['pintura', 'albanileria'],
    category_color: '#fce7f3', average_rating: 4.5, total_reviews: 29, total_jobs: 60, years_experience: 8,
    min_price: 40, max_price: 600, price_unit: 'proyecto', is_available: true, is_featured: false,
    verification_status: 'verified', response_time_minutes: 120, service_radius_km: 22,
    whatsapp_phone: '50760006666', public_whatsapp: '50760006666', public_email: 'pedro@demo.pa',
    instagram: 'pedropinta', facebook: 'pedropinta', website: '',
    address_text: 'Finca 12, Changuinola', city: 'Changuinola', province: 'Bocas del Toro',
    lat: BASE_LAT - 0.006, lng: BASE_LNG + 0.005,
  },
]

const REVIEWER_NAMES = ['Roberto P.', 'Lucía M.', 'Daniel V.', 'Carmen S.', 'Andrés L.', 'Patricia R.']
const COMMENTS = [
  'Excelente trabajo, muy profesional y puntual. Lo recomiendo totalmente.',
  'Llegó rápido y resolvió el problema sin complicaciones. Muy buen precio.',
  'Trabajo limpio y de calidad. Volveré a contratarlo sin dudarlo.',
  'Muy atento y explicó todo el proceso. Quedé satisfecho con el resultado.',
  'Buen servicio aunque tardó un poco más de lo esperado. Resultado correcto.',
]

export const demoReviews = demoTechnicians.flatMap((tech, ti) =>
  Array.from({ length: 4 }).map((_, i) => ({
    id: `r-${tech.user_id}-${i}`,
    technician_id: tech.user_id,
    reviewer_id: `u-${i}`,
    rating: 5 - (i % 2),
    comment: COMMENTS[(ti + i) % COMMENTS.length],
    is_public: true,
    moderation_status: 'approved',
    created_at: new Date(Date.now() - (i + 1) * 86400000 * 7).toISOString(),
    reviewer: { full_name: REVIEWER_NAMES[(ti + i) % REVIEWER_NAMES.length], avatar_url: AVATARS[(ti + i) % AVATARS.length] },
  }))
)

const GALLERY_IMAGES = [
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600',
  'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=600',
  'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600',
  'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600',
]

export const demoGallery = demoTechnicians.flatMap((tech) =>
  GALLERY_IMAGES.map((url, i) => ({
    id: `g-${tech.user_id}-${i}`,
    technician_id: tech.user_id,
    image_url: url,
    caption: `Trabajo realizado #${i + 1}`,
    created_at: new Date().toISOString(),
  }))
)

// Tabla → filas demo. Las no listadas devuelven [].
const TABLES = {
  technicians_full: demoTechnicians,
  categories: demoCategories,
  reviews: demoReviews,
  technician_gallery: demoGallery,
}

// ── Query-builder simulado ─────────────────────────────
// Soporta encadenamiento (select/eq/order/limit/in/...) y es "thenable",
// igual que el builder de supabase-js. Aplica filtros eq básicos.
class DemoQuery {
  constructor(table) {
    this.table = table
    this.rows = (TABLES[table] || []).slice()
    this._eq = []
    this._single = false
  }
  select() { return this }
  insert() { this.rows = []; return this }
  update() { this.rows = []; return this }
  upsert() { this.rows = []; return this }
  delete() { this.rows = []; return this }
  eq(col, val) { this._eq.push([col, val]); return this }
  neq() { return this }
  gt() { return this }
  gte() { return this }
  lt() { return this }
  lte() { return this }
  like() { return this }
  ilike() { return this }
  is() { return this }
  in(col, vals) { this._eq.push([col, Array.isArray(vals) ? vals : [vals], true]); return this }
  or() { return this }
  contains() { return this }
  order() { return this }
  limit(n) { this._limit = n; return this }
  range() { return this }
  single() { this._single = true; return this }
  maybeSingle() { this._single = true; return this }

  _resolve() {
    let out = this.rows
    for (const [col, val, isIn] of this._eq) {
      out = out.filter(r => (isIn ? val.includes(r[col]) : r[col] === val))
    }
    if (this._limit != null) out = out.slice(0, this._limit)
    const data = this._single ? (out[0] ?? null) : out
    return { data, error: null }
  }
  then(onFulfilled, onRejected) {
    return Promise.resolve(this._resolve()).then(onFulfilled, onRejected)
  }
}

export function demoFrom(table) {
  return new DemoQuery(table)
}

export function demoRpc(fn, args = {}) {
  if (fn === 'technicians_near') {
    const { lat = BASE_LAT, lng = BASE_LNG, radius_km = 25 } = args
    const withDistance = demoTechnicians.map(t => {
      const dLat = (t.lat - lat) * 111
      const dLng = (t.lng - lng) * 111 * Math.cos((lat * Math.PI) / 180)
      const distance_km = Math.sqrt(dLat * dLat + dLng * dLng)
      return { ...t, distance_km: Math.round(distance_km * 10) / 10 }
    }).filter(t => t.distance_km <= radius_km)
      .sort((a, b) => a.distance_km - b.distance_km)
    return Promise.resolve({ data: withDistance, error: null })
  }
  return Promise.resolve({ data: null, error: null })
}
