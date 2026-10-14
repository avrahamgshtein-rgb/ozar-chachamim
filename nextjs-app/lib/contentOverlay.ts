// Content localization overlay — Masterplan Phase 2 ("Content Translation").
// Canonical data.json stays Hebrew; per-locale overlay files under
// public/i18n/sages.<locale>.json carry translated fields which are merged
// over the sage records at load time. Generated/extended by the Character
// Factory pipeline (Phase 3); safe to ship partially — untranslated sages
// simply fall back to Hebrew.
import type { Sage, Locale } from './types'
import { CONJUNCTION_WORD, translateTerm, type TermDict } from './terms'

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

/** The place and field vocabulary of `locale` (lib/terms.ts), or null. */
export async function fetchTerms(locale: Locale): Promise<TermDict | null> {
  if (locale === 'he') return null
  try {
    const res = await fetch(`/i18n/terms.${locale}.json`)
    if (!res.ok) return null
    return ((await res.json()) as { terms?: TermDict }).terms ?? null
  } catch {
    return null
  }
}

/** `location_label` / `field_label` for a sage, from the vocabulary; nothing when untranslated. */
export function withTermLabels(sage: Sage, terms: TermDict | null | undefined, locale: Locale): Sage {
  if (!terms || locale === 'he') return sage
  const and = CONJUNCTION_WORD[locale]
  const location_label = translateTerm(sage.location, terms, and) ?? undefined
  const field_label = translateTerm(sage.field, terms, and) ?? undefined
  // each tag is its own chip: an untranslated one stays Hebrew without taking the others with it
  const tags_label = sage.tags?.length ? sage.tags.map(t => translateTerm(t, terms, and) ?? t) : undefined
  return location_label || field_label || tags_label ? { ...sage, location_label, field_label, tags_label } : sage
}

/** What a page shows as the sage's place and field: the translation when there is one. */
export const shownLocation = (s: Pick<Sage, 'location' | 'location_label'>) => s.location_label ?? s.location
export const shownField = (s: Pick<Sage, 'field' | 'field_label'>) => s.field_label ?? s.field
export const shownTags = (s: Pick<Sage, 'tags' | 'tags_label'>) => s.tags_label ?? s.tags ?? []

export function applyOverlay(sages: Sage[], overlay: SageOverlay | null, terms?: TermDict | null, locale?: Locale): Sage[] {
  if (!overlay) return sages
  let applied = 0
  const label = (s: Sage) => (locale ? withTermLabels(s, terms, locale) : s)
  // `label_he` keeps the canonical Hebrew label for name-keyed lookups
  // (lib/schools.ts) once `label` is replaced by a translation.
  const merged = sages.map(sage => {
    const entry = overlay[sage.id]
    if (!entry) {
      // Fallback: no translation entry yet → at least show the Latin name
      // instead of Hebrew when one exists
      return label(sage.name_en ? { ...sage, label: sage.name_en, label_he: sage.label } : sage)
    }
    applied++
    return label({ ...sage, ...entry, label_he: sage.label })
  })
  if (applied > 0) {
    console.log(`[i18n] ✅ Content overlay: ${applied} sages translated`)
  }
  return merged
}
