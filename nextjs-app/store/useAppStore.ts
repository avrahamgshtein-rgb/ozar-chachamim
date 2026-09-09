'use client'

import { create } from 'zustand'
import type { Sage, Connection, Tab, Filters, Period, Region } from '@/lib/types'
import { isTagFacet } from '@/lib/types'
import { regionsOf } from '@/lib/regions'
import { placesIn } from '@/lib/placeIndex'
import { normalizeHe, fuzzyIncludes } from '@/lib/search'

interface AppState {
  // Data
  sages: Sage[]
  connections: Connection[]
  sageMap: Map<string, Sage>
  isLoaded: boolean
  totalSages: number
  lastUpdate: string

  // Selection
  selectedSageId: string | null
  selectedSage: Sage | null

  // UI
  theme: 'dark' | 'light'
  activeTab: Tab
  isDrawerOpen: boolean
  isSearchOpen: boolean
  isFiltersOpen: boolean
  isComparatorOpen: boolean
  comparatorSages: [Sage | null, Sage | null]

  // Filters
  filters: Filters
  filteredSages: Sage[]
  availableFields: string[]
  /** Sage whose journey the place focus is being read against, if any. */
  placeAnchorId: string | null

  // Actions
  setData: (sages: Sage[], connections: Connection[], total: number, lastUpdate: string) => void
  selectSage: (sage: Sage) => void
  clearSelection: () => void
  setActiveTab: (tab: Tab) => void
  toggleTheme: () => void
  initTheme: () => void
  openDrawer: () => void
  closeDrawer: () => void
  toggleSearch: () => void
  openFilters: () => void
  closeFilters: () => void
  openComparator: (sage?: Sage) => void
  closeComparator: () => void
  setComparatorSage: (slot: 0 | 1, sage: Sage | null) => void
  setSearchQuery: (query: string) => void
  togglePeriodFilter: (period: Period) => void
  toggleRegionFilter: (region: Region) => void
  toggleFieldFilter: (field: string) => void
  setPeriodFilters: (periods: Period[] | null) => void
  setRegionFilters: (regions: Region[]) => void
  clearFilters: () => void
  /** Focus one place; `anchorId` marks whose journey prompted it. */
  setPlaceFocus: (place: string | null, anchorId?: string | null) => void
  applyNavigationState: (tab: Tab | null, sage: string | null, regions: Region[], periods: Period[] | null) => void
}

function applyFilters(sages: Sage[], filters: Filters): Sage[] {
  return sages.filter(sage => {
    // Period filtering: null = all periods (no filter), [] = no periods (empty set), [...] = selected subset
    if (filters.period !== null && filters.period.length === 0) return false
    if (filters.period !== null && filters.period.length > 0 && !filters.period.includes(sage.period)) return false
    if (filters.region.length > 0) {
      const sageRegions = sage.region ? [sage.region, ...regionsOf(sage.location)] : regionsOf(sage.location)
      if (!sageRegions.some(r => filters.region.includes(r))) return false
    }
    if (filters.field.length > 0) {
      // Handle comma-separated fields: "philosophy, halakha" → ["philosophy", "halakha"]
      const sageFields = (sage.field ?? '').split(',').map(f => f.trim()).filter(Boolean)
      // Curated tag facets (e.g. נשים) ride the same filter dimension — see TAG_FACETS.
      // Only whitelisted tags participate, so ordinary field chips keep their meaning
      // even when the same word also appears as a free-text tag on other sages.
      const sageFacets = (sage.tags ?? []).filter(isTagFacet)
      const selectable = [...sageFields, ...sageFacets]
      if (!selectable.some(f => filters.field.includes(f))) return false
    }
    if (filters.place) {
      // Presence covers both where a sage was based and any stop on their
      // migration path, so focusing on Jerusalem surfaces the Ramban, who
      // arrived there late, alongside those who lived there all along.
      const stops = sage.migration_path
        ? [sage.migration_path.from, ...(sage.migration_path.intermediate ?? []), sage.migration_path.to]
        : []
      const here =
        placesIn(sage.location).includes(filters.place) ||
        stops.some(s => placesIn(s).includes(filters.place!))
      if (!here) return false
    }
    if (filters.searchQuery) {
      // Fuzzy Hebrew matching: "רמבם" ↔ "רמב״ם" (nikud/quotes/finals-insensitive)
      const q = normalizeHe(filters.searchQuery)
      const matchLabel   = fuzzyIncludes(sage.label, q)
      const matchNameEn  = fuzzyIncludes(sage.name_en, q)
      const matchField   = fuzzyIncludes(sage.field, q)
      const matchLoc     = fuzzyIncludes(sage.location, q)
      if (!matchLabel && !matchNameEn && !matchField && !matchLoc) return false
    }
    return true
  })
}

export const useAppStore = create<AppState>((set, get) => ({
  sages: [],
  connections: [],
  sageMap: new Map(),
  isLoaded: false,
  totalSages: 0,
  lastUpdate: '',

  selectedSageId: null,
  selectedSage: null,

  theme: 'dark',
  activeTab: 'graph',
  isDrawerOpen: false,
  isSearchOpen: false,
  isFiltersOpen: false,
  isComparatorOpen: false,
  comparatorSages: [null, null],

  filters: {
    period: null,
    region: [],
    field: [],
    searchQuery: '',
    place: null,
  },
  filteredSages: [],
  availableFields: [],
  placeAnchorId: null,

  setData: (sages, connections, total, lastUpdate) => {
    const sageMap = new Map(sages.map(s => [s.id, s]))
    const fields = [...new Set(sages.map(s => s.field).filter(Boolean) as string[])].sort()
    set({
      sages,
      connections,
      sageMap,
      isLoaded: true,
      totalSages: total,
      lastUpdate,
      filteredSages: sages,
      availableFields: fields,
    })
  },

  selectSage: (sage) => {
    set({ selectedSage: sage, selectedSageId: sage.id, isDrawerOpen: true })
  },

  clearSelection: () => {
    set({ selectedSage: null, selectedSageId: null, isDrawerOpen: false })
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleTheme: () => {
    const theme = get().theme === 'dark' ? 'light' : 'dark'
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme
      try { localStorage.setItem('ozar-theme', theme) } catch { /* noop */ }
    }
    set({ theme })
  },
  initTheme: () => {
    if (typeof document === 'undefined') return
    let theme: 'dark' | 'light' = 'dark'
    try { if (localStorage.getItem('ozar-theme') === 'light') theme = 'light' } catch { /* noop */ }
    document.documentElement.dataset.theme = theme
    set({ theme })
  },

  openDrawer:  () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false, selectedSage: null, selectedSageId: null }),

  toggleSearch:  () => set(s => ({ isSearchOpen: !s.isSearchOpen })),
  openFilters:   () => set({ isFiltersOpen: true }),
  closeFilters:  () => set({ isFiltersOpen: false }),

  openComparator: (sage) => {
    const current = get().comparatorSages
    const next: [Sage | null, Sage | null] = sage
      ? [sage, current[1]]
      : current
    set({ isComparatorOpen: true, comparatorSages: next })
  },
  closeComparator: () => set({ isComparatorOpen: false }),
  setComparatorSage: (slot, sage) => {
    const current = get().comparatorSages
    const next: [Sage | null, Sage | null] = [...current] as [Sage | null, Sage | null]
    next[slot] = sage
    set({ comparatorSages: next })
  },

  setSearchQuery: (query) => {
    const { sages, filters } = get()
    const updated = { ...filters, searchQuery: query }
    set({ filters: updated, filteredSages: applyFilters(sages, updated) })
  },

  togglePeriodFilter: (period) => {
    const { sages, filters } = get()
    const { ALL_PERIODS } = require('@/lib/types')

    const nextPeriods: Period[] = filters.period === null
      ? ALL_PERIODS.filter((p: Period) => p !== period)
      : filters.period.includes(period)
      ? filters.period.filter(p => p !== period)
      : [...filters.period, period]

    // If result is all periods, revert to null (no filter)
    const final: Period[] | null = nextPeriods.length === ALL_PERIODS.length ? null : nextPeriods

    const newFilters = { ...filters, period: final }
    set({ filters: newFilters, filteredSages: applyFilters(sages, newFilters) })
  },

  toggleRegionFilter: (region) => {
    const { sages, filters } = get()
    const updated = filters.region.includes(region)
      ? filters.region.filter(r => r !== region)
      : [...filters.region, region]
    const newFilters = { ...filters, region: updated }
    set({ filters: newFilters, filteredSages: applyFilters(sages, newFilters) })
  },

  toggleFieldFilter: (field) => {
    const { sages, filters } = get()
    const updated = filters.field.includes(field)
      ? filters.field.filter(f => f !== field)
      : [...filters.field, field]
    const newFilters = { ...filters, field: updated }
    set({ filters: newFilters, filteredSages: applyFilters(sages, newFilters) })
  },

  setPeriodFilters: (periods) => {
    const { sages, filters } = get()
    const newFilters = { ...filters, period: periods }
    set({ filters: newFilters, filteredSages: applyFilters(sages, newFilters) })
  },

  setRegionFilters: (regions) => {
    const { sages, filters } = get()
    const newFilters = { ...filters, region: regions }
    set({ filters: newFilters, filteredSages: applyFilters(sages, newFilters) })
  },

  setPlaceFocus: (place, anchorId = null) => {
    const { sages, filters } = get()
    const updated = { ...filters, place }
    set({
      filters: updated,
      filteredSages: applyFilters(sages, updated),
      placeAnchorId: place ? anchorId : null,
    })
  },

  clearFilters: () => {
    const { sages } = get()
    const empty: Filters = { period: null, region: [], field: [], searchQuery: '', place: null }
    set({ filters: empty, filteredSages: sages, placeAnchorId: null })
  },

  applyNavigationState: (tab, sage, regions, periods) => {
    const { sages, sageMap } = get()

    // Resolve sage if data available; clear if stale
    let selectedSage: Sage | null = null
    let selectedSageId: string | null = null
    if (sage && sageMap.size) {
      const sageObj = sageMap.get(sage)
      if (sageObj) {
        selectedSage = sageObj
        selectedSageId = sageObj.id
      }
    }

    // Apply all state atomically in one set() call
    const newFilters: Filters = { period: periods, region: regions, field: [], searchQuery: '', place: null }
    set({
      activeTab: tab || 'graph',
      selectedSage,
      selectedSageId,
      filters: newFilters,
      filteredSages: applyFilters(sages, newFilters),
      isDrawerOpen: selectedSage ? true : false,
    })
  },
}))
