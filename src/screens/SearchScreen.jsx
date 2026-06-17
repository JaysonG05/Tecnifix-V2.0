import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { TechnicianCard } from '../components/TechnicianCard.jsx'
import { SkeletonCard, EmptyState, Btn } from '../components/UI.jsx'
import { supabase, technicians } from '../lib/supabase.js'
import { T } from '../i18n/translations.js'

const CATS = [
  { slug: 'climatizacion', nameEs: 'Climatización', nameEn: 'A/C', icon: '❄️' },
  { slug: 'electricidad', nameEs: 'Electricidad', nameEn: 'Electrical', icon: '⚡' },
  { slug: 'plomeria', nameEs: 'Plomería', nameEn: 'Plumbing', icon: '🔧' },
  { slug: 'albanileria', nameEs: 'Albañilería', nameEn: 'Masonry', icon: '🧱' },
  { slug: 'limpieza', nameEs: 'Limpieza', nameEn: 'Cleaning', icon: '🧹' },
  { slug: 'cerrajeria', nameEs: 'Cerrajería', nameEn: 'Locksmith', icon: '🔐' },
  { slug: 'pintura', nameEs: 'Pintura', nameEn: 'Painting', icon: '🎨' },
  { slug: 'tecnologia', nameEs: 'Técnico PC', nameEn: 'PC Tech', icon: '💻' },
]

export function SearchScreen() {
  const { th, selectedCategory, navigate, setSelectedTech, lang } = useApp()
  const t = T[lang]

  const [filter, setFilter] = useState(selectedCategory?.slug || 'all')
  const [sort, setSort] = useState('average_rating')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [maxPrice, setMaxPrice] = useState(100)
  const [minRating, setMinRating] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    technicians.list({
      categorySlug: filter === 'all' ? undefined : filter,
      onlyAvailable: onlyAvailable || undefined,
      onlyVerified: onlyVerified || undefined,
      sortBy: sort,
    })
      .then(data => {
        let filtered = data
        if (maxPrice < 100) {
          filtered = filtered.filter(tech => Number(tech.min_price ?? 0) <= maxPrice)
        }
        if (minRating > 0) {
          filtered = filtered.filter(tech => Number(tech.average_rating ?? 0) >= minRating)
        }
        setResults(filtered)
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [filter, sort, onlyAvailable, onlyVerified, maxPrice, minRating])

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
          <Chip active={showFilters || maxPrice < 100 || minRating > 0}
            onClick={() => setShowFilters(v => !v)}>
            ⚙️ {lang === 'en' ? 'More filters' : 'Más filtros'}
            {(maxPrice < 100 || minRating > 0) && (
              <span style={{
                marginLeft: 4, background: th.primary, color: '#fff',
                borderRadius: 10, fontSize: 10, padding: '1px 5px', fontWeight: 700
              }}>
                {(maxPrice < 100 ? 1 : 0) + (minRating > 0 ? 1 : 0)}
              </span>
            )}
          </Chip>
        </div>

        {/* Panel de filtros avanzados */}
        {showFilters && (
          <div style={{ padding: '4px 16px 14px', borderTop: `1px solid ${th.border}` }}>
            {/* Precio máximo */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: th.text }}>
                  {lang === 'en' ? 'Max. price' : 'Precio máximo'}
                </p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: th.primaryText }}>
                  {maxPrice >= 100 ? (lang === 'en' ? 'Any' : 'Cualquiera') : `$${maxPrice}`}
                </p>
              </div>
              <input type="range" min="5" max="100" step="5" value={maxPrice}
                onChange={e => setMaxPrice(Number(e.target.value))}
                style={{ width: '100%', accentColor: th.primary }} />
            </div>

            {/* Calificación mínima */}
            <div style={{ marginBottom: 8 }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: th.text }}>
                {lang === 'en' ? 'Minimum rating' : 'Calificación mínima'}
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 3, 3.5, 4, 4.5].map(r => (
                  <button key={r} onClick={() => setMinRating(r)}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 10,
                      border: `1.5px solid ${minRating === r ? th.primary : th.border}`,
                      background: minRating === r ? th.primaryLight : 'transparent',
                      color: minRating === r ? th.primaryText : th.textSec,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                    }}>
                    {r === 0 ? (lang === 'en' ? 'Any' : 'Todas') : `${r}+ ⭐`}
                  </button>
                ))}
              </div>
            </div>

            {(maxPrice < 100 || minRating > 0) && (
              <button onClick={() => { setMaxPrice(100); setMinRating(0) }}
                style={{
                  marginTop: 10, background: 'none', border: 'none', color: th.red,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  textDecoration: 'underline'
                }}>
                {lang === 'en' ? 'Clear advanced filters' : 'Limpiar filtros avanzados'}
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px 90px' }}>
        <p style={{ color: th.textSec, fontSize: 13, margin: '0 0 14px' }}>
          {loading ? '...' : results.length} {t.techniciansFound}
        </p>
        {loading
          ? [1, 2, 3].map(i => <SkeletonCard key={i} />)
          : results.length === 0
            ? <EmptyState emoji="😔" title={t.noTechsFilter}
              action={<Btn onClick={() => { setFilter('all'); setOnlyAvailable(false); setOnlyVerified(false); setMaxPrice(100); setMinRating(0) }} style={{ maxWidth: 200, margin: '0 auto' }}>{t.clearFilters}</Btn>}
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