'use client'

import { ERA_COLORS, ERA_LABELS } from '@/lib/types'
import type { Locale } from '@/lib/types'
import { ALL_MILESTONES } from '@/lib/milestones'
import { eraAt } from '@/lib/journey'
import { useJourneyStore } from '@/lib/journeyStore'
import { formatYear, cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'

/** A milestone is shown while the year is within this many years of it. */
const MILESTONE_NEAR = 18

/**
 * The big year over the map, its era, how many sages are active, and the
 * milestone being passed. Re-renders only when the whole year changes.
 */
export function JourneyHud({ locale, compact }: { locale: Locale; compact: boolean }) {
  const year = useJourneyStore(s => Math.round(s.year))
  const snapshot = useJourneyStore(s => s.snapshot)
  const era = eraAt(year)
  const milestone = ALL_MILESTONES.find(m =>
    m.endYear != null ? year >= m.year - MILESTONE_NEAR && year <= m.endYear + MILESTONE_NEAR : Math.abs(year - m.year) <= MILESTONE_NEAR,
  )
  const active = snapshot?.active.length ?? 0
  const centres = snapshot?.centres.length ?? 0

  return (
    <div
      className={cn(
        'absolute left-1/2 -translate-x-1/2 z-[1000] pointer-events-none text-center select-none',
        compact ? 'top-[3.1rem] w-[10.5rem]' : 'top-[3.2rem] w-[22rem]',
      )}
    >
      <div
        className={cn(
          'font-serif font-bold tabular-nums leading-none text-gold-300 journey-year',
          compact ? 'text-[1.75rem]' : 'text-[2.75rem]',
        )}
        dir={locale === 'he' ? 'rtl' : 'ltr'}
      >
        {formatYear(year, locale)}
      </div>
      <div className={cn('mt-1 flex items-center justify-center gap-1.5 font-sans whitespace-nowrap', compact ? 'text-[10.5px]' : 'text-xs')}>
        {era && (
          <span className="inline-flex items-center gap-1 font-bold journey-halo" style={{ color: ERA_COLORS[era] }}>
            <span className="w-2 h-2 rounded-full" style={{ background: ERA_COLORS[era] }} />
            {ERA_LABELS[era][locale]}
          </span>
        )}
        {/* On phones the count lives in the side list's pill instead. */}
        {!compact && (
          <span className="text-ink-300 journey-halo">
            {era ? '· ' : ''}
            {tr(locale, `${active} חכמים`, `${active} sages`, `мудрецов: ${active}`)}
            {` · ${tr(locale, `${centres} מרכזים`, `${centres} centres`, `центров: ${centres}`)}`}
          </span>
        )}
      </div>
      {milestone && (
        <div
          key={milestone.year}
          className={cn(
            'mx-auto mt-1.5 inline-block rounded-full px-2.5 py-0.5 font-sans font-semibold glass animate-fade-in',
            compact ? 'text-[10px]' : 'text-[11px]',
            milestone.kind === 'transmission' ? 'text-gold-300 border border-gold-500/40' : 'text-ink-200 border border-ink-600/50',
          )}
          title={milestone.summary[locale]}
        >
          ✦ {milestone.label[locale]}
          {!compact && <span className="text-ink-400 font-normal"> · {milestone.circa ? '~' : ''}{formatYear(milestone.year, locale)}</span>}
        </div>
      )}
    </div>
  )
}
