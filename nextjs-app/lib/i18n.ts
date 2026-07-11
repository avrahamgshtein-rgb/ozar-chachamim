import type { Locale } from './types'

export const LOCALES: Locale[] = ['he', 'en', 'ru']
export const DEFAULT_LOCALE: Locale = 'he'

export const LOCALE_NAMES: Record<Locale, string> = {
  he: 'עברית',
  en: 'English',
  ru: 'Русский',
}

export const LOCALE_SHORT: Record<Locale, string> = {
  he: 'עב',
  en: 'EN',
  ru: 'РУ',
}

export function isValidLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale)
}

export function getDirection(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'he' ? 'rtl' : 'ltr'
}

export function getHtmlLang(locale: Locale): string {
  return locale
}

/** Inline trilingual helper — for view-specific strings outside the UI dictionary. */
export function tr(locale: Locale, he: string, en: string, ru?: string): string {
  if (locale === 'he') return he
  if (locale === 'ru') return ru ?? en
  return en
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
  works: string
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
    works:            'חיבורים',
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
    works:            'Works',
  },
  ru: {
    appTitle:         'Оцар Хахамим',
    appSubtitle:      'Граф знаний еврейских мудрецов',
    searchPlaceholder:'Поиск мудреца — имя, эпоха, место...',
    searchLabel:      'Поиск',
    filtersLabel:     'Фильтр',
    advancedSearch:   'Расширенный поиск',
    clearFilters:     'Сбросить фильтры',
    close:            'Закрыть',
    loading:          'Загрузка...',
    noResults:        'Ничего не найдено',
    sagesLoaded:      'Мудрецы',
    lastUpdate:       'Последнее обновление',
    openFilters:      'Открыть фильтры',
    period:           'Эпоха',
    region:           'Регион',
    field:            'Область',
    connections:      'Связи',
    biography:        'Биография',
    coreConcept:      'Основная идея',
    migrationPath:    'Миграция',
    relatedSages:     'Связанные мудрецы',
    externalLinks:    'Внешние ссылки',
    exportPDF:        'Экспорт PDF',
    allPeriods:       'Все эпохи',
    works:            'Сочинения',
  },
}
