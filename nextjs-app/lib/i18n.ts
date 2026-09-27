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

/** OpenGraph locale codes, one per site locale. */
export const OG_LOCALES: Record<Locale, string> = { he: 'he_IL', en: 'en_US', ru: 'ru_RU' }

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

  // Site frame: SEO, skip links, header controls, tab bar, 404
  seoDescription: string
  skipToContent: string
  skipToTabs: string
  tabsLabel: string
  sagesUnit: string
  linksUnit: string
  statsToggle: string
  byEra: string
  dataAsOf: string
  themeToLight: string
  themeToDark: string
  themeToggle: string
  guidedTour: string
  startTour: string
  languageMenu: string
  moreActions: string
  backToMap: string
  notFoundTitle: string
  notFoundBody: string
  notFoundSearch: string
  notFoundSearchHint: string
  notFoundNoMatch: string
  notFoundExplore: string
  goHome: string
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

    seoDescription:   'מפת ידע של חכמי ישראל לדורותיהם: עבודת מחקר על כל חכם, רשת הקשרים בין רבותיו לתלמידיו, מפה, ציר זמן, שושלות ופרקי האזנה.',
    skipToContent:    'דלג לתוכן',
    skipToTabs:       'דלג לבחירת התצוגה',
    tabsLabel:        'תצוגות',
    sagesUnit:        'חכמים',
    linksUnit:        'קשרים',
    statsToggle:      'פילוח החכמים לפי תקופה',
    byEra:            'לפי תקופה',
    dataAsOf:         'נתונים נכון ל־',
    themeToLight:     'מעבר למצב בהיר',
    themeToDark:      'מעבר למצב כהה',
    themeToggle:      'מצב כהה / בהיר',
    guidedTour:       'סיור מודרך',
    startTour:        'התחלת סיור מודרך',
    languageMenu:     'שפת האתר',
    moreActions:      'פעולות נוספות',
    backToMap:        'חזרה למפת החכמים',
    notFoundTitle:    'הדף לא נמצא',
    notFoundBody:     'ייתכן שנפלה טעות בכתובת, או שהדף הועבר. אפשר לחפש חכם לפי שמו, או להמשיך לאחת התצוגות.',
    notFoundSearch:   'חיפוש חכם',
    notFoundSearchHint:'הקלידו שם, למשל רמב״ם',
    notFoundNoMatch:  'לא נמצא חכם בשם הזה',
    notFoundExplore:  'או המשיכו אל',
    goHome:           'לדף הבית',
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

    seoDescription:   'A knowledge map of the Jewish sages across the generations: a research paper on each sage, the network of teachers and students, a map, a timeline, lineages and podcast episodes.',
    skipToContent:    'Skip to content',
    skipToTabs:       'Skip to view selection',
    tabsLabel:        'Views',
    sagesUnit:        'sages',
    linksUnit:        'links',
    statsToggle:      'Sages by era',
    byEra:            'By era',
    dataAsOf:         'Data as of ',
    themeToLight:     'Switch to light mode',
    themeToDark:      'Switch to dark mode',
    themeToggle:      'Dark / light mode',
    guidedTour:       'Guided tour',
    startTour:        'Start the guided tour',
    languageMenu:     'Site language',
    moreActions:      'More actions',
    backToMap:        'Back to the map of sages',
    notFoundTitle:    'Page not found',
    notFoundBody:     'The address may be mistyped, or the page may have moved. Search for a sage by name, or continue to one of the views.',
    notFoundSearch:   'Search for a sage',
    notFoundSearchHint:'Type a name, e.g. Rambam',
    notFoundNoMatch:  'No sage by that name',
    notFoundExplore:  'Or continue to',
    goHome:           'Go to the home page',
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

    seoDescription:   'Карта знаний о еврейских мудрецах разных поколений: исследование о каждом мудреце, сеть учителей и учеников, карта, хронология, династии и выпуски подкаста.',
    skipToContent:    'Перейти к содержанию',
    skipToTabs:       'Перейти к выбору вида',
    tabsLabel:        'Виды',
    sagesUnit:        'мудрецов',
    linksUnit:        'связей',
    statsToggle:      'Мудрецы по эпохам',
    byEra:            'По эпохам',
    dataAsOf:         'Данные на ',
    themeToLight:     'Включить светлую тему',
    themeToDark:      'Включить тёмную тему',
    themeToggle:      'Тёмная / светлая тема',
    guidedTour:       'Обучающий тур',
    startTour:        'Начать обучающий тур',
    languageMenu:     'Язык сайта',
    moreActions:      'Другие действия',
    backToMap:        'Назад к карте мудрецов',
    notFoundTitle:    'Страница не найдена',
    notFoundBody:     'Возможно, в адресе опечатка или страница переехала. Найдите мудреца по имени или перейдите к одному из видов.',
    notFoundSearch:   'Поиск мудреца',
    notFoundSearchHint:'Введите имя, например Рамбам',
    notFoundNoMatch:  'Мудрец с таким именем не найден',
    notFoundExplore:  'Или перейдите к',
    goHome:           'На главную',
  },
}
