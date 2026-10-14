// The tower's layout for a language, computed once per request and shared by the page and its
// metadata (app/[locale]/tower/page.tsx and tower/[id]/page.tsx).
import { cache } from 'react'
import { getAllConnections, getAllSages } from './serverData'
import { localizeSage } from './serverDataTranslator'
import { buildTower, type TowerData } from './tower'
import type { Locale } from './types'

export const towerData = cache((locale: Locale): TowerData =>
  buildTower(getAllSages().map(s => localizeSage(s, locale)), getAllConnections(), locale))
