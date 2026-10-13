// "Today at Ozar Chachamim": today's Hebrew date, the sages whose hillula (yahrzeit) falls today, and a
// sage of the day when none does. Pure (no server imports), so the page, the status image and the tests
// share it.
//
// Death dates come from public/data-yahrzeit.json, a per-id side file built by
// scripts/build_yahrzeit.py from dates the sage's own research paper states (each entry keeps the
// paper's words and the roster label it was read for: tests/today.test.ts fails when an id now belongs
// to another sage). The day turns at midnight in Israel, not at nightfall.
import yahrzeitData from '../public/data-yahrzeit.json'

/** Hebrew months as Intl names them (`en-u-ca-hebrew`), in the order of the year from Tishri. */
export const HEBREW_MONTHS = [
  'Tishri', 'Heshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar I', 'Adar', 'Adar II', 'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul',
] as const
export type HebrewMonth = (typeof HEBREW_MONTHS)[number]

export interface Yahrzeit {
  label: string
  day: number
  month: HebrewMonth
  /** The paper's own words giving the date. */
  quote: string
}

export const YAHRZEITS = yahrzeitData as Record<string, Yahrzeit>

export interface HebrewDate {
  day: number
  month: HebrewMonth
  year: number
  /** A leap year has Adar I and Adar II instead of Adar. */
  leap: boolean
  /** True on the 29th of a month that has no 30th: a yahrzeit on the 30th is kept today. */
  lastDayIs29: boolean
}

export const ISRAEL_TZ = 'Asia/Jerusalem'
const DAY_MS = 86_400_000

function parts(date: Date, tz: string): { day: number; month: string; year: number } {
  const fmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric', timeZone: tz })
  const p = fmt.formatToParts(date)
  const get = (t: string) => p.find(x => x.type === t)?.value ?? ''
  return { day: Number(get('day')), month: get('month'), year: Number(get('year').replace(/\D/g, '')) }
}

/** The Hebrew date of `date` in Israel (or another time zone). */
export function hebrewDate(date: Date, tz: string = ISRAEL_TZ): HebrewDate {
  const today = parts(date, tz)
  const tomorrow = parts(new Date(date.getTime() + DAY_MS), tz)
  // A leap year: some day of it is in Adar II. The year's Adar is about 5 to 7 months after Tishri.
  const leap = isLeapYear(today.year)
  return {
    day: today.day,
    month: today.month as HebrewMonth,
    year: today.year,
    leap,
    lastDayIs29: today.day === 29 && tomorrow.day === 1,
  }
}

/** The 19-year cycle: years 3, 6, 8, 11, 14, 17 and 19 are leap years. */
export function isLeapYear(year: number): boolean {
  return (7 * year + 1) % 19 < 7
}

/** Whether a death on `y` is remembered on the Hebrew date `d`. */
export function isYahrzeitOn(y: Pick<Yahrzeit, 'day' | 'month'>, d: HebrewDate): boolean {
  const dayMatches = y.day === d.day || (y.day === 30 && d.lastDayIs29)
  if (!dayMatches) return false
  if (y.month === d.month) return true
  // Adar of a common year is kept in Adar II of a leap year (the widespread custom);
  // Adar I or Adar II of a leap year is kept in the single Adar of a common year.
  if (d.leap && y.month === 'Adar' && d.month === 'Adar II') return true
  if (!d.leap && (y.month === 'Adar I' || y.month === 'Adar II') && d.month === 'Adar') return true
  return false
}

/** Ids of the sages whose hillula falls on this Hebrew date. */
export function hillulotOn(d: HebrewDate, known: Set<string> | null = null): string[] {
  return Object.entries(YAHRZEITS)
    .filter(([id, y]) => (!known || known.has(id)) && isYahrzeitOn(y, d))
    .map(([id]) => id)
    .sort((a, b) => Number(a) - Number(b))
}

/** Days since 1 Jan 1970 in the given time zone: a number that changes once a day, at local midnight. */
export function dayNumber(date: Date, tz: string = ISRAEL_TZ): number {
  const p = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz }).format(date)
  return Math.floor(Date.parse(`${p}T00:00:00Z`) / DAY_MS)
}

/**
 * The sage of the day: a stable walk through `ids` (sorted), a different one each day and every one
 * within a cycle, the same for every visitor on the same day.
 */
export function sageOfTheDay(ids: string[], day: number): string | null {
  if (ids.length === 0) return null
  const sorted = [...ids].sort((a, b) => Number(a) - Number(b))
  const n = sorted.length
  // a step coprime with n visits every index once per cycle
  let step = Math.max(1, Math.floor(n * 0.618))
  while (gcd(step, n) !== 1) step++
  return sorted[(((day * step) % n) + n) % n]
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/** The Hebrew date written out: "ב׳ בחשוון התשפ״ז", "2 Heshvan 5787", "2 хешвана 5787". */
export function formatHebrewDate(date: Date, locale: 'he' | 'en' | 'ru', tz: string = ISRAEL_TZ): string {
  if (locale === 'he') {
    const p = new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric', timeZone: tz }).formatToParts(date)
    const get = (t: string) => p.find(x => x.type === t)?.value ?? ''
    const day = hebrewNumeral(Number(get('day')))
    const year = hebrewNumeral(Number(get('year').replace(/\D/g, '')) % 1000)
    return `${day} ב${get('month').replace(/^ב/, '')} ה${year}`
  }
  return new Intl.DateTimeFormat(`${locale}-u-ca-hebrew`, { day: 'numeric', month: 'long', year: 'numeric', timeZone: tz }).format(date)
}

/** The civil date of the same day: "13 באוקטובר 2026". */
export function formatCivilDate(date: Date, locale: 'he' | 'en' | 'ru', tz: string = ISRAEL_TZ): string {
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: tz }).format(date)
}

const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
const HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק']

/** A number in Hebrew letters with geresh or gershayim: 2 → ב׳, 15 → ט״ו, 787 → תשפ״ז. */
export function hebrewNumeral(n: number): string {
  if (n <= 0 || n >= 1000) return String(n)
  let s = HUNDREDS[Math.floor(n / 100)]
  const rest = n % 100
  if (rest === 15) s += 'טו'
  else if (rest === 16) s += 'טז'
  else s += TENS[Math.floor(rest / 10)] + ONES[rest % 10]
  return s.length === 1 ? `${s}׳` : `${s.slice(0, -1)}״${s.slice(-1)}`
}

/** The Hebrew name of a month, for a yahrzeit line ("כ׳ בטבת"). */
export const MONTH_HE: Record<HebrewMonth, string> = {
  Tishri: 'תשרי', Heshvan: 'חשוון', Kislev: 'כסלו', Tevet: 'טבת', Shevat: 'שבט', 'Adar I': 'אדר א׳', Adar: 'אדר',
  'Adar II': 'אדר ב׳', Nisan: 'ניסן', Iyar: 'אייר', Sivan: 'סיוון', Tamuz: 'תמוז', Av: 'אב', Elul: 'אלול',
}
