// Related sages, grouped by how they stand to the viewed sage (see
// relations.ts). No hooks, so the server-rendered sage page and the client
// drawer share it: the page passes `hrefFor`, the drawer `onSelect`.
// Long groups spill into a native <details>, which needs no script.
import Link from 'next/link'
import { ERA_COLORS, ERA_LABELS } from '@/lib/types'
import type { Locale } from '@/lib/types'
import { RELATION_ITEM_LABELS, RELATION_LABELS, type RelatedGroup, type RelatedPerson } from './relations'

export interface RelatedPersonView extends RelatedPerson {
  /** `displayName(label)`, already localized. */
  name: string
  name_en?: string
}

const MORE: Record<Locale, (n: number) => string> = {
  he: n => `ועוד ${n}`,
  en: n => `${n} more`,
  ru: n => `ещё ${n}`,
}

export function RelatedSages({
  groups, locale, hrefFor, onSelect, perGroup = 6, compact = false, headingLevel = 3,
}: {
  groups: RelatedGroup<RelatedPersonView>[]
  locale: Locale
  hrefFor?: (id: string) => string
  onSelect?: (id: string) => void
  /** Shown before the rest folds into "N more". */
  perGroup?: number
  compact?: boolean
  headingLevel?: 3 | 4
}) {
  const H = headingLevel === 3 ? 'h3' : 'h4'
  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {groups.map(({ group, people }) => {
        const shown = people.length > perGroup + 1 ? people.slice(0, perGroup) : people
        const rest = people.slice(shown.length)
        const itemLabel = RELATION_ITEM_LABELS[group][locale]
        const item = (p: RelatedPersonView) => (
          <RelatedItem key={p.id} person={p} locale={locale} relation={itemLabel}
            href={hrefFor?.(p.id)} onSelect={onSelect} compact={compact} />
        )
        return (
          <section key={group}>
            <H className="flex items-center gap-2 mb-2 text-[11px] font-sans font-semibold uppercase tracking-wider text-ink-400">
              <span>{RELATION_LABELS[group][locale]}</span>
              <span className="min-w-[1.25rem] rounded-full bg-ink-700/60 px-1.5 text-center text-[10px] tabular-nums text-ink-300">
                {people.length}
              </span>
            </H>
            <ul className="space-y-1.5">{shown.map(item)}</ul>
            {rest.length > 0 && (
              <details className="group/more mt-1.5">
                <summary className="inline-flex cursor-pointer select-none list-none items-center gap-1 rounded-lg px-2 py-1 text-xs font-sans text-gold-300/90 hover:bg-ink-800/60 hover:text-gold-200 [&::-webkit-details-marker]:hidden">
                  <svg className="h-3 w-3 transition-transform group-open/more:rotate-45" viewBox="0 0 12 12" aria-hidden>
                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  {MORE[locale](rest.length)}
                </summary>
                <ul className="mt-1.5 space-y-1.5">{rest.map(item)}</ul>
              </details>
            )}
          </section>
        )
      })}
    </div>
  )
}

function RelatedItem({ person, locale, relation, href, onSelect, compact }: {
  person: RelatedPersonView
  locale: Locale
  relation: string
  href?: string
  onSelect?: (id: string) => void
  compact: boolean
}) {
  const color = ERA_COLORS[person.period] ?? '#7a6550'
  const era = ERA_LABELS[person.period]?.[locale] ?? person.period
  const cls =
    'group flex w-full items-center gap-2.5 rounded-xl border border-ink-700/40 bg-ink-800/40 text-start ' +
    'transition-colors duration-150 hover:border-gold-500/30 hover:bg-ink-700/40 ' +
    (compact ? 'px-2.5 py-1.5' : 'px-3 py-2')
  const body = (
    <>
      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: color }} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-serif text-ink-100 transition-colors group-hover:text-gold-300 ${compact ? 'text-sm' : 'text-[15px]'}`}>
          {person.name}
        </span>
        {person.name_en && person.name_en !== person.name && (
          <span className="block truncate text-xs font-sans text-ink-500" dir="ltr">{person.name_en}</span>
        )}
      </span>
      <span
        className="flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-sans text-ink-300"
        style={{ borderColor: `${color}55`, background: `${color}14` }}
      >
        {era}
      </span>
    </>
  )
  const title = `${person.name} · ${relation}`
  return (
    <li>
      {href ? (
        <Link href={href} className={cls} title={title}>{body}</Link>
      ) : (
        <button type="button" onClick={() => onSelect?.(person.id)} className={cls} title={title}>{body}</button>
      )}
    </li>
  )
}
