export type Period =
  | 'patriarchs'
  | 'exodus'
  | 'judges'
  | 'kings'
  | 'second-temple'
  | 'tannaim'
  | 'amoraim'
  | 'geonim'
  | 'rishonim'
  | 'acharonim'
  | 'modern'

/** Canonical chronological order — single source for era lists across views. */
export const ALL_PERIODS: Period[] = [
  'patriarchs', 'exodus', 'judges', 'kings',
  'second-temple', 'tannaim', 'amoraim',
  'geonim', 'rishonim', 'acharonim', 'modern',
]

export type Region =
  | 'ashkenaz'
  | 'east-europe'
  | 'tsarfat'
  | 'provence'
  | 'sefarad'
  | 'italy'
  | 'north-africa'
  | 'mizrach'
  | 'eretz-israel'
  | 'other'

export type ConnectionType =
  | 'student'
  | 'teacher'
  | 'colleague'
  | 'influence'
  | 'oppose'
  | 'predecessor'
  | 'contemporary'
  | 'family'

export type Locale = 'he' | 'en' | 'ru'

export type Tab = 'graph' | 'map' | 'traditions' | 'ideas' | 'timeline' | 'genealogy' | 'about'

export interface MigrationPath {
  from: string
  to: string
  intermediate?: string[]
  years?: string
}

export interface Sage {
  id: string
  label: string
  name_en?: string
  period: Period
  region?: Region
  location?: string
  field?: string
  bio?: string
  core_concept?: string
  birth_year?: number
  death_year?: number
  /**
   * How much the year pair can be trusted.
   *   'exact'   — the source gave real dates, e.g. "1905–1997"
   *   'century' — only a century is known; birth/death are the bounds of that
   *               window, NOT a lifespan. Never present these as a specific
   *               date, and never assert two such sages were contemporaries.
   * Absent means no usable years were found.
   */
  date_precision?: 'exact' | 'century'
  tags?: string[]
  migration_path?: MigrationPath
  coordinates?: { lat: number; lng: number }
  spotify_url?: string
  works?: string[]
}

export interface Connection {
  source: string
  target: string
  type: ConnectionType
  source_name?: string
  target_name?: string
}

export interface GraphData {
  nodes: Sage[]
  links: Connection[]
}

export interface ResearchContent {
  sage_id: string
  content: string
  source_file?: string
  created_at: string
}

export interface Filters {
  period: Period[] | null
  region: Region[]
  field: string[]
  searchQuery: string
  /**
   * A single canonical place from LOCATION_COORDS. When set, the dataset
   * narrows to everyone recorded there — whether they lived there or passed
   * through on a migration path. Distinct from `region`, which is a coarse
   * keyword bucket: this is one named city or land.
   */
  place: string | null
}

/**
 * "פאות" — ערכי `tags` נבחרים שנושאים סינון נושאי שחוצה תחומי דעת.
 *
 * נשים, למשל, אינן "תחום" (הן מלכות, נביאות, מחנכות, פוסקות…), ולכן הסימון
 * יושב ב-`tags` שבנתונים ולא ב-`field`. כדי לא להוסיף ממד סינון מקביל,
 * הפאות רוכבות על `filters.field` הקיים: אותו setter, אותו clear, אותו מונה,
 * אותו סנכרון URL. `applyFilters` מתאים ערך נבחר מול תגיות רק כשהוא ברשימה
 * הזו — כך שצ'יפים קיימים ("הלכה", "קבלה"…) שומרים על משמעותם המקורית.
 */
export const TAG_FACETS = ['נשים'] as const
export type TagFacet = (typeof TAG_FACETS)[number]

export const TAG_FACET_LABELS: Record<TagFacet, Record<Locale, string>> = {
  'נשים': { he: 'נשים', en: 'Women', ru: 'Женщины' },
}

export function isTagFacet(value: string): value is TagFacet {
  return (TAG_FACETS as readonly string[]).includes(value)
}

export const ERA_LABELS: Record<Period, Record<Locale, string>> = {
  patriarchs:      { he: 'האבות',           en: 'Patriarchs',    ru: 'Праотцы'        },
  exodus:          { he: 'יציאת מצרים',    en: 'Exodus & Sinai', ru: 'Исход и Синай' },
  judges:          { he: 'השופטים',         en: 'Judges',        ru: 'Судьи'          },
  kings:           { he: 'המלכים',          en: 'Kings',         ru: 'Цари'           },
  'second-temple': { he: 'בית שני',        en: 'Second Temple', ru: 'Второй Храм'    },
  tannaim:         { he: 'תנאים',           en: 'Tannaim',       ru: 'Таннаи'         },
  amoraim:         { he: 'אמוראים',         en: 'Amoraim',       ru: 'Амораи'         },
  geonim:          { he: 'גאונים',          en: 'Geonim',        ru: 'Гаоны'          },
  rishonim:        { he: 'ראשונים',         en: 'Rishonim',      ru: 'Ришоним'        },
  acharonim:       { he: 'אחרונים',         en: 'Acharonim',     ru: 'Ахароним'       },
  modern:          { he: 'מודרני',          en: 'Modern',        ru: 'Современность'  },
}

export const CONNECTION_LABELS: Record<ConnectionType, Record<Locale, string>> = {
  student:      { he: 'תלמיד',   en: 'Student',       ru: 'Ученик'          },
  teacher:      { he: 'רב',      en: 'Teacher',        ru: 'Учитель'         },
  colleague:    { he: 'חבר',     en: 'Colleague',      ru: 'Коллега'         },
  influence:    { he: 'השפעה',   en: 'Influence',      ru: 'Влияние'         },
  oppose:       { he: 'פולמוס',  en: 'Opponent',       ru: 'Оппонент'        },
  predecessor:  { he: 'קודם',    en: 'Predecessor',    ru: 'Предшественник'  },
  contemporary: { he: 'בן דור',  en: 'Contemporary',   ru: 'Современник'     },
  family:       { he: 'משפחה',   en: 'Family',         ru: 'Семья'           },
}

export const ERA_COLORS: Record<Period, string> = {
  patriarchs:      '#8d6e63',
  exodus:          '#ad1457',
  judges:          '#00838f',
  kings:           '#455a64',
  'second-temple': '#8e44ad',
  tannaim:         '#e74c3c',
  amoraim:         '#e67e22',
  geonim:          '#f1c40f',
  rishonim:        '#27ae60',
  acharonim:       '#2980b9',
  modern:          '#1abc9c',
}

export const REGION_LABELS: Record<Region, Record<Locale, string>> = {
  'ashkenaz':    { he: 'אשכנז',        en: 'Ashkenaz',       ru: 'Ашкеназ'          },
  'east-europe': { he: 'מזרח אירופה',  en: 'Eastern Europe', ru: 'Восточная Европа' },
  'tsarfat':     { he: 'צרפת',         en: 'France',         ru: 'Франция'          },
  'provence':    { he: 'פרובנס',       en: 'Provence',       ru: 'Прованс'          },
  'sefarad':     { he: 'ספרד',         en: 'Sepharad',       ru: 'Сефарад'          },
  'italy':       { he: 'איטליה',       en: 'Italy',          ru: 'Италия'           },
  'north-africa':{ he: 'צפון אפריקה', en: 'North Africa',   ru: 'Северная Африка'  },
  'mizrach':     { he: 'המזרח',        en: 'Middle East',    ru: 'Ближний Восток'   },
  'eretz-israel':{ he: 'ארץ ישראל',   en: 'Eretz Israel',   ru: 'Земля Израиля'    },
  'other':       { he: 'אחר',          en: 'Other',          ru: 'Другое'           },
}

export const REGION_COLORS: Record<Region, string> = {
  'ashkenaz':    '#43a047',
  'east-europe': '#c0ca33',
  'tsarfat':     '#ec407a',
  'provence':    '#f9a825',
  'sefarad':     '#1e88e5',
  'italy':       '#26c6da',
  'north-africa':'#8e24aa',
  'mizrach':     '#ef6c00',
  'eretz-israel':'#00897b',
  'other':       '#90a4ae',
}

export const TAB_META: Record<Tab, { labelHe: string; labelEn: string; labelRu: string; icon: string }> = {
  graph:      { labelHe: 'רשת קשרים',      labelEn: 'Network',    labelRu: 'Сеть связей', icon: '⬡' },
  map:        { labelHe: 'גיאוגרפיה',      labelEn: 'Geography',  labelRu: 'География',   icon: '◎' },
  traditions: { labelHe: 'מסורות',         labelEn: 'Traditions', labelRu: 'Традиции',    icon: '◈' },
  ideas:      { labelHe: 'טבלה',           labelEn: 'Table',      labelRu: 'Таблица',     icon: '≡' },
  timeline:   { labelHe: 'שלשלת הקבלה',  labelEn: 'Timeline',   labelRu: 'Хронология',  icon: '▷' },
  genealogy:  { labelHe: 'עץ שושלות',     labelEn: 'Lineage',    labelRu: 'Династии',    icon: '⟁' },
  about:      { labelHe: 'אודות',          labelEn: 'About',      labelRu: 'О проекте',   icon: 'temple' },
}
