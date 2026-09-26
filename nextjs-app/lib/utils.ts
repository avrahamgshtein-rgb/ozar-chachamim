import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Locale } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Hebrew life-span label.
 *
 * `precision: 'century'` means the year pair is a 100-year window rather than
 * a lifespan, so it renders as "המאה ה־12" — printing "1100–1200" there would
 * assert dates the source never gave.
 */
export function formatYearRange(
  birth?: number,
  death?: number,
  precision?: 'exact' | 'century',
): string {
  if (birth == null && death == null) return ''

  const bce = (y: number) => `${Math.abs(y)} לפנה״ס`
  const one = (y: number) => (y < 0 ? bce(y) : `${y}`)

  if (precision === 'century' && birth != null) {
    const n = Math.floor(Math.abs(birth) / 100) + 1
    return birth < 0 ? `המאה ה־${n} לפנה״ס` : `המאה ה־${n}`
  }

  if (birth != null && death != null) {
    // One "לפנה״ס" at the end when the whole span is BCE, rather than on each year.
    if (birth < 0 && death < 0) return `${Math.abs(birth)}–${Math.abs(death)} לפנה״ס`
    return `${one(birth)}–${one(death)}`
  }
  if (birth != null) return `נ. ${one(birth)}`
  if (death != null) return `נפ. ${one(death)}`
  return ''
}

/** One year in the reader's locale: "586 לפנה״ס" / "586 BCE" / "586 до н. э.". */
export function formatYear(year: number, locale: Locale = 'he'): string {
  if (year >= 0) return `${year}`
  const n = Math.abs(year)
  return locale === 'en' ? `${n} BCE` : locale === 'ru' ? `${n} до н. э.` : `${n} לפנה״ס`
}

/**
 * `formatYearRange` for any locale. Hebrew delegates to it unchanged; English
 * and Russian follow the same rules (a century window reads as a century, one
 * BCE suffix for an all-BCE span), including its century arithmetic, so a sage
 * never shows a different century depending on the interface language.
 */
export function formatYearRangeFor(
  locale: Locale,
  birth?: number,
  death?: number,
  precision?: 'exact' | 'century',
): string {
  if (locale === 'he') return formatYearRange(birth, death, precision)
  if (birth == null && death == null) return ''

  const en = locale === 'en'
  const bceSuffix = en ? ' BCE' : ' до н. э.'
  const one = (y: number) => formatYear(y, locale)

  if (precision === 'century' && birth != null) {
    const n = Math.floor(Math.abs(birth) / 100) + 1
    const name = en ? `${ordinal(n)} century` : `${roman(n)} век`
    return birth < 0 ? name + bceSuffix : name
  }

  if (birth != null && death != null) {
    if (birth < 0 && death < 0) return `${Math.abs(birth)}–${Math.abs(death)}${bceSuffix}`
    return `${one(birth)}–${one(death)}`
  }
  if (birth != null) return `${en ? 'b.' : 'род.'} ${one(birth)}`
  return `${en ? 'd.' : 'ум.'} ${one(death!)}`
}

function ordinal(n: number): string {
  const tens = n % 100
  if (tens >= 11 && tens <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

function roman(n: number): string {
  const parts: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let out = ''
  for (const [v, s] of parts) while (n >= v) { out += s; n -= v }
  return out
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .trim()
}
