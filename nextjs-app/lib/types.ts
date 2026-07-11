export type Period =
  | 'second-temple'
  | 'tannaim'
  | 'amoraim'
  | 'geonim'
  | 'rishonim'
  | 'acharonim'
  | 'modern'

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
  tags?: string[]
  migration_path?: MigrationPath
  coordinates?: { lat: number; lng: number }
  spotify_url?: string
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
  period: Period[]
  region: Region[]
  field: string[]
  searchQuery: string
}

export const ERA_LABELS: Record<Period, Record<Locale, string>> = {
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
  'second-temple': '#8e44ad',
  tannaim:         '#e74c3c',
  amoraim:         '#e67e22',
  geonim:          '#f1c40f',
  rishonim:        '#27ae60',
  acharonim:       '#2980b9',
  modern:          '#1abc9c',
}

export const REGION_LABELS: Record<Region, { he: string; en: string }> = {
  'ashkenaz':    { he: 'אשכנז',        en: 'Ashkenaz'      },
  'east-europe': { he: 'מזרח אירופה',  en: 'Eastern Europe' },
  'tsarfat':     { he: 'צרפת',         en: 'France'         },
  'provence':    { he: 'פרובנס',       en: 'Provence'       },
  'sefarad':     { he: 'ספרד',         en: 'Sepharad'       },
  'italy':       { he: 'איטליה',       en: 'Italy'          },
  'north-africa':{ he: 'צפון אפריקה', en: 'North Africa'   },
  'mizrach':     { he: 'המזרח',        en: 'Middle East'    },
  'eretz-israel':{ he: 'ארץ ישראל',   en: 'Eretz Israel'   },
  'other':       { he: 'אחר',          en: 'Other'          },
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

export const TAB_META: Record<Tab, { labelHe: string; labelEn: string; icon: string }> = {
  graph:      { labelHe: 'רשת קשרים',      labelEn: 'Network',    icon: '⬡' },
  map:        { labelHe: 'גיאוגרפיה',      labelEn: 'Geography',  icon: '◎' },
  traditions: { labelHe: 'מסורות',         labelEn: 'Traditions', icon: '◈' },
  ideas:      { labelHe: 'טבלה',           labelEn: 'Table',      icon: '≡' },
  timeline:   { labelHe: 'שלשלת הקבלה',  labelEn: 'Timeline',   icon: '▷' },
  genealogy:  { labelHe: 'עץ שושלות',     labelEn: 'Lineage',    icon: '⟁' },
  about:      { labelHe: 'אודות',          labelEn: 'About',      icon: 'temple' },
}
