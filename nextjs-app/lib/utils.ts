import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatYearRange(birth?: number, death?: number): string {
  if (!birth && !death) return ''
  if (birth && death) return `${birth}–${death}`
  if (birth) return `נ. ${birth}`
  if (death) return `נפ. ${death}`
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
