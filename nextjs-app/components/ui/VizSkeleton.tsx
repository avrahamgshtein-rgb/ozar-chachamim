'use client'

/**
 * Skeleton screen shown while a visualization chunk loads
 * (tab transitions / dynamic imports). Pure CSS shimmer — no deps.
 */
type VizSkeletonVariant = 'canvas' | 'graph' | 'map' | 'timeline' | 'table' | 'list'

export function VizSkeleton({ variant = 'canvas' }: { variant?: VizSkeletonVariant }) {
  if (variant === 'list') {
    return (
      <div className="absolute inset-0 overflow-hidden px-6 py-6 space-y-3" aria-busy="true" aria-live="polite">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl bg-ink-800/60 animate-pulse"
            style={{ animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-busy="true" aria-live="polite">
      {/* Faux graph: pulsing dots + connecting lines */}
      <svg width="260" height="180" viewBox="0 0 260 180" className="opacity-60" aria-hidden>
        <g stroke="var(--ink-600)" strokeWidth="1" opacity="0.5">
          <line x1="60" y1="60" x2="130" y2="100" />
          <line x1="130" y1="100" x2="200" y2="50" />
          <line x1="130" y1="100" x2="110" y2="150" />
          <line x1="200" y1="50" x2="220" y2="120" />
        </g>
        {[
          [60, 60, 14], [130, 100, 18], [200, 50, 12], [110, 150, 10], [220, 120, 11],
        ].map(([cx, cy, r], i) => (
          <circle
            key={i} cx={cx} cy={cy} r={r}
            fill="var(--ink-700)"
            className="animate-pulse"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </svg>
    </div>
  )
}
