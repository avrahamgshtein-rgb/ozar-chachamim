// AppShell-specific data loader: fetches the static dataset and runs it
// through the shared dataFoundation pipeline, the same one lib/serverData.ts
// uses, so the home page and the sage pages always show the same corpus.

import type { Sage, Connection } from './types'
import {
  mergeDatasets,
  applyPatches,
  type SageRecord,
  type DataQualityReport,
  type DataValidationIssue,
} from './dataFoundation'

export interface AppShellDataResult {
  sages: Sage[]
  connections: Connection[]
  quality: DataQualityReport
}

type RawDataset = { nodes?: Record<string, unknown>[]; links?: Record<string, unknown>[] }

// Supplements carry extra links (and occasionally figures); order matters for
// node precedence, matching the import order in lib/serverData.ts.
const SUPPLEMENTS = [
  '/data-ancient.json',
  '/data-supplement.json',
  '/data-supplement-2.json',
  '/data-research-links.json',
]

async function fetchJson<T>(src: string): Promise<T | null> {
  try {
    const response = await fetch(src)
    return response.ok ? ((await response.json()) as T) : null
  } catch {
    return null
  }
}

/**
 * Load the public graph for AppShell from the static pipeline only:
 * data.json + supplements, merged, then data-patch.json applied.
 *
 * Supabase is deliberately not consulted. Its sages/connections tables hold an
 * old snapshot (missing ~100 current sages, e.g. Rashi, and carrying links
 * deleted since), and preferring it whenever it looked "big enough" meant the
 * live site showed stale data, and every visitor waited on it before seeing
 * anything. All files are fetched in parallel, raw, and handed straight to
 * mergeDatasets — no Sage → raw round trip that could drop fields.
 */
export async function loadAppShellData(): Promise<AppShellDataResult> {
  const [canonical, patches, ...supplements] = await Promise.all([
    fetchJson<RawDataset>('/data.json'),
    fetchJson<Record<string, Partial<SageRecord>>>('/data-patch.json'),
    ...SUPPLEMENTS.map(src => fetchJson<RawDataset>(src)),
  ])

  if (!canonical?.nodes?.length) {
    console.error('[AppShell] data.json failed to load')
  } else {
    console.log(`[AppShell] data.json: ${canonical.nodes.length} sages, ${canonical.links?.length ?? 0} links`)
  }

  const supplementDatasets: RawDataset[] = []
  supplements.forEach((data, i) => {
    if (data?.nodes?.length || data?.links?.length) {
      supplementDatasets.push(data)
      console.log(
        `[AppShell] 🏛 ${SUPPLEMENTS[i]}: +${data.nodes?.length ?? 0} figures, +${data.links?.length ?? 0} links`
      )
    }
  })

  // Merge all datasets (canonical first, so it wins on id) via unified pipeline
  const issues: DataValidationIssue[] = []
  const { sages, connections, quality } = mergeDatasets([canonical ?? {}, ...supplementDatasets], issues)

  if (patches) {
    applyPatches(sages, patches)
    console.log(`[AppShell] 🩹 data-patch: ${Object.keys(patches).length} sages patched`)
  }

  // Convert back to Sage[] (without the locations array). The field list
  // mirrors lib/serverData.ts: this is an explicit copy, so anything omitted
  // here is dropped silently — no type error, no console warning, just a
  // feature that renders nothing. GeoMap's migration-path polylines, and the
  // drawer's patched `works`, were both dead for exactly this reason.
  const outputSages: Sage[] = []
  for (const record of sages.values()) {
    outputSages.push({
      id: record.id,
      label: record.label,
      name_en: record.name_en,
      period: record.period,
      region: record.region,
      location: record.location,
      field: record.field,
      bio: record.bio,
      core_concept: record.core_concept,
      birth_year: record.birth_year,
      death_year: record.death_year,
      date_precision: record.date_precision,
      has_research: record.has_research,
      tags: record.tags,
      migration_path: record.migration_path,
      coordinates: record.coordinates,
      spotify_url: record.spotify_url,
      works: record.works,
    })
  }

  return {
    sages: outputSages,
    connections,
    quality,
  }
}
