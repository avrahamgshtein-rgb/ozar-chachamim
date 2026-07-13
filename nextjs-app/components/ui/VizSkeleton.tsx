'use client'

import { cn } from '@/lib/utils'

type SkeletonVariant = 'graph' | 'map' | 'timeline' | 'table' | 'list'

interface VizSkeletonProps {
  variant?: SkeletonVariant
  message?: string
}

export function VizSkeleton({ variant = 'graph', message }: VizSkeletonProps) {
  return (
    <div className={cn(
      'absolute inset-0 flex items-center justify-center',
      'bg-ink-900/10 backdrop-blur-sm'
    )} role="status" aria-live="polite" aria-busy="true">
      {variant === 'table' && <SkeletonTable />}
      {variant === 'list' && <SkeletonList />}
      {variant === 'timeline' && <SkeletonTimeline />}
      {variant === 'map' && <SkeletonMap />}
      {(variant === 'graph' || variant === undefined) && <SkeletonGraph />}

      {/* Loading message */}
      {message && (
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-xs text-ink-400 text-center animate-pulse">
            {message}
          </p>
        </div>
      )}
    </div>
  )
}

function SkeletonGraph() {
  return (
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
  )
}

function SkeletonTable() {
  return (
    <div className="w-full px-6 py-6 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-12 rounded-lg bg-ink-800/40 animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  )
}

function SkeletonList() {
  return (
    <div className="w-full px-6 py-6 space-y-3">
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

function SkeletonTimeline() {
  return (
    <div className="w-full h-full px-6 py-6 flex gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-lg bg-ink-800/40 animate-pulse min-h-20"
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  )
}

function SkeletonMap() {
  return (
    <div className="w-full h-full px-6 py-6">
      <div className="w-full h-full rounded-xl bg-ink-800/30 animate-pulse" />
    </div>
  )
}
