import type { Sage } from './types'

/**
 * Hebrew-aware fuzzy normalization.
 * "רמבם" ↔ "רמב״ם", strips nikud, quotes, geresh/gershayim,
 * unifies final letters, collapses whitespace.
 */
export function normalizeHe(s: string): string {
  return s
    .replace(/[֑-ׇ]/g, '')          // nikud + cantillation
    .replace(/[״"“”'’׳`]/g, '')               // gershayim / geresh / quotes
    .replace(/[-–—_.,()]/g, ' ')              // separators → space
    .toLowerCase()
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function fuzzyIncludes(text: string | undefined | null, normQuery: string): boolean {
  if (!text || !normQuery) return false
  return normalizeHe(text).includes(normQuery)
}

/**
 * Client-side instant search with scoring:
 * exact label > label starts-with > label includes > other-field includes.
 */
export function searchSagesLocal(sages: Sage[], query: string, limit = 8): Sage[] {
  const q = normalizeHe(query)
  if (!q) return []

  const scored: Array<{ sage: Sage; score: number }> = []

  for (const sage of sages) {
    const label  = normalizeHe(sage.label ?? '')
    const nameEn = sage.name_en ? normalizeHe(sage.name_en) : ''

    let score = 0
    if (label === q || nameEn === q)                    score = 100
    else if (label.startsWith(q) || nameEn.startsWith(q)) score = 80
    else if (label.includes(q)   || nameEn.includes(q))   score = 60
    else if (fuzzyIncludes(sage.field, q))                score = 30
    else if (fuzzyIncludes(sage.location, q))             score = 25
    else if (sage.tags?.some(t => fuzzyIncludes(t, q)))   score = 20

    if (score > 0) scored.push({ sage, score })
  }

  return scored
    .sort((a, b) => b.score - a.score || a.sage.label.localeCompare(b.sage.label, 'he'))
    .slice(0, limit)
    .map(x => x.sage)
}
