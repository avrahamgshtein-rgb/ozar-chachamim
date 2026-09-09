import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .trim()
}
