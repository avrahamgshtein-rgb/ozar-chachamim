// Server-side translation: applies the locale overlays to sage data, so
// /en/sage/<id> and /ru/sage/<id> render translated fields in the initial
// HTML. Mirrors the browser's lib/contentOverlay.ts (same files, same fields,
// same name_en fallback), so the drawer and the sage page agree.
//
// The overlays are imported statically, like data.json in serverData.ts:
// bundled at build time, never fetched and never read through `fs`
// (public/ isn't readable from Vercel's serverless functions).

import type { Locale, Sage } from './types'
import type { SageOverlay, SageOverlayEntry } from './contentOverlay'
import overlayEn from '../public/i18n/sages.en.json'
import overlayRu from '../public/i18n/sages.ru.json'

const OVERLAYS: Record<'en' | 'ru', SageOverlay> = {
  en: overlayEn as SageOverlay,
  ru: overlayRu as SageOverlay,
}

/** The translatable fields; anything else in an overlay entry is ignored. */
const FIELDS = ['label', 'bio', 'core_concept', 'field', 'location'] as const satisfies readonly (keyof SageOverlayEntry)[]

/** The overlay entry for one sage, or null (Hebrew, or not translated yet). */
export function overlayEntry(id: string, locale: Locale): SageOverlayEntry | null {
  if (locale === 'he') return null
  return OVERLAYS[locale][String(id)] ?? null
}

/**
 * The sage as shown in `locale`: translated fields overlaid on the Hebrew
 * record. Untranslated sages keep their Hebrew text, except that a Latin
 * `name_en` stands in for the Hebrew label. Never mutates its input.
 */
export function localizeSage(sage: Sage, locale: Locale): Sage {
  if (locale === 'he') return sage
  const entry = overlayEntry(sage.id, locale)
  if (!entry) return sage.name_en ? { ...sage, label: sage.name_en } : sage
  const out: Sage = { ...sage }
  for (const f of FIELDS) {
    const v = entry[f]
    if (typeof v === 'string' && v.trim()) out[f] = v
  }
  return out
}

/** Which fields of this sage are actually translated in `locale`. */
export function translatedFields(id: string, locale: Locale): Set<(typeof FIELDS)[number]> {
  const entry = overlayEntry(id, locale)
  const out = new Set<(typeof FIELDS)[number]>()
  if (entry) for (const f of FIELDS) if (typeof entry[f] === 'string' && entry[f]!.trim()) out.add(f)
  return out
}

// ── Earlier API, kept for compatibility ─────────────────────────────────────

/** Overlay one sage with a given translation map. Hebrew passes through. */
export function translateSage(sage: Sage, translations: Record<string, Partial<Sage>>, locale: Locale): Sage {
  if (locale === 'he') return sage
  const translated = translations[sage.id]
  return translated ? { ...sage, ...translated } : sage
}

export function translateSages(sages: Sage[], translations: Record<string, Partial<Sage>>, locale: Locale): Sage[] {
  return locale === 'he' ? sages : sages.map(s => translateSage(s, translations, locale))
}

/** The bundled overlay map for a locale ({} for Hebrew). */
export async function getOverlay(locale: Locale): Promise<Record<string, Partial<Sage>>> {
  return locale === 'he' ? {} : (OVERLAYS[locale] as Record<string, Partial<Sage>>)
}
