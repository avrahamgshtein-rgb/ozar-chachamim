// Stage 2: Unified Data Foundation
// Single source for normalization and merging across browser and server consumers
// Preserves all supported fields, validates without silent loss, documents quality issues

import type { Sage, Connection, Period } from './types'

export interface Location {
  place: string
  role?: 'birth' | 'residence' | 'study' | 'teaching' | 'activity'
  period?: string
  precision?: 'exact' | 'approximate' | 'region' | 'unknown'
  source?: string
}

export interface SageRecord extends Sage {
  // Raw source fields (may be preserved from original data)
  era?: string
  era_key?: string
  era_label?: string
  chapter_type?: string
  central_idea?: string
  has_research?: boolean
  // Location enrichment (Stage 2 extension)
  locations?: Location[]
}

export interface DataValidationIssue {
  sage_id: string
  type: 'missing_period' | 'invalid_period' | 'duplicate_id' | 'unknown_location'
  message: string
  severity: 'error' | 'warning'
}

export interface DataQualityReport {
  total_sages: number
  total_connections: number
  issues: DataValidationIssue[]
  canonical_count: number
  supplement_count: number
  deduplicated_relationships: number
}

// Authoritative era mapping: raw era_key in data → canonical Period type
const ERA_KEY_MAP: Record<string, Period> = {
  'patriarchs': 'patriarchs',
  'exodus': 'exodus',
  'judges': 'judges',
  'kings': 'kings',
  'second-temple': 'second-temple',
  'tannaim': 'tannaim',
  'amoraim': 'amoraim',
  'geonim': 'geonim',
  'rishonim': 'rishonim',
  'acharonim': 'acharonim',
  'modern': 'modern',
  // Fallback for unknown values
  '': 'modern',
}

/**
 * Normalize a raw data node to canonical Sage type
 * Preserves all supported fields; reports missing critical fields
 */
export function normalizeSage(raw: Record<string, unknown>, issues: DataValidationIssue[]): SageRecord | null {
  const id = String(raw.id ?? '').trim()
  if (!id) {
    issues.push({
      sage_id: '(unknown)',
      type: 'missing_period',
      message: 'Node has no id',
      severity: 'error',
    })
    return null
  }

  // The master dataset names this column `era_key`; the supplement files
  // (data-ancient, data-supplement*) use `period`. Reading only the former
  // silently dropped every supplement sage into 'modern' — King David showed
  // as "מודרני · 1040–970 לפנה״ס" — because an absent key raises no warning.
  const era_key = String(raw.era_key ?? raw.period ?? '').trim()
  const period: Period = ERA_KEY_MAP[era_key] || 'modern'

  if (!era_key) {
    issues.push({
      sage_id: id,
      type: 'missing_period',
      message: 'No era_key or period on node, defaulting to "modern"',
      severity: 'warning',
    })
  } else if (!ERA_KEY_MAP[era_key]) {
    issues.push({
      sage_id: id,
      type: 'invalid_period',
      message: `Unknown era_key "${era_key}", defaulting to "modern"`,
      severity: 'warning',
    })
  }

  const location_text = String(raw.location ?? '').trim()
  const locations = location_text
    ? location_text.split(';').map(place => ({
      place: place.trim(),
      role: 'activity' as const,
    }))
    : undefined

  return {
    // Canonical Sage fields (all supported types)
    id,
    label: String(raw.label ?? raw.name ?? id),
    name_en: (raw.name_en as string) || undefined,
    period,
    location: location_text || undefined,
    region: (raw.region as any) || undefined,
    field: (raw.field as string) || undefined,
    bio: (raw.bio as string) || undefined,
    core_concept: (raw.central_idea as string) || undefined,
    birth_year: typeof raw.birth_year === 'number' ? raw.birth_year : undefined,
    date_precision: (raw.date_precision as Sage['date_precision']) || undefined,
    death_year: typeof raw.death_year === 'number' ? raw.death_year : undefined,
    tags: typeof raw.tags === 'string'
      ? raw.tags.split(',').map(t => t.trim()).filter(Boolean)
      : Array.isArray(raw.tags) ? raw.tags : undefined,
    spotify_url: (raw.spotify_url as string) || undefined,
    migration_path: (raw.migration_path as any) || undefined,
    coordinates: (raw.coordinates as any) || undefined,
    works: Array.isArray(raw.works) ? raw.works as string[] : undefined,
    // Raw source fields (preserved for diagnostics/debugging)
    era: (raw.era as string) || undefined,
    era_key: era_key || undefined,
    era_label: (raw.era_label as string) || undefined,
    chapter_type: (raw.chapter_type as string) || undefined,
    // Stage 2 extensions
    locations,
    has_research: Boolean(raw.has_research),
  }
}

/**
 * Merge canonical and supplement datasets
 * Precedence: canonical > supplement (only add if id not already seen)
 * Relationships: accumulate from all sources, deduplicate exact matches
 */
export function mergeDatasets(
  datasets: Array<{ nodes?: Record<string, unknown>[]; links?: Record<string, unknown>[] }>,
  issues: DataValidationIssue[]
): { sages: Map<string, SageRecord>; connections: Connection[]; quality: DataQualityReport } {
  const sages = new Map<string, SageRecord>()
  const connectionSet = new Set<string>() // Track "source->target:type" to deduplicate
  const connections: Connection[] = []
  let canonical_count = 0
  let supplement_count = 0

  // Process nodes: canonical first, then supplements (don't overwrite)
  for (let datasetIdx = 0; datasetIdx < datasets.length; datasetIdx++) {
    const dataset = datasets[datasetIdx]
    const isCanonical = datasetIdx === 0

    for (const node of dataset.nodes ?? []) {
      const sage = normalizeSage(node as Record<string, unknown>, issues)
      if (!sage) continue

      if (!sages.has(sage.id)) {
        sages.set(sage.id, sage)
        if (isCanonical) canonical_count++
        else supplement_count++
      }
    }
  }

  // Process relationships: deduplicate only genuinely identical relationships
  for (const dataset of datasets) {
    for (const link of dataset.links ?? []) {
      const source = String((link as Record<string, unknown>).source ?? '').trim()
      const target = String((link as Record<string, unknown>).target ?? '').trim()
      const type = String(((link as Record<string, unknown>).type as string) || 'colleague').trim()

      // Deduplicate: skip if identical directed relationship already exists
      const key = `${source}->${target}:${type}`
      if (connectionSet.has(key)) continue

      connectionSet.add(key)
      connections.push({ source, target, type: type as Connection['type'] })
    }
  }

  return {
    sages,
    connections,
    quality: {
      total_sages: sages.size,
      total_connections: connections.length,
      issues,
      canonical_count,
      supplement_count,
      deduplicated_relationships: connectionSet.size,
    },
  }
}

/**
 * Apply patches (field overrides) consistently
 * Patches provide additional or corrected data for specific sages
 */
export function applyPatches(
  sages: Map<string, SageRecord>,
  patches: Record<string, Partial<SageRecord>>
): void {
  for (const [id, patch] of Object.entries(patches)) {
    const sage = sages.get(id)
    if (!sage) continue

    // Merge patch fields into sage
    Object.assign(sage, patch)
  }
}

/**
 * Apply translations consistently
 * Browser and server both use this for locale fallback
 */
export function applyTranslations(
  sage: SageRecord,
  translations: Record<string, Partial<SageRecord>>,
  locale: 'he' | 'en' | 'ru'
): SageRecord {
  // Return original if no translation
  if (locale === 'he') return sage

  const translated = translations[sage.id]
  if (!translated) return sage

  // Overlay translated fields (shallow merge)
  return { ...sage, ...translated }
}
