// The tower's layout for a language, computed once per request and shared by the page and its
// metadata (app/[locale]/tower/page.tsx and tower/[id]/page.tsx), with the road to Sinai.
import { cache } from 'react'
import { getAllConnections, getAllSages } from './serverData'
import { localizeSage } from './serverDataTranslator'
import { buildTower, buildTowerRoad, type TowerData } from './tower'
import type { Locale } from './types'

export const towerData = cache((locale: Locale): TowerData => {
  const sages = getAllSages(), connections = getAllConnections()
  const data = buildTower(sages.map(s => localizeSage(s, locale)), connections, locale)
  return { ...data, road: buildTowerRoad(data, sages, connections, locale) }
})
