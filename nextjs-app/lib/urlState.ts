/**
 * URL state serialization and parsing for Geography filters + tab/sage selection.
 *
 * Contract:
 * - Missing ?periods → null (all periods, no filter)
 * - ?periods= → [] (no periods, empty result set)
 * - ?periods=tannaim,amoraim → [tannaim, amoraim] (subset)
 * Same for regions.
 */

import type { Period, Region, Tab } from './types'
import { ALL_PERIODS } from './types'

const ALL_REGIONS: Region[] = [
  'eretz-israel', 'mizrach', 'sefarad', 'ashkenaz', 'tsarfat', 'provence',
  'italy', 'north-africa', 'east-europe', 'other'
]

export interface NavigationState {
  tab: Tab | null
  sage: string | null
  regions: Region[]
  periods: Period[] | null
}

/**
 * Parse URL query string into navigation state.
 * Validates all parameters against supported constants.
 * Deduplicates repeated values.
 * Distinguishes missing params (null/all) from empty params ([]).
 */
export function parseURLState(search: string): NavigationState {
  const params = new URLSearchParams(search)

  // Tab: validate against known tabs. 'graph' is the default and is never carried
  // in the URL, so it normalises to null here — keeping parse/serialize inverses.
  const tabParam = params.get('tab')
  const VALID_TABS: Tab[] = ['graph', 'map', 'traditions', 'ideas', 'timeline', 'genealogy', 'about']
  const tab: Tab | null =
    tabParam && tabParam !== 'graph' && VALID_TABS.includes(tabParam as any)
      ? (tabParam as Tab)
      : null

  // Sage: no validation needed (validated against sageMap at resolution time)
  const sage = params.get('sage')

  // Regions: missing → [], empty string → [], valid values → deduplicated array
  const regionsParam = params.get('regions')
  const regions = (regionsParam
    ? [...new Set(regionsParam.split(',').filter((r: string) => ALL_REGIONS.includes(r as any)))]
    : []) as Region[]

  // Periods: distinguish missing (null) from empty ([] )
  // - Missing ?periods → null (all periods)
  // - ?periods= → [] (no periods)
  // - ?periods=tannaim,amoraim → [tannaim, amoraim]
  const periodsParam = params.get('periods')
  let periods: Period[] | null
  if (!params.has('periods')) {
    // Missing parameter: all periods
    periods = null
  } else if (periodsParam === '') {
    // Empty parameter: no periods
    periods = []
  } else {
    // Non-empty parameter: parse and validate
    const parsed = [...new Set(
      periodsParam!.split(',').filter((p: string) => ALL_PERIODS.includes(p as any))
    )]
    // If all validation failed (no valid periods found), treat as empty selection
    periods = (parsed.length > 0 ? parsed : []) as Period[]
  }

  return { tab, sage, regions, periods }
}

/**
 * Serialize navigation state to URL query string.
 * Only includes non-default values:
 * - tab: only if not 'graph'
 * - sage: only if set
 * - regions: only if non-empty
 * - periods: only if not null (all) and not empty
 */
export function serializeURLState(state: NavigationState): URLSearchParams {
  const params = new URLSearchParams()

  if (state.tab && state.tab !== 'graph') {
    params.set('tab', state.tab)
  }

  if (state.sage) {
    params.set('sage', state.sage)
  }

  if (state.regions.length > 0) {
    params.set('regions', state.regions.join(','))
  }

  // Preserve period contract: null = omitted, [] = empty param, [x,y] = x,y
  if (state.periods !== null) {
    params.set('periods', state.periods.join(','))
  }

  return params
}

/**
 * Merge parsed URL state with current URL parameters.
 * Replaces ?tab, ?sage, ?regions, ?periods.
 * Preserves any other parameters.
 */
export function updateURLWithState(state: NavigationState): string {
  const url = new URL(window.location.href)

  // Clear old geography/navigation params
  url.searchParams.delete('tab')
  url.searchParams.delete('sage')
  url.searchParams.delete('regions')
  url.searchParams.delete('periods')

  // Set new params
  const newParams = serializeURLState(state)
  newParams.forEach((value, key) => {
    url.searchParams.set(key, value)
  })

  return url.toString()
}
