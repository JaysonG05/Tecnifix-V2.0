import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { TechnicianCard } from '../components/TechnicianCard.jsx'
import { SkeletonCard, EmptyState, Btn } from '../components/UI.jsx'
import { technicians } from '../lib/supabase.js'
import { T } from '../i18n/translations.js'

const CATS = [
  { slug: 'climatizacion', nameEs: 'Climatización', nameEn: 'A/C', icon: '❄️' },
  { slug: 'electricidad',  nameEs: 'Electricidad',  nameEn: 'Electrical', icon: '⚡' },
  { slug: 'plomeria',      nameEs: 'Plomería',      nameEn: 'Plumbing', icon: '🔧' },
  { slug: 'albanileria',   nameEs: 'Albañilería',   nameEn: 'Masonry', icon: '🧱' },
  { slug: 'limpieza',      nameEs: 'Limpieza',      nameEn: 'Cleaning', icon: '🧹' },
  { slug: 'cerrajeria',    nameEs: 'Cerrajería',    nameEn: 'Locksmith', icon: '🔐' },
  { slug: 'pintura',       nameEs: 'Pintura',       nameEn: 'Painting', icon: '🎨' },
  { slug: 'tecnologia',    nameEs: 'Técnico PC',    nameEn: 'PC Tech', icon: '💻' },
]

export function SearchScreen() {
  const { th, selectedCategory, navigate, setSelectedTech, lang } = useApp()
  const t = T[lang]

  const [filter,        setFilter]        = useState(selectedCategory?.slug || 'all')
  const [sort,          setSort]          = useState('average_rating')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [onlyVerified,  setOnlyVerified]  = useState(false)
  const [results,       setResults]       = useState([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    setLoading(true)
    technicians.list({
      categorySlug:  filter === 'all' ? undefined : filter,
      onlyAvailable: onlyAvailable || undefined,
      onlyVerified:  onlyVerified || undefined,
      sortBy:        sort,
    })
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [filter, sort, onlyAvailable, onlyVerified])

  const openTech = (tech) => { setSelectedTech(tech); navigate('tech-profile') }

  return (
    <div style={{ background: th.bg, minHeight: '100vh' }}>
      {/* Filtros sticky */}
      <div style={{ background: th.surface, borderBottom: `1px solid ${th.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        {/* Categorías scroll horizontal */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px 0', scrollbarWidth: 'none' }}>
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>{t.allCategories}</Chip>
          {CATS.map(c => (
            <Chip key={c.slug} active={filter === c.slug} onClick={() => setFilter(c.slug)}>
              {c.icon} {lang === 'en' ? c.nameEn : c.nameEs}
            </Chip>
          ))}
        </div>
        {/* Ordenar y filtros */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px 12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 10, border: `1px solid ${th.border}`, fontSize: 13, color: th.text, background: th.inputBg, outline: 'none', fontFamily: 'inherit' }}>
            <option value="average_rating">{t.bestRatedFilter}</option>
            <option value="min_price">{t.lowestPrice}</option>
            <option value="total_reviews">{t.mostReviews}</option>
          </select>
          <Chip active={onlyVerified} onClick={() => setOnlyVerified(v => !v)}>{t.verifiedOnly}</Chip>
          <Chip active={onlyAvailable} onClick={() => setOnlyAvailable(v => !v)}>{t.availableOnly}</Chip>
        </div>
      </div>

      <div style={{ padding: '12px 16px 90px' }}>
        <p style={{ color: th.textSec, fontSize: 13, margin: '0 0 14px' }}>
          {loading ? '...' : results.length} {t.techniciansFound}
        </p>
        {loading
          ? [1, 2, 3].map(i => <SkeletonCard key={i} />)
          : results.length === 0
            ? <EmptyState emoji="😔" title={t.noTechsFilter}
                action={<Btn onClick={() => { setFilter('all'); setOnlyAvailable(false); setOnlyVerified(false) }} style={{ maxWidth: 200, margin: '0 auto' }}>{t.clearFilters}</Btn>}
              />
            : results.map(tech => <TechnicianCard key={tech.user_id} tech={tech} onPress={openTech} />)
        }
      </div>
    </div>
  )
}

function Chip({ children, active, onClick }) {
  const { th } = useApp()
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, padding: '6px 14px', borderRadius: 20,
      border: `1.5px solid ${active ? th.primary : th.border}`,
      background: active ? th.primaryLight : 'transparent',
      color: active ? th.primaryText : th.textSec,
      fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
      fontFamily: 'inherit',
    }}>{children}</button>
  )
}
