'use client'

import type { Locale, Sage } from '@/lib/types'

export interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  timestamp?: number
}

/**
 * Track user analytics events
 * Vercel Analytics is auto-enabled; this sends custom events
 */
export function trackEvent(name: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${name}`, properties)
  }

  // Send to Vercel Analytics (if available)
  if ('dataLayer' in window) {
    (window.dataLayer as any)?.push({
      event: name,
      ...properties,
    })
  }
}

// ── Event tracking helpers ────────────────────────────────────────

export function trackSageViewed(sage: Sage, locale: Locale) {
  trackEvent('sage_viewed', {
    sage_id: sage.id,
    sage_label: sage.label,
    period: sage.period,
    locale,
  })
}

export function trackTabSwitched(tab: string, durationMs: number) {
  trackEvent('tab_switched', {
    tab_name: tab,
    duration_ms: durationMs,
  })
}

export function trackFilterApplied(filterType: string, value: string) {
  trackEvent('filter_applied', {
    filter_type: filterType,
    value,
  })
}

export function trackSearchQuery(query: string, resultCount: number) {
  trackEvent('search_query', {
    query_text: query,
    result_count: resultCount,
  })
}

export function trackErrorOccurred(errorType: string, component: string, message?: string) {
  trackEvent('error_occurred', {
    error_type: errorType,
    component,
    message: message?.slice(0, 100), // Truncate long messages
  })
}

export function trackPathFinderSearch(source: string, target: string, found: boolean) {
  trackEvent('pathfinder_search', {
    source_id: source,
    target_id: target,
    path_found: found,
  })
}
