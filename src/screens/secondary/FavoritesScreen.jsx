import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { TechnicianCard } from '../../components/TechnicianCard.jsx'
import {
  Avatar, StarRating, Badge, Btn, Input, Toggle, SkeletonCard,
  EmptyState, Modal, Toast, PageHeader, SettingsRow, StatusBadge, Spinner
} from '../../components/UI.jsx'
import {
  supabase, auth, profiles, technicians, techCategories, certificatesApi, serviceCatalog, favorites as favApi,
  serviceRequests, archiveApi, receiptsApi, admin, notifications
} from '../../lib/supabase.js'
import { T } from '../../i18n/translations.js'
import { receiptActions, disputeActions } from '../../lib/payments.js'

export function FavoritesScreen() {
  const { th, user, navigate, setSelectedTech, favoriteIds, lang, isDesktop } = useApp()
  const t = T[lang]
  const [techList, setTechList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    favApi.listFull(user.id)
      .then(setTechList).catch(() => { }).finally(() => setLoading(false))
  }, [user, favoriteIds.length])

  if (!user) return (
    <EmptyState emoji="⭐" title={t.myFavorites} sub={t.loginRequired}
      action={<Btn onClick={() => navigate('login')} style={{ maxWidth: 200, margin: '0 auto' }}>{t.login}</Btn>}
    />
  )

  return (
    <div style={{ background: th.bg, minHeight: '100vh', padding: '20px 16px 90px' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: th.text }}>⭐ {t.myFavorites}</h2>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: th.textSec }}>{t.savedTechs}</p>
      <div style={isDesktop ? {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 16, alignItems: 'start',
      } : undefined}>
        {loading
          ? [1, 2].map(i => <SkeletonCard key={i} />)
          : techList.length === 0
            ? <EmptyState emoji="⭐" title={t.noFavorites} sub={t.tapToSave} />
            : techList.map(tech => (
              <TechnicianCard key={tech.user_id} tech={tech}
                onPress={t2 => { setSelectedTech(t2); navigate('tech-profile') }}
              />
            ))
        }
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────
