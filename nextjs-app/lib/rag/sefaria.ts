// RAG Stage 2 — Sefaria API client. Best-effort: on any failure (network,
// rate limit, 404, unexpected shape) we return null/empty and the caller
// falls back to internal data only. Never let an external API outage break
// the chat feature.
const SEFARIA_BASE = 'https://www.sefaria.org/api'
const TIMEOUT_MS = 5000

async function fetchJson(url: string): Promise<any | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export interface SefariaTopic {
  slug: string
  title: string
  description?: string
  refs: string[] // source references linked to this topic (e.g. authored works)
}

/** Slugify a Hebrew/English name the way Sefaria's topic slugs are formed:
 *  lowercase, spaces → dashes. Sefaria's actual slug may differ (it doesn't
 *  follow a single deterministic rule), so callers should treat a null
 *  result as "no topic found" rather than a hard error. */
function guessSlug(name: string): string {
  return name.trim().toLowerCase().replace(/["'׳״]/g, '').replace(/\s+/g, '-')
}

export async function fetchSefariaTopic(name: string): Promise<SefariaTopic | null> {
  const slug = guessSlug(name)
  const data = await fetchJson(`${SEFARIA_BASE}/topics/${encodeURIComponent(slug)}`)
  if (!data) return null
  return {
    slug,
    title: data.primaryTitle?.en ?? data.primaryTitle?.he ?? name,
    description: data.description?.en ?? data.description?.he ?? undefined,
    refs: Array.isArray(data.refs) ? data.refs.slice(0, 10).map((r: any) => r.ref ?? r) : [],
  }
}

export interface SefariaSearchHit {
  ref: string
  text: string
}

export async function searchSefaria(query: string, limit = 5): Promise<SefariaSearchHit[]> {
  const data = await fetchJson(
    `${SEFARIA_BASE}/search-wrapper?query=${encodeURIComponent(query)}&size=${limit}`,
  )
  if (!data?.hits?.hits) return []
  return data.hits.hits.slice(0, limit).map((h: any) => ({
    ref: h._source?.ref ?? h._id ?? '',
    text: (h._source?.exact ?? h._source?.he ?? h._source?.en ?? '').toString().slice(0, 500),
  })).filter((h: SefariaSearchHit) => h.ref)
}
