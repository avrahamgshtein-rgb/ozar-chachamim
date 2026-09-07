// Bridge between data sources and the unified normalization pipeline
// Used by both browser (AppShell) and server (serverData) consumers

import type { Sage, Connection } from './types'
import {
  mergeDatasets,
  applyPatches,
  applyTranslations,
  type SageRecord,
  type DataQualityReport,
} from './dataFoundation'

export interface DataConsumerResult {
  sages: Sage[]
  connections: Connection[]
  quality: DataQualityReport
}

/**
 * Load and normalize data from provided datasets (canonical + supplements)
 * Apply patches and translations consistently for browser/server
 *
 * @param datasets Array of canonical + supplement data sources
 * @param patchOverrides Optional field overrides (e.g. from data-patch.json)
 * @param translations Optional locale-specific field overlays
 * @param locale Target locale (he/en/ru)
 */
export async function loadAndNormalizeData(
  datasets: Array<{ nodes?: Record<string, unknown>[]; links?: Record<string, unknown>[] }>,
  patchOverrides?: Record<string, Partial<SageRecord>>,
  translations?: Record<string, Partial<SageRecord>>,
  locale: 'he' | 'en' | 'ru' = 'he'
): Promise<DataConsumerResult> {
  const issues: typeof mergeDatasets extends (...args: any[]) => infer R
    ? R extends { quality: { issues: infer I } } ? I : never
    : never = []

  // Merge canonical + supplement datasets with deduplication
  const { sages, connections, quality } = mergeDatasets(datasets, issues as any)

  // Apply field patches
  if (patchOverrides) {
    applyPatches(sages, patchOverrides)
  }

  // Convert to output format and apply translations
  const outputSages: Sage[] = []
  for (const [id, record] of sages.entries()) {
    const sage: Sage = {
      id: record.id,
      label: record.label,
      period: record.period,
      location: record.location,
      field: record.field,
      bio: record.bio,
      core_concept: record.core_concept,
      birth_year: record.birth_year,
      death_year: record.death_year,
      tags: record.tags,
      spotify_url: record.spotify_url,
    }

    // Apply translations
    if (translations && locale !== 'he') {
      const translated = applyTranslations(record, translations, locale)
      if (translated.label !== record.label) sage.label = translated.label
      if (translated.bio) sage.bio = translated.bio
      if (translated.core_concept) sage.core_concept = translated.core_concept
      if (translated.field) sage.field = translated.field
      if (translated.location) sage.location = translated.location
    }

    outputSages.push(sage)
  }

  return {
    sages: outputSages,
    connections,
    quality: { ...quality, issues },
  }
}
