// The tower's layout for a language, computed once per request and shared by the page and its
// metadata (app/[locale]/tower/page.tsx and tower/[id]/page.tsx), with the road to Sinai and the
// portrait atlas (each sage's tile, so the scene can draw his face).
import { cache } from 'react'
import atlasData from '../public/portraits/atlas.json'
import { hasPortrait } from './portraits'
import { getAllConnections, getAllSages } from './serverData'
import { localizeSage } from './serverDataTranslator'
import { buildTower, buildTowerRoad, type TowerData } from './tower'
import { attachFaces, type PortraitAtlas } from './towerFaces'
import type { Locale } from './types'

export const towerData = cache((locale: Locale): TowerData => {
  const sages = getAllSages(), connections = getAllConnections()
  const data = buildTower(sages.map(s => localizeSage(s, locale)), connections, locale)
  return { ...attachFaces(data, atlasData as PortraitAtlas, hasPortrait), road: buildTowerRoad(data, sages, connections, locale) }
})
