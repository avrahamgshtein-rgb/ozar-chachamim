'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import { Header } from './Header'
import { TabBar } from './TabBar'
import { Drawer } from './Drawer'
import { SearchBar } from '@/components/ui/SearchBar'
import { FAB } from '@/components/ui/FAB'
import { SageCard } from '@/components/sages/SageCard'
import { SageFilters } from '@/components/sages/SageFilters'
import { Comparator } from '@/components/viz/Comparator'
import { FilterChips } from '@/components/viz/FilterChips'
import { MapLegend } from '@/components/viz/MapLegend'
import { useAppStore } from '@/store/useAppStore'
import { fetchSages, fetchConnections, fetchLocalGraphData } from '@/lib/supabase'
import type { Locale } from '@/lib/types'

// Dynamic imports — browser-only visualization libraries
const NetworkGraph = dynamic(
  () => import('@/components/viz/NetworkGraph').then(m => ({ default: m.NetworkGraph })),
  { ssr: false },
)
const GeoMap = dynamic(
  () => import('@/components/viz/GeoMap').then(m => ({ default: m.GeoMap })),
  { ssr: false },
)
const Timeline = dynamic(
  () => import('@/components/viz/Timeline').then(m => ({ default: m.Timeline })),
  { ssr: false },
)
const Traditions = dynamic(
  () => import('@/components/viz/Traditions').then(m => ({ default: m.Traditions })),
  { ssr: false },
)
const SagesTable = dynamic(
  () => import('@/components/viz/SagesTable').then(m => ({ default: m.SagesTable })),
  { ssr: false },
)
const GenealogyTree = dynamic(
  () => import('@/components/viz/GenealogyTree').then(m => ({ default: m.GenealogyTree })),
  { ssr: false },
)

interface AppShellProps {
  locale: Locale
  initialTotal: number
  initialLastUpdate: string
}

export function AppShell({ locale, initialTotal, initialLastUpdate }: AppShellProps) {
  const otherLocale: Locale = locale === 'he' ? 'en' : 'he'

  const {
    activeTab,
    isDrawerOpen,
    isFiltersOpen,
    isSearchOpen,
    isComparatorOpen,
    selectedSage,
    selectedSageId,
    sageMap,
    closeDrawer,
    closeFilters,
    closeComparator,
    selectSage,
    setData,
  } = useAppStore()

  // Theme bootstrap (persisted)
  useEffect(() => { useAppStore.getState().initTheme() }, [])

  // Bootstrap data
  useEffect(() => {
    setData([], [], initialTotal, initialLastUpdate)
    ;(async () => {
      let [sages, connections] = await Promise.all([
        fetchSages(),
        fetchConnections(),
      ])
      // Supabase still carries the old sparse connection set — fall back to
      // the canonical data.json whenever it is richer (keeps parity with Vercel)
      if (connections.length < 100 || sages.length < 300) {
        const local = await fetchLocalGraphData()
        if (local.connections.length > connections.length) {
          sages = local.sages
          connections = local.connections
          console.log('[AppShell] ↪ using data.json fallback (richer dataset)')
        }
      }
      setData(sages, connections, sages.length, initialLastUpdate)
      console.log(`[AppShell] ✅ ${sages.length} sages, ${connections.length} connections`)
    })()
  }, [initialTotal, initialLastUpdate, setData])

  // URL deep-linking: read ?sage= on data load
  useEffect(() => {
    if (!sageMap.size) return
    const params = new URLSearchParams(window.location.search)
    const sageId = params.get('sage')
    if (sageId) {
      const sage = sageMap.get(sageId)
      if (sage) selectSage(sage)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sageMap.size])

  // URL deep-linking: write ?sage= when selection changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (selectedSageId) {
      url.searchParams.set('sage', selectedSageId)
    } else {
      url.searchParams.delete('sage')
    }
    window.history.replaceState({}, '', url.toString())
  }, [selectedSageId])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeDrawer()
        closeFilters()
        closeComparator()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('[data-search-input]')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeDrawer, closeFilters, closeComparator])

  return (
    <div
      className="relative w-full h-dvh overflow-hidden bg-ink-900"
      dir={locale === 'he' ? 'rtl' : 'ltr'}
    >
      <Header locale={locale} otherLocale={otherLocale} />

      <main className="absolute inset-0 pt-[var(--header-h,64px)]">
        <CanvasArea activeTab={activeTab} locale={locale} />
      </main>

      {/* Mobile search overlay */}
      {isSearchOpen && (
        <div className="fixed inset-x-4 top-20 z-50 md:hidden animate-fade-in">
          <SearchBar locale={locale} />
        </div>
      )}

      <TabBar locale={locale} />
      <FAB locale={locale} />

      {/* Sage detail drawer */}
      <Drawer isOpen={isDrawerOpen && !!selectedSage} onClose={closeDrawer} locale={locale}>
        {selectedSage && (
          <SageCard sage={selectedSage} locale={locale} onClose={closeDrawer} />
        )}
      </Drawer>

      {/* Filters drawer */}
      <Drawer isOpen={isFiltersOpen} onClose={closeFilters} locale={locale}>
        <SageFilters locale={locale} onClose={closeFilters} />
      </Drawer>

      {/* Comparator overlay */}
      {isComparatorOpen && (
        <Comparator locale={locale} onClose={closeComparator} />
      )}
    </div>
  )
}

/* ── Canvas area ──────────────────────────────────────────────── */

function CanvasArea({ activeTab, locale }: { activeTab: string; locale: Locale }) {
  return (
    <div className="relative w-full h-full">
      {/* Network graph — always mounted so simulation lives across tab switches */}
      <div className={cn('absolute inset-0', activeTab === 'graph' ? 'block' : 'hidden')}>
        <NetworkGraph locale={locale} />
        <FilterChips locale={locale} />
      </div>

      {/* Geo map — lazy-mounted on first visit */}
      <div className={cn('absolute inset-0 isolate', activeTab === 'map' ? 'block' : 'hidden')}>
        <GeoMap locale={locale} />
        <FilterChips locale={locale} />
        <MapLegend locale={locale} />
      </div>

      {/* Traditions — era-grouped sage cards */}
      {activeTab === 'traditions' && (
        <div className="absolute inset-0">
          <Traditions locale={locale} />
        </div>
      )}

      {/* Timeline — D3 horizontal bands */}
      {activeTab === 'timeline' && (
        <div className="absolute inset-0">
          <Timeline locale={locale} />
        </div>
      )}

      {/* Sages table */}
      {activeTab === 'ideas' && (
        <div className="absolute inset-0">
          <SagesTable locale={locale} />
        </div>
      )}

      {/* Genealogy tree */}
      {activeTab === 'genealogy' && (
        <div className="absolute inset-0">
          <GenealogyTree locale={locale} />
        </div>
      )}
    </div>
  )
}

function TabPlaceholder({ icon, label, hint }: { icon: string; label: string; hint: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center select-none">
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--ink-200) 1px, transparent 1px),
            linear-gradient(to bottom, var(--ink-200) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(201,151,58,0.04) 0%, transparent 70%)' }}
        aria-hidden
      />
      <div className="relative z-10 flex flex-col items-center gap-4 text-center px-8">
        <span className="text-6xl font-mono text-gold-500/20 animate-pulse-gold" aria-hidden>
          {icon}
        </span>
        <h2 className="font-serif text-2xl font-bold text-ink-700">{label}</h2>
        <p className="font-sans text-xs text-ink-600 max-w-xs leading-relaxed">{hint}</p>
      </div>
    </div>
  )
}
