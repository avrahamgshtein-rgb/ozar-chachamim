// What the connect page and the tower's path flight need from the corpus (lib/connect.ts holds the rules):
// the graph over the roster, the net the browser holds in a language, and a path described for the screens.
import { getAllConnections, getAllSages } from './serverData'
import { localizeSage } from './serverDataTranslator'
import { labelParts } from './displayName'
import { shortName } from './tower'
import type { Locale } from './types'
import {
  buildConnectGraph, describePath, netFromGraph, shortestPath,
  type ConnectGraph, type ConnectNet, type PathView,
} from './connect'

let graph: ConnectGraph | null = null
const nets = new Map<Locale, ConnectNet>()

/** The links between roster sages as a graph (cached). */
export function connectGraph(): ConnectGraph {
  return (graph ??= buildConnectGraph(getAllSages().map(s => s.id), getAllConnections()))
}

/** The sages with at least one link, in id order, named as the chips and captions name them (the short name in `locale`) (cached per language). */
export function connectNet(locale: Locale): ConnectNet {
  let net = nets.get(locale)
  if (!net) {
    const byId = new Map(getAllSages().map(s => [s.id, s]))
    net = netFromGraph(connectGraph(), id => {
      const s = byId.get(id)!
      return {
        name: shortName(labelParts(localizeSage(s, locale).label).name),
        period: s.period,
        woman: !!s.tags?.includes('נשים'),
      }
    })
    nets.set(locale, net)
  }
  return net
}

/** The chain from one sage to another with names and captions in `locale`; null for a sage that is not on the roster, the same sage twice, or two sages with no chain between them. */
export function connectPathFor(locale: Locale, from: string, to: string): PathView[] | null {
  if (from === to) return null
  const path = shortestPath(connectGraph(), from, to)
  return path ? describePath(connectNet(locale), path, locale) : null
}
