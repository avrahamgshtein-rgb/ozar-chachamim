// AppShell-specific data loader: coordinates Supabase/data.json fallback with unified pipeline
// Browser consumer that uses the shared dataFoundation pipeline

import type { Sage, Connection } from './types'
import {
  mergeDatasets,
  applyPatches,
  type SageRecord,
  type DataQualityReport,
} from './dataFoundation'

export interface AppShellDataResult {
  sages: Sage[]
  connections: Connection[]
  quality: DataQualityReport
  source: 'supabase' | 'fallback' | 'local'
}

/**
 * Load data for AppShell: coordinate Supabase first, fall back to data.json,
 * then merge supplements and apply patches via unified pipeline.
 *
 * This preserves the graceful-degradation logic while using dataFoundation
 * for consistent normalization across browser and server.
 */
export async function loadAppShellData(
  supabaseData: { sages: Sage[]; connections: Connection[] },
  dataJsonData: { sages: Sage[]; connections: Connection[] },
): Promise<AppShellDataResult> {
  // Decide which dataset to use: Supabase or data.json fallback
  let primary = supabaseData
  let source: 'supabase' | 'fallback' = 'supabase'

  if (
    supabaseData.connections.length < 100 ||
    supabaseData.sages.length < 300
  ) {
    // Supabase is sparse, use data.json instead
    if (dataJsonData.connections.length > supabaseData.connections.length) {
      primary = dataJsonData
      source = 'fallback'
      console.log('[AppShell] ↪ using data.json fallback (richer dataset)')
    }
  }

  // Convert Sage[] to raw nodes for merging
  const primaryDataset = {
    nodes: primary.sages.map(s => ({
      id: s.id,
      label: s.label,
      era_key: s.period,
      location: s.location,
      field: s.field,
      bio: s.bio,
      central_idea: s.core_concept,
      tags: s.tags?.join(','),
      spotify_url: s.spotify_url,
      birth_year: s.birth_year,
      death_year: s.death_year,
      migration_path: s.migration_path,
    })),
    links: primary.connections.map(c => ({
      source: c.source,
      target: c.target,
      type: c.type,
    })),
  }

  // Fetch supplement datasets
  const supplementDatasets = []
  for (const src of ['/data-ancient.json', '/data-supplement.json', '/data-supplement-2.json', '/data-research-links.json']) {
    try {
      const response = await fetch(src)
      if (response.ok) {
        const data = await response.json()
        if (data?.nodes?.length || data?.links?.length) {
          supplementDatasets.push(data)
          console.log(
            `[AppShell] 🏛 ${src}: +${data.nodes?.length ?? 0} figures, +${data.links?.length ?? 0} links`
          )
        }
      }
    } catch { /* optional dataset */ }
  }

  // Merge all datasets (canonical + supplements) via unified pipeline
  const issues: any[] = []
  const allDatasets = [primaryDataset, ...supplementDatasets]
  const { sages, connections, quality } = mergeDatasets(allDatasets, issues)

  // Fetch and apply patches
  let patches: Record<string, Partial<SageRecord>> = {}
  try {
    const response = await fetch('/data-patch.json')
    if (response.ok) {
      patches = await response.json()
      applyPatches(sages, patches)
      console.log(`[AppShell] 🩹 data-patch: ${Object.keys(patches).length} sages patched`)
    }
  } catch { /* optional */ }

  // Convert back to Sage[] format (without locations array for browser)
  const outputSages: Sage[] = []
  for (const record of sages.values()) {
    outputSages.push({
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
      // Both mappings above rebuild Sage objects from an explicit field list,
      // so anything omitted here is dropped silently — no type error, no
      // console warning, just a feature that renders nothing. GeoMap's
      // migration-path polylines were dead for exactly this reason.
      migration_path: record.migration_path,
    })
  }

  return {
    sages: outputSages,
    connections,
    quality,
    source,
  }
}
