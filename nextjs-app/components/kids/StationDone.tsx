'use client'

// "I finished this station": stamps the station in the journey passport (this browser only). Pressing
// it again takes the stamp back, so a slip of the finger is not final.
import { cn } from '@/lib/utils'
import { track } from '@/lib/analytics'
import type { RouteKey } from '@/lib/kidsJourney'
import { toggleStation, useJourneyProgress } from '@/lib/kidsJourneyProgress'

export function StationDone({ route, n, object }: { route: RouteKey; n: number; object?: { name: string; icon: string } }) {
  const progress = useJourneyProgress()
  const done = progress[route].includes(n)

  return (
    <button
      type="button"
      aria-pressed={done}
      onClick={() => {
        if (toggleStation(route, n)) track('kids_station_done', { route })
      }}
      className={cn(
        'inline-flex min-h-[44px] items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition-colors',
        done
          ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300 [[data-theme=light]_&]:text-emerald-800'
          : 'border-gold-500/60 bg-gold-500/20 text-gold-300 hover:bg-gold-500/30',
      )}
    >
      <span aria-hidden>{done ? '✓' : '🔖'}</span>
      {done
        ? object ? `התחנה בדרכון, וה${object.name} בתיק` : 'התחנה חתומה בדרכון'
        : 'סיימתי את התחנה: החתימו לי את הדרכון'}
    </button>
  )
}
