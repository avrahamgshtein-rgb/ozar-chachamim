// Server-only data access — unified normalization via dataFoundation pipeline
// Reads canonical + supplemental datasets, applies patches, ensures server/browser consistency
import type { Sage, Connection } from './types'
import { mergeDatasets, applyPatches, type SageRecord } from './dataFoundation'

// Static data bundled at build time (works in Vercel serverless)
import graphData from '../public/data.json'
import dataAncient from '../public/data-ancient.json'
import dataSupplement from '../public/data-supplement.json'
import dataSupplement2 from '../public/data-supplement-2.json'
import dataResearchLinks from '../public/data-research-links.json'
import dataPatch from '../public/data-patch.json'

interface Db {
  sages: Map<string, Sage>
  links: Connection[]
}

let cache: Db | null = null

function db(): Db {
  if (cache) return cache

  // Merge canonical + supplements via unified pipeline
  const datasets = [
    graphData,
    dataAncient,
    dataSupplement,
    dataSupplement2,
    dataResearchLinks,
  ] as Array<{ nodes?: Record<string, unknown>[]; links?: Record<string, unknown>[] }>

  const issues: any[] = []
  const { sages: recordMap, connections } = mergeDatasets(datasets, issues)

  // Apply patches server-side for consistency with browser
  applyPatches(recordMap, dataPatch as Record<string, Partial<SageRecord>>)

  // Convert SageRecord → Sage format, preserving all fields
  const sages = new Map<string, Sage>()
  for (const [id, record] of recordMap) {
    sages.set(id, {
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
      tags: record.tags,
      migration_path: record.migration_path,
      coordinates: record.coordinates,
      spotify_url: record.spotify_url,
      works: record.works,
    })
  }

  cache = { sages, links: connections }
  return cache
}

export function getSageById(id: string): Sage | null {
  return db().sages.get(String(id)) ?? null
}

export function getAllSages(): Sage[] {
  return Array.from(db().sages.values())
}

export function getSageConnections(id: string): Array<{ type: Connection['type']; otherSage: Sage }> {
  const { sages, links } = db()
  const out: Array<{ type: Connection['type']; otherSage: Sage }> = []
  for (const l of links) {
    if (l.source === id || l.target === id) {
      const other = sages.get(l.source === id ? l.target : l.source)
      if (other) out.push({ type: l.type, otherSage: other })
    }
  }
  return out
}

export interface ResearchDoc {
  title: string
  source_file: string
  word_count: number
  content: string
}

// המחקר נטען בצד הלקוח מ-/research/<id>.json (ראו ResearchSection);
// גם נגיש מהשרת (RAG) דרך getResearchDocs, באותו דפוס fs שבו
// משתמש app/api/research/[id]/route.ts.
export async function getResearchDocs(id: string, locale: 'he' | 'en' | 'ru' = 'he'): Promise<ResearchDoc[]> {
  const { readFile } = await import('fs/promises')
  const { join, resolve, sep } = await import('path')

  const baseDir = resolve(process.cwd(), 'public', 'research')

  // Validate that resolved path stays within base directory (defense-in-depth)
  const validatePath = (filePath: string): boolean => {
    const resolved = resolve(filePath)
    return resolved.startsWith(baseDir + sep)
  }

  if (locale !== 'he') {
    try {
      const path = resolve(baseDir, `${id}.${locale}.json`)
      if (!validatePath(path)) return []
      return JSON.parse(await readFile(path, 'utf-8'))
    } catch { /* fall through to Hebrew */ }
  }
  try {
    const path = resolve(baseDir, `${id}.json`)
    if (!validatePath(path)) return []
    return JSON.parse(await readFile(path, 'utf-8'))
  } catch {
    return []
  }
}
