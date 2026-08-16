import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/types'
import { tr } from '@/lib/i18n'

interface EmptyStateProps {
  locale: Locale
  title?: string
  description?: string
  icon?: 'filter' | 'search' | 'network' | 'map' | 'calendar'
  action?: {
    label: string
    onClick: () => void
  }
}

const ICONS = {
  filter: (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  search: (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  network: (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.5a1 1 0 00-.8.4l-4.5 5.6a1 1 0 00.8 1.6h2.5" />
    </svg>
  ),
  map: (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 003 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6.553 3.276A1 1 0 0021 20.382V9.618a1 1 0 00-1.447-.894L15 11m0 13V11m0 0L9 7" />
    </svg>
  ),
  calendar: (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

export function EmptyState({
  locale,
  title,
  description,
  icon = 'filter',
  action
}: EmptyStateProps) {
  const isHe = locale === 'he'
  const defaultTitle = isHe ? 'אין חכמים התואמים' : 'No sages found'
  const defaultDescription = isHe
    ? 'לא נמצאו חכמים התואמים לפילטרים הנוכחיים. נסה להחליף את בחירתך או לאפס את הפילטרים.'
    : 'No sages match your current filters. Try changing your selection or resetting filters.'

  return (
    <div className={cn(
      'flex flex-col items-center justify-center',
      'py-12 px-4',
      'text-center'
    )}>
      {/* Icon */}
      <div className="mb-4 text-ink-500/60">
        {ICONS[icon]}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-ink-200 mb-2">
        {title || defaultTitle}
      </h3>

      {/* Description */}
      <p className="text-sm text-ink-400 max-w-sm mb-6 leading-relaxed">
        {description || defaultDescription}
      </p>

      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'px-4 py-2 rounded-lg',
            'bg-ink-700 hover:bg-ink-600',
            'text-ink-100 text-sm font-medium',
            'transition-colors'
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
