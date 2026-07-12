// Content localization overlay — Masterplan Phase 2 ("Content Translation").
// Canonical data.json stays Hebrew; per-locale overlay files under
// public/i18n/sages.<locale>.json carry translated fields which are merged
// over the sage records at load time. Generated/extended by the Character
// Factory pipeline (Phase 3); safe to ship partially — untranslated sages
// simply fall back to Hebrew.
import type { Sage, Locale } from './types'

export interface SageOverlayEntry {
  label?: string
  bio?: string
  core_concept?: string
  field?: string
  location?: string
}

export type SageOverlay = Record<string, SageOverlayEntry>

export async function fetchContentOverlay(locale: Locale): Promise<SageOverlay | null> {
  if (locale === 'he') return null // Hebrew is canonical
  try {
    const res = await fetch(`/i18n/sages.${locale}.json`)
    if (!res.ok) return null
    return (await res.json()) as SageOverlay
  } catch {
    return null
  }
}

export function applyOverlay(sages: Sage[], overlay: SageOverlay | null): Sage[] {
  if (!overlay) return sages
  let applied = 0
  const merged = sages.map(sage => {
    const entry = overlay[sage.id]
    if (!entry) return sage
    applied++
    return { ...sage, ...entry }
  })
  if (applied > 0) {
    console.log(`[i18n] ✅ Content overlay: ${applied} sages translated`)
  }
  return merged
}
