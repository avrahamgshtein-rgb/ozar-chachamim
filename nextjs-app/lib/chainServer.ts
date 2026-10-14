// What the sage chain needs from the corpus (lib/chain.ts holds the rules, lib/connect.ts the graph): the
// pairs a daily game may be about, the pair of a day, and the page's payload (the net the browser searches
// plus the day's route and the fields of its sages for the hints).
import { getSageById } from './serverData'
import { localizeSage } from './serverDataTranslator'
import { dayNumber } from './today'
import { riddleOn, riddlePoolIds } from './riddleServer'
import { connectGraph, connectNet } from './connectServer'
import { hopDistancesFrom, shortestPath, type ConnectNet } from './connect'
import {
  CHAIN_MAX_BEST, CHAIN_MIN_BEST, chainNumber, dailyPair,
  type ChainDay, type ChainPair,
} from './chain'
import type { Locale } from './types'

let candidates: ChainPair[] | null = null

/**
 * The pairs a day's game may be about (cached): two sages of the riddle's fame pool (so both are people a
 * player may have heard of) whose fewest links are `CHAIN_MIN_BEST` to `CHAIN_MAX_BEST`, and whose cheapest
 * chain (the one the tower flies and the end screen shows) is as short as that. `a` comes before `b` in id
 * order. `best` is the number of links on that chain, which no chain a player builds can beat.
 */
export function chainCandidates(): ChainPair[] {
  if (candidates) return candidates
  const graph = connectGraph()
  const pool = [...riddlePoolIds()].sort((x, y) => Number(x) - Number(y))
  const out: ChainPair[] = []
  for (let i = 0; i < pool.length; i++) {
    const hops = hopDistancesFrom(graph, pool[i])
    for (let j = i + 1; j < pool.length; j++) {
      const best = hops.get(pool[j])
      if (best === undefined || best < CHAIN_MIN_BEST || best > CHAIN_MAX_BEST) continue
      if (shortestPath(graph, pool[i], pool[j])?.links === best) out.push({ a: pool[i], b: pool[j], best })
    }
  }
  return (candidates = out)
}

/** The pair of the day `date` falls on in Israel: never the sage the riddle of the same day hides. */
export function chainOn(date: Date = new Date()): { day: number; number: number; pair: ChainPair } {
  const day = dayNumber(date)
  const pair = dailyPair(chainCandidates(), day, new Set([riddleOn(date).sage.id]))
  if (!pair) throw new Error('chainOn: no pair for the sage chain')
  return { day, number: chainNumber(day), pair }
}

/** The day's game as the page hands it over: the pair, the optimal chain, and the field of each sage strictly between (in `locale`; '' when there is none). */
export function chainDay(locale: Locale, date: Date = new Date()): ChainDay {
  const { day, number, pair } = chainOn(date)
  const path = shortestPath(connectGraph(), pair.a, pair.b)
  if (!path) throw new Error(`chainDay: no path between ${pair.a} and ${pair.b}`)
  const route = path.steps.map(s => s.id)
  const fields: Record<string, string> = {}
  for (const id of route.slice(1, -1)) {
    const sage = getSageById(id)
    if (!sage) continue
    const field = locale === 'he' ? sage.field : localizeSage(sage, locale).field_label
    fields[id] = field?.trim() ?? ''
  }
  return { day, number, a: pair.a, b: pair.b, best: pair.best, route, fields }
}

/** What `/connect` ships to the browser: the net to search and the day's game. */
export function connectPageData(locale: Locale, date: Date = new Date()): { net: ConnectNet; day: ChainDay } {
  return { net: connectNet(locale), day: chainDay(locale, date) }
}
