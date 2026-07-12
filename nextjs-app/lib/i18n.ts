import type { Locale } from './types'

export const LOCALES: Locale[] = ['he', 'en']
export const DEFAULT_LOCALE: Locale = 'he'

export function isValidLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale)
}

export function getDirection(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'he' ? 'rtl' : 'ltr'
}

export function getHtmlLang(locale: Locale): string {
  return locale === 'he' ? 'he' : 'en'
}

type UIStrings = {
  appTitle: string
  appSubtitle: string
  searchPlaceholder: string
  searchLabel: string
  filtersLabel: string
  advancedSearch: string
  clearFilters: string
  close: string
  loading: string
  noResults: string
  sagesLoaded: string
  lastUpdate: string
  openFilters: string
  period: string
  region: string
  field: string
  connections: string
  biography: string
  coreConcept: string
  migrationPath: string
  relatedSages: string
  externalLinks: string
  exportPDF: string
  allPeriods: string
}

export const UI: Record<Locale, UIStrings> = {
  he: {
    appTitle:         'אוצר חכמים',
    appSubtitle:      'גרף הידע של חכמי ישראל',
    searchPlaceholder:'חפש חכם — שם, תקופה, מקום...',
    searchLabel:      'חיפוש',
    filtersLabel:     'סינון',
    advancedSearch:   'חיפוש מתקדם',
    clearFilters:     'נקה סינון',
    close:            'סגור',
    loading:          'טוען...',
    noResults:        'לא נמצאו תוצאות',
    sagesLoaded:      'חכמים',
    lastUpdate:       'עדכון אחרון',
    openFilters:      'פתח סינון',
    period:           'תקופה',
    region:           'אזור',
    field:            'תחום',
    connections:      'קשרים',
    biography:        'ביוגרפיה',
    coreConcept:      'רעיון מרכזי',
    migrationPath:    'נדידה',
    relatedSages:     'חכמים קשורים',
    externalLinks:    'קישורים חיצוניים',
    exportPDF:        'ייצוא PDF',
    allPeriods:       'כל התקופות',
  },
  en: {
    appTitle:         'Ozar Chachamim',
    appSubtitle:      'The Knowledge Graph of Jewish Sages',
    searchPlaceholder:'Search a sage — name, era, place...',
    searchLabel:      'Search',
    filtersLabel:     'Filter',
    advancedSearch:   'Advanced Search',
    clearFilters:     'Clear Filters',
    close:            'Close',
    loading:          'Loading...',
    noResults:        'No results found',
    sagesLoaded:      'Sages',
    lastUpdate:       'Last Update',
    openFilters:      'Open Filters',
    period:           'Period',
    region:           'Region',
    field:            'Field',
    connections:      'Connections',
    biography:        'Biography',
    coreConcept:      'Core Concept',
    migrationPath:    'Migration',
    relatedSages:     'Related Sages',
    externalLinks:    'External Links',
    exportPDF:        'Export PDF',
    allPeriods:       'All Periods',
  },
}
