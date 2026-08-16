// RAG Stage 2 — Wikipedia REST API client (Hebrew Wikipedia primary, English
// fallback). Best-effort: returns null on any failure so a Wikipedia outage
// never breaks the chat feature.
const TIMEOUT_MS = 5000

interface WikiSummary {
  title: string
  extract: string
  url?: string
}

async function fetchSummary(host: string, title: string): Promise<WikiSummary | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res = await fetch(
      `https://${host}/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { signal: controller.signal, headers: { 'Accept': 'application/json' } },
    )
    clearTimeout(timer)
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.extract) return null
    return {
      title: data.title ?? title,
      extract: data.extract,
      url: data.content_urls?.desktop?.page,
    }
  } catch {
    return null
  }
}

/** Try Hebrew Wikipedia first (primary source per the RAG plan), then
 *  English if the sage has a Latin name and the Hebrew page isn't found. */
export async function fetchWikipediaSummary(
  hebrewName: string,
  englishName?: string,
): Promise<WikiSummary | null> {
  const he = await fetchSummary('he.wikipedia.org', hebrewName)
  if (he) return he
  if (englishName) return fetchSummary('en.wikipedia.org', englishName)
  return null
}
