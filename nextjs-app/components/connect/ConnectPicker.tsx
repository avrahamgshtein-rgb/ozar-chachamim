'use client'

// "שישה צעדים", the picker: two sages from a search box each, and the shortest chain of recorded relations
// between them (lib/connect.ts) as a list of stations, each with how he is linked to the one before. The chain
// can be flown in the Tower of Generations (a plain link to /tower/path/<a>/<b>, which plays it on load). The
// pair is kept in the address (?from=&to=, replaceState) so it can be shared, and read from it on load. The
// whole net (names, eras, links: ~23 KB for Hebrew) is in the page, so the search runs in the browser.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { track } from '@/lib/analytics'
import { ALL_PERIODS } from '@/lib/types'
import type { Locale, Period } from '@/lib/types'
import { degreeOf, describePath, graphFromNet, shortestPath, type ConnectNet, type PathView } from '@/lib/connect'
import { flightHref } from '@/lib/connectFlight'
import { EraChip } from '@/components/ui/EraChip'
import { ruPlural } from '@/components/viz/SinaiPathText'
import { SageCombobox, type ComboSage } from './SageCombobox'

const S = {
  title: { he: 'מסלול בין שני חכמים', en: 'A path between two sages', ru: 'Путь между двумя мудрецами' },
  lede: {
    he: 'בחרו שני חכמים, והאתר ימצא את שרשרת הקשרים הקצרה ביותר ביניהם: רב ותלמיד, משפחה, חברים, יריבים והשפעה.',
    en: 'Pick any two sages and the site finds the shortest chain of recorded relations between them: teacher and student, family, colleagues, rivals and influence.',
    ru: 'Выберите двух мудрецов, и сайт найдёт самую короткую цепочку известных связей между ними: учитель и ученик, семья, коллеги, оппоненты и влияние.',
  },
  fromLabel: { he: 'מהחכם', en: 'From', ru: 'От' },
  toLabel: { he: 'אל החכם', en: 'To', ru: 'К' },
  fromField: { he: 'החכם שממנו מתחילים. בחרו שם מהרשימה', en: 'The sage to start from. Pick a name from the list', ru: 'Мудрец, с которого начинаем. Выберите имя из списка' },
  toField: { he: 'החכם שאליו מגיעים. בחרו שם מהרשימה', en: 'The sage to reach. Pick a name from the list', ru: 'Мудрец, до которого добираемся. Выберите имя из списка' },
  placeholder: { he: 'הקלידו שם של חכם…', en: 'Type a sage’s name…', ru: 'Введите имя мудреца…' },
  find: { he: 'מצאו את המסלול', en: 'Find the path', ru: 'Найти путь' },
  note: {
    he: 'ברשימה יש רק חכמים שמתועד להם קשר לחכם אחר באתר.',
    en: 'The list holds only sages with a recorded link to another sage on the site.',
    ru: 'В списке только мудрецы, у которых на сайте есть известная связь с другим мудрецом.',
  },
  same: { he: 'בחרו שני חכמים שונים.', en: 'Pick two different sages.', ru: 'Выберите двух разных мудрецов.' },
  none: {
    he: 'אין מסלול מתועד בין {a} לבין {b}. נסו צמד אחר.',
    en: 'There is no recorded path between {a} and {b}. Try another pair.',
    ru: 'Между «{a}» и «{b}» нет известного пути. Попробуйте другую пару.',
  },
  stations: { he: 'תחנות המסלול', en: 'Stations of the path', ru: 'Остановки пути' },
  fly: { he: 'לטוס במגדל הדורות', en: 'Fly it in the Tower of Generations', ru: 'Пролететь по Башне поколений' },
  flyNote: {
    he: 'המסע במגדל עובר תחנה אחר תחנה, עם הסבר על כל קשר.',
    en: 'The flight visits the stations one by one, with a line on every link.',
    ru: 'Полёт проходит остановки одну за другой, с пояснением к каждой связи.',
  },
  start: { he: 'התחלה', en: 'Start', ru: 'Старт' },
} satisfies Record<string, Record<Locale, string>>

export const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))

/** "5 steps": the links between the sages, one less than the stations. */
export const stepsLabel = (n: number, l: Locale): string =>
  l === 'he' ? (n === 1 ? 'צעד אחד' : `${n} צעדים`)
    : l === 'en' ? (n === 1 ? '1 step' : `${n} steps`)
      : `${n} ${ruPlural(n, 'шаг', 'шага', 'шагов')}`

/** "5 steps between Rashi and the Rambam" */
const summary = (n: number, a: string, b: string, l: Locale): string =>
  l === 'he' ? `${stepsLabel(n, l)} בין ${a} לבין ${b}`
    : l === 'en' ? `${stepsLabel(n, l)} between ${a} and ${b}`
      : `${stepsLabel(n, l)} между «${a}» и «${b}»`

const primary = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-gold-500 px-5 py-2 text-sm font-semibold text-ink-900 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50'

/** A sage on a list of stations; PathView's fields, with a caption that may be absent. */
export type StationView = Pick<PathView, 'id' | 'name' | 'period' | 'caption' | 'dotted'>

/**
 * The stations of a path, numbered, each with his era and how he is linked to the one above; the thread
 * between two stations is dotted where the way in is only influence. `pending` adds an open slot after the
 * last station (the sage still to be named), `target` the sage the path must reach, `firstTag` marks the
 * first station and `lastMark` the last (the goal reached). Shared with the sage chain game.
 */
export function PathList({ locale, views, firstTag, lastMark, pending, target, testId, label, className }: {
  locale: Locale
  views: readonly StationView[]
  firstTag?: string
  lastMark?: string
  pending?: string
  target?: { name: string; period: Period; tag: string }
  testId?: string
  label: string
  className?: string
}) {
  const circle = 'absolute start-0 top-0 grid h-8 w-8 place-items-center rounded-full border text-sm tabular-nums'
  const rail = (dotted: boolean, open: boolean) => (
    <span
      aria-hidden
      className={cn(
        'absolute start-[15px] top-9 -bottom-1 border-s-2',
        dotted ? 'border-dotted border-gold-500/45' : open ? 'border-dashed border-ink-600/70' : 'border-solid border-gold-500/55',
      )}
    />
  )
  const more = pending !== undefined || target !== undefined
  return (
    <ol aria-label={label} data-testid={testId} className={className}>
      {views.map((v, i) => {
        const last = i === views.length - 1
        const goal = last && lastMark !== undefined
        return (
          <li key={v.id} data-sage-id={v.id} className={cn('relative ps-11', !last || more ? 'min-h-[68px] pb-5' : 'min-h-[44px]')}>
            {(!last || more) && rail(!last && views[i + 1].dotted, last)}
            <span aria-hidden className={cn(circle, goal ? 'border-emerald-400/60 bg-emerald-500/15 text-base' : 'border-gold-500/50 bg-ink-800 text-gold-300')}>
              {goal ? lastMark : i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <a dir="auto" href={`/${locale}/sage/${v.id}`} className="min-w-0 break-words font-serif text-lg leading-snug text-ink-50 hover:text-gold-300">{v.name}</a>
                <EraChip period={v.period} locale={locale} size="sm" />
                {i === 0 && firstTag && <span className="text-[11px] font-semibold uppercase tracking-widest text-gold-400">{firstTag}</span>}
              </div>
              {v.caption && <p dir="auto" className="mt-0.5 break-words text-sm text-ink-300">{v.caption}</p>}
            </div>
          </li>
        )
      })}
      {pending !== undefined && (
        <li className={cn('relative ps-11', target ? 'min-h-[68px] pb-5' : 'min-h-[44px]')}>
          {target && rail(false, true)}
          <span aria-hidden className={cn(circle, 'border-dashed border-ink-500 bg-ink-800 text-ink-400')}>?</span>
          <p className="pt-1 text-sm text-ink-400">{pending}</p>
        </li>
      )}
      {target && (
        <li className="relative min-h-[44px] ps-11">
          <span aria-hidden className={cn(circle, 'border-emerald-400/60 bg-emerald-500/15 text-base')}>🎯</span>
          <div className="min-w-0 pt-0.5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span dir="auto" className="min-w-0 break-words font-serif text-lg leading-snug text-ink-50">{target.name}</span>
              <EraChip period={target.period} locale={locale} size="sm" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300 [[data-theme=light]_&]:text-emerald-800">{target.tag}</span>
            </div>
          </div>
        </li>
      )}
    </ol>
  )
}

/** What the picker shows under the fields. */
type Outcome =
  | { kind: 'path'; from: string; to: string; views: PathView[]; links: number }
  | { kind: 'none'; from: string; to: string }
  | { kind: 'same' }

/** Keeps the chosen pair in the address, as `?from=&to=` (nothing else in the address changes). Never throws. */
function syncUrl(from: string | null, to: string | null) {
  try {
    const q = new URLSearchParams()
    if (from) q.set('from', from)
    if (to) q.set('to', to)
    const query = q.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
  } catch { /* an address that cannot be rewritten is only a pair that cannot be shared */ }
}

export function ConnectPicker({ locale, net }: { locale: Locale; net: ConnectNet }) {
  const graph = useMemo(() => graphFromNet(net), [net])
  const sages = useMemo<ComboSage[]>(() => net.sages.map(([id, name, period]) => ({ id, name, period })), [net])
  const nameOf = useMemo(() => new Map(net.sages.map(s => [s[0], s[1]])), [net])
  const degree = useMemo(() => new Map(net.sages.map(s => [s[0], degreeOf(graph, s[0])])), [net, graph])

  const [from, setFrom] = useState<string | null>(null)
  const [to, setTo] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const find = useCallback((a: string, b: string) => {
    if (a === b) { setOutcome({ kind: 'same' }); return }
    const path = shortestPath(graph, a, b)
    if (!path) { setOutcome({ kind: 'none', from: a, to: b }); return }
    setOutcome({ kind: 'path', from: a, to: b, views: describePath(net, path, locale), links: path.links })
    track('connect_path', { locale, steps: path.links })
  }, [graph, net, locale])

  // A pair in the address (a shared link, or "connect him to another sage" from a page): fill it in, and
  // show the path at once when both are known
  useEffect(() => {
    let a: string | null = null
    let b: string | null = null
    try {
      const q = new URLSearchParams(window.location.search)
      a = q.get('from')
      b = q.get('to')
    } catch { /* no address to read */ }
    const known = (id: string | null) => (id !== null && nameOf.has(id) ? id : null)
    const fa = known(a), fb = known(b)
    if (fa) setFrom(fa)
    if (fb) setTo(fb)
    if (fa && fb && fa !== fb) find(fa, fb)
  }, [nameOf, find])

  const pickFrom = (id: string | null) => { setFrom(id); setOutcome(null); syncUrl(id, to) }
  const pickTo = (id: string | null) => { setTo(id); setOutcome(null); syncUrl(from, id) }
  const submit = () => { if (from && to) { syncUrl(from, to); find(from, to) } }

  return (
    <section aria-labelledby="connect-picker" className="mt-10">
      <h2 id="connect-picker" className="font-serif text-2xl font-bold leading-tight text-ink-50">
        <span aria-hidden>🧭</span> {S.title[locale]}
      </h2>
      <p className="mt-2 leading-relaxed text-ink-300">{S.lede[locale]}</p>

      <form
        className="mt-5 rounded-2xl border border-gold-500/25 bg-gold-500/[0.05] p-4 sm:p-5"
        onSubmit={e => { e.preventDefault(); submit() }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-gold-400" aria-hidden>{S.fromLabel[locale]}</p>
            <SageCombobox
              locale={locale} sages={sages} degree={degree} value={from} onChange={pickFrom}
              label={S.fromField[locale]} placeholder={S.placeholder[locale]} testId="connect-from"
            />
          </div>
          <div className="min-w-0">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-gold-400" aria-hidden>{S.toLabel[locale]}</p>
            <SageCombobox
              locale={locale} sages={sages} degree={degree} value={to} onChange={pickTo}
              label={S.toField[locale]} placeholder={S.placeholder[locale]} testId="connect-to"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={!from || !to} data-testid="connect-find" className={primary}>{S.find[locale]}</button>
          <p className="min-w-0 text-xs text-ink-500">{S.note[locale]}</p>
        </div>
      </form>

      <div aria-live="polite" className="mt-6">
        {outcome?.kind === 'same' && <p className="rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-3 text-sm text-ink-100">{S.same[locale]}</p>}
        {outcome?.kind === 'none' && (
          <p data-testid="connect-none" className="rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-3 text-sm text-ink-100">
            {fill(S.none[locale], { a: nameOf.get(outcome.from) ?? '', b: nameOf.get(outcome.to) ?? '' })}
          </p>
        )}
        {outcome?.kind === 'path' && (
          <div data-testid="connect-result">
            <h3 data-testid="connect-steps" className="font-serif text-xl font-bold leading-snug text-ink-50">
              {summary(outcome.links, outcome.views[0].name, outcome.views[outcome.views.length - 1].name, locale)}
            </h3>
            <PathList
              locale={locale}
              views={outcome.views}
              firstTag={S.start[locale]}
              label={S.stations[locale]}
              testId="connect-path"
              className="mt-5"
            />
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                data-testid="connect-fly"
                href={`${flightHref(locale, outcome.from, outcome.to)}?via=picker`}
                className={cn(primary, 'px-6')}
              >
                <span aria-hidden>🌌</span>{S.fly[locale]}
              </a>
              <p className="min-w-0 text-xs text-ink-500">{S.flyNote[locale]}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/** Indices of `ALL_PERIODS`, for the game's rows that start from the net. */
export const periodOf = (index: number): Period => ALL_PERIODS[index] ?? ALL_PERIODS[0]
