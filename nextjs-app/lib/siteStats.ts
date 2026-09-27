// Server-only: the corpus figures the site frame shows (header count, About).
// Computed from the same static corpus the pages render, at build time, so they
// cannot drift the way the old hand-written numbers did.
import { getAllSages, getCorpusStats } from './serverData'
import { regionsOf } from './regions'

/** Corpus totals. Plain data, so client components can take it as a prop. */
export interface CorpusStats {
  sages: number
  connections: number
  /** Sages with a research paper (public/research/<id>.json). */
  withResearch: number
  /** Distinct regions the sages' locations resolve to. */
  regions: number
  /** Distinct podcast episodes linked from sage records (Spotify). */
  episodes: number
  /** ISO date of the build that computed these figures. */
  asOf: string
}

export function getSiteStats(): CorpusStats {
  const sages = getAllSages()
  const { sages: count, connections, withResearch } = getCorpusStats()
  return {
    sages: count,
    connections,
    withResearch,
    regions: new Set(sages.flatMap(s => regionsOf(s.location))).size,
    episodes: new Set(sages.map(s => s.spotify_url).filter(Boolean)).size,
    asOf: new Date().toISOString().slice(0, 10),
  }
}
