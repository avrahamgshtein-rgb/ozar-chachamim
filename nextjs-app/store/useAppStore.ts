'use client'

import { create } from 'zustand'
import type { Sage, Connection, Tab, Filters, Period, Region } from '@/lib/types'
import { regionsOf } from '@/lib/regions'

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
  clearFilters: () => void
}

function applyFilters(sages: Sage[], filters: Filters): Sage[] {
  return sages.filter(sage => {
    if (filters.period.length > 0 && !filters.period.includes(sage.period)) return false
    if (filters.region.length > 0) {
      const sageRegions = sage.region ? [sage.region, ...regionsOf(sage.location)] : regionsOf(sage.location)
      if (!sageRegions.some(r => filters.region.includes(r))) return false
    }
    if (filters.field.length > 0 && (!sage.field || !filters.field.includes(sage.field))) return false
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase()
      const matchLabel   = sage.label?.toLowerCase().includes(q)
      const matchNameEn  = sage.name_en?.toLowerCase().includes(q)
      const matchField   = sage.field?.toLowerCase().includes(q)
      const matchLoc     = sage.location?.toLowerCase().includes(q)
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
    period: [],
    region: [],
    field: [],
    searchQuery: '',
  },
  filteredSages: [],
  availableFields: [],

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
    const updated = filters.period.includes(period)
      ? filters.period.filter(p => p !== period)
      : [...filters.period, period]
    const newFilters = { ...filters, period: updated }
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

  clearFilters: () => {
    const { sages } = get()
    const empty: Filters = { period: [], region: [], field: [], searchQuery: '' }
    set({ filters: empty, filteredSages: sages })
  },
}))
