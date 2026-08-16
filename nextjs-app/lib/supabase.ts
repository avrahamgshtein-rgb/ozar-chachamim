import { createClient } from '@supabase/supabase-js'
import type { Sage, Connection } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)
export const supabase = createClient(
  supabaseUrl ?? 'https://missing-config.invalid',
  supabaseKey ?? 'missing-public-anon-key',
)

export async function fetchSages(): Promise<Sage[]> {
  const { data, error } = await supabase
    .from('sages_with_stats')
    .select('*')
    .order('period_order', { ascending: true })

  if (error) {
    console.error('[Supabase] fetchSages error:', error.message)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => mapSageRow(row))
}

function mapSageRow(row: Record<string, unknown>): Sage {
  // DB may use either old names (location/field/bio) or new names (region/primary_field/summary)
  const location = (row.location ?? row.region) as string | undefined
  const field    = (row.field ?? row.primary_field) as string | undefined
  const bio      = (row.bio ?? row.summary) as string | undefined
  const eraRaw   = (row.era ?? row.period ?? row.era_key) as string | undefined

  // Normalise era key to match Period type
  const ERA_MAP: Record<string, string> = {
    'Second Temple': 'second-temple', 'Tannaim': 'tannaim', 'Amoraim': 'amoraim',
    'Geonim': 'geonim', 'Rishonim': 'rishonim', 'Acharonim': 'acharonim', 'Modern': 'modern',
  }
  const period = (ERA_MAP[eraRaw ?? ''] ?? eraRaw ?? 'modern') as Sage['period']

  // Tags: may be comma-separated string or array
  let tags: string[] | undefined
  if (Array.isArray(row.tags)) {
    tags = row.tags as string[]
  } else if (typeof row.tags === 'string' && row.tags) {
    tags = row.tags.split(',').map(t => t.trim()).filter(Boolean)
  }

  return {
    id:           String(row.id ?? ''),
    label:        String(row.label ?? row.name_he ?? ''),
    name_en:      row.name_en ? String(row.name_en) : undefined,
    period,
    location:     location || undefined,
    region:       (row.region_key ?? row.region) as Sage['region'] | undefined,
    field:        field || undefined,
    bio:          bio || undefined,
    core_concept: row.core_concept ? String(row.core_concept) : undefined,
    birth_year:   row.birth_year  ? Number(row.birth_year)   : undefined,
    death_year:   row.death_year  ? Number(row.death_year)   : undefined,
    tags,
    migration_path: row.migration_path as Sage['migration_path'] ?? undefined,
    coordinates:    row.coordinates as Sage['coordinates'] ?? undefined,
    spotify_url:    row.spotify_url ? String(row.spotify_url) : undefined,
  }
}

export async function fetchConnections(): Promise<Connection[]> {
  const { data, error } = await supabase
    .from('connections_with_names')
    .select('*')

  if (error) {
    console.error('[Supabase] fetchConnections error:', error.message)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    source:      String(row.source_id ?? row.source ?? ''),
    target:      String(row.target_id ?? row.target ?? ''),
    type:        (row.connection_type ?? row.type ?? 'colleague') as Connection['type'],
    source_name: row.source_name ? String(row.source_name) : undefined,
    target_name: row.target_name ? String(row.target_name) : undefined,
  }))
}

export async function fetchSageById(id: string): Promise<Sage | null> {
  const { data, error } = await supabase
    .from('sages_with_stats')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return mapSageRow(data as Record<string, unknown>)
}

export async function searchSages(query: string, limit = 10): Promise<Sage[]> {
  const { data, error } = await supabase
    .from('sages_with_stats')
    .select('id, label, name_en, era, period, field, location')
    .or(`label.ilike.%${query}%,name_en.ilike.%${query}%`)
    .limit(limit)

  if (error) return []

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id:      String(row.id ?? ''),
    label:   String(row.label ?? ''),
    name_en: row.name_en ? String(row.name_en) : undefined,
    period:  (row.era ?? row.period) as Sage['period'],
    field:   row.field ? String(row.field) : undefined,
    location: row.location ? String(row.location) : undefined,
  }))
}

export async function fetchSageConnections(
  sageId: string,
): Promise<Array<Connection & { otherSage: Sage }>> {
  const { data, error } = await supabase
    .from('connections_with_names')
    .select('*')
    .or(`source_id.eq.${sageId},target_id.eq.${sageId}`)

  if (error || !data) return []

  const results: Array<Connection & { otherSage: Sage }> = []
  for (const row of data as Record<string, unknown>[]) {
    const conn: Connection = {
      source:      String(row.source_id ?? row.source ?? ''),
      target:      String(row.target_id ?? row.target ?? ''),
      type:        (row.connection_type ?? row.type ?? 'colleague') as Connection['type'],
      source_name: row.source_name ? String(row.source_name) : undefined,
      target_name: row.target_name ? String(row.target_name) : undefined,
    }
    const otherId = conn.source === sageId ? conn.target : conn.source
    const other   = await fetchSageById(otherId)
    if (other) results.push({ ...conn, otherSage: other })
  }
  return results
}

export async function fetchResearchContent(sageId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('research_content')
    .select('content')
    .eq('sage_id', sageId)
    .single()

  if (error || !data) return null
  const row = data as Record<string, unknown>
  const content = row.content
  return typeof content === 'string' && content ? content : null
}

export async function fetchSageStats(): Promise<{ total: number; lastUpdate: string }> {
  const { count } = await supabase
    .from('sages_with_stats')
    .select('*', { count: 'exact', head: true })

  return {
    total:      count ?? 0,
    lastUpdate: new Date().toLocaleDateString('he-IL'),
  }
}


// ── Local fallback: /data.json — the canonical curated dataset (363 sages,
// 450 typed connections). Used when Supabase is missing/behind, so the
// Next.js graph always matches the classic site and Vercel. ──────────────
export async function fetchLocalGraphData(): Promise<{ sages: Sage[]; connections: Connection[] }> {
  try {
    const res = await fetch('/data.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const d = await res.json()
    const sages: Sage[] = (d.nodes ?? []).map((n: Record<string, unknown>) => ({
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
    }))
    const connections: Connection[] = (d.links ?? []).map((l: Record<string, unknown>) => ({
      source: String(l.source ?? ''),
      target: String(l.target ?? ''),
      type:   ((l.type as string) || 'colleague') as Connection['type'],
    }))
    console.log(`[Fallback] ✅ data.json: ${sages.length} sages, ${connections.length} connections`)
    return { sages, connections }
  } catch (e) {
    console.error('[Fallback] data.json failed:', e)
    return { sages: [], connections: [] }
  }
}
