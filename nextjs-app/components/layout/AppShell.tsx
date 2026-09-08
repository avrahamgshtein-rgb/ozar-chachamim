'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'
import { Header } from './Header'
import { TabBar } from './TabBar'
import { Drawer } from './Drawer'
import { SearchBar } from '@/components/ui/SearchBar'
import { FAB } from '@/components/ui/FAB'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { SageCard } from '@/components/sages/SageCard'
import { VizSkeleton } from '@/components/ui/VizSkeleton'
import { OnboardingTour } from '@/components/ui/OnboardingTour'
import { SageFilters } from '@/components/sages/SageFilters'
import { Comparator } from '@/components/viz/Comparator'
import { FilterChips } from '@/components/viz/FilterChips'
import { MapLegend } from '@/components/viz/MapLegend'
import { GeographyPanel } from '@/components/viz/GeographyPanel'
import { GeographyMobileDrawer } from '@/components/viz/GeographyMobileDrawer'
import { useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { parseURLState, updateURLWithState } from '@/lib/urlState'
import { fetchSages, fetchConnections, fetchLocalGraphData } from '@/lib/supabase'
import { fetchContentOverlay, applyOverlay } from '@/lib/contentOverlay'
import { loadAppShellData } from '@/lib/appShellDataLoader'
import type { Locale, Tab } from '@/lib/types'

// Dynamic imports — browser-only visualization libraries.
// Each tab shows a skeleton screen while its chunk loads.
const NetworkGraph = dynamic(
  () => import('@/components/viz/NetworkGraph').then(m => ({ default: m.NetworkGraph })),
  { ssr: false, loading: () => <VizSkeleton /> },
)
const GeoMap = dynamic(
  () => import('@/components/viz/GeoMap').then(m => ({ default: m.GeoMap })),
  { ssr: false, loading: () => <VizSkeleton /> },
)
const Timeline = dynamic(
  () => import('@/components/viz/Timeline').then(m => ({ default: m.Timeline })),
  { ssr: false, loading: () => <VizSkeleton /> },
)
const Traditions = dynamic(
  () => import('@/components/viz/Traditions').then(m => ({ default: m.Traditions })),
  { ssr: false, loading: () => <VizSkeleton variant="list" /> },
)
const SagesTable = dynamic(
  () => import('@/components/viz/SagesTable').then(m => ({ default: m.SagesTable })),
  { ssr: false, loading: () => <VizSkeleton variant="list" /> },
)
const GenealogyTree = dynamic(
  () => import('@/components/viz/GenealogyTree').then(m => ({ default: m.GenealogyTree })),
  { ssr: false, loading: () => <VizSkeleton /> },
)
const AboutContent = dynamic(
  () => import('@/components/about/AboutContent').then(m => ({ default: m.AboutContent })),
  { ssr: false, loading: () => <VizSkeleton /> },
)
// Stage 4 — 3D time-layer mode. Lazy-loaded so the Geography tab pays nothing
// for it unless the reader actually switches modes.
const GeoTimeLayers = dynamic(
  () => import('@/components/viz/GeoTimeLayers').then(m => ({ default: m.GeoTimeLayers })),
  { ssr: false, loading: () => <VizSkeleton /> },
)

interface AppShellProps {
  locale: Locale
  initialTotal: number
  initialLastUpdate: string
}

export function AppShell({ locale, initialTotal, initialLastUpdate }: AppShellProps) {
  const otherLocale: Locale = locale === 'he' ? 'en' : 'he'
  const [isGeographyDrawerOpen, setIsGeographyDrawerOpen] = useState(false)
  const urlInitializedRef = useRef(false)

  const {
    activeTab,
    isDrawerOpen,
    isFiltersOpen,
    isSearchOpen,
    isComparatorOpen,
    selectedSage,
    selectedSageId,
    sageMap,
    filters,
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
      // These three are independent, so they run concurrently rather than in
      // series. loadAppShellData still decides whether Supabase or the static
      // file wins; fetching the file early only removes a round trip.
      const [sages, connections, dataJsonData, overlay] = await Promise.all([
        fetchSages(),
        fetchConnections(),
        fetchLocalGraphData(),
        fetchContentOverlay(locale),
      ])
      const supabaseData = { sages, connections }

      // Merge canonical + supplements, apply patches via unified pipeline
      const { sages: normalizedSages, connections: normalizedConnections, quality, source } =
        await loadAppShellData(supabaseData, dataJsonData)

      if (source === 'fallback') {
        console.log('[AppShell] ↪ using data.json fallback (richer dataset)')
      }
      console.log(`[AppShell] 📊 merged: ${quality.canonical_count} canonical + ${quality.supplement_count} supplement = ${quality.total_sages} sages`)

      // Content localization: merge per-locale translated fields
      const localizedSages = applyOverlay(normalizedSages, overlay)

      setData(localizedSages, normalizedConnections, localizedSages.length, initialLastUpdate)
      console.log(`[AppShell] ✅ ${localizedSages.length} sages, ${normalizedConnections.length} connections (deduped: ${quality.total_connections})`)
    })()
  }, [initialTotal, initialLastUpdate, setData, locale])

  // URL state: parse and apply on mount and back/forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return

    function applyURLState() {
      const state = parseURLState(window.location.search)
      const store = useAppStore.getState()
      store.applyNavigationState(state.tab, state.sage, state.regions, state.periods)
      urlInitializedRef.current = true
    }

    // Apply on mount
    applyURLState()

    // Handle back/forward navigation
    function onPopState() {
      applyURLState()
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Write URL when state changes, but not during initialization/restoration
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!sageMap.size) return
    if (!urlInitializedRef.current) return

    const url = updateURLWithState({
      tab: activeTab !== 'graph' ? activeTab : null,
      sage: selectedSageId,
      regions: filters.region,
      periods: filters.period,
    })

    window.history.replaceState({}, '', url)
  }, [selectedSageId, activeTab, filters.region, filters.period, sageMap.size])

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
        <CanvasArea
          activeTab={activeTab}
          locale={locale}
          isGeographyDrawerOpen={isGeographyDrawerOpen}
          setIsGeographyDrawerOpen={setIsGeographyDrawerOpen}
        />
      </main>

      {/* Mobile search overlay */}
      {isSearchOpen && (
        <div className="fixed inset-x-4 top-20 z-50 md:hidden animate-fade-in">
          <SearchBar locale={locale} />
        </div>
      )}

      <TabBar locale={locale} />
      <FAB locale={locale} />
      <ChatWidget locale={locale} />

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

      {/* First-visit guided tour */}
      <OnboardingTour locale={locale} />
    </div>
  )
}

/* ── Canvas area ──────────────────────────────────────────────── */

function CanvasArea({
  activeTab,
  locale,
  isGeographyDrawerOpen,
  setIsGeographyDrawerOpen,
}: {
  activeTab: string
  locale: Locale
  isGeographyDrawerOpen: boolean
  setIsGeographyDrawerOpen: (open: boolean) => void
}) {
  // Stage 4 — Geography render mode. Purely presentational: filters and the
  // selected sage live in the store, so switching modes carries both across.
  const [geoMode, setGeoMode] = useState<'2d' | '3d'>('2d')

  // Stage 5 — Leaflet is expensive and was initialising on every page load even
  // when Geography was never opened. Mount it on first visit, then keep it
  // mounted so the map instance survives later tab switches.
  const [mapEverOpened, setMapEverOpened] = useState(false)
  useEffect(() => {
    if (activeTab === 'map') setMapEverOpened(true)
  }, [activeTab])

  return (
    <div className="relative w-full h-full">
      {/* Network graph — always mounted so simulation lives across tab switches */}
      <div className={cn('absolute inset-0 isolate', activeTab === 'graph' ? 'block' : 'hidden')}>
        <NetworkGraph locale={locale} />
        <FilterChips locale={locale} />
      </div>

      {/* Geo map with geography panel — lazy-mounted on first visit */}
      <div className={cn('absolute inset-0 isolate flex flex-row-reverse', activeTab === 'map' ? 'flex' : 'hidden')}>
        <div className="flex-1 relative">
          {/* Stage 4: the 2D atlas stays mounted (Leaflet needs a stable container)
              and is hidden rather than unmounted when the 3D mode is active. */}
          <div className={cn('absolute inset-0', geoMode === '2d' ? 'block' : 'hidden')}>
            {mapEverOpened && (
              <>
                <GeoMap locale={locale} />
                <MapLegend locale={locale} />
              </>
            )}
          </div>

          {geoMode === '3d' && (
            <GeoTimeLayers
              locale={locale}
              fallback={
                <div className="absolute inset-0 flex items-center justify-center px-6">
                  <p className="text-xs font-sans text-ink-400 text-center max-w-xs leading-relaxed">
                    {tr(locale,
                      'הדפדפן אינו תומך בתצוגת שכבות תלת-ממדית. השתמש בתצוגת המפה הדו-ממדית.',
                      '3D layers are not supported by this browser. Use the 2D atlas instead.',
                      'Трёхмерные слои не поддерживаются этим браузером. Используйте двумерную карту.')}
                  </p>
                </div>
              }
            />
          )}

          <FilterChips locale={locale} />

          {/* Stage 4: 2D / 3D mode switch. Filters and selection live in the store,
              so switching modes preserves both.
              z-[1001]: Leaflet paints its panes/controls at 200–800 in this same
              stacking context, so anything below that renders behind the tiles.
              The enclosing container is `isolate`, so this cannot escape the geo
              area and cover app chrome. */}
          <div className="absolute top-2 end-2 z-[1001] flex rounded-md overflow-hidden border border-ink-700 bg-ink-900/85">
            {(['2d', '3d'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setGeoMode(mode)}
                aria-pressed={geoMode === mode}
                className={cn(
                  'px-2.5 py-1 text-[10px] font-sans font-bold uppercase tracking-wider transition-colors',
                  geoMode === mode
                    ? 'bg-gold-500 text-ink-900'
                    : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800',
                )}
              >
                {mode === '2d'
                  ? tr(locale, 'מפה', 'Atlas', 'Карта')
                  : tr(locale, 'שכבות', 'Layers', 'Слои')}
              </button>
            ))}
          </div>

          {/* Mobile geography button */}
          <button
            onClick={() => setIsGeographyDrawerOpen(true)}
            className="md:hidden absolute bottom-4 left-4 z-30 px-3 py-2 bg-gold-500/90 hover:bg-gold-400 text-ink-900 font-sans font-bold text-xs rounded-md transition-colors"
          >
            📍 {tr(locale, 'גיאוגרפיה', 'Geography', 'География')}
          </button>
        </div>
        {/* Desktop Geography Panel — always mount to avoid CSS-only flash */}
        <div className="hidden md:flex md:w-72 lg:w-80 flex-col border-s border-ink-800 bg-ink-950">
          <GeographyPanel locale={locale} />
        </div>
      </div>

      {/* Mobile geography drawer */}
      {activeTab === 'map' && (
        <GeographyMobileDrawer
          locale={locale}
          isOpen={isGeographyDrawerOpen}
          onClose={() => setIsGeographyDrawerOpen(false)}
        />
      )}

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

      {/* About page */}
      {activeTab === 'about' && <AboutContent locale={locale} />}
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
