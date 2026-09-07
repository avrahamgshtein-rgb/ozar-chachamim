// Server-side translation: applies locale overlays to sage data
// Mirrors browser behavior (contentOverlay.ts) for consistent localization

import type { Sage } from './types'
import { applyTranslations, type SageRecord } from './dataFoundation'

// Lazy-loaded locale overlays (only on demand, server-side)
let cachedOverlays: Record<string, Record<string, Partial<Sage>>> = {}

async function loadOverlay(locale: 'he' | 'en' | 'ru'): Promise<Record<string, Partial<Sage>>> {
  if (locale === 'he') return {} // Hebrew is canonical
  if (cachedOverlays[locale]) return cachedOverlays[locale]

  try {
    const overlayData = await import(`../public/i18n/sages.${locale}.json`, {
      with: { type: 'json' },
    }).then(m => m.default)
    cachedOverlays[locale] = overlayData
    return overlayData
  } catch {
    // Overlay not available, fallback to canonical (Hebrew)
    return {}
  }
}

/**
 * Apply locale translation to a sage
 * Preserves canonical data, overlays translated fields only
 * No mutation of input
 */
export function translateSage(sage: Sage, translations: Record<string, Partial<Sage>>, locale: 'he' | 'en' | 'ru'): Sage {
  if (locale === 'he') return sage // Hebrew is canonical

  const translated = translations[sage.id]
  if (!translated) return sage

  // Shallow merge: translated fields overlay canonical
  return { ...sage, ...translated }
}

/**
 * Translate all sages for a given locale
 * Used by server-rendered pages
 */
export function translateSages(sages: Sage[], translations: Record<string, Partial<Sage>>, locale: 'he' | 'en' | 'ru'): Sage[] {
  if (locale === 'he') return sages

  return sages.map(sage => translateSage(sage, translations, locale))
}

/**
 * Lazy loader for overlays by locale
 * Caches in memory to avoid repeated I/O
 */
export async function getOverlay(locale: 'he' | 'en' | 'ru'): Promise<Record<string, Partial<Sage>>> {
  return loadOverlay(locale)
}
