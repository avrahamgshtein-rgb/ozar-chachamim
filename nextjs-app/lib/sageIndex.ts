// Server-only: the plain index of every sage (/<locale>/sages). Names and links,
// grouped by era in the order of the generations, so that every sage page has an
// ordinary <a href> leading to it from one crawlable page (the home page is a
// client-rendered app and links to no sage in its HTML).
import type { Locale, Period, Sage } from './types'
import { ALL_PERIODS, ERA_COLORS, ERA_LABELS } from './types'
import { getAllSages } from './serverData'
import { localizeSage } from './serverDataTranslator'
import { labelParts } from './displayName'
import { formatYearRangeFor } from './utils'

export interface SageIndexEntry {
  id: string
  /** The name alone (no essay subtitle), in the page's language. */
  name: string
  /** "1040–1105", "11th century" or '' when the sage is undated. */
  years: string
}

export interface SageIndexGroup {
  period: Period
  label: string
  color: string
  entries: SageIndexEntry[]
}

/** Dated sages first, by birth (else death) year; undated last; ties by id. */
function byTime(a: Sage, b: Sage): number {
  const ya = a.birth_year ?? a.death_year
  const yb = b.birth_year ?? b.death_year
  if (ya != null && yb != null && ya !== yb) return ya - yb
  if ((ya == null) !== (yb == null)) return ya == null ? 1 : -1
  return Number(a.id) - Number(b.id)
}

/** Every sage of the corpus, once, under his era; eras in chronological order, empty ones left out. */
export function sageIndexGroups(locale: Locale, sages: Sage[] = getAllSages()): SageIndexGroup[] {
  const byPeriod = new Map<Period, Sage[]>()
  for (const sage of sages) {
    const list = byPeriod.get(sage.period) ?? []
    list.push(sage)
    byPeriod.set(sage.period, list)
  }
  return ALL_PERIODS.filter(p => byPeriod.has(p)).map(period => ({
    period,
    label: ERA_LABELS[period][locale],
    color: ERA_COLORS[period],
    entries: byPeriod.get(period)!.sort(byTime).map(sage => {
      const local = localizeSage(sage, locale)
      return {
        id: sage.id,
        name: labelParts(local.label).name,
        years: formatYearRangeFor(locale, sage.birth_year, sage.death_year, sage.date_precision),
      }
    }),
  }))
}
