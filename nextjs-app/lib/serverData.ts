// Server-only data access — reads the canonical public/data.json (365 sages,
// 452 typed connections) and the per-sage research files. Used by the full
// sage page so it always matches the graph, without depending on Supabase.
import fs from 'fs'
import path from 'path'
import type { Sage, Connection } from './types'

interface Db {
  sages: Map<string, Sage>
  links: Connection[]
  mtime: number
}

let cache: Db | null = null

function pub(rel: string) {
  return path.join(process.cwd(), 'public', rel)
}

function mapNode(n: Record<string, unknown>): Sage {
  return {
    id:           String(n.id ?? ''),
    label:        String(n.label ?? ''),
    period:       ((n.era_key as string) || 'modern') as Sage['period'],
    location:     (n.location as string) || undefined,
    field:        (n.field as string) || undefined,
    bio:          (n.bio as string) || undefined,
    core_concept: (n.central_idea as string) || undefined,
    tags: typeof n.tags === 'string' && n.tags
      ? (n.tags as string).split(',').map(t => t.trim()).filter(Boolean)
      : undefined,
    spotify_url:  (n.spotify_url as string) || undefined,
  }
}

function db(): Db {
  const file = pub('data.json')
  const mtime = fs.statSync(file).mtimeMs
  if (cache && cache.mtime === mtime) return cache
  const d = JSON.parse(fs.readFileSync(file, 'utf-8'))
  const sages = new Map<string, Sage>()
  for (const n of d.nodes ?? []) sages.set(String(n.id), mapNode(n))
  const links: Connection[] = (d.links ?? []).map((l: Record<string, unknown>) => ({
    source: String(l.source ?? ''),
    target: String(l.target ?? ''),
    type:   ((l.type as string) || 'colleague') as Connection['type'],
  }))
  cache = { sages, links, mtime }
  return cache
}

export function getSageById(id: string): Sage | null {
  return db().sages.get(String(id)) ?? null
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

export function getSageResearch(id: string): ResearchDoc[] {
  try {
    return JSON.parse(fs.readFileSync(pub(`research/${id}.json`), 'utf-8'))
  } catch {
    return []
  }
}
