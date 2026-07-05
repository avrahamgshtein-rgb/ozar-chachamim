'use client'

import { cn } from '@/lib/utils'
import { ERA_LABELS, ERA_COLORS } from '@/lib/types'
import type { Period, Locale } from '@/lib/types'

interface EraChipProps {
  period: Period
  locale?: Locale
  size?: 'sm' | 'md'
  className?: string
}

export function EraChip({ period, locale = 'he', size = 'md', className }: EraChipProps) {
  const label  = ERA_LABELS[period]?.[locale] ?? period
  const color  = ERA_COLORS[period] ?? '#7a6550'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-sans font-medium tracking-wide',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs',
        className,
      )}
      style={{
        background: `${color}1a`,
        border: `1px solid ${color}55`,
        color,
      }}
    >
      <span
        className="era-dot"
        style={{ background: color, width: 6, height: 6 }}
      />
      {label}
    </span>
  )
}
