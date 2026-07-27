// Server-only data access — reads the canonical public/data.json (409 sages)
// plus the same supplement files AppShell.tsx merges in client-side
// (data-ancient/data-supplement/data-supplement-2/data-research-links —
// figures like רש"י, הגר"א and the biblical patriarchs that aren't in the
// CSV master file), so server-side consumers (the sage page, RAG) see the
// same full set the client renders instead of a 53-sage-smaller subset.
import type { Sage, Connection } from './types'
// נתונים סטטיים — נארזים בתוך ה-bundle (עובד גם ב-Vercel serverless,
// שם אין גישת fs לתיקיית public בזמן ריצה)
import graphData from '../public/data.json'
import dataAncient from '../public/data-ancient.json'
import dataSupplement from '../public/data-supplement.json'
import dataSupplement2 from '../public/data-supplement-2.json'
import dataResearchLinks from '../public/data-research-links.json'

interface Db {
  sages: Map<string, Sage>
  links: Connection[]
}

let cache: Db | null = null

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
  if (cache) return cache
  const d = graphData as { nodes?: Record<string, unknown>[]; links?: Record<string, unknown>[] }
  const sages = new Map<string, Sage>()
  const links: Connection[] = []

  for (const n of d.nodes ?? []) sages.set(String(n.id), mapNode(n))
  for (const l of d.links ?? []) {
    links.push({
      source: String((l as Record<string, unknown>).source ?? ''),
      target: String((l as Record<string, unknown>).target ?? ''),
      type:   (((l as Record<string, unknown>).type as string) || 'colleague') as Connection['type'],
    })
  }

  // Supplement datasets — same precedence rule as AppShell.tsx: only add a
  // node if its id doesn't already exist in the canonical dataset.
  for (const extra of [dataAncient, dataSupplement, dataSupplement2, dataResearchLinks]) {
    const e = extra as { nodes?: Record<string, unknown>[]; links?: Record<string, unknown>[] }
    for (const n of e.nodes ?? []) {
      const id = String(n.id ?? '')
      if (id && !sages.has(id)) sages.set(id, mapNode(n))
    }
    for (const l of e.links ?? []) {
      links.push({
        source: String((l as Record<string, unknown>).source ?? ''),
        target: String((l as Record<string, unknown>).target ?? ''),
        type:   (((l as Record<string, unknown>).type as string) || 'colleague') as Connection['type'],
      })
    }
  }

  cache = { sages, links }
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
  const { join } = await import('path')

  if (locale !== 'he') {
    try {
      const path = join(process.cwd(), 'public', 'research', `${id}.${locale}.json`)
      return JSON.parse(await readFile(path, 'utf-8'))
    } catch { /* fall through to Hebrew */ }
  }
  try {
    const path = join(process.cwd(), 'public', 'research', `${id}.json`)
    return JSON.parse(await readFile(path, 'utf-8'))
  } catch {
    return []
  }
}
