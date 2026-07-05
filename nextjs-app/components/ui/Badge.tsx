'use client'

import { cn } from '@/lib/utils'

interface BadgeProps {
  total: number
  lastUpdate: string
  locale?: 'he' | 'en'
  className?: string
}

export function DataBadge({ total, lastUpdate, locale = 'he', className }: BadgeProps) {
  const isHe = locale === 'he'

  if (!total) return null

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1',
        'text-xs font-sans font-medium',
        'bg-ink-800/60 border border-ink-600/40',
        'text-ink-300',
        className,
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse"
        aria-hidden
      />
      <span>
        {total.toLocaleString('he-IL')}{' '}
        {isHe ? 'חכמים' : 'sages'}
      </span>
      {lastUpdate && (
        <>
          <span className="text-ink-600">·</span>
          <span className="text-ink-400">
            {isHe ? `עדכון: ${lastUpdate}` : `Updated: ${lastUpdate}`}
          </span>
        </>
      )}
    </div>
  )
}
