import { createClient } from '@supabase/supabase-js'
import type { Sage, Connection } from './types'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? 'https://ulluacifirzywhmzkvkr.supabase.co'
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C'

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function fetchSages(): Promise<Sage[]> {
  const { data, error } = await supabase
    .from('sages_with_stats')
    .select('*')
    .order('period_order', { ascending: true })

  if (error) {
    console.error('[Supabase] fetchSages error:', error.message)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id:           String(row.id ?? ''),
    label:        String(row.label ?? row.name_he ?? ''),
    name_en:      row.name_en ? String(row.name_en) : undefined,
    period:       (row.era ?? row.period) as Sage['period'],
    location:     row.location ? String(row.location) : undefined,
    field:        row.field   ? String(row.field)    : undefined,
    bio:          row.bio     ? String(row.bio)      : undefined,
    core_concept: row.core_concept ? String(row.core_concept) : undefined,
    birth_year:   row.birth_year  ? Number(row.birth_year)   : undefined,
    death_year:   row.death_year  ? Number(row.death_year)   : undefined,
    tags:         Array.isArray(row.tags) ? (row.tags as string[]) : undefined,
    migration_path: row.migration_path as Sage['migration_path'] ?? undefined,
    coordinates:    row.coordinates as Sage['coordinates'] ?? undefined,
  }))
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

  const row = data as Record<string, unknown>
  return {
    id:           String(row.id ?? ''),
    label:        String(row.label ?? row.name_he ?? ''),
    name_en:      row.name_en ? String(row.name_en) : undefined,
    period:       (row.era ?? row.period) as Sage['period'],
    location:     row.location ? String(row.location) : undefined,
    field:        row.field    ? String(row.field)    : undefined,
    bio:          row.bio      ? String(row.bio)      : undefined,
    core_concept: row.core_concept ? String(row.core_concept) : undefined,
    birth_year:   row.birth_year  ? Number(row.birth_year)   : undefined,
    death_year:   row.death_year  ? Number(row.death_year)   : undefined,
    tags:         Array.isArray(row.tags) ? (row.tags as string[]) : undefined,
    migration_path: row.migration_path as Sage['migration_path'] ?? undefined,
    coordinates:    row.coordinates as Sage['coordinates'] ?? undefined,
  }
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
